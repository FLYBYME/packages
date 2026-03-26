// FILE: src/domains/sys.catalog/catalog.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  CatalogModelSchema,
  CatalogModel,
  EnableModelParamsSchema,
  EnableModelParams,
  DeleteModelParamsSchema,
  DeleteModelParams,
  UpdateCapsParamsSchema,
  UpdateCapsParams,
  PingModelParamsSchema,
  PingModelParams,
  UpdateModelParamsSchema,
  UpdateModelParams,
  FindCatalogModelsParamsSchema,
  FindCatalogModelsParams,
} from './catalog.schema';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import { z } from 'zod';

import './catalog.contract';

const CatalogTable = defineTable('catalog_models', CatalogModelSchema);

/**
 * CatalogService — The LLM Model Registry.
 *
 * Manages the inventory of available LLM deployments across the grid.
 * Each model has an alias for routing, capabilities for persona matching,
 * and quotas for rate limiting.
 */
export class CatalogService extends DatabaseMixin(CatalogTable)(class { }) {
  public readonly name = 'sys.catalog';
  declare logger: ILogger;

  public actions = {
    enable: {
      params: EnableModelParamsSchema,
      returns: CatalogModelSchema,
      handler: this.enableModel.bind(this),
    },
    deleteModel: {
      params: DeleteModelParamsSchema,
      returns: z.object({ success: z.boolean(), alias: z.string() }),
      handler: this.deleteModelAction.bind(this),
    },
    updateCaps: {
      params: UpdateCapsParamsSchema,
      returns: z.object({ alias: z.string(), capabilities: z.array(z.string()) }),
      handler: this.updateCapsAction.bind(this),
    },
    ping: {
      params: PingModelParamsSchema,
      returns: z.object({ alias: z.string(), healthy: z.boolean(), latencyMs: z.number() }),
      handler: this.pingModel.bind(this),
    },
    find: {
      params: FindCatalogModelsParamsSchema,
      handler: async (ctx: IContext<FindCatalogModelsParams>): Promise<CatalogModel[]> => {
        const params = FindCatalogModelsParamsSchema.parse(ctx.params);
        return this.db.find(params.query, params.options);
      },
    },
    updateModel: {
      params: UpdateModelParamsSchema,
      returns: CatalogModelSchema,
      handler: this.updateModelAction.bind(this),
    }
  };

  constructor(_logger: ILogger) {
    super();
  }

  async enableModel(ctx: IContext<EnableModelParams>): Promise<CatalogModel> {
    const params = EnableModelParamsSchema.parse(ctx.params);

    const existing = await this.db.find({ alias: params.alias });
    if (existing.length > 0) {
      throw new MeshError({ code: 'CONFLICT', message: `Model '${params.alias}' already exists.`, status: 409 });
    }

    const now = Date.now();

    const record = await this.db.create({
      alias: params.alias,
      providerId: params.providerId,
      modelName: params.modelName,
      baseURL: params.baseURL,
      apiKey: params.apiKey,
      maxContextTokens: params.maxContextTokens,
      capabilities: params.capabilities,
      status: 'active',
      quotas: {
        maxTokensPerMinute: params.quotas?.maxTokensPerMinute ?? 100000,
        maxRequestsPerMinute: params.quotas?.maxRequestsPerMinute ?? 60,
        usedTokensThisCycle: 0,
        usedRequestsThisCycle: 0,
      },
      createdAt: now,
    });

    this.logger.info(`[sys.catalog] Enabled: ${params.alias} (${params.providerId}/${params.modelName})`);
    ctx.emit('sys.catalog.model_enabled', { alias: params.alias, providerId: params.providerId });

    return record as CatalogModel;
  }

  async deleteModelAction(ctx: IContext<DeleteModelParams>): Promise<{ success: boolean; alias: string }> {
    const { alias } = DeleteModelParamsSchema.parse(ctx.params);

    const existing = await this.db.find({ alias });
    if (existing.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Model '${alias}' not found.`, status: 404 });
    }

    await this.db.removeMany({ alias });
    this.logger.info(`[sys.catalog] Deleted: ${alias}`);
    ctx.emit('sys.catalog.model_deleted', { alias });

    return { success: true, alias };
  }

  async updateCapsAction(ctx: IContext<UpdateCapsParams>): Promise<{ alias: string; capabilities: string[] }> {
    const { alias, addCapabilities, removeCapabilities } = UpdateCapsParamsSchema.parse(ctx.params);

    const existing = await this.db.find({ alias });
    if (existing.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Model '${alias}' not found.`, status: 404 });
    }

    const model = existing[0];
    const caps = new Set<string>(model.capabilities || []);

    for (const cap of addCapabilities) caps.add(cap);
    for (const cap of removeCapabilities) caps.delete(cap);

    const updated = [...caps];
    await this.db.updateMany({ alias }, { capabilities: updated });

    this.logger.info(`[sys.catalog] Caps updated for ${alias}: [${updated.join(', ')}]`);
    return { alias, capabilities: updated };
  }

  async pingModel(ctx: IContext<PingModelParams>): Promise<{ alias: string; healthy: boolean; latencyMs: number }> {
    const { alias } = PingModelParamsSchema.parse(ctx.params);

    const existing = await this.db.find({ alias });
    if (existing.length === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Model '${alias}' not found.`, status: 404 });
    }

    const model = existing[0];
    const startMs = Date.now();
    let healthy = false;

    if (model.providerId === 'specialist-cli') {
      // Specialist CLI models are local binaries, not network services.
      healthy = true;
    } else {
      try {
        let baseUrl = model.baseURL || (model.providerId === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
        baseUrl = baseUrl.replace(/\/+$/, '');

        // Ensure /v1 suffix for standard OpenAI-compatible chat endpoints
        if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
          baseUrl += '/v1';
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': model.apiKey ? `Bearer ${model.apiKey}` : '',
          },
          body: JSON.stringify({
            model: model.modelName,
            messages: [{ role: 'user', content: 'hello' }],
            max_tokens: 1
          }),
          signal: AbortSignal.timeout(10000),
        });

        healthy = response.ok;
        if (!healthy) {
          const text = await response.text();
          this.logger.warn(`[sys.catalog] Ping ${alias} failed (${response.status}): ${text.slice(0, 100)}`);
        }
      } catch (err) {
        if (err instanceof Error) {
          this.logger.warn(`[sys.catalog] Ping ${alias} error: ${err.message}`);
        } else {
          this.logger.warn(`[sys.catalog] Ping ${alias} error: unknown error`);
        }
        healthy = false;
      }
    }

    const latencyMs = Date.now() - startMs;

    await this.db.updateMany({ id: model.id }, {
      lastHealthCheck: Date.now(),
      status: healthy ? 'active' : 'error',
    });

    this.logger.info(`[sys.catalog] Ping ${alias}: ${healthy ? 'HEALTHY' : 'UNREACHABLE'} (${latencyMs}ms)`);
    return { alias, healthy, latencyMs };
  }

  async updateModelAction(ctx: IContext<UpdateModelParams>): Promise<CatalogModel> {
    const { id, ...updates } = UpdateModelParamsSchema.parse(ctx.params);

    const changes = await this.db.update(id, updates);
    if (changes.changes === 0) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Model with ID '${id}' not found.`, status: 404 });
    }

    const updated = await this.db.findById(id);
    if (!updated) throw new MeshError({ code: 'NOT_FOUND', message: 'Model disappeared during update.', status: 500 });

    this.logger.info(`[sys.catalog] Updated: ${updated.alias}`);
    return updated;
  }
}

export default CatalogService;
