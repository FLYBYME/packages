import { z } from 'zod';
import { IContext, ILogger, MeshError } from '@flybyme/isomorphic-core';
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import { MeshStream } from '@flybyme/isomorphic-streams';
import { TopicSubscriptionSchema, ISubscriptionOptions } from './messaging.schema';
import { TopicRouter } from './core/TopicRouter';

const SubscriptionTable = defineTable('messaging_subscriptions', TopicSubscriptionSchema);

/**
 * MessagingService — Domain management for Pub/Sub.
 */
export class MessagingService extends DatabaseMixin(SubscriptionTable)(class {}) {
    public readonly name = 'messaging';
    private router?: TopicRouter;

    public actions = {
        publish: { 
            params: z.object({ topic: z.string(), payload: z.unknown() }),
            handler: this.publish.bind(this) 
        },
        subscribe: { 
            params: z.object({ topic: z.string(), options: z.unknown().optional() }), // Change later to strict schema
            handler: this.subscribe.bind(this) 
        },
        listSubscriptions: { 
            handler: this.listSubscriptions.bind(this) 
        }
    };

    constructor(private logger: ILogger) {
        super();
    }

    async onInit(app: { getProvider<T>(token: string): T }): Promise<void> {
        await super.onInit(app as unknown as import('@flybyme/isomorphic-core').IMeshApp);
    }

    /**
     * Publishes a message via the service layer.
     */
    async publish(ctx: IContext<{ topic: string, payload: unknown }>): Promise<{ success: boolean }> {
        const broker = this.broker as unknown as { publish: (topic: string, payload: unknown) => Promise<void> };
        if (!broker.publish) throw new MeshError({ 
            message: 'Messaging capabilities not injected in broker.', 
            code: 'CORE_ERROR',
            status: 500
        });
        
        await broker.publish(ctx.params.topic, ctx.params.payload);
        return { success: true };
    }

    /**
     * Internal: Tracks subscriptions in the database for persistence/durability.
     */
    async subscribe(ctx: IContext<{ topic: string, options?: ISubscriptionOptions }>): Promise<{ success: boolean }> {
        await this.db.create({
            topic: ctx.params.topic,
            nodeID: ctx.nodeID,
            consumerGroup: ctx.params.options?.consumerGroup
        });
        return { success: true };
    }

    async listSubscriptions(ctx: IContext<Record<string, unknown>>): Promise<unknown[]> {
        return this.db.find({ nodeID: ctx.nodeID });
    }

    /**
     * Stream Integration: Factory for high-throughput stream-based consumers.
     */
    public createSubscriptionStream<T>(topic: string): MeshStream<T> {
        const stream = new MeshStream<T>({ id: `sub:${topic}` });
        
        this.broker.on(topic, async (payload: unknown) => {
            // Push to stream. Native backpressure is handled by the MeshStream internally.
            await stream.write(payload as T);
        });

        return stream;
    }
}
