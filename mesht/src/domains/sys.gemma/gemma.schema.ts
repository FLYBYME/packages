import { z } from 'zod';

export const RecommendArtifactParamsSchema = z.object({
  objective: z.string().describe('Human directive objective or question text.'),
});

export type RecommendArtifactParams = z.infer<typeof RecommendArtifactParamsSchema>;

export const RecommendArtifactResultSchema = z.object({
  artifactId: z.string().describe('The preferred artifact to route this directive to.'),
  personaId: z.string().optional().describe('Persona that should drive the artifact.'),
  rationale: z.string().describe('Explanation of why this artifact was chosen.'),
});

export type RecommendArtifactResult = z.infer<typeof RecommendArtifactResultSchema>;
