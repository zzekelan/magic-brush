import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type {
  GenerateStructuredRequest,
  GenerateStructuredResult,
  LlmProvider,
  ProviderMessage
} from "./types";

type CompletionCreateInput = {
  model: string;
  temperature: number;
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
  usage?: {
    total_tokens?: number;
  };
};

type CompletionCreate = (input: CompletionCreateInput) => Promise<CompletionCreateOutput>;
type TimeoutHandle = ReturnType<typeof setTimeout>;
type TimerApi = {
  setTimeout: (callback: () => void, timeoutMs: number) => TimeoutHandle;
  clearTimeout: (handle: TimeoutHandle) => void;
};

export class OpenAICompatibleProvider implements LlmProvider {
  private readonly model: string;
  private readonly createCompletion: CompletionCreate;
  private readonly requestTimeoutMs: number;
  private readonly judgeTemperature: number;
  private readonly narrateTemperature: number;
  private readonly timerApi: TimerApi;

  constructor(input: {
    model: string;
    createCompletion: CompletionCreate;
    requestTimeoutMs?: number;
    judgeTemperature?: number;
    narrateTemperature?: number;
    timerApi?: TimerApi;
  }) {
    this.model = input.model;
    this.createCompletion = input.createCompletion;
    this.requestTimeoutMs = input.requestTimeoutMs ?? 30000;
    this.judgeTemperature = input.judgeTemperature ?? 0;
    this.narrateTemperature = input.narrateTemperature ?? 1;
    this.timerApi = input.timerApi ?? {
      setTimeout: (callback, timeoutMs) => setTimeout(callback, timeoutMs),
      clearTimeout: (handle) => clearTimeout(handle)
    };
  }

  static fromConfig(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
    judgeTemperature: number;
    narrateTemperature: number;
  }) {
    const client = new OpenAI({
      baseURL: input.baseUrl,
      apiKey: input.apiKey,
      timeout: input.timeoutMs
    });

    return new OpenAICompatibleProvider({
      model: input.model,
      requestTimeoutMs: input.timeoutMs,
      judgeTemperature: input.judgeTemperature,
      narrateTemperature: input.narrateTemperature,
      createCompletion: async (request) =>
        client.chat.completions.create(request as never) as Promise<CompletionCreateOutput>
    });
  }

  async generateStructured<TSchema extends z.ZodTypeAny>(
    request: GenerateStructuredRequest<TSchema>
  ): Promise<GenerateStructuredResult<TSchema>> {
    let timeoutHandle: TimeoutHandle | undefined;
    const timeoutPromise = new Promise<CompletionCreateOutput>((_, reject) => {
      timeoutHandle = this.timerApi.setTimeout(
        () =>
          reject(new Error(`Provider request timed out after ${this.requestTimeoutMs}ms`)),
        this.requestTimeoutMs
      );
    });

    let completion: CompletionCreateOutput;
    try {
      completion = await Promise.race([
        this.createCompletion({
          model: this.model,
          temperature:
            request.task === "judge"
              ? this.judgeTemperature
              : this.narrateTemperature,
          messages: request.messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: request.schemaName,
              strict: true,
              schema: zodToJsonSchema(
                request.schema,
                request.schemaName
              ) as Record<string, unknown>
            }
          }
        }),
        timeoutPromise
      ]);
    } finally {
      if (timeoutHandle !== undefined) {
        this.timerApi.clearTimeout(timeoutHandle);
      }
    }

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Structured output unavailable from provider");
    }

    const usageTotalTokens =
      typeof completion.usage?.total_tokens === "number" &&
      completion.usage.total_tokens >= 0
        ? completion.usage.total_tokens
        : 0;

    return {
      data: request.schema.parse(JSON.parse(content)),
      usage_total_tokens: usageTotalTokens
    };
  }
}
