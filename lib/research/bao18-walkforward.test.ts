import assert from "node:assert/strict";
import test from "node:test";
import { choose } from "../profit";
import { createRng, drawFairTicket } from "./rng";
import type { DrawRecord } from "../data/types";
import {
  BAO18_RULES,
  binomialCdf,
  binomialPmf,
  binomialQuantile,
  binomialTailAtLeast,
  buildPool18,
  buildProtocolAPool,
  canonicalScientificSpecJson,
  clopperPearsonCI,
  combineSeed,
  computeScientificSpecHash,
  evaluationRange,
  exactMatchTierCount,
  exactMcNemar,
  fixedPrizePayoutForDraw,
  hypergeometricExpectedK,
  hypergeometricPmf,
  intersectionCount,
  pairedBootstrapCI,
  pairedSignFlipTest,
  poolForTarget,
  poolHit6,
  runProtocolA,
  runRuleWalkForward,
  type Bao18NonRandomRule,
  type Bao18Rule,
  type Bao18ScientificSpec,
} from "./bao18-walkforward";

// ---------------------------------------------------------------------------
// Synthetic fixture dataset — fair, seeded, deterministic. Only used to
// exercise the harness in tests; the CLI audits the real canonical snapshot.
// ---------------------------------------------------------------------------
const LOOKBACK = 30;
const SEED = 645;

function buildFixtureDraws(count: number, seed = 1): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1).padStart(5, "0"),
    date: new Date(Date.UTC(2020, 0, 1) + i * 86_400_000).toISOString().slice(0, 10),
    result: drawFairTicket(rng),
  }));
}

const FIXTURE_DRAWS = buildFixtureDraws(150);

// ---------------------------------------------------------------------------
// §13 Test 1 — Protocol A sanity: must be 100% poolHit6, always.
// ---------------------------------------------------------------------------
test("Protocol A (reverse peek) đạt đúng 100% poolHit6 trên mọi kỳ đánh giá — nếu không, đó là FAIL", () => {
  const observations = runProtocolA(FIXTURE_DRAWS, SEED, LOOKBACK);
  assert.ok(observations.length > 0, "phải có kỳ đánh giá");
  for (const obs of observations) assert.equal(obs.hit6, true, `Protocol A phải trúng tại kỳ ${obs.drawId}`);
});

// ---------------------------------------------------------------------------
// §13 Test 2 — Target mutation: changing draws[t].result must not change the
// pool built for target t (the pool never sees draws[t] — only draws[0:t]).
// ---------------------------------------------------------------------------
test("Protocol B: đổi toàn bộ draws[t].result không làm đổi pool tại t (target không đi vào builder)", () => {
  const t = LOOKBACK + 10;
  for (const rule of BAO18_RULES) {
    const before = poolForTarget(FIXTURE_DRAWS, rule, SEED, LOOKBACK, t);
    const mutated = FIXTURE_DRAWS.slice();
    mutated[t] = { ...mutated[t], result: [2, 4, 6, 8, 10, 12] };
    const after = poolForTarget(mutated, rule, SEED, LOOKBACK, t);
    assert.deepEqual(after, before, `rule ${rule}: pool tại t phải bất biến khi đổi draws[t].result`);
  }
});

// ---------------------------------------------------------------------------
// §13 Test 3 — Future suffix mutation: mutating draws[t...] must not change
// the pool built for target t.
// ---------------------------------------------------------------------------
test("Protocol B: xáo trộn toàn bộ draws[t...] (tương lai) không làm đổi pool tại t", () => {
  const t = LOOKBACK + 10;
  for (const rule of BAO18_RULES) {
    const before = poolForTarget(FIXTURE_DRAWS, rule, SEED, LOOKBACK, t);
    const mutated = FIXTURE_DRAWS.slice();
    for (let i = t; i < mutated.length; i += 1) {
      mutated[i] = { ...mutated[i], result: [1, 3, 5, 7, 9, 11] };
    }
    const after = poolForTarget(mutated, rule, SEED, LOOKBACK, t);
    assert.deepEqual(after, before, `rule ${rule}: pool tại t phải bất biến khi tương lai bị xáo trộn`);
  }
});

