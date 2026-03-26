// FILE: src/domains/sys.eng/eng.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  ExecLogSchema,
  ExecResult,
  FileOpResult,
  ShellExecParamsSchema,
  ShellExecParams,
  FsReadParamsSchema,
  FsReadParams,
  FsWriteParamsSchema,
  FsWriteParams,
  FsDeleteParamsSchema,
  FsDeleteParams,
  FsListParamsSchema,
  FsListParams,
} from './eng.schema';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

import './eng.contract';
import { Directive } from '../sys.directives/directives.schema';
import { Project } from '../sys.projects/projects.schema';
import { GitflowSession } from '../sys.gitflow/gitflow.schema';

const execAsync = promisify(exec);

const ExecLogTable = defineTable('exec_logs', ExecLogSchema);

/**
 * EngService — The Engineering Sandbox.
 *
 * Provides sandboxed shell execution, filesystem operations,
 * and git operations for agent personas.
 *
 * Safety constraints:
 * - All paths are resolved relative to the project root
 * - Path traversal attacks are blocked
 * - `rm -rf` commands require governance approval (spec §7.2 Directive Beta)
 * - All executions are logged to the audit trail
 */
export class EngService extends DatabaseMixin(ExecLogTable)(class {}) {
  public readonly name = 'sys.eng';

  declare logger: ILogger;

  private initialProjectRoot: string;

