import {
  SessionStepRequestSchema,
  SessionStepResponseSchema,
  type SessionStepRequest,
  type SessionStepResponse
} from "../../../../src/interaction/session-step-contract";

export type { SessionStepRequest, SessionStepResponse };

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
      const request = SessionStepRequestSchema.parse(payload);
      const res = await fetchImpl(`${baseUrl}/api/session/step`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(request)
      });

      return SessionStepResponseSchema.parse(await parseJsonResponse(res));
    }
  };
}
