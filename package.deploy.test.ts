import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL(".", import.meta.url));

test("package.json start trỏ wrangler local + sites-env", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const start = pkg.scripts.start ?? "";
  assert.match(start, /wrangler/);
  assert.match(start, /dist\/server\/wrangler\.json/);
  assert.match(start, /sites-env\.mjs/);
  assert.equal(existsSync(path.join(root, "scripts/sites-env.mjs")), true);
});

test("npm test chạy typecheck (tsc --noEmit) trước business/data tests", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.match(pkg.scripts.typecheck ?? "", /tsc --noEmit/);
  assert.match(pkg.scripts.test ?? "", /typecheck/);
});
