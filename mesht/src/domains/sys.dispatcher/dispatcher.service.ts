// FILE: src/domains/sys.dispatcher/dispatcher.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  CognitionLogSchema,
  CognitionLog,
  CognitionResult,
  ChatMessage,
  DispatchCognitionParamsSchema,
  DispatchCognitionParams,
  GetCognitionHistoryParamsSchema,
  GetCognitionHistoryParams,
  FinalVerdictSchema,
  TokenUsage,
  ToolTraceEntry,
  DispatcherCognitionProgressStageSchema,
} from './dispatcher.schema';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { JSONObject, JSONValue } from '../../shared/json.schema';
import { z } from 'zod';

import './dispatcher.contract';
import { Blueprint } from '../sys.personas/personas.schema';
import { Directive } from '../sys.directives/directives.schema';
import { Project } from '../sys.projects/projects.schema';
import { ConstitutionalRule, DispatchPolicy } from '../sys.governance/governance.schema';
import { GitflowSession } from '../sys.gitflow/gitflow.schema';
import { InvokeToolResult } from '../sys.tools/tools.schema';

const CognitionLogTable = defineTable('cognition_logs', CognitionLogSchema);
type DispatcherCognitionProgressStage = z.infer<typeof DispatcherCognitionProgressStageSchema>;

/**
 * DispatcherService — The LLM Cognition Bridge.
 *
 * Orchestrates the full reasoning loop:
 * 1. Resolve persona blueprint via sys.personas.getBlueprint
 * 2. Build the LLM message array (system prompt + context + objective)
 * 3. Call the LLM provider API (OpenAI / Anthropic / Ollama compatible)
 * 4. Execute tool calls in a loop up to maxToolRounds
 * 5. Extract the verdict for FSM edge resolution
 * 6. Log the cognition to audit trail
 *
 * @see spec §6.2 — "Cognition Loop"
 */
export class DispatcherService extends DatabaseMixin(CognitionLogTable)(class { }) {
  public readonly name = 'sys.dispatcher';
  declare logger: ILogger;

