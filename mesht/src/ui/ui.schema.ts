import { z } from 'zod';
import { CircuitBreakersSchema, EdgeSchema, FSMManifestSchema, FSMNodeSchema } from '../domains/sys.artifacts/artifacts.schema';
import { JSONObjectSchema } from '../shared/json.schema';

export const InspectorLogEntrySchema = z.object({
  type: z.enum(['thought', 'tool', 'verdict']),
  content: z.string(),
  timestamp: z.number(),
});

export type InspectorLogEntry = z.infer<typeof InspectorLogEntrySchema>;

export const InspectorPanelStateSchema = z.object({
  directiveID: z.string(),
  logs: z.array(InspectorLogEntrySchema).default([]),
  currentNode: z.string(),
  manifest: FSMManifestSchema.optional(),
});

export type InspectorPanelState = z.infer<typeof InspectorPanelStateSchema>;

export const ArtifactBuilderManifestStateSchema = z.object({
  initialNodeId: z.string(),
  sharedMemorySchemaStr: z.string(),
  circuitBreakers: CircuitBreakersSchema,
  nodes: z.array(FSMNodeSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
});

export type ArtifactBuilderManifestState = z.infer<typeof ArtifactBuilderManifestStateSchema>;

export const ArtifactBuilderTabSchema = z.enum(['general', 'nodes', 'edges', 'raw']);
export type ArtifactBuilderTab = z.infer<typeof ArtifactBuilderTabSchema>;

export const ArtifactBuilderStateSchema = z.object({
  editingId: z.string().nullable().optional(),
  createdAt: z.number().optional(),
  activeTab: ArtifactBuilderTabSchema.default('general'),
  type: z.enum(['capability', 'protocol']).default('protocol'),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string(),
  tags: z.string(),
  schemaStr: z.string(),
  manifest: ArtifactBuilderManifestStateSchema,
  rawJson: z.string(),
});

export type ArtifactBuilderState = z.infer<typeof ArtifactBuilderStateSchema>;

export const ArtifactRegisterPayloadSchema = z.object({
  name: z.string(),
  type: z.enum(['capability', 'protocol']),
  description: z.string(),
  metadata: z.object({
    version: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    createdAt: z.number().optional(),
  }),
  manifest: FSMManifestSchema.optional(),
  schema: JSONObjectSchema.optional(),
});

export type ArtifactRegisterPayload = z.infer<typeof ArtifactRegisterPayloadSchema>;