// ---------------------------------------------------------------------------
// §13 Test 4 — Replay-prefix invariance: truncating the dataset right after t
// must not change the pool built for target t.
// ---------------------------------------------------------------------------
test("Protocol B: truncate dataset tại t+1 rồi build lại pool tại t phải giống hệt full dataset", () => {
  const t = LOOKBACK + 10;
  for (const rule of BAO18_RULES) {
    const onFull = poolForTarget(FIXTURE_DRAWS, rule, SEED, LOOKBACK, t);
    const truncated = FIXTURE_DRAWS.slice(0, t + 1);
    const onTruncated = poolForTarget(truncated, rule, SEED, LOOKBACK, t);
    assert.deepEqual(onTruncated, onFull, `rule ${rule}: replay-prefix invariance`);
  }
});

// ---------------------------------------------------------------------------
// §13 Test 5 — Determinism.
// ---------------------------------------------------------------------------
test("Protocol B: cùng dataset/rule/lookback/seed luôn tạo cùng pool (determinism)", () => {
  const t = LOOKBACK + 5;
  for (const rule of BAO18_RULES) {
    const a = poolForTarget(FIXTURE_DRAWS, rule, SEED, LOOKBACK, t);
    const b = poolForTarget(FIXTURE_DRAWS, rule, SEED, LOOKBACK, t);
    assert.deepEqual(a, b, `rule ${rule}: phải deterministic`);
  }
});

// ---------------------------------------------------------------------------
// Rule validity — every rule always returns exactly 18 unique numbers in 1..45.
// ---------------------------------------------------------------------------
test("Mọi rule luôn trả đúng 18 số duy nhất trong khoảng 1..45", () => {
  const { start, end } = evaluationRange(FIXTURE_DRAWS.length, LOOKBACK);
  for (const rule of BAO18_RULES) {
    for (let t = start; t <= end; t += 5) {
      const pool = buildPool18(FIXTURE_DRAWS.slice(0, t), rule, { targetIndex: t, seed: SEED, lookback: LOOKBACK });
      assert.equal(pool.length, 18, `rule ${rule} tại t=${t}`);
      assert.equal(new Set(pool).size, 18, `rule ${rule} tại t=${t}: số phải duy nhất`);
      for (const n of pool) assert.ok(n >= 1 && n <= 45, `rule ${rule} tại t=${t}: số ${n} ngoài 1..45`);
    }
  }
});

test("BALANCED18 luôn chọn đúng 6 số mỗi vùng 01–15 / 16–30 / 31–45 (ánh xạ forced, không tune)", () => {
  const t = LOOKBACK + 20;
  const pool = buildPool18(FIXTURE_DRAWS.slice(0, t), "BALANCED18", { targetIndex: t, seed: SEED, lookback: LOOKBACK });
  const bandCounts = [0, 0, 0];
  for (const n of pool) bandCounts[Math.floor((n - 1) / 15)] += 1;
  assert.deepEqual(bandCounts, [6, 6, 6]);
});

test("RANDOM18 không phụ thuộc history: cùng seed + targetIndex cho cùng pool bất kể lịch sử khác nhau", () => {
  const t = LOOKBACK + 7;
  const poolFromFixture = buildPool18(FIXTURE_DRAWS.slice(0, t), "RANDOM18", { targetIndex: t, seed: SEED, lookback: LOOKBACK });
  const otherHistory = buildFixtureDraws(t, 999999);
  const poolFromOtherHistory = buildPool18(otherHistory, "RANDOM18", { targetIndex: t, seed: SEED, lookback: LOOKBACK });
  assert.deepEqual(poolFromFixture, poolFromOtherHistory);
});

// ---------------------------------------------------------------------------
// §29 — closed-form exact match-tier count proven against one-time brute-force
// enumeration of all C(18,6)=18,564 combinations. Only place this file
// enumerates tickets; production code (this module, the CLI) never does.
// ---------------------------------------------------------------------------
function kCombinations<T>(items: readonly T[], k: number): T[][] {
  const results: T[][] = [];
  const current: T[] = [];
  function recurse(start: number): void {
    if (current.length === k) {
      results.push(current.slice());
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      current.push(items[i]);
      recurse(i + 1);
      current.pop();
    }
  }
  recurse(0);
  return results;
}

test("§29: exactMatchTierCount khớp brute-force enumerate toàn bộ 18,564 vé Bao-18 (proof-by-test)", () => {
  const pool = Array.from({ length: 18 }, (_, i) => i + 1); // pool = {1..18}
  const result = [1, 2, 3, 4, 19, 20]; // m = |pool ∩ result| = 4
  const m = intersectionCount(pool, result);
  assert.equal(m, 4);

  const allTickets = kCombinations(pool, 6);
  assert.equal(allTickets.length, choose(18, 6));
  assert.equal(allTickets.length, 18564);

  const bruteCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const ticket of allTickets) {
    const j = intersectionCount(ticket, result);
    bruteCounts[j] += 1;
  }

  for (let j = 0; j <= 6; j += 1) {
    assert.equal(exactMatchTierCount(18, m, j), bruteCounts[j], `j=${j}: closed-form phải khớp brute-force`);
  }
  // Sanity: tổng số vé match-j phải bằng đúng 18,564.
  assert.equal(Object.values(bruteCounts).reduce((a, b) => a + b, 0), 18564);
});

