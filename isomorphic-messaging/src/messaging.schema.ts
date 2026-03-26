import { z } from 'zod';

/**
 * Standardized wrapper for all events transported across the mesh.
 */
export const MessageEnvelopeSchema = z.object({
    messageId: z.string(),
    topic: z.string(),
    payload: z.unknown(), // Validated at boundary or by consumer
    timestamp: z.number(),
    producerId: z.string(),
    meta: z.record(z.unknown()).optional()
});

export type IMessageEnvelope<TPayload = unknown> = z.infer<typeof MessageEnvelopeSchema> & {
    payload: TPayload;
};

/**
 * Configuration for topic listeners.
 */
export const SubscriptionOptionsSchema = z.object({
    consumerGroup: z.string().optional(),
    durable: z.boolean().optional(),
    ackTimeoutMs: z.number().default(5000)
});

export type ISubscriptionOptions = z.infer<typeof SubscriptionOptionsSchema>;

/**
 * Domain Service Schemas for Internal State
 */
export const TopicSubscriptionSchema = z.object({
    topic: z.string(),
    consumerGroup: z.string().optional(),
    nodeID: z.string(),
    isStream: z.boolean().default(false)
});

export type ITopicSubscription = z.infer<typeof TopicSubscriptionSchema>;
