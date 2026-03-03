import { z } from "zod";

export const SessionStepRequestSchema = z.object({
  raw_input_text: z.string().trim().min(1),
  state_snapshot: z.record(z.unknown()).optional().default({}),
  debug: z.boolean().optional().default(false)
});

export type SessionStepRequest = z.infer<typeof SessionStepRequestSchema>;