test("fixedPrizePayoutForDraw khớp brute-force cho cùng fixture pool/result (m=4)", () => {
  const pool = Array.from({ length: 18 }, (_, i) => i + 1);
  const result = [1, 2, 3, 4, 19, 20];
  const allTickets = kCombinations(pool, 6);
  let bruteGross = 0;
  for (const ticket of allTickets) {
    const j = intersectionCount(ticket, result);
    if (j === 3) bruteGross += 30_000;
    if (j === 4) bruteGross += 300_000;
    if (j === 5) bruteGross += 10_000_000;
  }
  assert.equal(fixedPrizePayoutForDraw(18, 4), bruteGross);
});

// ---------------------------------------------------------------------------
// Exact binomial statistics sanity
// ---------------------------------------------------------------------------
test("binomialPmf tổng theo k=0..n xấp xỉ 1", () => {
  const n = 50;
  const p = 0.1;
  let sum = 0;
  for (let k = 0; k <= n; k += 1) sum += binomialPmf(n, k, p);
  assert.ok(Math.abs(sum - 1) < 1e-9, `tổng pmf = ${sum}`);
});

test("binomialTailAtLeast(n,0,p) = 1 và binomialTailAtLeast(n,n+1,p) = 0", () => {
  assert.equal(binomialTailAtLeast(20, 0, 0.05), 1);
  assert.equal(binomialTailAtLeast(20, 21, 0.05), 0);
});

test("binomialCdf + binomialTailAtLeast(x+1) cộng lại đúng bằng 1 (bù trừ)", () => {
  const n = 30;
  const p = 0.2;
  for (let x = 0; x < n; x += 1) {
    const sum = binomialCdf(n, x, p) + binomialTailAtLeast(n, x + 1, p);
    assert.ok(Math.abs(sum - 1) < 1e-9, `x=${x}: sum=${sum}`);
  }
});

test("clopperPearsonCI tự nhất quán với chính binomialTailAtLeast dùng để suy ra nó", () => {
  const alpha = 0.05;
  for (const [n, x] of [
    [100, 0],
    [100, 3],
    [100, 100],
    [1471, 2],
    [1471, 0],
  ]) {
    const { lower, upper } = clopperPearsonCI(n, x, alpha);
    assert.ok(lower >= 0 && lower <= 1, `lower trong [0,1]: ${lower}`);
    assert.ok(upper >= 0 && upper <= 1, `upper trong [0,1]: ${upper}`);
    assert.ok(lower <= upper, "lower <= upper");
    if (x > 0) {
      assert.ok(Math.abs(binomialTailAtLeast(n, x, lower) - alpha / 2) < 1e-5, `n=${n} x=${x}: lower không tự nhất quán`);
    } else {
      assert.equal(lower, 0);
    }
    if (x < n) {
      assert.ok(
        Math.abs(binomialTailAtLeast(n, x + 1, upper) - (1 - alpha / 2)) < 1e-5,
        `n=${n} x=${x}: upper không tự nhất quán`,
      );
    } else {
      assert.equal(upper, 1);
    }
  }
});

test("binomialQuantile: quantile 0 và 1 chạm biên hợp lý", () => {
  const n = 40;
  const p = 0.1;
  assert.equal(binomialQuantile(n, p, 0), 0);
  assert.ok(binomialQuantile(n, p, 0.999999) <= n);
});

test("hypergeometricPmf(poolSize=18) tổng theo k=0..6 xấp xỉ 1, và E[K]=2.4", () => {
  let sum = 0;
  for (let k = 0; k <= 6; k += 1) sum += hypergeometricPmf(18, k);
  assert.ok(Math.abs(sum - 1) < 1e-9, `tổng = ${sum}`);
  assert.ok(Math.abs(hypergeometricExpectedK(18) - 2.4) < 1e-9);
});

