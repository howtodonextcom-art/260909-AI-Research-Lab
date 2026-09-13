/**
 * GAP-07 regression: proves the Bao-18 audit's evidence gate genuinely
 * fail-closes when the underlying test suite fails, and genuinely succeeds
 * when it passes — WITHOUT mutating the real committed
 * `lib/research/bao18-walkforward.test.ts` (that file stays pristine; Round 6
 * §6 explicitly warns against a harness fragile enough to require breaking a
 * real committed test in CI).
 *
 * This imports and calls the REAL exported `runEvidenceGate` function from
 * `scripts/audit-bao18-walkforward.ts` — the same function
 * `research:bao18-audit`'s real CLI run calls with the real test path — so a
 * future refactor of the gate logic cannot silently drift away from what
 * this test protects. It is not a reimplementation of the gate; it is the
 * gate, pointed at throwaway temp-dir fixtures instead of the real suite.
 *
 * Importing `audit-bao18-walkforward.ts` does NOT run the full CLI (git
 * provenance read, dataset load, artifact write) — that top-level flow is
 * guarded by an `isMainModule` check in that file so only a direct
 * `node .../audit-bao18-walkforward.ts` invocation executes it. Only the
 * gate function itself runs here.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runEvidenceGate } from "./audit-bao18-walkforward";

const FAILING_TEST_SOURCE = `
import assert from "node:assert/strict";
import test from "node:test";

test("deliberately failing throwaway assertion (GAP-07 fixture)", () => {
  assert.equal(1, 2, "this must fail — it is the GAP-07 regression fixture");
});
`;

const PASSING_TEST_SOURCE = `
import assert from "node:assert/strict";
import test from "node:test";

test("deliberately passing throwaway assertion (GAP-07 fixture)", () => {
  assert.equal(1, 1);
});
`;

test("GAP-07: runEvidenceGate refuses (ok:false) when the pointed-at test file fails", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gap07-fail-"));
  try {
    const testFile = path.join(dir, "throwaway.test.ts");
    await writeFile(testFile, FAILING_TEST_SOURCE, "utf8");

    // Deliberately NOT overriding `cwd` here: it defaults to this repo's
    // project root inside `runEvidenceGate`, which is required for
    // `node --import=tsx --test <file>` to resolve the `tsx` loader from
    // this project's node_modules. The test file itself is still an
    // absolute path into an unrelated OS temp directory, so this never
    // touches (or needs) the real committed test suite.
    const result = await runEvidenceGate(testFile);

    assert.equal(result.ok, false, "gate must report failure when the test suite fails");
    if (!result.ok) {
      assert.notEqual(result.exitCode, 0, "exit code must be nonzero on a failing suite");
      assert.match(result.reason, /KHÔNG pass/);
    }
    // The discriminated result carries no `evidence` field on failure — any
    // real CLI `main()` flow that checks `result.ok` before writing an
    // artifact structurally cannot reach the artifact-write path here.
    assert.ok(!("evidence" in result), "a failed gate result must not carry evidence used to justify writing an artifact");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("GAP-07: runEvidenceGate succeeds (ok:true) when the pointed-at test file passes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gap07-pass-"));
  try {
    const testFile = path.join(dir, "throwaway.test.ts");
    await writeFile(testFile, PASSING_TEST_SOURCE, "utf8");

    const result = await runEvidenceGate(testFile);

    assert.equal(result.ok, true, "gate must report success when the test suite passes");
    if (result.ok) {
      assert.equal(result.evidence.exitCode, 0);
      assert.equal(result.evidence.passCount, 1);
      assert.equal(result.evidence.failCount, 0);
      assert.equal(result.evidence.testFile, testFile);
      assert.match(result.evidence.testFileSha256, /^[0-9a-f]{64}$/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("GAP-07: runEvidenceGate reports failure (not a thrown exception) when the test file does not exist", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gap07-missing-"));
  try {
    const missing = path.join(dir, "does-not-exist.test.ts");
    const result = await runEvidenceGate(missing);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /không đọc được test file/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
