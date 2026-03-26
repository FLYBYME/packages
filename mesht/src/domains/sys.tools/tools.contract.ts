// FILE: src/domains/sys.tools/tools.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  ToolSchema,
  RegisterToolParamsSchema,
  ResolveToolBeltParamsSchema,
  DisableToolParamsSchema,
  InvokeToolResultSchema,
  RegisterDynamicToolParamsSchema,
  DelegateToSpecialistParamsSchema,
  DelegateToSpecialistResultSchema,
  ToolsEmptyParamsSchema,
  SpecialistSettingsSchema,
  SpecialistSettingsUpdateParamsSchema,
} from './tools.schema';
import { z } from 'zod';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.tools', typeof ToolSchema> {
    'sys.tools.register': {
      params: typeof RegisterToolParamsSchema;
      returns: typeof ToolSchema;
    };

    'sys.tools.resolveToolBelt': {
      params: typeof ResolveToolBeltParamsSchema;
      returns: z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<'function'>;
        function: z.ZodObject<{
          name: z.ZodString;
          description: z.ZodString;
          parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }>;
      }>>;
    };

    'sys.tools.invoke': {
      params: typeof import('./tools.schema').InvokeToolParamsSchema;
      returns: typeof InvokeToolResultSchema;
    };

    'sys.tools.disable': {
      params: typeof DisableToolParamsSchema;
      returns: typeof ToolSchema;
    };

    'sys.tools.register_dynamic': {
      params: typeof RegisterDynamicToolParamsSchema;
      returns: typeof ToolSchema;
    };

    /**
     * Delegate a task to a CLI-based specialist (gemini, copilot, opencode).
     */
    'sys.tools.delegate_to_specialist': {
      params: typeof DelegateToSpecialistParamsSchema;
      returns: typeof DelegateToSpecialistResultSchema;
    };

    /**
     * Get global specialist worker settings.
     */
    'sys.tools.get_specialist_settings': {
      params: typeof ToolsEmptyParamsSchema;
      returns: typeof SpecialistSettingsSchema;
    };

    /**
     * Update global specialist worker settings.
     */
    'sys.tools.update_specialist_settings': {
      params: typeof SpecialistSettingsUpdateParamsSchema;
      returns: typeof SpecialistSettingsSchema;
    };
  }

  export interface IServiceEventRegistry {
    'sys.tools.registered': { id: string; name: string; category: string };
    'sys.tools.approval_requested': {
      approvalId: string;
      toolName: string;
      arguments: Record<string, unknown>;
      id?: string;
      personaId?: string;
      riskLevel: string;
      description: string;
    };
    'sys.tools.approval_resolved': { approvalId: string; toolName: string; approved: boolean; id?: string };

    // Specialist CLI Worker Events
    'sys.tools.specialist_start': { id?: string; specialist: string; model: string; timestamp: number };
    'sys.tools.specialist_log': { id?: string; specialist: string; stream: 'stdout' | 'stderr'; text: string };
    'sys.tools.specialist_complete': { id?: string; specialist: string; durationMs: number; exitCode: number };
  }
}
