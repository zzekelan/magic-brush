import { z } from "zod";
import { ReasonCodeSchema } from "./reason-codes";

const JudgeBaseSchema = z
  .object({
    internal_reason: z.string().min(1),
    confidence: z.number().min(0).max(1),
    ref_from_judge: z.string().min(1)
  })
  .strict();

const JudgeApproveSchema = JudgeBaseSchema.extend({
  verdict: z.literal("approve"),
  reason_code: z.literal("APPROVED")
}).strict();

const JudgeRejectSchema = JudgeBaseSchema.extend({
  verdict: z.literal("reject"),
  reason_code: ReasonCodeSchema.exclude(["APPROVED"])
}).strict();

export const JudgeOutputSchema = z.discriminatedUnion("verdict", [
  JudgeApproveSchema,
  JudgeRejectSchema
]);

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
