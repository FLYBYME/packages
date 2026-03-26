// FILE: src/domains/sys.forge/forge.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import { z } from 'zod';
import ivm from 'isolated-vm';
import { 
  ForgeToolSchema, 
  ForgeTool, 
  ForgeStatus,
  ForgeStatusEnum,
  ProposeToolParamsSchema, 
  ProposeToolParams,
  ApproveToolParamsSchema, 
  ApproveToolParams,
  ExecuteForgedToolParamsSchema,
  ExecuteForgedToolParams,
  ExecuteForgedToolResultSchema,
  ExecuteForgedToolResult,
} from './forge.schema';
import './forge.contract';

const ForgeTable = defineTable('forge_tools', ForgeToolSchema);

export class ForgeService extends DatabaseMixin(ForgeTable)(class { }) {
  public readonly name = 'sys.forge';
  declare logger: ILogger;

  public actions = {
    propose: {
      params: ProposeToolParamsSchema,
      handler: this.proposeTool.bind(this),
    },
    list: {
      params: z.object({ status: ForgeStatusEnum.optional() }),
      handler: this.listTools.bind(this),
    },
    approve: {
      params: ApproveToolParamsSchema,
      handler: this.approveTool.bind(this),
    },
    execute: {
      params: ExecuteForgedToolParamsSchema,
      returns: ExecuteForgedToolResultSchema,
      handler: this.executeTool.bind(this),
      timeout: 5000,
    }
  };

  constructor(_logger: ILogger) {
    super();
  }

  async proposeTool(ctx: IContext<ProposeToolParams>): Promise<ForgeTool> {
    const params = ProposeToolParamsSchema.parse(ctx.params);
    const now = Date.now();

    const tool = await this.db.create({
      ...params,
      status: 'pending_approval',
      createdAt: now,
      updatedAt: now,
    });

    this.logger.info(`[sys.forge] New tool proposed: ${params.name} (${tool.id})`);
    ctx.emit('sys.forge.tool_proposed', { id: tool.id, name: params.name });

    return tool;
  }

  async listTools(ctx: IContext<{ status?: ForgeStatus }>): Promise<ForgeTool[]> {
    const { status } = ctx.params;
    return this.db.find(status ? { status } : {});
  }

  async approveTool(ctx: IContext<ApproveToolParams>): Promise<ForgeTool> {
    const { id, status } = ApproveToolParamsSchema.parse(ctx.params);
    const now = Date.now();

    const result = await this.db.update(id, { status, updatedAt: now });
    if (result.changes === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Tool ${id} not found.`, status: 404 });
    }

    const tool = await this.db.findById(id);
    if (!tool) throw new Error('Failed to retrieve updated tool.');

    if (status === 'active') {
      this.logger.info(`[sys.forge] Tool activated: ${tool.name}`);
      ctx.emit('sys.forge.tool_activated', { id: tool.id, name: tool.name });
      
      // Notify sys.tools to register it
      try {
        await ctx.call('sys.tools.register_dynamic', {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          handler: 'sys.forge.execute',
          metadata: { forgeId: tool.id }
        });
      } catch (err) {
        if (err instanceof Error) {
          this.logger.error(`[sys.forge] Failed to register active tool in sys.tools: ${err.message}`);
        }
      }
    }

    return tool;
  }

  async executeTool(ctx: IContext<ExecuteForgedToolParams>): Promise<ExecuteForgedToolResult> {
    const { toolName, arguments: args } = ExecuteForgedToolParamsSchema.parse(ctx.params);

    const tools = await this.db.find({ name: toolName, status: 'active' });
    if (tools.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Active forged tool '${toolName}' not found.`, status: 404 });
    }

    const tool = tools[0];
    return this.runInSandbox(tool.code, args);
  }

  private async runInSandbox(code: string, args: ExecuteForgedToolParams['arguments']): Promise<ExecuteForgedToolResult> {
    const isolate = new ivm.Isolate({ memoryLimit: 8 }); // 8MB limit
    const context = await isolate.createContext();
    const jail = context.global;

    try {
      // Inject arguments as a JSON string to keep it simple and safe
      await jail.set('args', new ivm.ExternalCopy(args).copyInto());

      // Wrap code in a self-invoking function that takes 'args'
      const script = await isolate.compileScript(`
        (function() {
          const fn = ${code};
          return fn(args);
        })()
      `);

      const result = await script.run(context, { timeout: 1000 }); // 1000ms limit
      
      return { success: true, result };
    } catch (err) {
      this.logger.error(`[sys.forge] Sandbox execution failed for code: ${code.slice(0, 50)}... Error: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    } finally {
      isolate.dispose();
    }
  }
}

export default ForgeService;
