// FILE: src/domains/sys.projects/projects.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { IContext, ILogger, IMeshApp, MeshError } from '@flybyme/isomorphic-core';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ProjectSchema,
  ProjectCreateParamsSchema,
  ProjectUpdateParamsSchema,
  Project,
  ProjectStatus,
  ProjectCreateParams,
  EmptyParams,
  ProjectUpdateParams,
} from './projects.schema';
import './projects.contract';

const ProjectsTable = defineTable('projects', ProjectSchema);
const execAsync = promisify(exec);

/**
 * ProjectsService — Manages the workspace projects and active project root for sys.eng.
 */
export class ProjectsService extends DatabaseMixin(ProjectsTable)(class { }) {
  public readonly name = 'sys.projects';

  declare logger: ILogger;
  private readonly workspaceRoot = path.join(process.cwd(), '.mesh', 'projects');

  public actions = {
    list: {
      params: z.object({}),
      handler: this.listProjects.bind(this),
    },
    get: {
      params: z.object({ id: z.string() }),
      handler: this.getProject.bind(this),
      timeout: 15000
    },
    create: {
      params: ProjectCreateParamsSchema,
      handler: this.createProject.bind(this),
    },
    update: {
      params: ProjectUpdateParamsSchema,
      handler: this.updateProject.bind(this),
    },
    delete: {
      params: z.object({ id: z.string() }),
      handler: this.deleteProject.bind(this),
    },
    select: {
      params: z.object({ id: z.string() }),
      handler: this.selectProject.bind(this),
    },
    get_active: {
      params: z.object({}),
      handler: this.getActiveProject.bind(this),
      timeout: 15000
    },
    status: {
      params: z.object({}),
      handler: this.getStatus.bind(this),
      timeout: 15000
    }
  };


  constructor(_logger: ILogger) {
    super();
  }

  async onInit(app: IMeshApp): Promise<void> {
    await super.onInit(app);
    await fs.mkdir(this.workspaceRoot, { recursive: true });
  }

  /**
   * Initial project seed for common workspaces.
   */
  async started(): Promise<void> {
    const projects = await this.db.find({});
    if (projects.length === 0) {
      this.logger.info('[sys.projects] Seeding default projects...');
      await this.broker.call('sys.projects.create', {
        id: 'packages',
        name: 'Packages Monorepo',
        repository: 'https://github.com/FLYBYME/mesh.git',
        description: 'Main isomorphic mesh packages monorepo'
      });

      // Default: The 'mesht' repo
      await this.broker.call('sys.projects.create', {
        id: 'mesht',
        name: 'MeshT Operations Grid',
        repository: 'https://github.com/FLYBYME/mesht.git',
        description: 'MeshT Gateway and Operations Grid'
      });

      // Select 'packages' as default active
      await this.broker.call('sys.projects.select', { id: 'packages' });
    }
  }

  async listProjects(_ctx: IContext<EmptyParams>): Promise<Project[]> {
    return this.db.find({});
  }

