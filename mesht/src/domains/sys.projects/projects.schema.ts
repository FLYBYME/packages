// FILE: src/domains/sys.projects/projects.schema.ts
import { z } from 'zod';
import { JSONObjectSchema } from '../../shared/json.schema';

/**
 * Project Model — Represents a software engineering project managed by MeshT.
 */
export const ProjectSchema = z.object({
  id: z.string().describe('Primary Key (e.g. "packages", "mesht").'),
  name: z.string().describe('Display name for the project.'),
  rootPath: z.string().describe('Derived absolute path to the bootstrapped project workspace on the node filesystem.'),
  description: z.string().optional(),
  repository: z.string().describe('Source control URL (git) used to bootstrap the workspace.'),
  active: z.boolean().default(false).describe('True if this is the currently active project for sys.eng.'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
  updatedAt: z.number().int().describe('Unix MS timestamp.'),
  metadata: JSONObjectSchema.default({}).describe('Extensible metadata (e.g. primary language, stack).'),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Input for creating a new project.
 */
export const ProjectCreateParamsSchema = z.object({
  id: z.string(),
  name: z.string(),
  repository: z.string(),
  description: z.string().optional(),
  metadata: JSONObjectSchema.optional(),
});

export type ProjectCreateParams = z.infer<typeof ProjectCreateParamsSchema>;

/**
 * Input for updating a project.
 */
export const ProjectUpdateParamsSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  metadata: JSONObjectSchema.optional(),
});

export type ProjectUpdateParams = z.infer<typeof ProjectUpdateParamsSchema>;

/**
 * Current status of the projects system.
 */
export const ProjectStatusSchema = z.object({
  activeProjectId: z.string().optional(),
  activeProjectRoot: z.string().optional(),
  projectCount: z.number().int(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectDeleteResultSchema = z.object({
  success: z.boolean(),
});

export type ProjectDeleteResult = z.infer<typeof ProjectDeleteResultSchema>;

export const EmptyParamsSchema = z.object({});
export type EmptyParams = z.infer<typeof EmptyParamsSchema>;
