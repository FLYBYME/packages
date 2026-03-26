// FILE: src/domains/sys.forge/forge.contract.ts
import { z } from 'zod';
import { 
  ForgeToolSchema, 
  ProposeToolParamsSchema, 
  ApproveToolParamsSchema, 
  ExecuteForgedToolParamsSchema 
} from './forge.schema';

declare module '@flybyme/isomorphic-core' {
  interface IServiceActionRegistry {
    /**
     * Propose a new tool for the forge.
     */
    'sys.forge.propose': {
      params: typeof ProposeToolParamsSchema;
      returns: typeof ForgeToolSchema;
    };

    /**
     * List forged tools.
     */
    'sys.forge.list': {
      params: z.ZodObject<{ status: z.ZodOptional<typeof import('./forge.schema').ForgeStatusEnum> }>;
      returns: z.ZodArray<typeof ForgeToolSchema>;
    };

    /**
     * Approve or quarantine a forged tool.
     */
    'sys.forge.approve': {
      params: typeof ApproveToolParamsSchema;
      returns: typeof ForgeToolSchema;
    };

    /**
     * Execute a forged tool in the isolated sandbox.
     */
    'sys.forge.execute': {
      params: typeof ExecuteForgedToolParamsSchema;
      returns: z.ZodObject<{ success: z.ZodBoolean; result: z.ZodAny; error: z.ZodOptional<z.ZodString> }>;
    };
  }

  interface IServiceEventRegistry {
    'sys.forge.tool_proposed': { id: string; name: string };
    'sys.forge.tool_activated': { id: string; name: string };
  }
}