  async getProject(ctx: IContext<{ id: string }>): Promise<Project> {
    const project = await this.db.findById(ctx.params.id);
    if (!project) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${ctx.params.id} not found`, status: 404 });
    return this.ensureProjectWorkspace(project);
  }

  async createProject(ctx: IContext<ProjectCreateParams>): Promise<Project> {
    const now = Date.now();
    const rootPath = await this.ensureWorkspaceCheckout(ctx.params.id, ctx.params.repository);
    const project = await this.db.create({
      ...ctx.params,
      rootPath,
      active: false,
      createdAt: now,
      updatedAt: now,
      metadata: ctx.params.metadata ?? {}
    });
    this.logger.info(`[sys.projects] Created project: ${project.id} at ${project.rootPath}`);
    return project;
  }

  async updateProject(ctx: IContext<ProjectUpdateParams>): Promise<Project> {
    const { id, ...updates } = ctx.params;
    const existing = await this.db.findById(id);
    if (!existing) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${id} not found`, status: 404 });

    const repository = updates.repository ?? existing.repository;
    const rootPath = await this.ensureWorkspaceCheckout(id, repository);
    const changes = await this.db.update(id, { ...updates, repository, rootPath, updatedAt: Date.now() });
    if (changes.changes === 0) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${id} not found`, status: 404 });
    const project = await this.db.findById(id);
    if (!project) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${id} disappeared`, status: 500 });
    return project;
  }

  async deleteProject(ctx: IContext<{ id: string }>): Promise<{ success: boolean }> {
    const res = await this.db.remove(ctx.params.id);
    return { success: res.changes > 0 };
  }

  async selectProject(ctx: IContext<{ id: string }>): Promise<Project> {
    // 1. Deactivate all
    const all = await this.db.find({});
    for (const p of all) {
      if (p.active) await this.db.update(p.id, { active: false });
    }

    // 2. Activate target
    const changes = await this.db.update(ctx.params.id, { active: true });
    if (changes.changes === 0) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${ctx.params.id} not found`, status: 404 });

    const project = await this.db.findById(ctx.params.id);
    if (!project) throw new MeshError({ code: 'NOT_FOUND', message: `Project ${ctx.params.id} disappeared!`, status: 500 });
    const bootstrappedProject = await this.ensureProjectWorkspace(project);

    this.logger.info(`[sys.projects] Switched active project to: ${bootstrappedProject.id} (${bootstrappedProject.rootPath})`);

    this.broker.emit('sys.projects.switched', bootstrappedProject);


    return bootstrappedProject;
  }

  async getActiveProject(_ctx: IContext<EmptyParams>): Promise<Project> {
    const project = await this.db.findOne({ active: true });
    if (!project) {
      // Fallback to first if none active
      const first = await this.db.findOne({});
      if (first) {
        const selected = await this.db.update(first.id, { active: true });
        if (selected.changes === 0) {
          throw new MeshError({ code: 'NOT_FOUND', message: `Project ${first.id} not found`, status: 404 });
        }
        const activeProject = await this.db.findById(first.id);
        if (!activeProject) {
          throw new MeshError({ code: 'NOT_FOUND', message: `Project ${first.id} disappeared`, status: 500 });
        }
        const bootstrappedProject = await this.ensureProjectWorkspace(activeProject);
        this.broker.emit('sys.projects.switched', bootstrappedProject);
        return bootstrappedProject;
      }
      throw new MeshError({ code: 'NOT_FOUND', message: 'No projects registered', status: 404 });
    }
    return this.ensureProjectWorkspace(project);
  }

  async getStatus(_ctx: IContext<EmptyParams>): Promise<ProjectStatus> {
    const active = await this.db.findOne({ active: true });
    const count = await this.db.count({});
    return {
      activeProjectId: active?.id,
      activeProjectRoot: active?.rootPath,
      projectCount: count
    };
}

  private async ensureProjectWorkspace(project: Project): Promise<Project> {
    if (!project.repository) {
      return project;
    }

    const rootPath = await this.ensureWorkspaceCheckout(project.id, project.repository);
    if (project.rootPath === rootPath) {
      return project;
    }

    await this.db.update(project.id, { rootPath, updatedAt: Date.now() });
    const updatedProject = await this.db.findById(project.id);
    if (!updatedProject) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Project ${project.id} disappeared`, status: 500 });
    }
    return updatedProject;
  }

  private async ensureWorkspaceCheckout(projectId: string, repository: string): Promise<string> {
    const workspacePath = path.join(this.workspaceRoot, projectId);
    const gitDir = path.join(workspacePath, '.git');

    await fs.mkdir(this.workspaceRoot, { recursive: true });

    const existingGitDir = await fs.stat(gitDir).then(() => true).catch(() => false);
    if (!existingGitDir) {
      const existingWorkspace = await fs.readdir(workspacePath).then((entries) => entries.length > 0).catch(() => false);
      if (existingWorkspace) {
        throw new MeshError({
          code: 'INVALID_STATE',
          message: `Workspace path '${workspacePath}' already exists and is not a git checkout.`,
          status: 409,
        });
      }

      await execAsync(`git clone ${this.quoteShellArg(repository)} ${this.quoteShellArg(workspacePath)}`);
      return workspacePath;
    }

    await execAsync(`git remote set-url origin ${this.quoteShellArg(repository)}`, { cwd: workspacePath });
    await execAsync('git fetch origin --prune', { cwd: workspacePath }).catch(() => undefined);
    return workspacePath;
  }

  private quoteShellArg(value: string): string {
    return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
  }
}

export default ProjectsService;
