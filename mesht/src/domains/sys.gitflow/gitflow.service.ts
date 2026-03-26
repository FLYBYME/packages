// FILE: src/domains/sys.gitflow/gitflow.service.ts
import { DatabaseMixin, defineTable, FilterObject } from '@flybyme/isomorphic-database';
import {
  GitflowSessionSchema,
  GitflowSession,
  ProvisionWorkspaceParamsSchema,
  ProvisionWorkspaceParams,
  CommitCheckpointParamsSchema,
  CommitCheckpointParams,
  AttemptMergeParamsSchema,
  AttemptMergeParams,
  GetSessionDetailsParamsSchema,
  GetSessionDetailsParams,
  GetFileDiffParamsSchema,
  GetFileDiffParams,
  GitflowFileDiff,
  AbortWorkspaceParamsSchema,
  AbortWorkspaceParams,
  ForceMergeParamsSchema,
  ForceMergeParams,
  ListSessionsParamsSchema,
  ListSessionsParams,
} from './gitflow.schema';
import { IContext, ILogger, IMeshApp, MeshError } from '@flybyme/isomorphic-core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

import './gitflow.contract';
import { Project } from '../sys.projects/projects.schema';
import { Directive } from '../sys.directives/directives.schema';

const execAsync = promisify(exec);

const GitflowSessionTable = defineTable('gitflow_sessions', GitflowSessionSchema);

/**
 * GitflowService — Autonomous VCS Manager.
 *
 * Handles ephemeral workspace provisioning via Git Worktrees.
 * Orchestrates branch creation, auto-commits, and merge logic.
 */
export class GitflowService extends DatabaseMixin(GitflowSessionTable)(class { }) {
  public readonly name = 'sys.gitflow';

  declare logger: ILogger;

  private worktreeRoot: string;

