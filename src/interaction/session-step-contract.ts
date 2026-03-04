import { z } from "zod";

export const SessionStateSchema = z.record(z.unknown());

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

export const SessionStepRequestSchema = z
  .object({
    raw_input_text: z.string().trim(),
    state_snapshot: SessionStateSchema.optional().default({}),
    debug: z.boolean().optional().default(false)
  })
  .strict();

export type SessionStepRequest = z.infer<typeof SessionStepRequestSchema>;

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
