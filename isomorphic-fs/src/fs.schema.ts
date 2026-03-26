import { z } from 'zod';

/**
 * FSPermissionSchema — Defines RBAC bitmask for file operations.
 */
export const FSPermissionSchema = z.object({
    owner: z.string(),
    group: z.string(),
    mode: z.number().int().min(0).max(777).default(644), // unix-style octal
});

/**
 * Global Metadata for all FS nodes.
 */
export const MeshFileMetaSchema = z.object({
    ownerID: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    permissions: FSPermissionSchema,
    lockedBy: z.string().optional(),
    tags: z.record(z.string()).optional(),
});

/**
 * Virtual Node Types.
 */
export const VNodeTypeSchema = z.enum(['file', 'directory', 'symlink']);

/**
 * IVirtualNode — The base schema for all filesystem entries.
 */
export const VirtualNodeSchema = z.object({
    id: z.string(),
    name: z.string().regex(/^[a-zA-Z0-9._-]+$/, 'Illegal characters in name'),
    path: z.string().startsWith('/'),
    type: VNodeTypeSchema,
    size: z.number().nonnegative(),
    hash: z.string().optional(), // SHA-256 for integrity
    metadata: MeshFileMetaSchema,
});

/**
 * DirectoryNodeSchema — Specifically for directory listings.
 */
export const DirectoryNodeSchema = VirtualNodeSchema.extend({
    type: z.literal('directory'),
    children: z.array(z.string()).optional(), // List of child IDs or names
});

/**
 * FileNodeSchema — Specifically for files.
 */
export const FileNodeSchema = VirtualNodeSchema.extend({
    type: z.literal('file'),
    mimeType: z.string().default('application/octet-stream'),
});

/**
 * Action Parameter Schemas.
 */
export const ReadFileParams = z.object({
    path: z.string(),
    encoding: z.enum(['utf8', 'binary', 'base64']).default('binary'),
});

export const WriteFileParams = z.object({
    path: z.string(),
    data: z.instanceof(Uint8Array).or(z.string()),
    options: z.object({
        flag: z.string().optional(),
        mode: z.number().optional(),
    }).optional(),
});

export const ReadDirParams = z.object({
    path: z.string(),
});

export const StatParams = z.object({
    path: z.string(),
});

/**
 * Settings Schema.
 */
export const FSSettingsSchema = z.object({
    defaultDrive: z.string().default('local'),
    mountPoints: z.record(z.string()).default({}), // path -> nodeID
    maxFileSize: z.number().default(100 * 1024 * 1024), // 100MB
});

export type VirtualNode = z.infer<typeof VirtualNodeSchema>;
export type MeshFileMeta = z.infer<typeof MeshFileMetaSchema>;
export type FileNode = z.infer<typeof FileNodeSchema>;
export type DirectoryNode = z.infer<typeof DirectoryNodeSchema>;
export type FSSettings = z.infer<typeof FSSettingsSchema>;
