import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(path.join(fileURLToPath(new URL(".", import.meta.url)), "data-status.tsx"), "utf8");

test("DataStatus surface PRIMARY_ENDPOINT và EXPECTED_MATCHES", () => {
  assert.match(source, /PRIMARY_ENDPOINT/);
  assert.match(source, /EXPECTED_MATCHES/);
});
