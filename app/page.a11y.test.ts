import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(path.join(fileURLToPath(new URL(".", import.meta.url)), "page.tsx"), "utf8");

test("page có skip-link tới #workspace và đúng 3 TabsTrigger", () => {
  assert.match(source, /className="skip-link"/);
  assert.match(source, /href="#workspace"/);
  assert.match(source, /id="workspace"/);
  assert.equal([...source.matchAll(/<TabsTrigger/g)].length, 3);
});

test("page đọc fairnessSimulationCount từ CURRENT_PROTOCOL, không hard-code 300", () => {
  assert.match(source, /CURRENT_PROTOCOL\.fairnessSimulationCount/);
  assert.doesNotMatch(source, /simulationCount:\s*300/);
});

test("page không còn hard-code Holm «ba chiến lược»", () => {
  assert.doesNotMatch(source, /Holm-Bonferroni cho ba chiến lược/);
  assert.match(source, /familySize/);
});
