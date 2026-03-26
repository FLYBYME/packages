import { z } from 'zod';

/**
 * RedactionSchema — Defines fields that must be redacted from log payloads.
 */
export const RedactionSchema = z.object({
    password: z.string().optional(),
    token: z.string().optional(),
    secret: z.string().optional(),
    apiKey: z.string().optional(),
    creditCard: z.string().optional(),
    email: z.string().optional(),
});

/**
 * TagSanitizer — Utility to scrub sensitive data from objects before logging or exporting.
 */
export class TagSanitizer {
    private static readonly REDACTED = '[REDACTED]';
    
    // Derived from RedactionSchema shape plus common aliases.
    private static readonly SENSITIVE_KEYS = new Set([
        ...Object.keys(RedactionSchema.shape),
        'api_key', 'authorization', 'cc', 'passwd'
    ].map(k => k.toLowerCase()));

    /**
     * Sanitize an object recursively by redacting known sensitive keys.
     */
    public static sanitize(data: Record<string, unknown>, seen = new WeakSet(), depth = 0): Record<string, unknown> {
        if (depth > 10) return { '[MAX_DEPTH_REACHED]': true };
        
        if (seen.has(data)) {
            return { '[CIRCULAR_REFERENCE]': true };
        }
        seen.add(data);

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
                result[key] = this.REDACTED;
            } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.sanitize(value as Record<string, unknown>, seen, depth + 1);
            } else if (Array.isArray(value)) {
                result[key] = value.map(v => (v !== null && typeof v === 'object') ? this.sanitize(v as Record<string, unknown>, seen, depth + 1) : v);
            } else {
                result[key] = value;
            }
        }

        return result;
    }
}
