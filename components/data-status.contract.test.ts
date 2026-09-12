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

test("DataStatus surface protocol lock hash, prospective start, và classifyEvidence", () => {
  assert.match(source, /protocolLock/);
  assert.match(source, /protocolHash/);
  assert.match(source, /prospectiveStartDrawId/);
  assert.match(source, /classifyEvidence/);
});

test("DataStatus surface Holm familySize từ registry summary", () => {
  assert.match(source, /familySummary/);
  assert.match(source, /hypothesisCount/);
  assert.match(source, /lookCount/);
  assert.match(source, /số giả thuyết/i);
  assert.doesNotMatch(source, /đã có server store/);
  assert.match(source, /proxy lịch sự/);
});
