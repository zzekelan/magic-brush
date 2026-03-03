export type TurnRequest = {
  raw_input_text: string;
  state_snapshot?: Record<string, unknown>;
  debug?: boolean;
};

export type TurnResponse = {
  narration_text: string;
  reference: string;
  state: Record<string, unknown>;
  reason_code?: string;
  system_error_code?: string;
  debug?: unknown;
};

export function createApiClient(input?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}) {
  const rawBase = input?.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "";
  const baseUrl = rawBase.replace(/\/$/, "");
  const fetchImpl = input?.fetchImpl ?? fetch;

  return {
    async turn(payload: TurnRequest): Promise<TurnResponse> {
      const res = await fetchImpl(`${baseUrl}/api/turn`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as TurnResponse;
    }
  };
}
