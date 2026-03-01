import { z } from "zod";

export const NarrateOutputSchema = z
  .object({
    narration_text: z.string().min(1),
    reference: z.string().min(1)
  })
  .strict();

export type NarrateOutput = z.infer<typeof NarrateOutputSchema>;
