import { z } from "zod";

export const TurnRequestSchema = z.object({
  raw_input_text: z.string().trim().min(1),
  state_snapshot: z.record(z.unknown()).optional().default({}),
  debug: z.boolean().optional().default(false)
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;
