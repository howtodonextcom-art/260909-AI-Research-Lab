import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("app/layout.tsx gắn IBM Plex Sans/Mono và Source Serif 4", () => {
  const source = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  assert.match(source, /IBM_Plex_Sans/);
  assert.match(source, /IBM_Plex_Mono/);
  assert.match(source, /Source_Serif_4/);
  assert.match(source, /--font-sans/);
  assert.match(source, /--font-mono/);
  assert.match(source, /--font-display/);
});
