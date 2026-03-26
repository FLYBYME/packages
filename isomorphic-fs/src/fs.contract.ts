import { z } from 'zod';
import { ReadFileParams, WriteFileParams, ReadDirParams, StatParams, VirtualNodeSchema, FSSettingsSchema } from './fs.schema';

declare module '@flybyme/isomorphic-core' {
    interface IServiceActionRegistry {
        'fs.readFile': {
            params: typeof ReadFileParams;
            returns: z.ZodObject<{ data: z.ZodUnion<[z.ZodType<Uint8Array>, z.ZodString]> }>;
        };
        'fs.writeFile': {
            params: typeof WriteFileParams;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'fs.readdir': {
            params: typeof ReadDirParams;
            returns: z.ZodArray<typeof VirtualNodeSchema>;
        };
        'fs.stat': {
            params: typeof StatParams;
            returns: typeof VirtualNodeSchema;
        };
        'fs.mkdir': {
            params: z.ZodObject<{ path: z.ZodString, recursive: z.ZodOptional<z.ZodBoolean> }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'fs.unlink': {
            params: typeof StatParams;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'fs.openStream': {
            params: z.ZodObject<{ path: z.ZodString }>;
            returns: z.ZodObject<{ streamID: z.ZodString }>;
        };
        'fs.lock': {
            params: z.ZodObject<{ path: z.ZodString, ttl: z.ZodOptional<z.ZodNumber> }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'fs.unlock': {
            params: z.ZodObject<{ path: z.ZodString }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
        };
        'fs.rmdir': {
            params: z.ZodObject<{ path: z.ZodString, recursive: z.ZodOptional<z.ZodBoolean> }>;
            returns: z.ZodObject<{ success: z.ZodBoolean }>;
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
