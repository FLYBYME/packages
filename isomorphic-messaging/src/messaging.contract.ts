import { z } from 'zod';
import { MessageEnvelopeSchema, SubscriptionOptionsSchema } from './messaging.schema';

declare module '@flybyme/isomorphic-core' {
    export interface IServiceActionRegistry {
        'messaging.publish': {
            params: z.ZodObject<{
                topic: z.ZodString;
                payload: z.ZodUnknown;
                options?: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }>;
            returns: z.ZodObject<{ success: z.ZodBoolean, messageId: z.ZodString }>;
        };
        'messaging.subscribe': {
            params: z.ZodObject<{
                topic: z.ZodString;
                options: typeof SubscriptionOptionsSchema;
            }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
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
