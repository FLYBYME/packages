import { z } from 'zod';
import { MessageEnvelopeSchema, SubscriptionOptionsSchema } from './messaging.schema';

declare module '@flybyme/isomorphic-core' {
    export interface IServiceActionRegistry {
        'messaging.publish': {
            params: {
                topic: string;
                payload: unknown;
                options?: Record<string, unknown>;
            };
            returns: { success: boolean, messageId: string };
        };
        'messaging.subscribe': {
            params: {
                topic: string;
                options: z.infer<typeof SubscriptionOptionsSchema>;
            };
            returns: { success: boolean };
        };
    }

    export interface IServiceEventRegistry {
        'messaging.event.received': typeof MessageEnvelopeSchema;
        'messaging.dead_letter': z.ZodObject<{
            original: typeof MessageEnvelopeSchema;
            error: z.ZodString;
        }>;
    }
}

/**
 * Topic Descriptor Schema
 */
export const TopicDescriptorSchema = z.object({
    name: z.string(),
    schema: z.unknown(), // Zod schema for payload validation
});

export type ITopicDescriptor = z.infer<typeof TopicDescriptorSchema>;
