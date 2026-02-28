import { z } from "zod";

export const NarrateOutputSchema = z.object({
  narration_text: z.string().min(1),
  visible_choices: z.array(z.string().min(1)).max(6).optional()
});

export type NarrateOutput = z.infer<typeof NarrateOutputSchema>;
