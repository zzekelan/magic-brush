export type SessionStepRequest = {
  raw_input_text: string;
  state_snapshot?: Record<string, unknown>;
  debug?: boolean;
};

export type LocalizedMessage = {
  en: string;
  zh: string;
};

export type SessionStepResponse =
  | {
      kind: "exit";
      next_state: Record<string, unknown>;
    }
  | {
      kind: "system_ack" | "onboarding_ack";
      next_state: Record<string, unknown>;
      message_key: string;
      message: LocalizedMessage;
    }
  | {
      kind: "turn_result";
      next_state: Record<string, unknown>;
      turn: {
        narration_text: string;
        reference: string;
        reason_code?: string;
        system_error_code?: string;
        system_error_detail?: string;
      };
      debug?: unknown;
    };

async function parseJsonResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await res.json();
}

export function createApiClient(input?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}) {
  const rawBase = input?.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "";
  const baseUrl = rawBase.replace(/\/$/, "");
  const fetchImpl = input?.fetchImpl ?? fetch;

  return {
    async sessionStep(payload: SessionStepRequest): Promise<SessionStepResponse> {
      const res = await fetchImpl(`${baseUrl}/api/session/step`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      return (await parseJsonResponse(res)) as SessionStepResponse;
    }
  };
}
