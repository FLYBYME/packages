import { IProviderToken } from '../interfaces/IProviderToken';
import { IServiceBroker } from '../interfaces/IServiceBroker';
import { ILogger } from '../interfaces/ILogger';
import { IMeshNetwork } from '../interfaces/IMeshNetwork';
import { IMeshApp } from '../interfaces/IMeshApp';
import { IServiceRegistry } from '../interfaces/IServiceRegistry';

/**
 * Factory function to securely generate strongly-typed injection tokens.
 */
export function createToken<T>(name: string): IProviderToken<T> {
    // A single, contained assertion to satisfy the brand signature, 
    // completely eliminating 'unknown' casts from the codebase.
    return name as IProviderToken<T>;
}

/**
 * Injection Tokens for core framework components.
 */
export const TOKENS = {
    BROKER: createToken<IServiceBroker>('broker'),
    LOGGER: createToken<ILogger>('logger'),
    NETWORK: createToken<IMeshNetwork>('network'),
    APP: createToken<IMeshApp>('app'),
    REGISTRY: createToken<IServiceRegistry>('registry')
};