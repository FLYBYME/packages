// FILE: src/domains/sys.projects/projects.contract.ts
import { z } from 'zod';
import { 
  ProjectSchema, 
  ProjectCreateParamsSchema, 
  ProjectUpdateParamsSchema,
  ProjectStatusSchema,
  ProjectDeleteResultSchema,
  EmptyParamsSchema,
} from './projects.schema';

declare module '@flybyme/isomorphic-core' {
  interface IServiceActionRegistry {
    /**
     * List all projects registered in MeshT.
     */
    'sys.projects.list': {
      params: typeof EmptyParamsSchema;
      returns: z.ZodArray<typeof ProjectSchema>;
    };

    /**
     * Get details for a specific project.
     */
    'sys.projects.get': {
      params: z.ZodObject<{ id: z.ZodString }>;
      returns: typeof ProjectSchema;
    };

    /**
     * Register a new project.
     */
    'sys.projects.create': {
      params: typeof ProjectCreateParamsSchema;
      returns: typeof ProjectSchema;
    };

    /**
     * Update project configuration.
     */
    'sys.projects.update': {
      params: typeof ProjectUpdateParamsSchema;
      returns: typeof ProjectSchema;
    };

    /**
     * Delete a project registration (not files).
     */
    'sys.projects.delete': {
      params: z.ZodObject<{ id: z.ZodString }>;
      returns: typeof ProjectDeleteResultSchema;
    };

    /**
     * Select a project as active (for sys.eng operations).
     */
    'sys.projects.select': {
      params: z.ZodObject<{ id: z.ZodString }>;
      returns: typeof ProjectSchema;
    };

    /**
     * Get the currently active project.
     */
    'sys.projects.get_active': {
      params: typeof EmptyParamsSchema;
      returns: typeof ProjectSchema;
    };

    /**
     * Get system-wide project status.
     */
    'sys.projects.status': {
      params: typeof EmptyParamsSchema;
      returns: typeof ProjectStatusSchema;
    };
  }
}
