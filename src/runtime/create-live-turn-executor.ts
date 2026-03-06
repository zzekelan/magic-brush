import { createJudgeAgent } from "../agents/judge-agent";
import { createNarrateAgent } from "../agents/narrate-agent";
import { loadLlmConfig } from "../config/llm";
import { OpenAICompatibleProvider } from "../providers/openai-compatible";
import { executeJudge } from "./execute-judge";
import { executeTurn } from "./execute-turn";

type ExecuteTurnInput = Parameters<typeof executeTurn>[0];
type ExecuteTurnOutput = Awaited<ReturnType<typeof executeTurn>>;
type ExecuteJudgeInput = Parameters<typeof executeJudge>[0];
type ExecuteJudgeOutput = Awaited<ReturnType<typeof executeJudge>>;

export type LiveTurnInput = {
  rawInputText: string;
  state: Record<string, unknown>;
  debug?: boolean;
};

export type JudgeOnlyInput = {
  rawInputText: string;
  state: Record<string, unknown>;
};

export function createLiveTurnExecutor(deps?: {
  loadLlmConfig?: typeof loadLlmConfig;
  createProvider?: (cfg: ReturnType<typeof loadLlmConfig>) => unknown;
  createJudgeAgent?: (provider: unknown) => ExecuteTurnInput["judgeAgent"];
  createNarrateAgent?: (provider: unknown) => ExecuteTurnInput["narrateAgent"];
  executeTurnImpl?: (input: ExecuteTurnInput) => Promise<ExecuteTurnOutput>;
  executeJudgeImpl?: (input: ExecuteJudgeInput) => Promise<ExecuteJudgeOutput>;
}) {
  const loadConfig = deps?.loadLlmConfig ?? loadLlmConfig;
  const createProvider =
    deps?.createProvider ??
    ((cfg: ReturnType<typeof loadLlmConfig>) =>
      OpenAICompatibleProvider.fromConfig({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        timeoutMs: cfg.timeoutMs,
        judgeTemperature: cfg.judgeTemperature,
        narrateTemperature: cfg.narrateTemperature
      }));
  const createJudge = deps?.createJudgeAgent ?? ((provider: unknown) => createJudgeAgent(provider as never));
  const createNarrate =
    deps?.createNarrateAgent ?? ((provider: unknown) => createNarrateAgent(provider as never));
  const executeTurnImpl = deps?.executeTurnImpl ?? executeTurn;
  const executeJudgeImpl = deps?.executeJudgeImpl ?? executeJudge;

  const config = loadConfig();
  const provider = createProvider(config);
  const judgeAgent = createJudge(provider);
  const narrateAgent = createNarrate(provider);

  return {
    executeTurn: (input: LiveTurnInput) =>
      executeTurnImpl({
        rawInputText: input.rawInputText,
        debug: input.debug,
        state: input.state,
        judgeTemperature: config.judgeTemperature,
        narrateTemperature: config.narrateTemperature,
        judgeAgent,
        narrateAgent
      }),
    executeJudge: (input: JudgeOnlyInput) =>
      executeJudgeImpl({
        rawInputText: input.rawInputText,
        state: input.state,
        judgeAgent
      })
  };
}
