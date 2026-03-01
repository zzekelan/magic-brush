import { z } from "zod";
import { ReasonCodeSchema } from "./reason-codes";

const JudgeBaseSchema = z
  .object({
    reason_code: ReasonCodeSchema,
    internal_reason: z.string().min(1),
    confidence: z.number().min(0).max(1),
    ref_from_judge: z.string().min(1)
  })
  .strict();

const JudgeApproveSchema = JudgeBaseSchema.extend({
  verdict: z.literal("approve")
}).strict();

const JudgeRejectSchema = JudgeBaseSchema.extend({
  verdict: z.literal("reject")
}).strict();

export const JudgeOutputSchema = z.discriminatedUnion("verdict", [
  JudgeApproveSchema,
  JudgeRejectSchema
]);

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
