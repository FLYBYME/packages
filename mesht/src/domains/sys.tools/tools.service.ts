// FILE: src/domains/sys.tools/tools.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  ToolSchema,
  Tool,
  RegisterToolParamsSchema,
  RegisterToolParams,
  ResolveToolBeltParamsSchema,
  ResolveToolBeltParams,
  InvokeToolParamsSchema,
  InvokeToolParams,
  DisableToolParamsSchema,
  DisableToolParams,
  ResolveApprovalParamsSchema,
  ResolveApprovalParams,
  SpecialistSettingsSchema,
  QuotaLockSchema,
  DelegateToSpecialistParamsSchema,
  DelegateToSpecialistParams,
  DelegateToSpecialistResult,
  RegisterDynamicToolParams,
} from './tools.schema';
import { IContext, ILogger, MeshError, IMeshApp } from '@flybyme/isomorphic-core';
import { SpecialistExecutor } from './SpecialistExecutor';
import { VerifyComplianceResult } from '../sys.governance/governance.schema';

import './tools.contract';

const ToolTable = defineTable('tools', ToolSchema);
const SpecialistSettingsTable = defineTable('specialist_settings', SpecialistSettingsSchema);
const QuotaLocksTable = defineTable('quota_locks', QuotaLockSchema);

/**
 * Pending approval record — held in-memory until resolved.
 */
interface PendingApproval {
  approvalId: string;
  toolName: string;
  handler: string;
  arguments: Record<string, unknown>;
  projectId: string;
  id?: string;
  personaId?: string;
  createdAt: number;
}

/**
 * ToolsService — The Capability Registry & Invocation Proxy.
 *
 * Manages the registry of atomic tools available to personas.
 * Each tool maps to a broker action and has risk classification
 * for governance enforcement.
 *
 * HITL: Tools with `requiresApproval: true` will pause execution
 * and emit an approval_requested event. The operator must resolve
 * via sys.tools.resolve_approval before the tool executes.
 */
export class ToolsService extends DatabaseMixin(ToolTable, SpecialistSettingsTable, QuotaLocksTable)(class { }) {
  public readonly name = 'sys.tools';

  // logger is injected by DatabaseMixin.onInit()
  declare logger: ILogger;

  private specialistExecutor!: SpecialistExecutor;

  /** In-memory store for pending HITL approvals */
  private pendingApprovals: Map<string, PendingApproval> = new Map();

  public actions = {
    register: {
      params: RegisterToolParamsSchema,
      returns: ToolSchema,
      handler: this.registerTool.bind(this),
    },
    resolveToolBelt: {
      params: ResolveToolBeltParamsSchema,
      handler: this.resolveToolBeltAction.bind(this),
    },
    invoke: {
      params: InvokeToolParamsSchema,
      handler: this.invokeTool.bind(this),
      timeout: 60000 // 1 minute default for tool calls
    },
    disable: {
      params: DisableToolParamsSchema,
      returns: ToolSchema,
      handler: this.disableTool.bind(this),
    },
    resolve_approval: {
      params: ResolveApprovalParamsSchema,
      handler: this.resolveApproval.bind(this),
    },
    list_pending_approvals: {
      handler: this.listPendingApprovals.bind(this),
    },
    register_dynamic: {
      handler: this.registerDynamicTool.bind(this),
    },
    delegate_to_specialist: {
      params: DelegateToSpecialistParamsSchema,
      handler: this.delegateToSpecialist.bind(this),
      timeout: 300000 // 5 minutes
    }
  };

  constructor(_logger: ILogger) {
    super();
  }

  async onInit(app: IMeshApp): Promise<void> {
    await super.onInit(app);
    this.specialistExecutor = new SpecialistExecutor(
      this.logger,
      this.dbs.specialist_settings,
      this.dbs.quota_locks
    );

    // Listen for directive cancellation to kill orphaned processes
    this.broker.on('sys.directives.cancelled', (payload: { id: string; reason: string }) => {
      if (payload.id) {
        this.specialistExecutor.killByDirective(payload.id);
      }
    });
  }