  public actions = {
    dispatch_cognition: {
      params: DispatchCognitionParamsSchema,
      handler: this.dispatchCognition.bind(this),
      timeout: 180000 // 3 minutes
    },
    cognition_history: {
      params: GetCognitionHistoryParamsSchema,
      handler: this.getCognitionHistory.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }

  private parseJSON<T>(value: string | T | null | undefined, fallback: T): T {
    if (typeof value === 'string') {
      try { return JSON.parse(value) as T; } catch { return fallback; }
    }
    return value ?? fallback;
  }

  /**
   * Core cognition loop.
   */
  async dispatchCognition(ctx: IContext<DispatchCognitionParams>): Promise<CognitionResult> {
    const params = DispatchCognitionParamsSchema.parse(ctx.params);
    const startMs = Date.now();
    const id = params.id || 'anonymous';

    // 0. Emit start event
    ctx.emit('sys.dispatcher.cognition_started', {
      id,
      personaId: params.personaId,
      objective: params.objective,
      timestamp: startMs
    });

    // 1. Resolve persona blueprint
    let blueprint: Blueprint;

    try {
      blueprint = await ctx.call<Blueprint>('sys.personas.getBlueprint', { alias: params.personaId }, { timeout: 15000 });
    } catch (err: unknown) {
      throw new MeshError({
        code: 'PERSONA_NOT_FOUND',
        message: `Failed to resolve persona '${params.personaId}': ${(err as Error).message}`,
        status: 404,
      });
    }

    const persona = blueprint.persona;
    const deployment = blueprint.llmDeployment;
    const toolBelt = blueprint.toolBelt;

    const systemPrompt = persona.systemPrompt || '';
    const maxToolRounds = params.maxToolRoundsOverride ?? persona.maxToolRounds ?? 10;
    const temperature = persona.temperature ?? 0.7;

    // 1.1 Resolve Project Info & Gitflow Session
    let projectInfo = 'No project selected.';
    let projectId = 'global';
    let targetDirectory = '';

    if (id && id !== 'anonymous') {
      try {
        const directive = await ctx.call<Directive>('sys.directives.get', { id });

        if (directive && !['completed', 'failed', 'cancelled'].includes(directive.status)) {
          try {
            // Ensure workspace is provisioned and ready before LLM begins thinking
            const session = await ctx.call<GitflowSession>('sys.gitflow.provision_workspace', { directiveId: id });
            targetDirectory = session.workspacePath;
          } catch (err) {
            // If it already exists, this is fine. If it fails, log it.
            this.logger.warn(`[sys.dispatcher] Workspace check: ${(err as Error).message}`);
          }
        }

        // Use .catch to handle NOT_FOUND silently if it happens (though provision_workspace should have handled it)
        const session = await ctx.call<GitflowSession>('sys.gitflow.get_session_details', { directiveId: id }).catch(() => null);

        if (directive?.projectId) {
          projectId = directive.projectId;
          const project = await ctx.call<Project>('sys.projects.get', { id: directive.projectId });
          if (project) {
            targetDirectory = targetDirectory || session?.workspacePath || project.rootPath;
            projectInfo = [
              `Project ID: ${project.id}`,
              `Name: ${project.name}`,
              `Isolated Workspace: ${targetDirectory}`,
              project.description ? `Description: ${project.description}` : '',
            ].filter(Boolean).join('\n');
          }
        }
      } catch (err) {
        this.logger.error('Failed to resolve project info', err);
      }
    }

    const gitflowGuardrail = [
      '',
      'SYSTEM OVERRIDE: You are operating in an isolated, system-managed workspace for this specific directive. All file operations are safely contained.',
      'Do NOT attempt to use Git, manage branches, or create commits. Focus entirely on modifying the source code to achieve the objective.',
    ].join('\n');

    const constitution = await ctx.call<ConstitutionalRule[]>('sys.governance.getActiveConstitution', {}, { timeout: 10000 })
      .catch(() => []);
    const hardRules = constitution
      .filter((rule) => rule.severity === 'HARD')
      .map((rule) => `- ${rule.ruleId}: ${rule.text}`);
    const dispatchPolicy: DispatchPolicy = await ctx.call<DispatchPolicy>('sys.governance.getDispatchPolicy', {}, { timeout: 10000 }).catch(() => ({ circuitBreakerActive: false }));

    // 2. Build initial message array
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          systemPrompt,
          gitflowGuardrail,
          '',
          '--- CONSTITUTIONAL HARD RULES ---',
          hardRules.length > 0 ? hardRules.join('\n') : 'No ratified HARD rules.',
          '',
          '--- PROJECT CONTEXT ---',
          projectInfo,
          '',
          '--- DIRECTIVE CONTEXT ---',
          JSON.stringify(params.stateContext, null, 2),
        ].join('\n'),
      },
      {
        role: 'user',
        content: params.objective,
      },
    ];

    // 3. Resolve provider configuration
    const baseURL = deployment.baseURL || process.env.MESHT_LLM_BASE_URL || 'https://api.openai.com/v1';
    const modelName = dispatchPolicy.circuitBreakerActive
      ? (dispatchPolicy.modelOverride || deployment.modelName || 'gpt-4o-mini')
      : (dispatchPolicy.modelOverride || deployment.modelName || 'gpt-4o');
    const apiKey = deployment.apiKey || process.env.MESHT_LLM_API_KEY || '';

    const openai = new OpenAI({ baseURL, apiKey, timeout: 60000 });

    // 4. Execute Phase 1: Tool Cognition Loop
    let toolCallsMade = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const toolTrace: ToolTraceEntry[] = [];

    this.emitCognitionProgress(ctx, params, {
      stage: 'started',
      detail: 'Built prompt context and queued tool belt.',
      messages,
      toolTrace,
      toolCallsMade,
      projectId,
      modelName,
    });

    for (let round = 0; round < maxToolRounds; round++) {
      let llmResponse: OpenAI.Chat.Completions.ChatCompletion;
      try {
        llmResponse = await openai.chat.completions.create({
          model: modelName,
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature,
          tools: toolBelt.length > 0 ? toolBelt.map(t => ({
            type: 'function',
            function: {
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters,
            }
          })) : undefined,
        });
      } catch (err: unknown) {
        await this.logCognition(ctx, params, startMs, {
          verdict: 'ERROR',
          response: '',
          toolCallsMade,
          status: (err as Error).message.includes('timeout') ? 'timeout' : 'error',
          errorMessage: (err as Error).message,
          messageTrace: JSON.stringify(messages),
          toolTrace: JSON.stringify(toolTrace),
        });

        throw new MeshError({
          code: 'LLM_ERROR',
          message: `LLM Phase 1 call failed: ${(err as Error).message}`,
          status: 502,
        });
      }

      const choice = llmResponse.choices[0];
      const message = choice.message;
      const content = message.content || '';
      const toolCalls = message.tool_calls || [];

      const usage = llmResponse.usage;
      if (usage) {
        totalPromptTokens += usage.prompt_tokens;
        totalCompletionTokens += usage.completion_tokens;
      }

      // No tool calls — Phase 1 complete
      if (toolCalls.length === 0) {
        messages.push({
          role: 'assistant',
          content,
        });
        break;
      }

      messages.push({
        role: 'assistant',
        content,
        tool_calls: toolCalls
          .filter(tc => tc.type === 'function')
          .map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;

        toolCallsMade++;
        let toolResult: string;
        let rawResult: JSONValue;

        try {
          const args = JSON.parse(toolCall.function.name === 'dummy' ? '{}' : toolCall.function.arguments) as JSONObject;
          const invokeResult = await ctx.call<InvokeToolResult>('sys.tools.invoke', {
            toolName: toolCall.function.name,
            arguments: args,
            projectId,
            id: params.id,
            personaId: params.personaId,
          }, { timeout: 30000 });

          rawResult = invokeResult.result;
          ctx.emit('sys.dispatcher.tool_called', {
            id,
            toolName: toolCall.function.name,
            arguments: args,
            result: rawResult,
            timestamp: Date.now()
          });

          toolResult = JSON.stringify(rawResult);
          toolTrace.push({ tool: toolCall.function.name, args, result: rawResult, status: 'success' });
        } catch (err: unknown) {
          toolResult = JSON.stringify({ error: (err as Error).message });
          toolTrace.push({ tool: toolCall.function.name, args: toolCall.function.arguments, error: (err as Error).message, status: 'error' });
        }

        messages.push({
          role: 'tool',
          content: toolResult,
          name: toolCall.function.name,
          tool_call_id: toolCall.id,
        });
        this.emitCognitionProgress(ctx, params, {
          stage: 'tool_result',
          detail: `Tool ${toolCall.function.name} completed (${toolTrace.length} total).`,
          messages,
          toolTrace,
          toolCallsMade,
          projectId,
          modelName,
        });
      }
    }

    // 4.1 Commit Checkpoint (System Level)
    if (id !== 'anonymous' && toolCallsMade > 0) {
      await ctx.call('sys.gitflow.commit_checkpoint', {
        directiveId: id,
        nodeName: params.nodeId || 'unknown',
      }).catch((err) => this.logger.warn(`[sys.dispatcher] Checkpoint failed: ${err.message}`));
    }

    // 5. Execute Phase 2: Structured Wrap-up
    const wrapUpMessage = 'You have completed your tool executions. Summarize your actions and provide the final verdict required by the FSM using the strict JSON schema provided.';
    messages.push({
      role: 'system',
      content: wrapUpMessage,
    });

    let verdict: string;
    let finalResponse: string;

    try {
      // Map ChatCompletionMessageParam to ResponseInputItem
      const responseInput: OpenAI.Responses.ResponseInput = [];
      for (const msg of messages) {
        if (msg.role === 'tool') {
          if (!msg.tool_call_id) {
            continue;
          }
          responseInput.push({
            type: 'function_call_output',
            call_id: msg.tool_call_id,
            output: msg.content ?? '',
          });
          continue;
        }

        if (msg.role === 'assistant' && msg.tool_calls) {
          responseInput.push({
            role: 'assistant',
            content: msg.content || '',
          });
          continue;
        }

        responseInput.push({
          role: msg.role,
          content: msg.content ?? '',
        });
      }

      const parseResponse = await openai.responses.parse({
        model: modelName,
        input: responseInput,
        temperature: 0,
        text: {
          // OpenAI's helper type and the repo's Zod types do not unify cleanly under ts-node here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          format: zodTextFormat(FinalVerdictSchema as any, 'final_verdict'),
        },
      });

      const usage = parseResponse.usage;
      if (usage) {
        totalPromptTokens += usage.input_tokens;
        totalCompletionTokens += usage.output_tokens;
      }

      const structured = parseResponse.output_parsed;
      if (!structured) {
        throw new Error('LLM failed to provide structured output.');
      }

      verdict = structured.verdict;
      finalResponse = structured.response;
    } catch (err: unknown) {
      this.logger.error(`[sys.dispatcher] Phase 2 parsing failed: ${(err as Error).message}`);
      verdict = 'ERROR';
      finalResponse = `Structured parsing failed: ${(err as Error).message}`;
    }

    // 5.1 Attempt Merge if DONE
    if (id !== 'anonymous' && verdict === 'DONE') {
      try {
        const mergeResult = await ctx.call<GitflowSession>('sys.gitflow.attempt_merge', { directiveId: id });
        if (mergeResult.status === 'conflict') {
          verdict = 'ERROR';
          finalResponse += '\n\n[SYSTEM] Merge conflict detected. Human intervention required.';
          await ctx.call('sys.directives.updateContext', {
            id,
            contextMutation: {},
            status: 'blocked_merge_conflict',
          });
        }
      } catch (err) {
        this.logger.error(`[sys.dispatcher] Merge attempt failed for ${id}: ${(err as Error).message}`);
      }
    }

    // 6. Build context mutations
    const updatedContext: JSONObject = {
      ...params.stateContext,
      _lastResponse: finalResponse,
      _lastVerdict: verdict,
      _toolCallsMade: toolCallsMade,
    };

    // 7. Log the cognition
    this.emitCognitionProgress(ctx, params, {
      stage: 'verdict',
      detail: `Final verdict resolved: ${verdict}`,
      messages,
      toolTrace,
      toolCallsMade,
      projectId,
      modelName,
    });

    await this.logCognition(ctx, params, startMs, {
      verdict,
      response: finalResponse,
      toolCallsMade,
      status: 'success',
      messageTrace: JSON.stringify(messages),
      toolTrace: JSON.stringify(toolTrace),
    });

    const tokenUsage: TokenUsage = {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    };

    const result: CognitionResult = {
      verdict,
      response: finalResponse,
      updatedContext,
      toolCallsMade,
      tokenUsage,
    };

    // 8. Emit finished event
    ctx.emit('sys.dispatcher.cognition_finished', {
      id,
      personaId: params.personaId,
      projectId,
      modelName,
      verdict,
      response: finalResponse,
      tokenUsage: result.tokenUsage,
      latencyMs: Date.now() - startMs,
      timestamp: Date.now()
    });

    this.logger.info(
      `[sys.dispatcher] Cognition complete: persona=${params.personaId} verdict=${verdict} ` +
      `tools=${toolCallsMade} tokens=${totalPromptTokens + totalCompletionTokens} ` +
      `latency=${Date.now() - startMs}ms`
    );

    return result;
  }

  /**
   * Persist a cognition log entry.
   */
  private async logCognition(
    _ctx: IContext<Record<string, unknown>>,
    params: DispatchCognitionParams,
    startMs: number,
    result: {
      verdict: string;
      response: string;
      toolCallsMade: number;
      status: 'success' | 'error' | 'timeout';
      errorMessage?: string;
      messageTrace?: string;
      toolTrace?: string;
    },
  ): Promise<void> {
    const now = Date.now();
    const latencyMs = now - startMs;

    await this.db.create({
      directiveID: params.id,
      personaId: params.personaId,
      nodeId: params.nodeId,
      objective: params.objective,
      verdict: result.verdict,
      response: result.response,
      toolCallsMade: result.toolCallsMade,
      messageTrace: result.messageTrace,
      toolTrace: result.toolTrace,
      latencyMs,
      status: result.status,
      errorMessage: result.errorMessage,
      createdAt: now,
    });

    try {
      await _ctx.call('sys.audit.log', {
        traceId: params.traceId,
        attempt: params.attempt,
        directiveId: params.id,
        actor: {
          nodeID: _ctx.nodeID,
          personaID: params.personaId,
        },
        action: 'sys.dispatcher.dispatch_cognition',
        domain: 'dispatcher',
        changeType: 'COGNITION_TRACE',
        payload: {
          objective: params.objective,
          nodeId: params.nodeId,
          verdict: result.verdict,
          response: result.response,
          messageTrace: result.messageTrace ? JSON.parse(result.messageTrace) : [],
          toolTrace: result.toolTrace ? JSON.parse(result.toolTrace) : [],
        },
        status: result.status === 'success' ? 'SUCCESS' : 'FAILURE',
        latencyMs,
      });
    } catch (err) {
      this.logger.warn(`[sys.dispatcher] Failed to log COGNITION_TRACE to sys.audit: ${(err as Error).message}`);
    }
  }

  private emitCognitionProgress(
    ctx: IContext<DispatchCognitionParams>,
    params: DispatchCognitionParams,
    payload: {
      stage: DispatcherCognitionProgressStage;
      detail: string;
      messages?: ChatMessage[];
      toolTrace?: ToolTraceEntry[];
      toolCallsMade?: number;
      projectId?: string;
      modelName?: string;
    },
  ): void {
    ctx.emit('sys.dispatcher.cognition_progress', {
      id: params.id,
      directiveId: params.id,
      personaId: params.personaId,
      projectId: payload.projectId,
      modelName: payload.modelName,
      stage: payload.stage,
      detail: payload.detail,
      timestamp: Date.now(),
      messages: payload.messages?.map((msg) => this.serializeChatMessage(msg)),
      toolTrace: payload.toolTrace ? payload.toolTrace.map((entry) => ({ ...entry })) : undefined,
      toolCallsMade: payload.toolCallsMade,
    });
    void this.logCognitionProgress(ctx, params, payload);
  }

  private serializeChatMessage(msg: ChatMessage): ChatMessage {
    return {
      role: msg.role,
      content: msg.content ?? null,
      name: msg.name,
      tool_call_id: msg.tool_call_id,
      tool_calls: msg.tool_calls,
    };
  }

  private async logCognitionProgress(
    ctx: IContext<DispatchCognitionParams>,
    params: DispatchCognitionParams,
    payload: {
      stage: DispatcherCognitionProgressStage;
      detail: string;
      messages?: ChatMessage[];
      toolTrace?: ToolTraceEntry[];
      toolCallsMade?: number;
    },
  ): Promise<void> {
    try {
      await ctx.call('sys.audit.log', {
        traceId: params.traceId,
        attempt: params.attempt,
        directiveId: params.id,
        actor: {
          nodeID: ctx.nodeID,
          personaID: params.personaId,
        },
        action: 'sys.dispatcher.cognition_progress',
        domain: 'dispatcher',
        changeType: 'COGNITION_PROGRESS',
        payload: {
          stage: payload.stage,
          detail: payload.detail,
          messages: payload.messages?.length ?? 0,
          toolCalls: payload.toolCallsMade ?? 0,
          toolErrors: payload.toolTrace?.filter(entry => entry.status === 'error').length ?? 0,
        },
        status: 'SUCCESS',
        latencyMs: 0,
      });
    } catch (err) {
      this.logger.warn(`[sys.dispatcher] Failed to log cognition progress: ${(err as Error).message}`);
    }
  }
  /**
   * Retrieve cognition history for a directive.
   */
  async getCognitionHistory(ctx: IContext<GetCognitionHistoryParams>): Promise<CognitionLog[]> {
    const { id, limit } = GetCognitionHistoryParamsSchema.parse(ctx.params);
    return await this.db.find({ directiveID: id }, { limit });
  }
}

export default DispatcherService;
