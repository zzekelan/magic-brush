export type LlmCall<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
