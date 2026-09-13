import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const page = readFileSync(path.join(root, "app/page.tsx"), "utf8");
const boundary = readFileSync(path.join(root, "components/panel-error-boundary.tsx"), "utf8");

test("PanelErrorBoundary is a class component with getDerivedStateFromError", () => {
  assert.match(boundary, /class PanelErrorBoundary/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /componentDidCatch/);
  assert.match(boundary, /role="alert"/);
});

test("Research tab wraps optional artifact panels in PanelErrorBoundary", () => {
  assert.match(page, /PanelErrorBoundary/);
  for (const name of [
    "Scientific Verdict",
    "Data Status",
    "Experiment Scorecard",
    "Bao-18",
    "Capability Inspector",
    "Diagnostics",
    "Data Explorer",
    "Profit Lab",
  ]) {
    assert.match(page, new RegExp(`PanelErrorBoundary name="${name}"`));
  }
});