  async started(): Promise<void> {
    // 1. Seed global specialist settings
    const settings = await this.dbs.specialist_settings.findById('global');
    if (!settings) {
      this.logger.info('[sys.tools] Seeding global specialist settings...');
      await this.dbs.specialist_settings.create({
        id: 'global',
        geminiEnabled: true,
        copilotEnabled: true,
        opencodeEnabled: true,
        specialistTimeoutMs: 300000
      });
    }

    // 2. Register the delegation tool itself in the tools registry
    const toolName = 'delegate_to_specialist';
    const results = await this.db.find({ name: toolName });
    if (results.length === 0) {
      this.logger.info(`[sys.tools] Registering core tool: ${toolName}`);
      await this.createToolRecord({
        name: toolName,
        description: 'Delegates a complex task or query to a CLI-based LLM specialist (gemini, copilot, or opencode).',
        category: 'generation',
        handler: 'sys.tools.delegate_to_specialist',
        parameters: [
          { name: 'specialist', type: 'string', description: 'Target CLI (gemini, copilot, opencode).', required: true },
          { name: 'prompt', type: 'string', description: 'Objective for the specialist.', required: true },
          { name: 'projectId', type: 'string', description: 'Project context for execution.', required: true },
          { name: 'model', type: 'string', description: 'Specific model to use.', required: false },
          { name: 'hints', type: 'array', description: 'Optional execution hints (e.g. ["simple"]).', required: false },
          { name: 'cwd', type: 'string', description: 'Working directory.', required: false },
        ],
        outputSchema: {},
        riskLevel: 'safe',
        requiresApproval: false,
      });
    }
  }

  async delegateToSpecialist(ctx: IContext<DelegateToSpecialistParams>): Promise<DelegateToSpecialistResult> {
    const params = DelegateToSpecialistParamsSchema.parse(ctx.params);
    return await this.specialistExecutor.execute(ctx, params);
  }

  async registerTool(ctx: IContext<RegisterToolParams>): Promise<Tool> {
    const params = RegisterToolParamsSchema.parse(ctx.params);

    const existing = await this.db.find({ name: params.name });
    if (existing.length > 0) {
      throw new MeshError({ code: 'CONFLICT', message: `Tool '${params.name}' already exists.`, status: 409 });
    }

    const tool = await this.createToolRecord(params);

    this.logger.info(`[sys.tools] Registered: ${params.name} (${params.category}, risk: ${params.riskLevel})`);

    const eventPayload = { id: tool.id, name: params.name, category: params.category };
    if (typeof ctx.emit === 'function') {
      ctx.emit('sys.tools.registered', eventPayload);
    } else {
      this.broker.emit('sys.tools.registered', eventPayload);
    }

    return tool;
  }

