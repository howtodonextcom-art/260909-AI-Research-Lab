"use client";

/**
 * Sticky in-page nav for the Research tab (Round 6 §5 / Combined §30 —
 * Variant A "Verdict-first Production IA", the pre-selected default).
 *
 * Rendered once, right after `<ScientificVerdict>` and before `<DataStatus>`,
 * so the verdict is still the very first substantive content but a reader
 * never has to manually scroll past the 45-cell frequency matrix or the
 * walk-forward/holdout tables to reach Bao-18, Diagnostics, or the Advanced
 * (Capability Inspector) section — each is one anchor click away instead.
 *
 * Every entry is a real `<a href="#...">` — natively focusable and
 * activatable with Enter, no custom keyboard handling needed — pointing at
 * stable ids that already exist on the target headings/sections (see the
 * `id` attributes already present on `DataStatus`'s heading,
 * `ExperimentScorecard`'s heading, the walk-forward section in
 * `app/page.tsx`, `Bao18Panel`'s heading, `DiagnosticsPanel`'s heading,
 * `CapabilityInspector`'s `<details id="capability-inspector">`, and
 * `DataExplorer`'s heading). No new ids were invented where an existing one
 * already worked as an anchor target.
 */
const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "#data-status-heading", label: "Dữ liệu" },
  { href: "#evidence-section", label: "Bằng chứng" },
  { href: "#bao18-panel-heading", label: "Bao-18" },
  { href: "#diagnostics-panel-heading", label: "Chẩn đoán" },
  { href: "#capability-inspector", label: "Nâng cao" },
  { href: "#data-explorer-heading", label: "Tra cứu" },
];

export function ResearchNav() {
  return (
    <nav className="research-nav" aria-label="Điều hướng nhanh trong tab Nghiên cứu">
      <ul>
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
