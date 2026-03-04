import { z } from "zod";
import { SessionStateSchema } from "./session-step-schema";

const TurnOutputSchema = z
  .object({
    narration_text: z.string(),
    reference: z.string(),
    state: SessionStateSchema,
    reason_code: z.string().optional(),
    system_error_code: z.string().optional(),
    system_error_detail: z.string().optional(),
    debug: z.unknown().optional()
  })
  .strict();

export const SessionStepResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("noop"),
      next_state: SessionStateSchema
    })
    .strict(),
  z
    .object({
      kind: z.literal("exit"),
      next_state: SessionStateSchema
    })
    .strict(),
  z
    .object({
      kind: z.literal("system_ack"),
      text: z.string().min(1),
      next_state: SessionStateSchema
    })
    .strict(),
  z
    .object({
      kind: z.literal("onboarding_ack"),
      text: z.string().min(1),
      next_state: SessionStateSchema
    })
    .strict(),
  z
    .object({
      kind: z.literal("turn_result"),
      output: TurnOutputSchema,
      next_state: SessionStateSchema
    })
    .strict()
]);

export type SessionStepResponse = z.infer<typeof SessionStepResponseSchema>;
