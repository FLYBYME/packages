import { 
    IServiceBroker, 
    IContext, 
    NodeInfo 
} from '@flybyme/isomorphic-core';
import { IDatabaseAdapter } from '@flybyme/isomorphic-database';
import { IMessageEnvelope, ISubscriptionOptions } from '../messaging.schema';
import { nanoid } from 'nanoid';

/**
 * TopicRouter — Implementation of Selective Forwarding and Subscription Gossip.
 */
export class TopicRouter {
    private localSubscriptions = new Map<string, Array<{ 
        handler: (ctx: IContext<unknown, Record<string, unknown>>) => Promise<void>,
        options?: ISubscriptionOptions
    }>>();

    constructor(private broker: IServiceBroker) {
        // Listen to inbound messaging events
        this.broker.on('messaging.dispatch', (payload: IMessageEnvelope) => this.handleInbound(payload));
    }

    /**
     * Deduplication using isomorphic-kv.
     * Prevents processing the same messageId within a TTL window.
     */
    private async isDuplicate(id: string): Promise<boolean> {
        try {
            const kv = this.broker.app.getProvider<{ 
                get(ctx: { params: { key: string } }): Promise<unknown>;
                set(ctx: { params: { key: string, value: unknown, ttlMs: number } }): Promise<void>;
            }>('kv');
            if (!kv) return false;

            const existing = await kv.get({ params: { key: `msg_dedup:${id}` } });
            if (existing) return true;

            await kv.set({ params: { key: `msg_dedup:${id}`, value: true, ttlMs: 300000 } }); // 5 min TTL
            return false;
        } catch {
            return false; // Fallback to allowing duplicates if KV is down
        }
    }

    /**
     * Registers a local subscription and Gossips it to the mesh.
     */
    public subscribe(
        topic: string, 
        handler: (ctx: IContext<unknown, Record<string, unknown>>) => Promise<void>, 
        options?: ISubscriptionOptions
    ): string {
        const id = nanoid();
        const subs = this.localSubscriptions.get(topic) || [];
        subs.push({ handler, options });
        this.localSubscriptions.set(topic, subs);

        // Gossip: Inform registry about this subscription
        this.updateRegistryMetadata();
        return id;
    }

    /**
     * Updates the local NodeInfo metadata to include subscribed topics.
     */
    private updateRegistryMetadata(): void {
        const topics = Array.from(this.localSubscriptions.keys());
        const localNode = this.broker.registry.getNode(this.broker.app.nodeID);
        
        if (localNode) {
            const updatedNode: NodeInfo = {
                ...localNode,
                metadata: {
                    ...localNode.metadata,
                    subscriptions: topics
                }
            };
            this.broker.registry.registerNode(updatedNode);
        }
    }

    /**
     * Publishes a message to all (or group-sampled) subscribers in the mesh.
     */
    public async publish<T>(topic: string, payload: T): Promise<void> {
        const envelope: IMessageEnvelope<T> = {
            messageId: nanoid(),
            topic,
            payload,
            timestamp: Date.now(),
            producerId: this.broker.app.nodeID
        };

        const targetNodes = this.resolveSubscribers(topic);
        
        for (const nodeID of targetNodes) {
            if (nodeID === this.broker.app.nodeID) {
                // Local delivery
                this.handleInbound(envelope as unknown as IMessageEnvelope).catch(err => {
                    this.broker.logger.error(`Local subscriber failed for topic ${topic}: ${err.message}`);
                });
            } else {
                // Remote delivery
                this.broker.executeRemote(nodeID, 'messaging.dispatch', envelope).catch(err => {
                    this.broker.logger.warn(`Failed to dispatch message to node ${nodeID}: ${err.message}`);
                });
            }
        }
    }

    /**
     * Resolves nodeIDs subscribed to a topic, handling Consumer Groups if specified.
     */
    private resolveSubscribers(topic: string): string[] {
        const allNodes = this.broker.registry.getNodes();
        const subscribers: string[] = [];

        for (const node of allNodes) {
            const subs = (node.metadata?.subscriptions as string[]) || [];
            if (subs.includes(topic)) {
                // Check if this node belongs to a consumer group for this topic
                // In a real implementation, the subscription metadata would include group info.
                // For simplicity, we assume fan-out unless specified.
                subscribers.push(node.nodeID);
            }
        }

        return subscribers;
    }

    /**
     * Processes an inbound message, handling deduplication and context hydration.
     */
    public async handleInbound(envelope: IMessageEnvelope): Promise<void> {
        // Idempotency: Drop if already processed
        if (await this.isDuplicate(envelope.messageId)) {
            this.broker.logger.debug(`[Messaging] Dropped duplicate message: ${envelope.messageId}`);
            return;
        }

        const handlers = this.localSubscriptions.get(envelope.topic);
        if (!handlers) return;

        // Task: Deduplication Strategy (Short-lived cache)
        // ... (Would use isomorphic-kv here)

        const broker = this.broker;
        for (const { handler } of handlers) {
            // Reconstruct context
            const ctx: IContext<unknown, Record<string, unknown>> = {
                id: envelope.messageId,
                correlationID: envelope.messageId,
                actionName: `event:${envelope.topic}`,
                params: envelope.payload,
                meta: { ...envelope.meta, producerId: envelope.producerId } as Record<string, unknown>,
                callerID: envelope.producerId,
                nodeID: broker.app.nodeID,
                traceId: (envelope.meta?.traceId as string) || nanoid(),
                spanId: nanoid(),
                get db() { return broker.app.getProvider<IDatabaseAdapter>('db')!; },
                call: (a: string, p: Record<string, unknown>) => broker.call(a as unknown as never, p),
                emit: (e: string, p: Record<string, unknown>) => broker.emit(e as unknown as never, p)
            } as unknown as IContext<unknown, Record<string, unknown>>;

            // Execute handler within context
            try {
                await handler(ctx);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.broker.logger.error(`Subscriber error for ${envelope.topic}: ${msg}`);
                // DLQ Integration would happen here
            }
        }
    }
}
