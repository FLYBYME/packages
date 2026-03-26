import { z } from 'zod';

export const JSONValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSONValueSchema),
    z.record(JSONValueSchema),
  ])
);

export const JSONObjectSchema = z.record(JSONValueSchema);
export const JSONArraySchema = z.array(JSONValueSchema);

export type JSONValue = z.infer<typeof JSONValueSchema>;
export type JSONObject = z.infer<typeof JSONObjectSchema>;
export type JSONArray = z.infer<typeof JSONArraySchema>;
