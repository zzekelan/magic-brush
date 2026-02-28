import type { z } from "zod";

export type ProviderTask = "judge" | "narrate";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateStructuredRequest<TSchema extends z.ZodTypeAny> = {
  task: ProviderTask;
  schemaName: string;
  schema: TSchema;
  messages: ProviderMessage[];
};

export type LlmProvider = {
  generateStructured<TSchema extends z.ZodTypeAny>(
    request: GenerateStructuredRequest<TSchema>
  ): Promise<z.infer<TSchema>>;
};
