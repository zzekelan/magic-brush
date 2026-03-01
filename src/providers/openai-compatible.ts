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
  private readonly requestTimeoutMs: number;

  constructor(input: {
    model: string;
    createCompletion: CompletionCreate;
    requestTimeoutMs?: number;
  }) {
    this.model = input.model;
    this.createCompletion = input.createCompletion;
    this.requestTimeoutMs = input.requestTimeoutMs ?? 30000;
  }

  static fromConfig(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
  }) {
    const client = new OpenAI({
      baseURL: input.baseUrl,
      apiKey: input.apiKey,
      timeout: input.timeoutMs
    });

    return new OpenAICompatibleProvider({
      model: input.model,
      requestTimeoutMs: input.timeoutMs,
      createCompletion: async (request) =>
        client.chat.completions.create(request as never) as Promise<CompletionCreateOutput>
    });
  }

  async generateStructured<TSchema extends z.ZodTypeAny>(
    request: GenerateStructuredRequest<TSchema>
  ): Promise<z.infer<TSchema>> {
    const completion = await Promise.race([
      this.createCompletion({
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
      }),
      new Promise<CompletionCreateOutput>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`Provider request timed out after ${this.requestTimeoutMs}ms`)
            ),
          this.requestTimeoutMs
        );
      })
    ]);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Structured output unavailable from provider");
    }

    return request.schema.parse(JSON.parse(content));
  }
}
