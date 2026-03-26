// FILE: src/domains/sys.eng/eng.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  ExecLogSchema,
  ExecResultSchema,
  FileOpResultSchema,
  ShellExecParamsSchema,
  FsReadParamsSchema,
  FsWriteParamsSchema,
  FsDeleteParamsSchema,
  FsListParamsSchema,
} from './eng.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.eng', typeof ExecLogSchema> {
    'sys.eng.shell_exec': {
      params: typeof ShellExecParamsSchema;
      returns: typeof ExecResultSchema;
    };

    'sys.eng.fs_read': {
      params: typeof FsReadParamsSchema;
      returns: typeof FileOpResultSchema;
    };

    'sys.eng.fs_write': {
      params: typeof FsWriteParamsSchema;
      returns: typeof FileOpResultSchema;
    };

    'sys.eng.fs_delete': {
      params: typeof FsDeleteParamsSchema;
      returns: typeof FileOpResultSchema;
    };

    'sys.eng.fs_list': {
      params: typeof FsListParamsSchema;
      returns: z.ZodArray<z.ZodString>;
    };
  }
}