  public actions = {
    list_sessions: {
      params: ListSessionsParamsSchema,
      handler: this.listSessions.bind(this),
    },
    provision_workspace: {
      params: ProvisionWorkspaceParamsSchema,
      handler: this.provisionWorkspace.bind(this),
    },
    commit_checkpoint: {
      params: CommitCheckpointParamsSchema,
      handler: this.commitCheckpoint.bind(this),
    },
    attempt_merge: {
      params: AttemptMergeParamsSchema,
      handler: this.attemptMerge.bind(this),
    },
    get_session_details: {
      params: GetSessionDetailsParamsSchema,
      handler: this.getSessionDetails.bind(this),
    },
    get_file_diff: {
      params: GetFileDiffParamsSchema,
      handler: this.getFileDiff.bind(this),
    },
    abort_workspace: {
      params: AbortWorkspaceParamsSchema,
      handler: this.abortWorkspace.bind(this),
    },
    force_merge: {
      params: ForceMergeParamsSchema,
      handler: this.forceMerge.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
    this.worktreeRoot = path.join(process.cwd(), '.mesh', 'worktrees');
  }

  override async onInit(app: IMeshApp): Promise<void> {
    await super.onInit(app);
    await fs.mkdir(this.worktreeRoot, { recursive: true });
  }

  // ────────────────────────────────────────────────────────────
  // ACTIONS
  // ────────────────────────────────────────────────────────────

  async listSessions(ctx: IContext<ListSessionsParams>): Promise<GitflowSession[]> {
    const { status } = ctx.params;
    const query: FilterObject<typeof GitflowSessionSchema> = {};
    if (status) query.status = status;
    return await this.db.find(query);
  }

  async provisionWorkspace(ctx: IContext<ProvisionWorkspaceParams>): Promise<GitflowSession> {
    const { directiveId } = ctx.params;

    // Check for existing session
    const existing = await this.findSession(directiveId);
    if (existing) {
      if (existing.status !== 'pending') return existing;
      // If pending, we re-provision (clean start)
    }

    // 1. Resolve Project
    const directive = await ctx.call<Directive>('sys.directives.get', { id: directiveId });
    if (!directive || !directive.projectId) {
      throw new MeshError({ code: 'INVALID_INPUT', message: 'Directive has no associated project.', status: 400 });
    }

    const project = await ctx.call<Project>('sys.projects.get', { id: directive.projectId });
    if (!project || !project.rootPath) {
      throw new MeshError({ code: 'NOT_FOUND', message: 'Project not found.', status: 404 });
    }

    const repoPath = project.rootPath;

    // 2. Determine branches
    const baseBranch = await this.resolveBaseBranch(repoPath);
    const branchName = `feature/${directiveId}`;
    const workspacePath = path.join(this.worktreeRoot, directiveId);

    this.logger.info(`[sys.gitflow] Provisioning workspace for ${directiveId} at ${workspacePath}`);

    try {
      await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);

      // Create the feature branch and worktree atomically from the resolved base branch.
      await execAsync(
        `git worktree add -b ${this.quoteShellArg(branchName)} ${this.quoteShellArg(workspacePath)} ${this.quoteShellArg(baseBranch)}`,
        { cwd: repoPath }
      );
    } catch (err: unknown) {
      throw new MeshError({ code: 'GIT_ERROR', message: `Failed to provision worktree: ${(err as Error).message}`, status: 500 });
    }

    const now = Date.now();
    const session: GitflowSession = {
      id: crypto.randomUUID(),
      projectId: project.id,
      directiveId,
      branchName,
      baseBranch,
      workspacePath,
      status: 'active',
      commitHistory: [],
      changedFiles: [],
      conflictDetails: [],
      systemLogs: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.db.create(session);
    return session;
  }

  async commitCheckpoint(ctx: IContext<CommitCheckpointParams>): Promise<GitflowSession> {
    const { directiveId, nodeName } = ctx.params;
    const session = await this.findSession(directiveId);
    if (!session) {
      throw new MeshError({ code: 'NOT_FOUND', message: `No gitflow session for directive ${directiveId}`, status: 404 });
    }

    const cwd = session.workspacePath;

    try {
      await execAsync('git add .', { cwd });
      const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd });

      if (statusOut.trim() === '') {
        return session; // No changes to commit
      }

      const message = `[Auto] Checkpoint: FSM Node ${nodeName}`;
      const { stdout: commitOut } = await execAsync(`git commit -m "${message}"`, { cwd });

      const shaMatch = commitOut.match(/\[[\w/-]+ ([a-f0-9]+)\]/);
      const sha = shaMatch?.[1] ?? 'unknown';

      // Parse changed files
      const { stdout: diffOut } = await execAsync('git diff --name-status HEAD~1', { cwd }).catch(() => ({ stdout: '' }));
      const changedFiles = this.parseDiffStatus(diffOut);

      await this.db.updateMany({ directiveId }, {
        commitHistory: [...session.commitHistory, { sha, message, timestamp: Date.now() }],
        changedFiles,
        updatedAt: Date.now(),
      });

      const updated = await this.findSession(directiveId);
      if (!updated) throw new MeshError({ code: 'NOT_FOUND', message: 'Session lost after update.', status: 500 });
      return updated;
    } catch (err) {
      this.logger.error(`[sys.gitflow] Checkpoint failed for ${directiveId}: ${(err as Error).message}`);
      throw new MeshError({ code: 'GIT_ERROR', message: `Commit failed: ${(err as Error).message}`, status: 500 });
    }
  }

  async attemptMerge(ctx: IContext<AttemptMergeParams>): Promise<GitflowSession> {
    const { directiveId } = ctx.params;
    const session = await this.findSession(directiveId);
    if (!session) {
      throw new MeshError({ code: 'NOT_FOUND', message: `No gitflow session for directive ${directiveId}`, status: 404 });
    }

    const project = await this.broker.call<Project>('sys.projects.get', { id: session.projectId });
    const mainRepoPath = project.rootPath;

    this.logger.info(`[sys.gitflow] Attempting merge for ${directiveId} (${session.branchName} -> ${session.baseBranch})`);

    // 1. Final commit in worktree
    try {
      await execAsync('git add .', { cwd: session.workspacePath });
      await execAsync('git commit -m "[Auto] Final merge commit"', { cwd: session.workspacePath }).catch(() => { });
    } catch {
      // No final commit was needed.
    }

    // 2. Perform merge in main repo
    try {
      await execAsync(`git checkout ${session.baseBranch}`, { cwd: mainRepoPath });
      await execAsync(`git merge --no-ff ${session.branchName}`, { cwd: mainRepoPath });

      // Cleanup worktree on success
      await execAsync(`git worktree remove ${session.workspacePath}`, { cwd: mainRepoPath });
      await execAsync(`git branch -d ${session.branchName}`, { cwd: mainRepoPath });

      await this.db.updateMany({ directiveId }, {
        status: 'merged',
        updatedAt: Date.now()
      });


      const directive = await ctx.call<Directive>('sys.directives.get', { id: directiveId });
      if (directive?.status === 'blocked_merge_conflict') {
        await ctx.call('sys.directives.update', { id: directiveId, status: 'completed' });
      }


      const updated = await this.findSession(directiveId);
      if (!updated) throw new MeshError({ code: 'NOT_FOUND', message: 'Session lost after update.', status: 500 });
      return updated;

    } catch {
      this.logger.warn(`[sys.gitflow] Merge conflict detected for ${directiveId}`);

      // Extract conflict details
      const { stdout: diffOut } = await execAsync('git diff --name-only --diff-filter=U', { cwd: mainRepoPath }).catch(() => ({ stdout: '' }));
      const files = diffOut.split('\n').filter((filePath) => filePath.trim() !== '');

      const conflictDetails = await Promise.all(files.map(async file => {
        const markers = await fs.readFile(path.join(mainRepoPath, file), 'utf-8').catch(() => '');
        return { file, markers };
      }));

      await execAsync('git merge --abort', { cwd: mainRepoPath });

      await this.db.updateMany({ directiveId }, {
        status: 'conflict',
        conflictDetails,
        updatedAt: Date.now()
      });

      const updated = await this.findSession(directiveId);
      if (!updated) throw new MeshError({ code: 'NOT_FOUND', message: 'Session lost after update.', status: 500 });
      return updated;
    }
  }

  async getSessionDetails(ctx: IContext<GetSessionDetailsParams>): Promise<GitflowSession> {
    const session = await this.findSession(ctx.params.directiveId);
    if (!session) {
      throw new MeshError({ code: 'NOT_FOUND', message: `No gitflow session for directive ${ctx.params.directiveId}`, status: 404 });
    }
    return session;
  }

  async getFileDiff(ctx: IContext<GetFileDiffParams>): Promise<GitflowFileDiff> {
    const { directiveId, file } = ctx.params;
    const session = await this.findSession(directiveId);
    if (!session) {
      throw new MeshError({ code: 'NOT_FOUND', message: `No gitflow session for directive ${directiveId}`, status: 404 });
    }

    const project = await this.broker.call<Project>('sys.projects.get', { id: session.projectId });
    const changed = session.changedFiles.find((entry) => entry.file === file);
    const conflict = session.conflictDetails.find((entry) => entry.file === file);

    const normalizedPath = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');
    const workspaceFilePath = path.resolve(session.workspacePath, normalizedPath);
    if (!workspaceFilePath.startsWith(path.resolve(session.workspacePath))) {
      throw new MeshError({ code: 'INVALID_INPUT', message: 'File path escapes workspace root.', status: 400 });
    }

    const baseContent = await this.readGitRevisionFile(project.rootPath, session.baseBranch, normalizedPath);
    const currentContent = conflict
      ? conflict.markers
      : await fs.readFile(workspaceFilePath, 'utf-8').catch(async () => {
        const branchContent = await this.readGitRevisionFile(project.rootPath, session.branchName, normalizedPath);
        return branchContent ?? null;
      });

    return {
      file: normalizedPath,
      status: changed?.status || 'modified',
      baseContent,
      currentContent,
    };
  }

  async abortWorkspace(ctx: IContext<AbortWorkspaceParams>): Promise<GitflowSession> {
    const { directiveId } = ctx.params;
    const session = await this.findSession(directiveId);
    if (!session) {
      throw new MeshError({ code: 'NOT_FOUND', message: `No gitflow session for directive ${directiveId}`, status: 404 });
    }

    const project = await this.broker.call<Project>('sys.projects.get', { id: session.projectId });

    await execAsync(`git worktree remove ${this.quoteShellArg(session.workspacePath)} --force`, { cwd: project.rootPath }).catch(() => { });
    await fs.rm(session.workspacePath, { recursive: true, force: true }).catch(() => { });
    await execAsync(`git branch -D ${session.branchName}`, { cwd: project.rootPath }).catch(() => { });

    await this.db.updateMany({ directiveId }, {
      status: 'pending',
      changedFiles: [],
      conflictDetails: [],
      systemLogs: [...session.systemLogs, `[${new Date().toISOString()}] Workspace aborted by operator.`],
      updatedAt: Date.now(),
    });


    const directive = await ctx.call<Directive>('sys.directives.get', { id: directiveId });
    if (directive) {
      const preservedContext = { ...(directive.stateContext || {}) };
      delete preservedContext['_lastResponse'];
      delete preservedContext['_lastVerdict'];
      delete preservedContext['_toolCallsMade'];

      await ctx.call('sys.directives.update', {
        id: directiveId,
        status: 'initialized',
        currentNode: '',
        history: [],
        lockHolder: undefined,
        lockAcquiredAt: undefined,
        lastStepAt: undefined,
        stateContext: preservedContext,
      });
    }


    const updated = await this.findSession(directiveId);
    if (!updated) throw new MeshError({ code: 'NOT_FOUND', message: 'Session lost after update.', status: 500 });
    return updated;
  }

  async forceMerge(ctx: IContext<ForceMergeParams>): Promise<GitflowSession> {
    return this.attemptMerge({ ...ctx, params: { directiveId: ctx.params.directiveId } });
  }

  // ────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────

  private async findSession(directiveId: string): Promise<GitflowSession | null> {
    return this.db.findOne({ directiveId });
  }

  private async readGitRevisionFile(repoPath: string, revision: string, file: string): Promise<string | null> {
    const revisionSpec = `${revision}:${file}`.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`git show "${revisionSpec}"`, { cwd: repoPath }).catch((err: Error) => {
      if (err.message.includes('does not exist') || err.message.includes('exists on disk')) {
        return { stdout: '' };
      }
      return { stdout: '' };
    });
    return stdout === '' ? null : stdout;
  }

  private quoteShellArg(value: string): string {
    return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
  }

  private async resolveBaseBranch(repoPath: string): Promise<string> {
    const candidateRefs = [
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
      'refs/remotes/origin/master',
      'refs/heads/main',
      'refs/heads/master',
    ];

    for (const candidateRef of candidateRefs) {
      const resolved = await this.resolveGitRef(repoPath, candidateRef);
      if (resolved) {
        return resolved;
      }
    }

    const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
    const currentBranch = stdout.trim();
    if (currentBranch) {
      return currentBranch;
    }

    throw new MeshError({
      code: 'GIT_ERROR',
      message: `Unable to determine base branch for repository at ${repoPath}.`,
      status: 500,
    });
  }

  private async resolveGitRef(repoPath: string, gitRef: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`git symbolic-ref --quiet ${this.quoteShellArg(gitRef)}`, { cwd: repoPath });
      const symbolicRef = stdout.trim();
      if (symbolicRef) {
        return symbolicRef.replace('refs/remotes/origin/', '').replace('refs/heads/', '');
      }
    } catch {
      // Not a symbolic ref or not present.
    }

    try {
      const { stdout } = await execAsync(`git rev-parse --verify ${this.quoteShellArg(gitRef)}`, { cwd: repoPath });
      if (stdout.trim()) {
        return gitRef.replace('refs/remotes/origin/', '').replace('refs/heads/', '');
      }
    } catch {
      return null;
    }

    return null;
  }

  private parseDiffStatus(stdout: string): { file: string, status: 'added' | 'modified' | 'deleted' }[] {
    return stdout.split('\n').filter(line => line.trim() !== '').map(line => {
      const [code, file] = line.split(/\s+/);
      let status: 'added' | 'modified' | 'deleted' = 'modified';
      if (code === 'A') status = 'added';
      if (code === 'D') status = 'deleted';
      return { file, status };
    });
  }
}

export default GitflowService;
