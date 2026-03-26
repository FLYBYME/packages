import { IContext, ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import {
  SubmitDirectiveParamsSchema,
  SubmitDirectiveParams,
  SubmitDirectiveResult,
} from './interface.schema';
import { RecommendArtifactResult } from '../sys.gemma/gemma.schema';
import { z } from 'zod';
import * as readline from 'readline';
import { Directive } from '../sys.directives/directives.schema';

import './interface.contract';

import './interface.contract';

/**
 * InterfaceService — Human Interaction Layer.
 *
 * Provides REPL and CLI entry points, routing human commands to the
 * directive engine.
 */
export class InterfaceService implements IServiceSchema {
  public readonly name = 'sys.interface';
  public logger: ILogger;
  public broker!: IServiceBroker;

  private rl: readline.Interface | null = null;

  public actions = {
    submit: {
      params: SubmitDirectiveParamsSchema,
      handler: this.submitDirective.bind(this),
      timeout: 30000 // 30 seconds
    },
    start_repl: {
      params: z.object({}),
      handler: this.startRepl.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    this.logger = _logger;
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || app.logger;
  }

  /**
   * Translates a human request into a formal directive and enqueues it.
   */
  async submitDirective(ctx: IContext<SubmitDirectiveParams>): Promise<SubmitDirectiveResult> {
    const { title, objective, projectId, protocolId, personaId, priority } = SubmitDirectiveParamsSchema.parse(ctx.params);

    this.logger.info(`[sys.interface] Human submitted: "${title}" — "${objective.slice(0, 50)}..."`);

    const recommendation = await this.chooseArtifact(ctx, objective, protocolId, personaId);

    // 1. Create the directive in the engine
    const res = await ctx.call<Directive>('sys.directives.create', {
      title,
      projectId,
      artifactId: recommendation.artifactId,
      assignedPersona: recommendation.personaId ?? personaId,
      priority,
      stateContext: {
        objective,
        functionGemmaRationale: recommendation.rationale,
        functionGemmaArtifact: recommendation.artifactId,
      },
    });

    this.logger.info(`[sys.interface] Directive created: ${res.id.slice(0, 8)}`);

    return res;
  }

  private async chooseArtifact(
    ctx: IContext<SubmitDirectiveParams>,
    objective: string,
    fallbackArtifact: string,
    fallbackPersona?: string,
  ): Promise<{ artifactId: string; personaId?: string; rationale: string }> {
    if (!this.isInformationalObjective(objective)) {
      return { artifactId: fallbackArtifact, personaId: fallbackPersona, rationale: 'code-focused default' };
    }

    try {
      const recommendation = await ctx.call<RecommendArtifactResult>('sys.gemma.recommend_artifact', { objective }, { timeout: 3000 });
      return recommendation;
    } catch (err) {
      this.logger.warn(`[sys.interface] FunctionGemma failed: ${(err as Error).message}`);
      return { artifactId: fallbackArtifact, personaId: fallbackPersona, rationale: 'fallback after selector failure' };
    }
  }

  private isInformationalObjective(objective: string): boolean {
    const infoKeywords = ['review', 'explain', 'question', 'describe', 'understand', 'why', 'what', 'tell', 'summary', 'document'];
    const normalized = objective.toLowerCase();
    return infoKeywords.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Starts the interactive REPL loop.
   */
  async startRepl(ctx: IContext<Record<string, unknown>>): Promise<void> {
    if (this.rl) return;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.logger.info('[sys.interface] REPL session started. Type "help" or a directive to begin.');

    this.rl.setPrompt('mesht> ');
    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        this.rl?.prompt();
        return;
      }

      const args = input.split(' ');
      const command = args[0].toLowerCase();

      try {
        switch (command) {
          case 'help':
            this.printHelp();
            break;
          case 'exit':
          case 'quit':
            this.rl?.close();
            break;
          case 'status': {
            const status = await ctx.call('sys.scheduler.status', {});
            console.log(JSON.stringify(status, null, 2));
            break;
          }
          case 'list': {
            const running = await ctx.call('sys.directives.listByStatus', { status: 'running' });
            console.log('--- Active Directives ---');
            (running as Array<{ id: string; title: string; currentNode: string }>).forEach((d) => console.log(`[${d.id.slice(0, 8)}] ${d.title} (Node: ${d.currentNode})`));
            break;
          }
          case 'do': {
            // Usage: do "Fix the bug"
            const objective = input.substring(3).trim();
            if (!objective) {
              console.log('Error: objective required. Example: do "Refactor the engine"');
            } else {
              const res = await ctx.call<SubmitDirectiveResult>('sys.interface.submit', {
                title: objective.slice(0, 30),
                objective,
                protocolId: "prot_ralph_dev-loop_v120", // The canonical ID generated in sys.artifacts
              });
              console.log(`Directive created: ${res.id}`);
            }
            break;
          }
          case 'tick':
            // Trigger manual scheduler tick
            console.log('Triggering manual tick...');
            await ctx.call('sys.scheduler.tick', { manual: true }, { timeout: 600000 });
            break;
          default:
            console.log(`Unknown command: ${command}. Type "help" for a list of commands.`);
            break;
        }
      } catch (err) {
        console.error(`Command failed: ${(err as Error).message}`);
      }

      this.rl?.prompt();
    });

    this.rl.on('close', () => {
      this.logger.info('[sys.interface] REPL session closed.');
      process.exit(0);
    });
  }

  private printHelp() {
    console.log(`
--- MeshT commands ---
  do <objective>    Creates and enqueues a new directive.
  status            Displays the current grid/scheduler status.
  list              Lists all running directives.
  tick              Manually triggers the scheduler heartbeat.
  help              Shows this help menu.
  exit/quit         Exits the node.
----------------------
    `);
  }
}

export default InterfaceService;
