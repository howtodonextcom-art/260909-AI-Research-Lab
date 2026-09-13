# Browser MCP Acceptance Report — Round 5 (all 8 journeys, supersedes Round 4's partial version)

All journeys run against `npm run dev` (`http://localhost:5173/`) via real Playwright MCP sessions, by the lead session directly. Every journey below was actually interacted with (typed into, clicked, tabbed through) — not just checked for the presence of text in the DOM.

## Journey 1 — Research overview honesty + Scientific Verdict first

| Check | Result |
|---|---|
| Verdict text appears before "Trạng thái bộ dữ liệu" in reading order | PASS (index comparison confirmed) |
| Stability table (EARLY/LATE) present | PASS |
| `scientificSpecHash` visible | PASS |
| Ablation + Portfolio-MC panel present with real numbers | PASS |
| Prospective chain-health text present | PASS |
| Capability Inspector anchor present | PASS |
| Console | 0 errors, 0 warnings |

## Journey 2 — Portfolio frontier caveat

Navigated to Portfolio tab. Caveat text ("...không chứng minh thuật toán tốt hơn.") confirmed present. Console: 0 errors, 0 warnings.

## Journey 3 — Ticket Simulator: Chọn nhanh → Mô phỏng kỳ quay → result without overclaim

Navigated to "Vé mô phỏng" tab, clicked **Chọn nhanh** (6 numbers auto-selected, confirmed 6/6 via `aria-pressed` buttons), clicked **Mô phỏng kỳ quay**. Real independent result rendered (`06 15 17 26 38 44`), scored honestly against the chosen ticket ("Chưa trúng giải / Trùng 0/6 số" — a real, non-cherry-picked outcome). Banned-phrase scan on the result region: clean. Console: 0 errors, 0 warnings.

## Journey 4 — Data Explorer: type a real draw id → correct row

Typed `01561` into the id field (via a native input-value + `input` event, since the field is a controlled React input). Result table showed exactly one row: `#01561 / 11/9/2026 / 14 18 20 21 26 27` — matches the real bundled dataset exactly. Console: 0 errors, 0 warnings.

## Journey 5 — Capability Inspector / Advanced discoverability + Ablation/MC numbers visible

Clicked the new anchor link from the Scientific Verdict card (`href="#capability-inspector"`). URL became `.../#capability-inspector`, the Inspector (a `<details open>`) scrolled into viewport. Ablation/Portfolio-MC rows read "Chỉ đọc (read-only)", pointing at the Diagnostics panel below. Confirmed real, non-placeholder numbers in that panel:
- Ablation: `fullFamilySize=3, lookback=90, alpha=0.05, n=1561, datasetHash=8e26f348a8b2…`; all 3 drop-one-strategy scenarios report "Không đổi kết luận" (no Holm-family-size-sensitivity flip detected on real data).
- Portfolio-MC: `seed=645, simulationCount=3000`; n=10/20/30 rows with real mean-best-match and hit≥4/hit≥5 percentages for both projective and random arms.

Console: 0 errors, 0 warnings.

## Journey 6 — Keyboard (the specific gap this round closes)

| Step | Result |
|---|---|
| First Tab from page load | Lands on the skip-link ("Bỏ qua đến nội dung", `href="#workspace"`) |
| Enter on skip-link | URL becomes `.../#workspace` — skip-link genuinely works |
| Next Tab | Lands on the "Nghiên cứu" tab button (correct tablist order) |
| Next Tab | Lands on the ARIA tabpanel container (expected/correct native behavior for a focusable panel region, not a bug) |
| Next Tab | Lands on the "1 tháng" window-switch button, `aria-pressed="false"` |
| Enter on that button | Activates it — `aria-pressed` becomes `"true"` — real keyboard activation confirmed, not just visual focus |
| Visible focus indicator | Confirmed via computed style (`outlineStyle`/`outlineWidth` non-zero) on the focused tab button |
| New anchor link (`#capability-inspector`) | Confirmed as a real, visible, natively-focusable `<a>` (`tabIndex=0`, not hidden) — reachable by continued forward tabbing |
| Keyboard trap | None observed — every Tab press moved focus to a new, distinct element; no repeated/stuck focus |
| Console throughout | 0 errors, 0 warnings |

This directly closes the Round 4 acceptance report's stated gap ("no live keyboard-navigation or focus-order MCP pass was performed").

## Journey 7 — Responsive: 1440×900 and 390×844

| Viewport | Horizontal overflow | Verdict/caveats readable | Console |
|---|---|---|---|
| 1440×900 | N/A (wide) | Yes, all confirmed in Journeys 1–5 | 0 errors, 0 warnings |
| 390×844 | None (`scrollWidth` 375 ≤ 390) | Yes — Scientific Verdict, Ablation/Portfolio-MC panel (via anchor-link tap), all readable without clipping | 0 errors, 0 warnings |

## Journey 8 — Console: 0 errors / 0 warnings in normal flow

Confirmed at every step above across both viewports and all 3 tabs (Research, Portfolio, Ticket Simulator) — never more than 3 total console messages (info-level only) at any point in this session.

## GAP-07 — Bao-18 evidence gate re-attack (recorded here as it's browser/CLI acceptance evidence)

```
$ cp lib/research/bao18-walkforward.test.ts /tmp/backup
# Edited: Protocol A's "hit6 must be true" assertion → deliberately flipped to expect false
$ npm run research:bao18-audit
  ...
  ✖ Protocol A (reverse peek) đạt đúng 100% poolHit6 ...
    AssertionError: DELIBERATE_GAP07_BREAK — phải là false để kiểm tra evidence gate
  ...
  ℹ tests 35 / pass 34 / fail 1
  STOP (§35 fail-closed): anti-leak test suite KHÔNG pass (exit code 1) — từ chối ghi artifact (§35 fail-closed).

$ ls reports/*bao18-walkforward-reverse-audit*
  # Only the 2 pre-existing artifact pairs (12-53 and 13-59) — confirmed NO new file was written.

$ cp /tmp/backup lib/research/bao18-walkforward.test.ts   # restored
$ node --import=tsx --test lib/research/bao18-walkforward.test.ts
  ℹ tests 35 / pass 35 / fail 0
```

The evidence gate genuinely refuses to write an artifact on test failure, and the restored suite passes cleanly. This was independently re-attacked by the lead, not accepted on Agent B's Round 4 report alone.

## Summary

All 8 required journeys, including the previously-incomplete keyboard journey, now have direct, reproducible MCP evidence. The Round 4 "Browser MCP incomplete → max 90" hard cap no longer applies.
