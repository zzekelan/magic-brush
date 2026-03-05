import { createJudgeAgent } from "../agents/judge-agent";
import { createNarrateAgent } from "../agents/narrate-agent";
import { loadLlmConfig } from "../config/llm";
import { OpenAICompatibleProvider } from "../providers/openai-compatible";
import { runLiveTurn } from "./run-live-turn";

type RunLiveTurnInput = Parameters<typeof runLiveTurn>[0];
type LiveTurnOutput = Awaited<ReturnType<typeof runLiveTurn>>;

export type LiveTurnInput = {
  rawInputText: string;
  state: Record<string, unknown>;
  debug?: boolean;
};

export function createLiveTurnExecutor(deps?: {
  loadLlmConfig?: typeof loadLlmConfig;
  createProvider?: (cfg: ReturnType<typeof loadLlmConfig>) => unknown;
  createJudgeAgent?: (provider: unknown) => RunLiveTurnInput["judgeAgent"];
  createNarrateAgent?: (provider: unknown) => RunLiveTurnInput["narrateAgent"];
  runLiveTurnImpl?: (input: RunLiveTurnInput) => Promise<LiveTurnOutput>;
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
  const runLiveTurnImpl = deps?.runLiveTurnImpl ?? runLiveTurn;

  const config = loadConfig();
  const provider = createProvider(config);
  const judgeAgent = createJudge(provider);
  const narrateAgent = createNarrate(provider);

  return (input: LiveTurnInput) =>
    runLiveTurnImpl({
      rawInputText: input.rawInputText,
      debug: input.debug,
      state: input.state,
      judgeTemperature: config.judgeTemperature,
      narrateTemperature: config.narrateTemperature,
      judgeAgent,
      narrateAgent
    });
}
