import { z } from "zod";

export const SessionStateSchema = z.record(z.unknown());

export const SessionStepRequestSchema = z.object({
  raw_input_text: z.string().trim(),
  state_snapshot: SessionStateSchema.optional().default({}),
  debug: z.boolean().optional().default(false)
}).strict();

export type SessionStepRequest = z.infer<typeof SessionStepRequestSchema>;
