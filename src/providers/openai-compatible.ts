import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { GenerateStructuredRequest, LlmProvider, ProviderMessage } from "./types";

type CompletionCreateInput = {
  model: string;
  messages: ProviderMessage[];
  response_format: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
};

type CompletionCreateOutput = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type CompletionCreate = (input: CompletionCreateInput) => Promise<CompletionCreateOutput>;

export class OpenAICompatibleProvider implements LlmProvider {
  private readonly model: string;
  private readonly createCompletion: CompletionCreate;

  constructor(input: { model: string; createCompletion: CompletionCreate }) {
    this.model = input.model;
    this.createCompletion = input.createCompletion;
  }

  static fromConfig(input: { baseUrl: string; apiKey: string; model: string }) {
    const client = new OpenAI({
      baseURL: input.baseUrl,
      apiKey: input.apiKey
    });

    return new OpenAICompatibleProvider({
      model: input.model,
      createCompletion: async (request) =>
        client.chat.completions.create(request as never) as Promise<CompletionCreateOutput>
    });
  }

  async generateStructured<TSchema extends z.ZodTypeAny>(
    request: GenerateStructuredRequest<TSchema>
  ): Promise<z.infer<TSchema>> {
    const completion = await this.createCompletion({
      model: this.model,
      messages: request.messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: request.schemaName,
          strict: true,
          schema: zodToJsonSchema(request.schema, request.schemaName) as Record<string, unknown>
        }
      }
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Structured output unavailable from provider");
    }

    return request.schema.parse(JSON.parse(content));
  }
}