test("exactMcNemar: dưới ngưỡng discordant thì INSUFFICIENT_DISCORDANT_EVENTS, đủ thì exact p đối xứng khi b=c", () => {
  assert.deepEqual(exactMcNemar(2, 1), { kind: "insufficient" });
  const result = exactMcNemar(5, 5);
  assert.equal(result.kind, "exact");
  if (result.kind === "exact") {
    assert.equal(result.discordant, 10);
    assert.ok(Math.abs(result.pValue - 1) < 1e-9, "b=c hoàn toàn đối xứng thì p phải =1");
  }
});

test("pairedSignFlipTest: deterministic với cùng seed, và mean=0 khi mọi delta=0", () => {
  const deltas = [1, -1, 2, -2, 0.5, -0.5, 3, -3];
  const a = pairedSignFlipTest(deltas, SEED, 2000);
  const b = pairedSignFlipTest(deltas, SEED, 2000);
  assert.deepEqual(a, b);
  const zeroResult = pairedSignFlipTest([0, 0, 0], SEED, 500);
  assert.equal(zeroResult.meanDelta, 0);
});

test("pairedSignFlipTest: trường CI đã đổi tên rõ ràng KHÔNG PHẢI CI thật (nullRandomizationLower/Upper, không phải ciLower/ciUpper)", () => {
  const deltas = [1, -1, 2, -2, 0.5, -0.5, 3, -3];
  const result = pairedSignFlipTest(deltas, SEED, 2000);
  assert.ok("nullRandomizationLower" in result, "phải có field nullRandomizationLower");
  assert.ok("nullRandomizationUpper" in result, "phải có field nullRandomizationUpper");
  assert.ok(!("ciLower" in result), "KHÔNG được còn field ciLower gây hiểu lầm");
  assert.ok(!("ciUpper" in result), "KHÔNG được còn field ciUpper gây hiểu lầm");
  assert.ok(result.nullRandomizationLower <= result.nullRandomizationUpper);
});

// ---------------------------------------------------------------------------
// pairedBootstrapCI — a GENUINELY valid CI (paired/case bootstrap), distinct
// from the sign-flip null-randomization interval above.
// ---------------------------------------------------------------------------
test("pairedBootstrapCI: deterministic với cùng seed + data", () => {
  const deltas = [1, -1, 2, -2, 0.5, -0.5, 3, -3, 1.5, -1.5];
  const a = pairedBootstrapCI(deltas, SEED, 5000);
  const b = pairedBootstrapCI(deltas, SEED, 5000);
  assert.deepEqual(a, b);
});

test("pairedBootstrapCI: mọi delta bằng nhau (zero-variance) thì CI suy biến về đúng điểm đó", () => {
  const deltas = Array.from({ length: 20 }, () => 2.5);
  const result = pairedBootstrapCI(deltas, SEED, 3000);
  assert.equal(result.lower, 2.5);
  assert.equal(result.upper, 2.5);
});

test("pairedBootstrapCI và pairedSignFlipTest.nullRandomizationInterval là hai thủ tục resampling THỰC SỰ khác nhau (không phải cùng code path đội lốt hai tên)", () => {
  // Construct deltas with a real, non-zero mean shift (all values shifted
  // well away from 0) so the two procedures' outputs are clearly
  // distinguishable: the null-randomization interval (built from randomly
  // SIGN-FLIPPED deltas) is forced toward symmetry around 0 by construction,
  // while the bootstrap CI (built by resampling the ACTUAL observed deltas,
  // never flipping their sign) stays centered near the true observed mean.
  const deltas = Array.from({ length: 40 }, (_, i) => 5 + (i % 5) * 0.1);
  const observedMean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  assert.ok(observedMean > 4.9, "sanity: mean phải lớn, khác 0 rõ rệt");

  const signFlip = pairedSignFlipTest(deltas, SEED, 8000);
  const bootstrap = pairedBootstrapCI(deltas, SEED, 8000);

  // Null-randomization interval is pulled toward 0 (sign-flipping erases the
  // true shift), while the bootstrap CI stays near the true observed mean —
  // proving these are computed from genuinely different resampling schemes.
  assert.ok(
    Math.abs(signFlip.nullRandomizationLower) < observedMean / 2,
    "null-randomization interval phải bị kéo về gần 0 do sign-flip xóa shift thật",
  );
  assert.ok(
    bootstrap.lower > observedMean / 2,
    "bootstrap CI phải nằm gần mean quan sát thật, không bị kéo về 0",
  );
  assert.notEqual(signFlip.nullRandomizationLower, bootstrap.lower);
  assert.notEqual(signFlip.nullRandomizationUpper, bootstrap.upper);
});

