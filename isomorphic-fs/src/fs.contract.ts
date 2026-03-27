import { z } from 'zod';
import { ReadFileParams, WriteFileParams, ReadDirParams, StatParams, VirtualNodeSchema, FSSettingsSchema } from './fs.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'fs.readFile': {
            params: z.infer<typeof ReadFileParams>;
            returns: { data: Uint8Array | string };
        };
        'fs.writeFile': {
            params: z.infer<typeof WriteFileParams>;
            returns: { success: boolean };
        };
        'fs.readdir': {
            params: z.infer<typeof ReadDirParams>;
            returns: z.infer<typeof VirtualNodeSchema>[];
        };
        'fs.stat': {
            params: z.infer<typeof StatParams>;
            returns: z.infer<typeof VirtualNodeSchema>;
        };
        'fs.mkdir': {
            params: { path: string, recursive?: boolean };
            returns: { success: boolean };
        };
        'fs.unlink': {
            params: z.infer<typeof StatParams>;
            returns: { success: boolean };
        };
        'fs.openStream': {
            params: { path: string };
            returns: { streamID: string };
        };
        'fs.lock': {
            params: { path: string, ttl?: number };
            returns: { success: boolean };
        };
        'fs.unlock': {
            params: { path: string };
            returns: { success: boolean };
        };
        'fs.rmdir': {
            params: { path: string, recursive?: boolean };
            returns: { success: boolean };
        };
    }

    interface ISettingsRegistry {
        'fs': typeof FSSettingsSchema;
    }
}

export const FSContract = {
    name: 'fs',
    actions: {
        readFile: {
            params: ReadFileParams,
            returns: z.object({ data: z.union([z.instanceof(Uint8Array), z.string()]) })
        },
        writeFile: {
            params: WriteFileParams,
            returns: z.object({ success: z.boolean() })
        },
        readdir: {
            params: ReadDirParams,
            returns: z.array(VirtualNodeSchema)
        },
        stat: {
            params: StatParams,
            returns: VirtualNodeSchema
        },
        mkdir: {
            params: z.object({ path: z.string(), recursive: z.boolean().optional() }),
            returns: z.object({ success: z.boolean() })
        },
        unlink: {
            params: StatParams,
            returns: z.object({ success: z.boolean() })
        }
    }
};
