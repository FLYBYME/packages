import { z } from 'zod';

export const TokenPayloadSchema = z.object({
    iss: z.string(),
    iat: z.number().optional(),
    exp: z.number().optional(),
    sub: z.string(),
    type: z.enum(['TGT', 'ST', 'join', 'attach']),
    capabilities: z.array(z.string()).optional(),
    aud: z.string().optional(),
    sessionKey: z.string().optional(),
    jti: z.string().optional(),
    tenant_id: z.string().optional()
});

export const LoginParams = z.object({
    nodeID: z.string(),
    signature: z.string(),
    nonce: z.string()
});

export const GetTicketParams = z.object({
    tgt: z.string(),
    targetNodeID: z.string()
});

export const AuthSettingsSchema = z.object({
    issuer: z.string().default('@flybyme/isomorphic-auth'),
    tokenTTL: z.number().default(3600),
    kdcPublicKey: z.string().optional()
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
export type AuthSettings = z.infer<typeof AuthSettingsSchema>;
