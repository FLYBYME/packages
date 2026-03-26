import { IServiceSchema, ILogger, IMeshApp, IServiceBroker, IContext } from '@flybyme/isomorphic-core';
import { RecommendArtifactParamsSchema, RecommendArtifactResultSchema } from './gemma.schema';
import { z } from 'zod';

import './gemma.contract';

type RecommendArtifactParams = z.infer<typeof RecommendArtifactParamsSchema>;
type RecommendArtifactResult = z.infer<typeof RecommendArtifactResultSchema>;

const KEYWORD_MAP: Array<{ keywords: string[]; artifactId: string; personaId?: string; rationale: string }> = [
  {
    keywords: ['review', 'explain', 'outline', 'summarize', 'thoughts', 'question', 'describe'],
    artifactId: 'prot_tech_docs_v1',
    personaId: 'architect',
    rationale: 'Documentation/detail review intent',
  },
  {
    keywords: ['security', 'audit', 'vulnerab', 'compliance', 'secret'],
    artifactId: 'prot_security_audit_v1',
    personaId: 'judge',
    rationale: 'Security/compliance investigation',
  },
  {
    keywords: ['architecture', 'design', 'scaffold', 'arch'],
    artifactId: 'prot_arch_scaffold_v1',
    personaId: 'architect',
    rationale: 'Architectural scaffolding request',
  },
];

export class GemmaService implements IServiceSchema {
  public readonly name = 'sys.gemma';
  public logger: ILogger;
  public broker!: IServiceBroker;

  public actions = {
    recommend_artifact: {
      params: RecommendArtifactParamsSchema,
      returns: RecommendArtifactResultSchema,
      handler: this.recommendArtifact.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    this.logger = _logger;
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || this.logger;
  }

  private async recommendArtifact(ctx: IContext<RecommendArtifactParams>): Promise<RecommendArtifactResult> {
    const { objective } = RecommendArtifactParamsSchema.parse(ctx.params);
    const normalized = objective.toLowerCase();

    for (const candidate of KEYWORD_MAP) {
      if (candidate.keywords.some((keyword) => normalized.includes(keyword))) {
        this.logger.info(`[sys.gemma] FunctionGemma recommends ${candidate.artifactId}: ${candidate.rationale}`);
        return {
          artifactId: candidate.artifactId,
          personaId: candidate.personaId,
          rationale: candidate.rationale,
        };
      }
    }

    // Default fallback to the Ralph loop artifact
    return {
      artifactId: 'prot_ralph_dev_loop_v1',
      personaId: 'ralph_core',
      rationale: 'Default dev loop fallback',
    };
  }
}

export default GemmaService;
