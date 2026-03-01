function parseDebug(argv: string[]): { debug: boolean; positional: string[] } {
  let debug = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--debug") {
      debug = true;
      continue;
    }

    positional.push(arg);
  }

  return { debug, positional };
}

export function parseTurnArgs(argv: string[]): { rawInputText: string; debug: boolean } {
  const { debug, positional } = parseDebug(argv);
  const rawInputText = positional[0]?.trim();

  if (!rawInputText) {
    throw new Error('Missing player input. Usage: bun run turn -- [--debug] "look around"');
  }

  return { rawInputText, debug };
}

export function parseReplArgs(argv: string[]): { debug: boolean } {
  const { debug } = parseDebug(argv);
  return { debug };
}
