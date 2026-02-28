import { z } from "zod";
import { ReasonCodeSchema } from "./reason-codes";

export const JudgeOutputSchema = z.object({
  verdict: z.enum(["approve", "reject"]),
  reason_code: ReasonCodeSchema,
  internal_reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  state_patch: z.unknown().optional(),
  suggested_alternatives: z.array(z.string().min(1)).max(5).optional()
});

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
