import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { StepDirectiveParamsSchema, TransitionEntry } from '../directives.schema';
import { z } from 'zod';
import type { DirectivesService } from '../directives.service';
import { Artifact } from '../../sys.artifacts/artifacts.schema';
import { CognitionResult } from '../../sys.dispatcher/dispatcher.schema';

type StepParams = z.infer<typeof StepDirectiveParamsSchema>;

export const step = {
  params: StepDirectiveParamsSchema,
  async handler(this: DirectivesService, ctx: IContext<StepParams>) {
    const { id } = StepDirectiveParamsSchema.parse(ctx.params);
    const directive = await this.findDirective(id);

    const terminalStates = ['completed', 'failed', 'cancelled'];
    if (terminalStates.includes(directive.status)) {
      throw new MeshError({
        code: 'INVALID_STATE',
        message: `Directive in terminal state '${directive.status}'.`,
        status: 409,
      });
    }

    // Fetch protocol manifest
    const artifacts = await ctx.call<Artifact[]>('sys.artifacts.find', { id: directive.artifactId });
    const artifact = artifacts?.[0];
    if (!artifact || !artifact.manifest) {
      await this.db.updateMany({ id }, { status: 'failed' });
      throw new MeshError({ code: 'NOT_FOUND', message: `Protocol '${directive.artifactId}' missing or invalid.`, status: 404 });
    }

    const manifest = artifact.manifest;
    const currentNodeID = directive.currentNode || manifest.initialNodeId;
    const currentNodeDef = manifest.nodes.find((n) => n.nodeId === currentNodeID);

    if (!currentNodeDef) {
      await this.db.updateMany({ id }, { status: 'failed' });
      throw new MeshError({ code: 'INVALID_STATE', message: `Node '${currentNodeID}' not in manifest.`, status: 500 });
    }

    // Circuit breakers — history is already a native array
    const history = directive.history;

    if (history.length >= manifest.circuitBreakers.maxTransitions) {
      await this.db.updateMany({ id }, { status: 'failed' });
      throw new MeshError({ code: 'CIRCUIT_BREAKER', message: `Exceeded maxTransitions (${manifest.circuitBreakers.maxTransitions}).`, status: 429 });
    }

    if (Date.now() - directive.createdAt >= manifest.circuitBreakers.globalTimeoutMs) {
      await this.db.updateMany({ id }, { status: 'failed' });
      throw new MeshError({ code: 'CIRCUIT_BREAKER', message: `Exceeded globalTimeoutMs (${manifest.circuitBreakers.globalTimeoutMs}ms).`, status: 429 });
    }

    // stateContext is already a native object
    const stateContext = directive.stateContext;

    // Terminal node
    if (currentNodeDef.type === 'terminal') {
      const finalStatus = currentNodeDef.resolution === 'SUCCESS' ? 'completed' : 'failed';
      await this.db.updateMany({ id }, { status: finalStatus, lastStepAt: Date.now() });
      ctx.emit('sys.directives.completed', { id, resolution: currentNodeDef.resolution });
      return { id, currentNode: currentNodeID, status: finalStatus, nextAction: null, payload: stateContext };
    }

    // Execute node logic
    let transitionTrigger: string | null = null;
    const traceId = crypto.randomUUID();
    const attempt = history.filter(h => h.fromNode === currentNodeID).length + 1;

    if (currentNodeDef.type === 'persona') {
      this.logger.info(`[sys.directives] Invoking Persona: ${currentNodeDef.personaId} for ${id.slice(0, 8)}`);
      try {
        const cogRes = await ctx.call<CognitionResult>(
          'sys.dispatcher.dispatch_cognition',
          { 
            personaId: currentNodeDef.personaId, 
            objective: currentNodeDef.nodeObjective || stateContext['objective'] || 'Progress the task.', 
            stateContext, 
            id,
            nodeId: currentNodeID,
            traceId,
            attempt
          }
        );
        if (cogRes?.updatedContext) {
          await this.db.updateMany({ id }, { stateContext: cogRes.updatedContext });
        }
        transitionTrigger = cogRes?.verdict ?? 'DONE';
      } catch (err: unknown) {
        this.logger.error(`[sys.directives] Persona execution failed: ${(err as Error).message}`);
        transitionTrigger = 'ERROR';
      }
    } else if (currentNodeDef.type === 'gate') {
      if (currentNodeDef.evaluatorType === 'human_review') {
        const verdict = stateContext['_human_verdict'];
        if (verdict) {
          transitionTrigger = verdict;
          // Consume the verdict
          const remainingContext = { ...stateContext };
          delete remainingContext['_human_verdict'];
          delete remainingContext['_human_feedback'];
          await this.db.updateMany({ id }, { stateContext: remainingContext });
          this.logger.info(`[sys.directives] Gate '${currentNodeID}': Human resolved → ${transitionTrigger}`);
        } else {
          // Pause and request approval
          await this.db.updateMany({ id }, { status: 'paused', lastStepAt: Date.now() });
          ctx.emit('sys.directives.approval_requested', {
            id,
            nodeId: currentNodeID,
            objective: currentNodeDef.nodeObjective || 'Operator approval required to proceed.',
            stateContext,
          });
          this.logger.info(`[sys.directives] Gate '${currentNodeID}': Pausing for human review.`);
          return { id, currentNode: currentNodeID, status: 'paused', nextAction: null, payload: stateContext };
        }
      } else {
        const contextValue = stateContext[currentNodeDef.contextPath!];
        transitionTrigger = contextValue ? 'TRUE' : 'FALSE';
        this.logger.info(`[sys.directives] Gate '${currentNodeID}': ${currentNodeDef.contextPath} = ${String(contextValue)} → ${transitionTrigger}`);
      }
    }

    // Resolve next node
    let nextNodeID: string | null = null;
    if (transitionTrigger) {
      const edge = manifest.edges.find((e) => e.fromNode === currentNodeID && e.trigger === transitionTrigger)
        ?? manifest.edges.find((e) => e.fromNode === currentNodeID && e.trigger === '*')
        ?? manifest.edges.find((e) => e.fromNode === currentNodeID);
      nextNodeID = edge?.toNode ?? null;
    }

    const now = Date.now();
    const updatedHistory: TransitionEntry[] = [
      ...history,
      {
        fromNode: currentNodeID,
        toNode: nextNodeID ?? 'TERMINAL',
        trigger: transitionTrigger ?? 'NONE',
        timestamp: now,
        actorID: directive.assignedPersona,
        output: {},
      },
    ];

    const newStatus = nextNodeID ? 'running' : 'completed';
    await this.db.updateMany(
      { id },
      { status: newStatus, currentNode: nextNodeID ?? currentNodeID, lastStepAt: now, history: updatedHistory }
    );

    ctx.emit('sys.directives.step_completed', { id, fromNode: currentNodeID, toNode: nextNodeID ?? currentNodeID, trigger: transitionTrigger, timestamp: now });

    return { id, currentNode: nextNodeID ?? currentNodeID, status: newStatus, nextAction: nextNodeID ? `step:${nextNodeID}` : null, payload: stateContext };
  },
};
