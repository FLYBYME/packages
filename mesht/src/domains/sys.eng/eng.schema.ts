// FILE: src/domains/sys.eng/eng.schema.ts
import { z } from 'zod';

// ─── Execution Result ───────────────────────────────────────────

export const ExecResultSchema = z.object({
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().int(),
  truncated: z.boolean().default(false).describe('True if output was capped at maxOutputBytes.'),
});

export type ExecResult = z.infer<typeof ExecResultSchema>;

// ─── File Operation Result ──────────────────────────────────────

export const FileOpResultSchema = z.object({
  path: z.string(),
  operation: z.enum(['read', 'write', 'delete', 'list', 'stat']),
  success: z.boolean(),
  content: z.string().optional().describe('File content (for read operations).'),
  error: z.string().optional(),
});

export type FileOpResult = z.infer<typeof FileOpResultSchema>;

// ─── Database Schema — Execution Log ────────────────────────────

export const ExecLogSchema = z.object({
  id: z.string().describe('Primary Key.'),
  directiveID: z.string().optional().describe('FK → sys.directives.directiveID.'),
  personaId: z.string().optional().describe('Persona that triggered the execution.'),
  command: z.string().describe('The command that was executed.'),
  workDir: z.string().describe('Working directory for the command.'),
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().int(),
  sandbox: z.boolean().default(true).describe('Whether this was executed in sandbox mode.'),
  createdAt: z.number().int().describe('Unix MS timestamp.'),
});

export type ExecLog = z.infer<typeof ExecLogSchema>;

// ─── Action Parameter Schemas ───────────────────────────────────

export const ShellExecParamsSchema = z.object({
  command: z.string().describe('Shell command to execute.'),
  workDir: z.string().default('.').describe('Working directory (relative to project root).'),
  timeoutMs: z.number().int().positive().default(30000).describe('Execution timeout in ms.'),
  maxOutputBytes: z.number().int().positive().default(1_000_000).describe('Max output capture size.'),
  directiveID: z.string().optional(),
  personaId: z.string().optional(),
});
export type ShellExecParams = z.infer<typeof ShellExecParamsSchema>;

export const FsReadParamsSchema = z.object({
  path: z.string().describe('File path to read (relative to project root).'),
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
  directiveID: z.string().optional(),
});
export type FsReadParams = z.infer<typeof FsReadParamsSchema>;

export const FsWriteParamsSchema = z.object({
  path: z.string().describe('File path to write (relative to project root).'),
  content: z.string().describe('Content to write.'),
  createDirs: z.boolean().default(true).describe('Whether to create parent directories.'),
  directiveID: z.string().optional(),
});
export type FsWriteParams = z.infer<typeof FsWriteParamsSchema>;

export const FsDeleteParamsSchema = z.object({
  path: z.string().describe('File path to delete (relative to project root).'),
  recursive: z.boolean().default(false),
  directiveID: z.string().optional(),
});
export type FsDeleteParams = z.infer<typeof FsDeleteParamsSchema>;

export const FsListParamsSchema = z.object({
  path: z.string().default('.').describe('Directory path to list.'),
  recursive: z.boolean().default(false),
  pattern: z.string().optional().describe('Glob pattern filter.'),
  directiveID: z.string().optional(),
});
export type FsListParams = z.infer<typeof FsListParamsSchema>;
