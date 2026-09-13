/**
 * Contract test (blueprint requirement, verbatim): "no `ranking-score` import
 * in `app/`/`components/`". `lib/research/ranking-score.ts` is forbidden from
 * the UI until it clears the promotion gate plus prospective proof — this
 * test reads every real source file under both directories and regex-checks
 * the import path, so a future file that adds the import (directly or via a
 * relative path) fails this test instead of silently shipping.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const scanDirs = ["app", "components"].map((dir) => path.join(repoRoot, dir));

// Matches static `import ... from "…lib/research/ranking-score"` (any relative
// or aliased prefix, with or without a trailing `.ts`/`.tsx`) as well as
// `require("…lib/research/ranking-score")` and dynamic `import("…")`.
const RANKING_SCORE_IMPORT =
  /(?:from\s+|require\(\s*|import\(\s*)["'][^"']*lib\/research\/ranking-score(?:\.tsx?)?["']/;

function isSourceFile(name: string): boolean {
  if (!/\.(ts|tsx)$/.test(name)) return false;
  if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) return false;
  if (name.endsWith(".contract.test.ts") || name.endsWith(".a11y.test.ts")) return false;
  return true;
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (isSourceFile(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = scanDirs.flatMap((dir) => collectSourceFiles(dir));

test("quét được ít nhất vài file nguồn dưới app/ và components/ (test không bị vô hiệu do đường dẫn sai)", () => {
  assert.ok(allFiles.length >= 3, `expected several source files, found ${allFiles.length}`);
  assert.ok(allFiles.some((file) => file.endsWith(path.join("app", "page.tsx"))));
  assert.ok(allFiles.some((file) => file.includes(path.join("components", "portfolio-lab.tsx"))));
});

test("không file nào dưới app/ hoặc components/ import lib/research/ranking-score (cấm dùng ở UI cho đến khi qua promotion gate + bằng chứng prospective)", () => {
  for (const file of allFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      RANKING_SCORE_IMPORT,
      `${path.relative(repoRoot, file)} import lib/research/ranking-score — bị cấm ở UI cho đến khi qua promotion gate + bằng chứng prospective`,
    );
  }
});

test("regex bắt được import ranking-score nếu ai đó thêm vào (self-check, không chỉ khẳng định vắng mặt hôm nay)", () => {
  const aliasSample = 'import { rankingScore } from "@/lib/research/ranking-score";';
  const relativeSample = 'import { rankingScore } from "../lib/research/ranking-score";';
  const dynamicSample = 'const mod = await import("../../lib/research/ranking-score");';
  assert.match(aliasSample, RANKING_SCORE_IMPORT);
  assert.match(relativeSample, RANKING_SCORE_IMPORT);
  assert.match(dynamicSample, RANKING_SCORE_IMPORT);
});