  public actions = {
    shell_exec: {
      params: ShellExecParamsSchema,
      handler: this.shellExec.bind(this),
    },
    fs_read: {
      params: FsReadParamsSchema,
      handler: this.fsRead.bind(this),
    },
    fs_write: {
      params: FsWriteParamsSchema,
      handler: this.fsWrite.bind(this),
    },
    fs_delete: {
      params: FsDeleteParamsSchema,
      handler: this.fsDelete.bind(this),
    },
    fs_list: {
      params: FsListParamsSchema,
      handler: this.fsList.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
    this.initialProjectRoot = process.env.MESHT_PROJECT_ROOT || process.cwd();
  }

  /**
   * Dynamically fetch the project root.
   * Priority:
   * 1. Project associated with the directive (if provided)
   * 2. Global active project from sys.projects
   * 3. Initial project root (CWD/ENV)
   */
  private async getEffectiveProjectRoot(directiveID?: string): Promise<string> {
    const broker = this.broker;
    if (!broker) return this.initialProjectRoot;

    try {
      if (directiveID && directiveID !== 'anonymous') {
        // 1. Try to get the isolated Git Worktree first
        try {
          const session = await broker.call<GitflowSession>('sys.gitflow.get_session_details', { directiveId: directiveID });
          if (session && session.workspacePath) {
            return session.workspacePath; // Sandbox successfully applied!
          }
        } catch {
          // Ignore. Gitflow session might not exist yet (e.g., during initialization)
        }

        // 2. Fallback to specific project associated with the directive
        const directive = await broker.call<Directive>('sys.directives.get', { id: directiveID });
        if (directive?.projectId) {
          const project = await broker.call<Project>('sys.projects.get', { id: directive.projectId });
          if (project?.rootPath) return project.rootPath;
        }
      }

      // 3. Fallback to global active project
      const active = await broker.call<Project>('sys.projects.get_active', {});
      return active?.rootPath || this.initialProjectRoot;
    } catch {
      // Service might not be ready or directive/project not found
      return this.initialProjectRoot;
    }
  }

  /**
   * Resolve and validate a file path is within the project root.
   * Prevents path traversal attacks.
   */
  private async resolveSafePath(relativePath: string, options: { rootOverride?: string; directiveID?: string } = {}): Promise<string> {
    const root = options.rootOverride || await this.getEffectiveProjectRoot(options.directiveID);
    const resolved = path.resolve(root, relativePath);
    if (!resolved.startsWith(root)) {
      throw new MeshError({
        code: 'PATH_TRAVERSAL',
        message: `Path '${relativePath}' resolves outside project root '${root}'.`,
        status: 403,
      });
    }
    return resolved;
  }

  /**
   * Enforce constitutional safety constraints on shell commands.
   */
  private validateCommand(command: string): void {
    const dangerous = [
      /rm\s+-rf\s+\//,        // Absolute rm -rf
      /rm\s+-rf\s+~/,         // Home directory rm -rf
      /rm\s+-rf\s+\.\./,     // Parent traversal rm -rf
      />\s*\/dev\/sd/,        // Direct disk writes
      /mkfs/,                 // Filesystem formatting
      /dd\s+if=/,             // Raw disk operations
    ];

    for (const pattern of dangerous) {
      if (pattern.test(command)) {
        throw new MeshError({
          code: 'GOVERNANCE_VIOLATION',
          message: `Command blocked by Directive Beta: '${command}' matches dangerous pattern.`,
          status: 403,
        });
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  // SHELL EXECUTION
  // ────────────────────────────────────────────────────────────

  async shellExec(ctx: IContext<ShellExecParams>): Promise<ExecResult> {
    const { command, workDir, timeoutMs, maxOutputBytes, directiveID, personaId } =
      ShellExecParamsSchema.parse(ctx.params);

    this.validateCommand(command);

    const cwd = await this.resolveSafePath(workDir, { directiveID });
    const startMs = Date.now();

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let truncated = false;

    try {
      const result = await execAsync(command, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: maxOutputBytes,
        env: { ...process.env, MESHT_SANDBOX: 'true' },
      });

      stdout = result.stdout;
      stderr = result.stderr;

      if (stdout.length >= maxOutputBytes) truncated = true;
    } catch (err: unknown) {
      const execErr = err as { code?: string | number; stdout?: string; stderr?: string; killed?: boolean };
      exitCode = typeof execErr.code === 'number' ? execErr.code : 1;
      stdout = execErr.stdout ?? '';
      stderr = execErr.stderr ?? (err as Error).message;

      if (execErr.killed) {
        stderr += '\n[TIMEOUT] Process killed after exceeding timeout.';
      }
    }

    const durationMs = Date.now() - startMs;

    // Log execution
    await this.db.create({
      directiveID,
      personaId,
      command,
      workDir: cwd,
      exitCode,
      stdout: stdout.slice(0, 10000), // Cap log storage
      stderr: stderr.slice(0, 10000),
      durationMs,
      sandbox: true,
      createdAt: Date.now(),
    });

    this.logger.info(`[sys.eng] Shell: "${command.slice(0, 60)}" → exit ${exitCode} (${durationMs}ms)`);

    return { exitCode, stdout, stderr, durationMs, truncated };
  }

  // ────────────────────────────────────────────────────────────
  // FILESYSTEM OPERATIONS
  // ────────────────────────────────────────────────────────────

  async fsRead(ctx: IContext<FsReadParams>): Promise<FileOpResult> {
    const { path: filePath, encoding, directiveID } = FsReadParamsSchema.parse(ctx.params);
    const resolved = await this.resolveSafePath(filePath, { directiveID });

    try {
      const content = await fs.readFile(resolved, encoding === 'base64' ? 'base64' : 'utf-8');
      return { path: filePath, operation: 'read', success: true, content };
    } catch (err: unknown) {
      return { path: filePath, operation: 'read', success: false, error: (err as Error).message };
    }
  }

  async fsWrite(ctx: IContext<FsWriteParams>): Promise<FileOpResult> {
    const { path: filePath, content, createDirs, directiveID } = FsWriteParamsSchema.parse(ctx.params);
    const resolved = await this.resolveSafePath(filePath, { directiveID });

    try {
      if (createDirs) {
        await fs.mkdir(path.dirname(resolved), { recursive: true });
      }
      await fs.writeFile(resolved, content, 'utf-8');
      this.logger.info(`[sys.eng] Wrote: ${filePath} (${content.length} bytes)`);
      return { path: filePath, operation: 'write', success: true };
    } catch (err: unknown) {
      return { path: filePath, operation: 'write', success: false, error: (err as Error).message };
    }
  }

  async fsDelete(ctx: IContext<FsDeleteParams>): Promise<FileOpResult> {
    const { path: filePath, recursive, directiveID } = FsDeleteParamsSchema.parse(ctx.params);
    const resolved = await this.resolveSafePath(filePath, { directiveID });

    // Governance check: prevent .git deletion (Directive Alpha)
    if (resolved.includes('.git')) {
      throw new MeshError({
        code: 'GOVERNANCE_VIOLATION',
        message: 'Directive Alpha: NEVER delete .git histories.',
        status: 403,
      });
    }

    try {
      await fs.rm(resolved, { recursive, force: false });
      this.logger.info(`[sys.eng] Deleted: ${filePath} (recursive: ${recursive})`);
      return { path: filePath, operation: 'delete', success: true };
    } catch (err: unknown) {
      return { path: filePath, operation: 'delete', success: false, error: (err as Error).message };
    }
  }

  async fsList(ctx: IContext<FsListParams>): Promise<string[]> {
    const { path: dirPath, recursive, directiveID } = FsListParamsSchema.parse(ctx.params);
    const resolved = await this.resolveSafePath(dirPath, { directiveID });

    const entries = await fs.readdir(resolved, { withFileTypes: true, recursive });
    return entries.map((e) => {
      const relativePath = path.relative(resolved, path.join(e.parentPath || resolved, e.name));
      return e.isDirectory() ? `${relativePath || e.name}/` : (relativePath || e.name);
    });
  }
}

export default EngService;
