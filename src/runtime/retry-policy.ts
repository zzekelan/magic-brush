export const MAX_RETRY = 3;
export const CONFIDENCE_THRESHOLD = 0.6;

export function shouldRetryJudge(input: {
  confidence: number;
  schemaValid: boolean;
  attempt: number;
}): boolean {
  if (input.attempt >= MAX_RETRY) {
    return false;
  }

  if (!input.schemaValid) {
    return true;
  }

  return input.confidence < CONFIDENCE_THRESHOLD;
}

export function shouldRetryNarrate(input: { attempt: number }): boolean {
  if (input.attempt >= MAX_RETRY) {
    return false;
  }

  return true;
}
