// FILE: src/domains/sys.gitflow/gitflow.schema.ts
import { z } from 'zod';

export const GitflowSessionStatusSchema = z.enum([
  'pending',
  'active',
  'merging',
  'merged',
  'conflict',
]);

export type GitflowSessionStatus = z.infer<typeof GitflowSessionStatusSchema>;

export const GitflowCommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  timestamp: z.number().int(),
});
export type GitflowCommit = z.infer<typeof GitflowCommitSchema>;

export const GitflowChangedFileSchema = z.object({
  file: z.string(),
  status: z.enum(['added', 'modified', 'deleted']),
});
export type GitflowChangedFile = z.infer<typeof GitflowChangedFileSchema>;

export const GitflowConflictDetailSchema = z.object({
  file: z.string(),
  markers: z.string(),
});
export type GitflowConflictDetail = z.infer<typeof GitflowConflictDetailSchema>;

export const GitflowSessionSchema = z.object({
  id: z.string().describe('Primary Key (UUID).'),
  projectId: z.string().describe('Foreign Key -> sys.projects.'),
  directiveId: z.string().describe('Foreign Key -> sys.directives.'),
  branchName: z.string().describe('e.g., feature/DIR-123-auth'),
  baseBranch: z.string().describe('develop or main'),
  workspacePath: z.string().describe('The absolute path to the isolated Git Worktree for this session'),
  status: GitflowSessionStatusSchema,
  commitHistory: z.array(GitflowCommitSchema).default([]),
  changedFiles: z.array(GitflowChangedFileSchema).default([]),
  conflictDetails: z.array(GitflowConflictDetailSchema).default([]),
  systemLogs: z.array(z.string()).default([]),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type GitflowSession = z.infer<typeof GitflowSessionSchema>;

export const GitflowFileDiffSchema = z.object({
  file: z.string(),
  status: z.enum(['added', 'modified', 'deleted']),
  baseContent: z.string().nullable(),
  currentContent: z.string().nullable(),
});

export type GitflowFileDiff = z.infer<typeof GitflowFileDiffSchema>;


// ─── Action Parameter Schemas ───────────────────────────────────

export const ListSessionsParamsSchema = z.object({
  status: GitflowSessionStatusSchema.optional(),
});
export type ListSessionsParams = z.infer<typeof ListSessionsParamsSchema>;

export const ProvisionWorkspaceParamsSchema = z.object({
  directiveId: z.string(),
});
export type ProvisionWorkspaceParams = z.infer<typeof ProvisionWorkspaceParamsSchema>;

export const CommitCheckpointParamsSchema = z.object({
  directiveId: z.string(),
  nodeName: z.string(),
});
export type CommitCheckpointParams = z.infer<typeof CommitCheckpointParamsSchema>;

export const AttemptMergeParamsSchema = z.object({
  directiveId: z.string(),
});
export type AttemptMergeParams = z.infer<typeof AttemptMergeParamsSchema>;

export const GetSessionDetailsParamsSchema = z.object({
  directiveId: z.string(),
});
export type GetSessionDetailsParams = z.infer<typeof GetSessionDetailsParamsSchema>;

export const GetFileDiffParamsSchema = z.object({
  directiveId: z.string(),
  file: z.string(),
});
export type GetFileDiffParams = z.infer<typeof GetFileDiffParamsSchema>;

export const AbortWorkspaceParamsSchema = z.object({
  directiveId: z.string(),
});
export type AbortWorkspaceParams = z.infer<typeof AbortWorkspaceParamsSchema>;

export const ForceMergeParamsSchema = z.object({
  directiveId: z.string(),
});
export type ForceMergeParams = z.infer<typeof ForceMergeParamsSchema>;
