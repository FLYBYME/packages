// FILE: src/domains/sys.gitflow/gitflow.contract.ts
import {
  ListSessionsParamsSchema,
  ProvisionWorkspaceParamsSchema,
  CommitCheckpointParamsSchema,
  AttemptMergeParamsSchema,
  GetSessionDetailsParamsSchema,
  GitflowSessionSchema,
  GetFileDiffParamsSchema,
  GitflowFileDiffSchema,
  AbortWorkspaceParamsSchema,
  ForceMergeParamsSchema,
} from './gitflow.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry {
    'sys.gitflow.list_sessions': {
      params: typeof ListSessionsParamsSchema;
      returns: z.ZodArray<typeof GitflowSessionSchema>;
    };
    'sys.gitflow.provision_workspace': {
      params: typeof ProvisionWorkspaceParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
    'sys.gitflow.commit_checkpoint': {
      params: typeof CommitCheckpointParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
    'sys.gitflow.attempt_merge': {
      params: typeof AttemptMergeParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
    'sys.gitflow.get_session_details': {
      params: typeof GetSessionDetailsParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
    'sys.gitflow.get_file_diff': {
      params: typeof GetFileDiffParamsSchema;
      returns: typeof GitflowFileDiffSchema;
    };
    'sys.gitflow.abort_workspace': {
      params: typeof AbortWorkspaceParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
    'sys.gitflow.force_merge': {
      params: typeof ForceMergeParamsSchema;
      returns: typeof GitflowSessionSchema;
    };
  }
}
