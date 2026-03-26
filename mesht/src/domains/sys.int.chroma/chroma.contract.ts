import {
  StoreMemoryParamsSchema,
  QueryMemoryParamsSchema,
  DeleteMemoryParamsSchema,
  UpdateMetadataParamsSchema,
  StoreMemoryResultSchema,
  QueryMemoryResultSchema,
  DeleteMemoryResultSchema,
  UpdateMetadataResultSchema,
  ListAllMemoriesParamsSchema,
} from './chroma.schema';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry {
    'sys.int.chroma.store_memory': {
      params: typeof StoreMemoryParamsSchema,
      returns: typeof StoreMemoryResultSchema;
    };
    'sys.int.chroma.query_memory': {
      params: typeof QueryMemoryParamsSchema,
      returns: typeof QueryMemoryResultSchema;
    };
    'sys.int.chroma.delete_memory': {
      params: typeof DeleteMemoryParamsSchema,
      returns: typeof DeleteMemoryResultSchema;
    };
    'sys.int.chroma.update_metadata': {
      params: typeof UpdateMetadataParamsSchema,
      returns: typeof UpdateMetadataResultSchema;
    };
    'sys.int.chroma.list_all': {
      params: typeof ListAllMemoriesParamsSchema,
      returns: typeof QueryMemoryResultSchema;
    };
  }
}
