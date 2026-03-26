import { IBrokerPlugin, IServiceBroker, IContext } from '@flybyme/isomorphic-core';
import { MeshStream } from '@flybyme/isomorphic-streams';
import { TopicRouter } from './core/TopicRouter';
import { ISubscriptionOptions, IMessageEnvelope } from './messaging.schema';

/**
 * Global IServiceBroker Augmentation
 * Extends the core broker with messaging primitives.
 * * FIX: Changed from Method Signatures (publish()) to Function Property 
 * Signatures (publish: () => void). This tells TypeScript these are 
 * dynamic properties assigned at runtime, eliminating the need for `any`.
 */
declare module '@flybyme/isomorphic-core' {
    export interface IServiceBroker {
        publish: <T>(topic: string, payload: T) => Promise<void>;
        subscribe: <T>(
            topic: string,
            handler: (ctx: IContext<T, Record<string, unknown>>) => Promise<void>,
            options?: ISubscriptionOptions
        ) => string;
        subscribeStream: <T>(topic: string) => MeshStream<T>;
    }
}

/**
 * MessagingPlugin — Mixes Pub/Sub capabilities into the ServiceBroker.
 */
export class MessagingPlugin implements IBrokerPlugin {
    public readonly name = 'messaging';
    private router!: TopicRouter;

    onRegister(broker: IServiceBroker): void {
        this.router = new TopicRouter(broker);

        // NO redundant casts (broker as IServiceBroker)
        // NO 'any' casts required because the interface now expects properties

        broker.publish = <T>(topic: string, payload: T) => {
            return this.router.publish(topic, payload);
        };

        broker.subscribe = <T>(
            topic: string,
            handler: (ctx: IContext<T, Record<string, unknown>>) => Promise<void>,
            options?: ISubscriptionOptions
        ) => {
            return this.router.subscribe(topic, handler as (ctx: IContext<unknown, Record<string, unknown>>) => Promise<void>, options);
        };

        broker.subscribeStream = <T>(topic: string): MeshStream<T> => {
            const streamID = `sub:${topic}`;

            // FIX: Explicitly declare the type and separate declaration from initialization
            // to resolve the circular reference/implicit any error (7022).
            const s = new MeshStream<T>({
                id: streamID,
                // FIX: Use unknown to match library interface (2322) and add explicit return type (7023).
                onWrite: async (data: unknown): Promise<void> => {
                    // We assert to T here as we are bridging the library's unknown boundary 
                    // to our strictly typed MeshStream<T>.
                    s.push(data as T);
                }
            });

            this.router.subscribe(topic, (async (ctx: IContext<T, Record<string, unknown>>) => {
                await s.write(ctx.params);
            }) as (ctx: IContext<unknown, Record<string, unknown>>) => Promise<void>);

            return s;
        };

        // Internal RPC action to handle remote dispatches
        broker.registerService({
            name: 'messaging',
            actions: {
                dispatch: {
                    // Properly using IMessageEnvelope to resolve the assignability error
                    handler: async (ctx: IContext<IMessageEnvelope, Record<string, unknown>>) => {
                        return this.router.handleInbound(ctx.params);
                    }
                }
            }
        });
    }

    async onStart(broker: IServiceBroker): Promise<void> {
        broker.logger.info('[MessagingPlugin] Advanced routing initialized.');
    }
}