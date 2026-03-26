import { ILogger, IServiceBroker } from '@flybyme/isomorphic-core';
import { BaseRepository } from '@flybyme/isomorphic-database';
import { BuildRecordSchema } from './compiler.schema';

export interface ICompilerService {
    logger: ILogger;
    broker: IServiceBroker;
    db: BaseRepository<typeof BuildRecordSchema>;
}
