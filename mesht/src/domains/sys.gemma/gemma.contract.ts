import { RecommendArtifactParamsSchema, RecommendArtifactResultSchema } from './gemma.schema';

declare module '@flybyme/isomorphic-core' {
  interface IServiceActionRegistry {
    'sys.gemma.recommend_artifact': {
      params: typeof RecommendArtifactParamsSchema;
      returns: typeof RecommendArtifactResultSchema;
    };
  }
}
