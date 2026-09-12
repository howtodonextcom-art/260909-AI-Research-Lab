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

test("page dùng INTERACTIVE_FAIRNESS_SIMULATION_COUNT cho MC UI, canonical vẫn từ CURRENT_PROTOCOL", () => {
  assert.match(source, /INTERACTIVE_FAIRNESS_SIMULATION_COUNT/);
  assert.match(source, /simulationCount:\s*INTERACTIVE_FAIRNESS_SIMULATION_COUNT/);
  assert.match(source, /CURRENT_PROTOCOL\.fairnessSimulationCount/);
  assert.doesNotMatch(source, /simulationCount:\s*CURRENT_PROTOCOL\.fairnessSimulationCount/);
});

test("page không còn hard-code Holm «ba chiến lược» và truyền familySize từ CURRENT_PROTOCOL", () => {
  assert.doesNotMatch(source, /Holm-Bonferroni cho ba chiến lược/);
  assert.match(source, /familySize/);
  assert.match(source, /runTemporalBacktestReport\(draws,\s*90,\s*CURRENT_PROTOCOL\.alpha,\s*familySize,\s*lookCount\)/);
  assert.match(source, /protocol-lock\.json/);
  assert.match(source, /classifyEvidence/);
  assert.match(source, /varianceMethod/);
});

test("page lấy Holm familySize từ registry summary, không từ CURRENT_PROTOCOL.strategies", () => {
  assert.doesNotMatch(source, /CURRENT_PROTOCOL\.strategies\.filter/);
  assert.match(source, /experiment-family\.json/);
  assert.match(source, /parseExperimentFamilySummary/);
  assert.match(source, /FALLBACK_HOLM_FAMILY_SIZE/);
  assert.match(source, /số giả thuyết \/ registry/);
  assert.match(source, /lookCount/);
  assert.doesNotMatch(source, /familySize tăng theo kỳ/);
  assert.match(source, /bền đuôi/);
  assert.match(source, /n\^\(1\/3\)/);
});
