import { z } from "zod";

export const ReasonCodeSchema = z.enum([
  "APPROVED",
  "RULE_CONFLICT",
  "MISSING_PREREQ",
  "OUT_OF_SCOPE_ACTION",
  "SAFETY_BLOCKED"
]);

export type ReasonCode = z.infer<typeof ReasonCodeSchema>;
