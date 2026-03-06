import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INTERACTION_MESSAGES, renderBilingualMessage } from "../../../src/interaction/messages";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

async function startMode(
  modeName: "Explore World" | "Developer Mode" | "探索世界" | "开发者模式",
  lang: "en" | "zh" = "en"
) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList;

  const { default: App } = await import("./App");
  render(<App />);
  if (lang === "zh") {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "中文" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
  }
  await waitFor(() => {
    expect(screen.getByRole("button", { name: modeName })).toBeInTheDocument();
  }, { timeout: 7000 });

  fireEvent.click(screen.getByRole("button", { name: modeName }));
  await waitFor(() => {
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
}

function submitInput(text: string) {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: text } });
  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected input form to exist");
  }
  fireEvent.submit(form);
}

function getPostedBody(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  const args = fetchMock.mock.calls[index];
  const init = (args?.[1] ?? {}) as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("frontend parity critical paths", () => {
  it("follows onboarding two-step flow then normal turn in explore mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: "Role profile recorded.\n已记录角色设定。",
          next_state: {
            onboarding: {
              completed: false,
              step: "world_background",
              role_profile: "A ranger"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: "World background recorded. Setup complete, you can start taking actions.\n已记录世界背景。设定完成，你可以开始行动。",
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "A ranger",
              world_background: "Steam city"
            },
            completed_turn_count: 0
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "turn_result",
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "A ranger",
              world_background: "Steam city"
            },
            approved_interaction_history: [],
            conversation_context: [],
            completed_turn_count: 1
          },
          output: {
            narration_text: "You stand in the city center.",
            reference: "Observe nearby streets.",
            state: {
              onboarding: {
                completed: true,
                step: "world_background",
                role_profile: "A ranger",
              world_background: "Steam city"
              },
              approved_interaction_history: [],
              conversation_context: [],
              completed_turn_count: 1
            }
          }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startMode("Explore World");

    submitInput("A ranger");
    await waitFor(() => {
      expect(screen.getByText("Role profile recorded.")).toBeInTheDocument();
      expect(screen.getByText("Please define your world background first.")).toBeInTheDocument();
    });

    submitInput("Steam city");
    await waitFor(() => {
      expect(
        screen.getByText("World background recorded. Setup complete, you can start taking actions.")
      ).toBeInTheDocument();
    });

    submitInput("look around");
    await waitFor(() => {
      expect(screen.getByText("You stand in the city center.")).toBeInTheDocument();
      expect(screen.getByText("Observe nearby streets.")).toBeInTheDocument();
    });

    const firstReq = getPostedBody(fetchMock, 0);
    const thirdReq = getPostedBody(fetchMock, 2);
    expect(firstReq.debug).toBe(false);
    expect(thirdReq.debug).toBe(false);
  });

  it("handles /reset and /exit command responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "system_ack",
          text: "Session state reset.\n会话已重置。",
          next_state: {}
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "exit",
          next_state: {}
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startMode("Explore World");

    submitInput("/reset");
    await waitFor(() => {
      expect(screen.getByText("Session state reset.")).toBeInTheDocument();
      expect(screen.getByText("Please define your role first.")).toBeInTheDocument();
    });

    submitInput("/exit");
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Explore World" })).toBeInTheDocument();
      },
      { timeout: 7000 }
    );

    const firstReq = getPostedBody(fetchMock, 0);
    const secondReq = getPostedBody(fetchMock, 1);
    expect(firstReq.raw_input_text).toBe("/reset");
    expect(secondReq.raw_input_text).toBe("/exit");
    expect(firstReq.debug).toBe(false);
    expect(secondReq.debug).toBe(false);
  });

  it("forces debug=true in developer mode and keeps debug JSON out of narration text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: "Role profile recorded.\n已记录角色设定。",
          next_state: {
            onboarding: {
              completed: false,
              step: "world_background",
              role_profile: "A mage"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: "World background recorded. Setup complete, you can start taking actions.\n已记录世界背景。设定完成，你可以开始行动。",
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "A mage",
              world_background: "Neon district"
            },
            completed_turn_count: 0
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "turn_result",
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "A mage",
              world_background: "Neon district"
            },
            approved_interaction_history: [],
            conversation_context: [],
            completed_turn_count: 1
          },
          output: {
            narration_text: "You step into the neon district.",
            reference: "Inspect the alley.",
            state: {
              onboarding: {
                completed: true,
                step: "world_background",
                role_profile: "A mage",
              world_background: "Neon district"
              },
              approved_interaction_history: [],
              conversation_context: [],
              completed_turn_count: 1
            },
            debug: { judge_ms: 12 }
          },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startMode("Developer Mode");

    submitInput("A mage");
    await waitFor(() => {
      expect(screen.getByText("Role profile recorded.")).toBeInTheDocument();
    });

    submitInput("Neon district");
    await waitFor(() => {
      expect(
        screen.getByText("World background recorded. Setup complete, you can start taking actions.")
      ).toBeInTheDocument();
    });

    submitInput("look around");
    await waitFor(() => {
      expect(screen.getByText("You step into the neon district.")).toBeInTheDocument();
      expect(screen.getByText("Debug JSON")).toBeInTheDocument();
      expect(screen.getByText(/"judge_ms": 12/)).toBeInTheDocument();
    });

    const thirdReq = getPostedBody(fetchMock, 2);
    expect(thirdReq.debug).toBe(true);
    expect(screen.getByText("You step into the neon district.").textContent).not.toContain(
      "judge_ms"
    );
    expect(screen.queryByText("World State")).not.toBeInTheDocument();
  });

  it("maps onboarding_ack by shared bilingual text instead of next_state inference", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_setup_already_complete),
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "A ranger",
              world_background: "Steam city"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "system_ack",
          text: renderBilingualMessage(INTERACTION_MESSAGES.system_ack_session_reset),
          next_state: {}
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startMode("Explore World");

    submitInput("A ranger");
    await waitFor(() => {
      expect(
        screen.getByText("Setup already complete. You can start taking actions.")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("World background recorded. Setup complete, you can start taking actions.")
      ).not.toBeInTheDocument();
    });

    submitInput("/reset");
    await waitFor(() => {
      expect(screen.getByText("Session state reset.")).toBeInTheDocument();
    });
  });

  it("localizes onboarding completion ack from bilingual payload in Chinese mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_role_recorded),
          next_state: {
            onboarding: {
              completed: false,
              step: "world_background",
              role_profile: "游侠"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "onboarding_ack",
          text: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_world_recorded_complete),
          next_state: {
            onboarding: {
              completed: true,
              step: "world_background",
              role_profile: "游侠",
              world_background: "蒸汽朋克废土"
            },
            completed_turn_count: 0
          }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startMode("探索世界", "zh");

    submitInput("游侠");
    await waitFor(() => {
      expect(screen.getByText("已记录角色设定。")).toBeInTheDocument();
      expect(screen.getByText("请先定义你的世界背景。")).toBeInTheDocument();
    });

    submitInput("蒸汽朋克废土");
    await waitFor(() => {
      expect(screen.getByText("已记录世界背景。设定完成，你可以开始行动。")).toBeInTheDocument();
    });
  });
});
