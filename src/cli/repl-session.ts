export function shouldExit(input: string): boolean {
  return input.trim() === "/exit";
}

export function applyReplCommand(
  input: string,
  state: Record<string, unknown>
): Record<string, unknown> {
  if (input.trim() === "/reset") {
    return {};
  }

  return state;
}
