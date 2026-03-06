import "dotenv/config";
import { fileURLToPath } from "node:url";
import { parseTurnArgs } from "./parse-cli-args";
import { createLiveTurnExecutor } from "../runtime/create-live-turn-executor";

async function main() {
  const { rawInputText, debug } = parseTurnArgs(process.argv.slice(2));
  const runtime = createLiveTurnExecutor();

  const out = await runtime.executeTurn({
    rawInputText,
    debug,
    state: {}
  });

  console.log(JSON.stringify(out, null, 2));
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return fileURLToPath(import.meta.url) === entry;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