// ---------------------------------------------------------------------------
// Misc — poolHit6/intersectionCount, combineSeed, evaluationRange
// ---------------------------------------------------------------------------
test("intersectionCount và poolHit6 nhất quán: poolHit6 true iff intersection = 6", () => {
  const pool = Array.from({ length: 18 }, (_, i) => i + 1);
  assert.equal(intersectionCount(pool, [1, 2, 3, 4, 5, 6]), 6);
  assert.equal(poolHit6(pool, [1, 2, 3, 4, 5, 6]), true);
  assert.equal(poolHit6(pool, [1, 2, 3, 4, 5, 40]), false);
});

test("buildProtocolAPool luôn chứa đủ 6 số thật + 18 số tổng, không trùng", () => {
  const result = [3, 9, 15, 21, 33, 44];
  const pool = buildProtocolAPool(result, SEED, 77);
  assert.equal(pool.length, 18);
  assert.equal(new Set(pool).size, 18);
  for (const n of result) assert.ok(pool.includes(n), `pool phải chứa số thật ${n}`);
});

test("combineSeed cho cùng đầu vào luôn cùng kết quả, khác đầu vào (thường) khác kết quả", () => {
  assert.equal(combineSeed(645, 10), combineSeed(645, 10));
  assert.notEqual(combineSeed(645, 10), combineSeed(645, 11));
});

test("evaluationRange: tôn trọng lookback, không âm khi dataset ngắn hơn lookback", () => {
  const wide = evaluationRange(150, 30);
  assert.equal(wide.start, 30);
  assert.equal(wide.end, 149);
  assert.equal(wide.evaluatedCount, 120);

  const short = evaluationRange(10, 30);
  assert.equal(short.evaluatedCount, 0);
});

test("runRuleWalkForward trả đúng số lượng observation bằng evaluationRange.evaluatedCount", () => {
  const range = evaluationRange(FIXTURE_DRAWS.length, LOOKBACK);
  for (const rule of BAO18_RULES) {
    const observations = runRuleWalkForward(FIXTURE_DRAWS, rule, SEED, LOOKBACK);
    assert.equal(observations.length, range.evaluatedCount, `rule ${rule}`);
  }
});

test("mọi rule không phải RANDOM18 phải nằm trong BAO18_RULES (không rule bí mật ngoài family khai báo)", () => {
  const declared = new Set<Bao18Rule>(BAO18_RULES);
  assert.ok(declared.has("HOT18"));
  assert.ok(declared.has("COLD18"));
  assert.ok(declared.has("OVERDUE18"));
  assert.ok(declared.has("BALANCED18"));
  assert.ok(declared.has("RANDOM18"));
  assert.equal(BAO18_RULES.length, 5);
});

// ---------------------------------------------------------------------------
// Scientific identity vs build provenance — the single most important test
// in this file (§26 pattern). A build/commit change alone (gitHead, branch,
// timestamp) must NEVER change what counts as "the same experiment"; only a
// genuine research-defining input may. This exercises the REAL exported
// `computeScientificSpecHash`, not a reimplementation.
// ---------------------------------------------------------------------------
function makeScientificSpec(overrides: Partial<Bao18ScientificSpec> = {}): Bao18ScientificSpec {
  const rules: Bao18Rule[] = ["RANDOM18", "HOT18", "COLD18", "OVERDUE18", "BALANCED18"];
  const holmFamily: Bao18NonRandomRule[] = ["HOT18", "COLD18", "OVERDUE18", "BALANCED18"];
  return {
    experiment: "bao18-walkforward-reverse-audit",
    version: "2.0",
    datasetSha256: "abc123",
    lookback: 90,
    seed: 645,
    rules,
    primaryEndpoint: "poolHit6",
    null: "C(18,6)/C(45,6)",
    alpha: 0.05,
    holmFamily,
    ...overrides,
  };
}

test("§26: scientificSpecHash KHÔNG đổi khi chỉ build-provenance (gitHead/timestamp) đổi — vì chúng không phải field của Bao18ScientificSpec", async () => {
  // `Bao18ScientificSpec` structurally has no `gitHead`/`generatedAt` field at
  // all, so the strongest way to prove the invariant is to show that two
  // specs with every genuine research input held identical, constructed at
  // two different simulated "times" (i.e. computed independently, as two
  // separate CLI runs on two different commits would), hash identically.
  const specRun1 = makeScientificSpec();
  const specRun2 = makeScientificSpec(); // simulates a second run after a new commit + later timestamp
  const hash1 = await computeScientificSpecHash(specRun1);
  const hash2 = await computeScientificSpecHash(specRun2);
  assert.equal(hash1, hash2, "hai spec với cùng research input phải cho cùng hash bất kể build/commit/thời điểm chạy");

  // Sanity: canonical JSON also matches (proves it's the same underlying
  // canonicalization, not coincidentally-equal hashes).
  assert.equal(canonicalScientificSpecJson(specRun1), canonicalScientificSpecJson(specRun2));
});

