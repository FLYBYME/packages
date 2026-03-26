// FILE: src/domains/sys.int.chroma/chroma.service.ts
import { IContext, ILogger, IServiceBroker, IServiceSchema, IMeshApp } from '@flybyme/isomorphic-core';
import {
  DeleteMemoryParams,
  DeleteMemoryParamsSchema,
  DeleteMemoryResult,
  MemoryEntry,
  QueryMemoryParams,
  QueryMemoryParamsSchema,
  QueryMemoryResult,
  StoreMemoryParams,
  StoreMemoryParamsSchema,
  StoreMemoryResult,
  UpdateMetadataParams,
  UpdateMetadataParamsSchema,
  UpdateMetadataResult,
} from './chroma.schema';

import './chroma.contract';

/**
 * ChromaService — The Long-Term Memory (RAG).
 *
 * Provides vector-like storage and semantic search for agents to
 * access their past behaviors, failures, and architectural maps.
 * Now with full CRUD for the Memory Explorer UI.
 */
export class ChromaService implements IServiceSchema {
  public readonly name = 'sys.int.chroma';
  public logger!: ILogger;
  public broker!: IServiceBroker;

  private chromaUrl = process.env.CHROMA_URL;
  private memory: MemoryEntry[] = [];

  public actions = {
    store_memory: {
      params: StoreMemoryParamsSchema,
      handler: this.storeMemory.bind(this),
    },
    query_memory: {
      params: QueryMemoryParamsSchema,
      handler: this.queryMemory.bind(this),
    },
    delete_memory: {
      params: DeleteMemoryParamsSchema,
      handler: this.deleteMemory.bind(this),
    },
    update_metadata: {
      params: UpdateMetadataParamsSchema,
      handler: this.updateMetadata.bind(this),
    },
    list_all: {
      handler: this.listAll.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    this.logger = _logger;
    if (this.chromaUrl) {
      this.logger.info(`[sys.int.chroma] Memory connected to: ${this.chromaUrl}`);
    } else {
      this.logger.info(`[sys.int.chroma] Memory initialized in local mock mode.`);
    }
  }

  async onInit(app: IMeshApp): Promise<void> {
    this.broker = app.getProvider<IServiceBroker>('broker');
    this.logger = app.getProvider<ILogger>('logger') || app.logger;
  }

  /**
   * Stores a new memory entry.
   */
  async storeMemory(ctx: IContext<StoreMemoryParams>): Promise<StoreMemoryResult> {
    const { content, metadata } = StoreMemoryParamsSchema.parse(ctx.params);
    const memoryId = crypto.randomUUID();

    if (this.chromaUrl) {
      try {
        const response = await fetch(`${this.chromaUrl}/api/v1/collections/mesht_memory/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [memoryId],
            documents: [content],
            metadatas: [{ ...metadata, createdAt: Date.now() }],
          }),
        });
        if (!response.ok) throw new Error(`Chroma returned ${response.status}`);
      } catch (err) {
        this.logger.warn(`[sys.int.chroma] Remote store failed, falling back to local: ${(err as Error).message}`);
      }
    }

    const entry = { id: memoryId, content, metadata: { ...metadata, createdAt: Date.now() } };
    this.memory.push(entry);

    this.logger.info(`[sys.int.chroma] Stored memory: ${memoryId.slice(0, 8)} (${content.length} bytes)`);
    return { id: memoryId };
  }

  /**
   * Performs semantic query on stored memories.
   */
  async queryMemory(ctx: IContext<QueryMemoryParams>): Promise<QueryMemoryResult> {
    const { query, limit } = QueryMemoryParamsSchema.parse(ctx.params);

    if (this.chromaUrl) {
      try {
        const response = await fetch(`${this.chromaUrl}/api/v1/collections/mesht_memory/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query_texts: [query], n_results: limit }),
        });
        if (response.ok) {
          const data = await response.json();
          return { results: (data.documents[0] || []).map((doc: string, idx: number) => ({
            id: data.ids[0][idx],
            content: doc,
            metadata: data.metadatas[0][idx] || {},
            similarityScore: 1 - (data.distances?.[0]?.[idx] || 0),
          })) };
        }
      } catch (err) {
        this.logger.warn(`[sys.int.chroma] Remote query failed: ${(err as Error).message}`);
      }
    }

    this.logger.info(`[sys.int.chroma] Falling back to local keyword search for: "${query}"`);
    const keywords = query.toLowerCase().split(' ');
    const results = this.memory
      .map(m => {
        const score = keywords.filter(k => m.content.toLowerCase().includes(k)).length;
        return { ...m, similarityScore: score / (keywords.length || 1) };
      })
      .filter(m => (m.similarityScore || 0) > 0)
      .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
      .slice(0, limit);

    return { results };
  }

  /**
   * Deletes a memory entry by ID.
   */
  async deleteMemory(ctx: IContext<DeleteMemoryParams>): Promise<DeleteMemoryResult> {
    const { id } = DeleteMemoryParamsSchema.parse(ctx.params);

    if (this.chromaUrl) {
      try {
        const response = await fetch(`${this.chromaUrl}/api/v1/collections/mesht_memory/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        if (!response.ok) throw new Error(`Chroma returned ${response.status}`);
      } catch (err) {
        this.logger.warn(`[sys.int.chroma] Remote delete failed: ${(err as Error).message}`);
      }
    }

    const before = this.memory.length;
    this.memory = this.memory.filter(m => m.id !== id);
    const deleted = before !== this.memory.length;

    this.logger.info(`[sys.int.chroma] Deleted memory: ${id.slice(0, 8)} (found: ${deleted})`);
    return { success: deleted, id };
  }

  /**
   * Updates metadata on a memory entry.
   */
  async updateMetadata(ctx: IContext<UpdateMetadataParams>): Promise<UpdateMetadataResult> {
    const { id, metadata } = UpdateMetadataParamsSchema.parse(ctx.params);

    if (this.chromaUrl) {
      try {
        const response = await fetch(`${this.chromaUrl}/api/v1/collections/mesht_memory/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id], metadatas: [metadata] }),
        });
        if (!response.ok) throw new Error(`Chroma returned ${response.status}`);
      } catch (err) {
        this.logger.warn(`[sys.int.chroma] Remote update failed: ${(err as Error).message}`);
      }
    }

    const entry = this.memory.find(m => m.id === id);
    if (entry) {
      entry.metadata = { ...entry.metadata, ...metadata };
      this.logger.info(`[sys.int.chroma] Updated metadata for: ${id.slice(0, 8)}`);
      return { success: true, id };
    }

    return { success: false, id };
  }

  /**
   * Lists all memories (for UI explorer).
   */
  async listAll(): Promise<QueryMemoryResult> {
    return { results: [...this.memory] };
  }
}

export default ChromaService;