  async registerDynamicTool(ctx: IContext<RegisterDynamicToolParams>): Promise<Tool> {
    const { name, description, inputSchema, handler } = ctx.params;

    const existing = await this.db.find({ name });
    if (existing.length > 0) {
      // Update existing if it matches
      const tool = existing[0];
      await this.db.update(tool.id, {
        description,
        inputSchemaJSON: inputSchema,
        handler,
        status: 'active',
      });
      const updatedTool = await this.db.findById(tool.id);
      if (!updatedTool) {
        throw new MeshError({ code: 'NOT_FOUND', message: `Dynamic tool '${name}' disappeared during update.`, status: 500 });
      }
      return updatedTool;
    }

    const now = Date.now();

    const record = await this.db.create({
      name,
      description,
      category: 'custom',
      handler,
      inputSchemaJSON: inputSchema,
      dynamic: true,
      status: 'active',
      createdAt: now,
    });

    this.logger.info(`[sys.tools] Registered Dynamic Tool: ${name}`);
    const createdTool = await this.db.findById(record.id);
    if (!createdTool) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Dynamic tool '${name}' disappeared after creation.`, status: 500 });
    }
    return createdTool;
  }

  private async createToolRecord(params: RegisterToolParams): Promise<Tool> {

    const now = Date.now();

    const record = await this.db.create({
      name: params.name,
      description: params.description,
      category: params.category,
      handler: params.handler,
      parameters: params.parameters,
      outputSchema: params.outputSchema,
      riskLevel: params.riskLevel,
      requiresApproval: params.requiresApproval,
      status: 'active',
      createdAt: now,
    });

    const tool = await this.db.findById(record.id);
    if (!tool) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Tool '${params.name}' disappeared after creation.`, status: 500 });
    }

    return tool;
  }

  async resolveToolBeltAction(ctx: IContext<ResolveToolBeltParams>): Promise<
    Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>
  > {
    const { toolNames } = ResolveToolBeltParamsSchema.parse(ctx.params);
    const toolBelt: Array<{
      type: 'function';
      function: { name: string; description: string; parameters: Record<string, unknown> };
    }> = [];

    for (const toolName of toolNames) {
      const results = await this.db.find({ name: toolName });
      if (results.length === 0) continue;

      const tool = results[0];
      if (tool.status !== 'active') continue;

      let parameters: Record<string, unknown> = { type: 'object', properties: {}, required: [] };

      if (tool.dynamic && tool.inputSchemaJSON) {
        try {
          parameters = JSON.parse(tool.inputSchemaJSON);
        } catch (err) {
          this.logger.error(`[sys.tools] Failed to parse dynamic schema for ${tool.name}: ${(err as Error).message}`);
          continue;
        }
      } else {
        const params = tool.parameters || [];
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const param of params) {
          properties[param.name] = { type: param.type, description: param.description };
          if (param.required) required.push(param.name);
        }
        parameters = { type: 'object', properties, required };
      }

      toolBelt.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters,
        },
      });
    }

    return toolBelt;
  }

  async invokeTool(ctx: IContext<InvokeToolParams>): Promise<{
    success: boolean;
    result: unknown;
    toolName: string;
    latencyMs: number;
    pendingApproval?: boolean;
    approvalId?: string;
  }> {
    const { toolName, arguments: args, projectId, personaId, id } = InvokeToolParamsSchema.parse(ctx.params);
    const startMs = Date.now();

    const results = await this.db.find({ name: toolName });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Tool '${toolName}' not found.`, status: 404 });
    }

    const tool = results[0];
    if (tool.status !== 'active') {
      throw new MeshError({ code: 'FORBIDDEN', message: `Tool '${toolName}' is ${tool.status}.`, status: 403 });
    }

    if (tool.riskLevel === 'dangerous') {
      const compliance = await ctx.call<VerifyComplianceResult>('sys.governance.verifyCompliance', {
        toolName,
        arguments: args,
        domain: 'sys.tools',
        personaId,
        projectId,
        directiveId: id,
      }, { timeout: 30000 });

      if (!compliance.compliant) {
        throw new MeshError({
          code: 'GOVERNANCE_VIOLATION',
          message: `Tool '${toolName}' blocked by governance: ${compliance.rationale}`,
          status: 403,
        });
      }
    }

    // ── HITL Gate ─────────────────────────────────────────────
    if (tool.requiresApproval) {
      const approvalId = crypto.randomUUID();

      this.pendingApprovals.set(approvalId, {
        approvalId,
        toolName,
        handler: tool.handler,
        arguments: args,
        projectId,
        id,
        personaId,
        createdAt: Date.now(),
      });

      this.logger.warn(`[sys.tools] HITL: Tool '${toolName}' requires approval. ID: ${approvalId.slice(0, 8)}`);

      // Emit approval_requested event over the mesh for UI consumption
      ctx.emit('sys.tools.approval_requested', {
        approvalId,
        toolName,
        arguments: args,
        projectId,
        id,
        personaId,
        riskLevel: tool.riskLevel,
        description: tool.description,
      });

      // Pause the directive if one is associated
      if (id) {
        try {
          await ctx.call('sys.directives.updateContext', {
            id,
            contextMutation: { _pendingApproval: approvalId, _pendingToolName: toolName },
            status: 'paused',
          }, { timeout: 15000 });
        } catch {
          this.logger.warn(`[sys.tools] Could not pause directive ${id}`);
        }
      }

      return {
        success: false,
        result: { message: `Tool '${toolName}' requires operator approval. Approval ID: ${approvalId}` },
        toolName,
        latencyMs: Date.now() - startMs,
        pendingApproval: true,
        approvalId,
      };
    }

    // ── Direct Execution ──────────────────────────────────────
    return this.executeToolHandler(ctx, tool, args, projectId, toolName, personaId, startMs);
  }

  /**
   * HITL: Resolve a pending tool approval.
   */
  async resolveApproval(ctx: IContext<ResolveApprovalParams>): Promise<{
    success: boolean;
    result: unknown;
    toolName: string;
  }> {
    const { approvalId, id, toolName, approved } = ResolveApprovalParamsSchema.parse(ctx.params);

    const pending = this.pendingApprovals.get(approvalId);
    if (!pending) {
      throw new MeshError({
        code: 'NOT_FOUND',
        message: `Pending approval '${approvalId}' not found or already resolved.`,
        status: 404,
      });
    }

    this.pendingApprovals.delete(approvalId);

    if (approved) {
      this.logger.info(`[sys.tools] HITL: Approved '${toolName}' (${approvalId.slice(0, 8)})`);

      // Execute the tool
      const tool = (await this.db.find({ name: pending.toolName }))?.[0];
      if (!tool) {
        throw new MeshError({ code: 'NOT_FOUND', message: `Tool '${pending.toolName}' no longer exists.`, status: 404 });
      }

      let result: unknown;
      let success = true;
      try {
        result = await ctx.call(tool.handler, { ...pending.arguments, projectId: pending.projectId }, { timeout: 30000 });
      } catch (err: unknown) {
        success = false;
        result = { error: (err as Error).message };
      }

      // Resume the directive
      if (id) {
        try {
          await ctx.call('sys.directives.updateContext', {
            id,
            contextMutation: { _pendingApproval: null, _lastToolResult: result },
            status: 'running',
          }, { timeout: 15000 });
          await ctx.call('sys.directives.resume', { id }, { timeout: 15000 });
        } catch {
          this.logger.warn(`[sys.tools] Could not resume directive ${id}`);
        }
      }

      ctx.emit('sys.tools.approval_resolved', { approvalId, toolName, approved: true, id });
      return { success, result, toolName };
    } else {
      this.logger.warn(`[sys.tools] HITL: Rejected '${toolName}' (${approvalId.slice(0, 8)})`);

      // Resume the directive with rejection context
      if (id) {
        try {
          await ctx.call('sys.directives.updateContext', {
            id,
            contextMutation: {
              _pendingApproval: null,
              _lastToolResult: { verdict: 'REJECTED', message: `Operator rejected tool '${toolName}'.` },
            },
            status: 'running',
          }, { timeout: 15000 });
          await ctx.call('sys.directives.resume', { id }, { timeout: 15000 });
        } catch {
          this.logger.warn(`[sys.tools] Could not resume directive ${id}`);
        }
      }

      ctx.emit('sys.tools.approval_resolved', { approvalId, toolName, approved: false, id });
      return { success: false, result: { verdict: 'REJECTED', message: `Operator rejected tool '${toolName}'.` }, toolName };
    }
  }

  /**
   * List all pending approvals (for the UI to poll/display).
   */
  async listPendingApprovals(): Promise<PendingApproval[]> {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Execute a tool handler with audit logging.
   */
  private async executeToolHandler(
    ctx: IContext<Record<string, unknown>>,
    tool: Tool,
    args: Record<string, unknown>,
    projectId: string,
    toolName: string,
    personaId: string | undefined,
    startMs: number,
  ): Promise<{ success: boolean; result: unknown; toolName: string; latencyMs: number }> {
    let result: unknown;
    let success = true;

    try {
      result = await ctx.call(tool.handler, { ...args, projectId }, { timeout: 30000 });
    } catch (err: unknown) {
      success = false;
      result = { error: (err as Error).message };
    }

    const latencyMs = Date.now() - startMs;

    try {
      await ctx.call('sys.audit.log', {
        actor: { nodeID: ctx.nodeID, personaID: personaId },
        action: `invoke.${toolName}`,
        domain: 'sys.tools',
        changeType: 'EXECUTE',
        payload: { toolName, arguments: args },
        status: success ? 'SUCCESS' : 'FAILURE',
      }, { timeout: 5000 });
    } catch {
      // Non-critical: failure to log audit does not block tool invocation
    }

    return { success, result, toolName, latencyMs };
  }

  async disableTool(ctx: IContext<DisableToolParams>): Promise<Tool> {
    const { name } = DisableToolParamsSchema.parse(ctx.params);
    const results = await this.db.find({ name });
    if (results.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Tool '${name}' not found.`, status: 404 });
    }

    await this.db.updateMany({ name }, { status: 'disabled' });
    const updated = await this.db.find({ name });
    return updated[0];
  }
}

export default ToolsService;