test("§26: scientificSpecHash THAY ĐỔI khi một research input thật (lookback) thay đổi", async () => {
  const baseline = makeScientificSpec({ lookback: 90 });
  const changedLookback = makeScientificSpec({ lookback: 120 });
  const hashBaseline = await computeScientificSpecHash(baseline);
  const hashChanged = await computeScientificSpecHash(changedLookback);
  assert.notEqual(hashBaseline, hashChanged, "đổi lookback (research input thật) phải làm đổi hash");
});

test("§26: scientificSpecHash THAY ĐỔI khi datasetSha256 thay đổi (dữ liệu khác = thí nghiệm khác)", async () => {
  const baseline = makeScientificSpec({ datasetSha256: "hash-A" });
  const changed = makeScientificSpec({ datasetSha256: "hash-B" });
  const hashBaseline = await computeScientificSpecHash(baseline);
  const hashChanged = await computeScientificSpecHash(changed);
  assert.notEqual(hashBaseline, hashChanged);
});

test("§26: canonicalScientificSpecJson không phụ thuộc thứ tự khai báo field (sorted-key canonicalization)", () => {
  const a = { experiment: "x", version: "1", datasetSha256: "d", lookback: 1, seed: 1, rules: ["RANDOM18"] as Bao18Rule[], primaryEndpoint: "p", null: "n", alpha: 0.05, holmFamily: [] as Bao18NonRandomRule[] };
  const b = { null: "n", alpha: 0.05, holmFamily: [] as Bao18NonRandomRule[], rules: ["RANDOM18"] as Bao18Rule[], seed: 1, lookback: 1, datasetSha256: "d", version: "1", experiment: "x", primaryEndpoint: "p" };
  assert.equal(canonicalScientificSpecJson(a), canonicalScientificSpecJson(b), "thứ tự key khai báo trong object literal không được ảnh hưởng canonical JSON");
});

// ---------------------------------------------------------------------------
// §5 adversarial re-verification — exact binomial / Clopper-Pearson at the
// n=0 / x=0 / x=n boundaries (Sub-Agent B task item 5c). Nothing was found
// broken by inspection or by these tests; they are added as a regression
// lock on the boundary behavior that was checked by hand.
// ---------------------------------------------------------------------------
test("Biên adversarial: binomialTailAtLeast/binomialPmf/clopperPearsonCI tại n=0 không crash và cho kết quả hợp lý", () => {
  assert.equal(binomialTailAtLeast(0, 0, 0.3), 1, "P(X>=0 | n=0) phải =1");
  assert.equal(binomialPmf(0, 0, 0.3), 1, "P(X=0 | n=0) phải =1 với mọi p hợp lệ");
  const ci = clopperPearsonCI(0, 0, 0.05);
  assert.deepEqual(ci, { lower: 0, upper: 1 }, "n=0 thì CI phải phủ toàn bộ [0,1] — không có dữ liệu, không thu hẹp được gì");
});

test("Biên adversarial: clopperPearsonCI tại x=n (mọi quan sát đều hit) không crash và upper=1", () => {
  const ci = clopperPearsonCI(5, 5, 0.05);
  assert.equal(ci.upper, 1);
  assert.ok(ci.lower > 0 && ci.lower < 1);
});

// ---------------------------------------------------------------------------
// §5 adversarial re-verification — RANDOM18 seed derivation (combineSeed)
// must not collide across the realistic targetIndex range, or two different
// draws could silently receive the identical "independent" random pool.
// Verified empirically over a range well beyond the real dataset's ~1471
// evaluated draws; no collision found.
// ---------------------------------------------------------------------------
test("Biên adversarial: combineSeed(645, t) không va chạm với t=0..2000 (dataset thật chỉ có ~1471 kỳ đánh giá)", () => {
  const seen = new Set<number>();
  for (let t = 0; t < 2000; t += 1) {
    const value = combineSeed(645, t);
    assert.ok(!seen.has(value), `va chạm combineSeed tại targetIndex=${t}`);
    seen.add(value);
  }
});
