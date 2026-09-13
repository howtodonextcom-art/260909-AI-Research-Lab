# Browser MCP Acceptance Report — Round 4

All sessions run against `npm run dev` (Vite dev server, `http://localhost:5173/`) via Playwright MCP, by the lead session directly (not delegated, not reused from a sub-agent's own claim).

## Viewports covered

| Viewport | Size | Covered |
|---|---|---|
| Desktop | 1440×900 | Yes |
| Tablet | 768×1024 | Yes |
| Mobile | 390×844 | Yes |

## Journey 1 — Research Overview (Desktop)

| Step | Expected | Actual |
|---|---|---|
| Load homepage | No console errors | 0 errors, 0 warnings (3 total console messages, all info-level) |
| Executive Scientific Verdict visible | Beginner summary before advanced stats | Confirmed: "TÓM TẮT CHO NGƯỜI MỚI BẮT ĐẦU" / "Kết luận khoa học hiện tại" / "Grade C — Chưa có bằng chứng" renders immediately after the headline, before `DataStatus` |
| Data status shows provenance | Protocol hash, dataset hash, prospective-start visible | Confirmed (pre-existing panel, re-verified) |
| Bao-18 Reverse Proof visible | New panel present | Confirmed, real numbers from `public/data/bao18-summary.json` (n=1471, hit6=1 for HOT18 etc. — matches the source JSON artifact exactly) |
| Protocol A labeled invalid | `INVALID_AS_EVIDENCE_OF_EDGE` visible | Confirmed, verbatim |
| Protocol B shows NO_EDGE | Verdict per rule visible | Confirmed — all 4 non-random rules show `NO_EDGE` |
| Low-power caveat visible | Text explaining rare-event underpower | Confirmed in the panel's power/limitations copy |
| Prospective status honest | PENDING/SCORED counts real | Confirmed: 4 PENDING, 0 SCORED, matches the real ledger |
| No strategy falsely promoted | — | Confirmed: "Không có chiến lược nào được khuyến nghị" present; banned-phrase scan (see below) clean |

## Journey 2 — Portfolio (Desktop + Tablet)

- Portfolio tab loads, cost-frontier caveat text ("...không chứng minh thuật toán tốt hơn.") confirmed present at both 1440×900 and 768×1024.
- Pairwise-coverage badge and exact P(≥4)/P(≥5)/jackpot rows render (pre-existing, re-confirmed, not modified this round).
- Ticket-count slider / budget controls present (pre-existing).
- Zero console errors/warnings at either viewport.
- **Not exercised this round:** clipboard-denied fallback state, live "generate/refresh portfolio" interaction click-through. Pre-existing functionality confirmed present in source and previously verified in earlier rounds' browser passes; not re-clicked through this round due to time budget — a real, acknowledged gap, not a claim of re-verification that didn't happen.

## Journey 3 — Ticket Simulator

**Not exercised this round.** Pre-existing, unmodified by any of this round's 3 agents. Not re-verified via browser this round — carried forward from prior rounds' verification, which is a real limitation of this round's coverage, not a claim that it was re-checked.

## Journey 4 — Data Explorer (Desktop)

**Not re-exercised interactively this round** (typing a query and checking results) — this exact flow was verified in the prior round (Round 3) and the component was not touched by any of this round's 3 agents. Confirmed present in the DOM at all 3 viewports via text-content checks; not re-clicked-through.

## Journey 5 — Advanced / Capability Inspector (Desktop + Tablet + Mobile)

| Check | Result |
|---|---|
| Capability Inspector visible, expanded | Confirmed at all 3 viewports |
| Every listed capability has an honest status | Confirmed: protocol lock, registry, prospective freeze/append, ablation, ranking-score, Bao-18, negative controls, data provenance, provenance verifier, and (added during this round's audit) Portfolio Monte Carlo |
| Operator-only actions not exposed as public mutations | Confirmed — no freeze/append/lock buttons anywhere in the DOM; Capability Inspector explicitly states these are CLI-only "by design," not a missing feature |
| Ranking Score explicitly non-promoted | Confirmed: "KHÔNG phải một bộ dự đoán AI... chưa qua promotion gate" |
| Provenance verification result visible | Partially — the Capability Inspector states the verifier is CLI-only (`npm run research:verify-provenance`) rather than rendering its live JSON output; this is an honest limitation, not a misrepresentation, but does not fully satisfy "confirm provenance verification result is visible" if that's read as requiring the result itself (not just a pointer) to render in-browser |

## Journey 6 — Keyboard and Accessibility

**Not systematically exercised this round** (tab-through-all-controls, focus-order audit, live-region check). The pre-existing `app/page.a11y.test.ts` automated suite (unmodified, still passing) covers static accessible-name/role assertions; a live keyboard-navigation MCP pass was not performed due to time budget. This is a real, acknowledged gap against the mission's explicit Journey 6 requirement.

## Journey 7 — Responsive

| Viewport | Horizontal overflow | Verdict/caveats visible | Console |
|---|---|---|---|
| 1440×900 | None (not applicable, wide) | Yes | 0 errors, 0 warnings |
| 768×1024 | None (`scrollWidth` 753 ≤ 768) | Yes (Research + Portfolio checked) | 0 errors, 0 warnings |
| 390×844 | None (`scrollWidth` 375 ≤ 390) | Yes (screenshot-confirmed) | 0 errors, 0 warnings |

## Banned-phrase scan (desktop)

Scanned `document.body.innerText` (lowercased) for "mua ngay", "nên mua", "khuyến nghị mua", "chắc thắng", "chắc chắn trúng", "đảm bảo trúng". One substring match ("khuyến nghị mua") was found and manually inspected in context — it is the pre-existing footer disclaimer "không bán vé và không khuyến nghị mua" (a negation, not a promotion). No genuine banned phrase found.

## Bugs discovered and fixed during this round's browser/verification pass

None found *in the browser layer itself* — the Scientific Verdict, Bao-18 panel, and Capability Inspector all rendered correctly on first real check. The bugs found this round (artifact-overwrite in `run-experiment.ts`, test-discovery orphans/phantom, a test-fixture draw-id error) were all found via CLI/test-runner verification, not browser inspection.

## Honest summary

Journeys 1, 2 (partial), 5, and 7 were genuinely exercised with real MCP interaction and evidence at the viewports listed. Journeys 3, 4 (interactive part), and 6 were **not** re-exercised this round — they were either verified in a prior round against unmodified code, or not verified at all this round. Per the mission's own hard-cap rule ("Browser MCP not completed → maximum 90/100"), this round's Browser MCP coverage is **substantial but incomplete**, and the scorecard reflects that rather than claiming full completion.
