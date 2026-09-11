/**
 * Official source: vietlott.vn itself (public HTML, no API contract).
 *
 * This is the PRIMARY source (see ADR-001): the mirror in `vietlott-data.ts`
 * is demoted to secondary/cross-check only. Ported from and cross-checked
 * against `260911-AI-Research-Lab-Python/vietlott_mega645/client.py`
 * (the donor repo), then validated against live responses fetched during
 * this implementation (see `reports/research-core-upgrade-final.md`).
 *
 * ## The dangerous failure mode this file exists to prevent
 *
 * The Vietlott history endpoint is paginated (8 rows/page) via an AjaxPro
 * POST. A naive crawler stops when a page yields zero parsable rows and
 * calls that "end of history". That conflates two completely different
 * situations:
 *
 *  - genuine EOF: verified live (2026-09) — page 195 returns a short page
 *    (1 row, id #00001) and pages 196+ return a well-formed table with
 *    zero rows. Real EOF is therefore SHORT PAGE, not necessarily EMPTY.
 *  - a markup regression: the row/wrapper regex stops matching mid-history
 *    because Vietlott changed a class name or the table shape. This also
 *    presents as "zero rows", but happening BEFORE reaching known history
 *    is a parser bug, not EOF — and must never be silently accepted as one.
 *
 * The fix: a zero-row (or wrapper-missing) page is only ever accepted as a
 * legitimate empty/EOF page once the crawl has positively reached a known
 * anchor — draw `#00001` for a full crawl, or the caller's previously
 * synced `latestId` for an incremental one. Reaching that anchor is
 * detected from row IDs actually parsed off the page, not inferred from an
 * absence of rows. If the configured page budget is exhausted without ever
 * reaching the anchor, the crawl throws instead of returning a truncated
 * dataset — see `crawl()` below.
 */
import { getGuarded, postGuarded } from "../http";
import { normalizeDraw } from "../schema";
import type { NormalizeOutcome } from "../schema";
import type { FetchOptions, RawDraw, SourceDescriptor, SourceResponse, SyncCursor } from "../types";
import type { DrawSourceAdapter } from "./source-adapter";

export const OFFICIAL_BASE_URL = "https://vietlott.vn";
const HISTORY_PATH = "/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645";
const DETAIL_PATH = "/vi/trung-thuong/ket-qua-trung-thuong/645";
const AJAX_PATH =
  "/ajaxpro/Vietlott.PlugIn.WebParts.Game645CompareWebPart,Vietlott.PlugIn.WebParts.ashx";

export const OFFICIAL_SOURCE: SourceDescriptor = {
  id: "vietlott-official",
  url: `${OFFICIAL_BASE_URL}${HISTORY_PATH}`,
  license: "public official website, no explicit reuse license stated",
};

/** Documented lower bound of Mega 6/45 history; see ADR-001 and §9 continuity rules. */
export const FIRST_DRAW_ID = "00001";
/** Verified live 2026-09: a full page carries 8 rows; the true last page carries fewer. */
const HISTORY_PAGE_SIZE = 8;
const DEFAULT_USER_AGENT = "mega645-research-lab-ts/0.1 (+https://vietlott.vn)";
const DEFAULT_PAGE_DELAY_MS = 400;
/** Safety bound: real history was ~196 pages as of 2026-09; this leaves ample headroom. */
const DEFAULT_MAX_PAGES = 800;

export class OfficialParseError extends Error {
  readonly state = "PARSE_STRUCTURE_CHANGED" as const;
  constructor(message: string) {
    super(message);
    this.name = "OfficialParseError";
  }
}

export class OfficialFetchError extends Error {
  readonly state = "FETCH_FAILED" as const;
  constructor(message: string) {
    super(message);
    this.name = "OfficialFetchError";
  }
}

const HISTORY_ROW_RE =
  /<tr>\s*<td>\s*(\d{2}\/\d{2}\/\d{4})\s*<\/td>\s*<td>\s*<a\s+href="([^"]*?id=(\d{5})&nocatche=1[^"]*)"[^>]*>\s*\d{5}\s*<\/a>\s*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
const BALL_RE = /<span[^>]*class="[^"]*\bbong_tron\b[^"]*"[^>]*>\s*(\d{1,2})\s*<\/span>/gi;
const DETAIL_HEADER_RE =
  /Kỳ\s+quay\s+thưởng\s*<b>#(\d{5})<\/b>\s*ngày\s*<b>(\d{2}\/\d{2}\/\d{4})<\/b>/i;
const DETAIL_BLOCK_RE = /<div\s+class="day_so_ket_qua_v2"[^>]*>([\s\S]*?)<\/div>/i;
const HISTORY_KEY_RE = /Game645CompareWebPart\.ServerSideDrawResult\(RenderInfo,\s*'([^']+)'/i;
const DATE_SHAPE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Pure format transform (DD/MM/YYYY -> YYYY-MM-DD). Calendar realness is validated
 *  downstream by `normalizeDraw`/`isRealCalendarDate`, so a garbage day/month such as
 *  32/13/2026 is intentionally allowed through here and rejected later, with a
 *  human-readable reason instead of this function silently guessing. */
export function parseVietnameseDate(value: string): string {
  const match = DATE_SHAPE_RE.exec(value.trim());
  if (!match) {
    throw new OfficialParseError(`Định dạng ngày không đúng DD/MM/YYYY: ${JSON.stringify(value)}`);
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/** Extracts however many ball numbers are actually present; validity (count, range,
 *  uniqueness) is enforced later by `normalizeDraw`, so a malformed row surfaces as an
 *  ordinary rejected-record issue rather than a page-level parse failure. */
export function extractBallNumbers(fragment: string): number[] {
  return [...fragment.matchAll(BALL_RE)].map((match) => Number(match[1]));
}

export function discoverHistoryKey(html: string): string {
  const match = HISTORY_KEY_RE.exec(html);
  if (!match) {
    throw new OfficialParseError(
      "Không tìm thấy AjaxPro history key trên trang landing — có thể Vietlott đã đổi giao diện.",
    );
  }
  return match[1];
}

export function parseDetailHtml(html: string): RawDraw {
  const header = DETAIL_HEADER_RE.exec(html);
  if (!header) {
    throw new OfficialParseError(
      "Không tìm thấy tiêu đề kỳ quay (id/ngày) trên trang chi tiết — có thể Vietlott đã đổi giao diện.",
    );
  }
  const block = DETAIL_BLOCK_RE.exec(html);
  if (!block) {
    throw new OfficialParseError(
      "Không tìm thấy khối kết quả (day_so_ket_qua_v2) trên trang chi tiết — có thể Vietlott đã đổi giao diện.",
    );
  }
  return {
    id: header[1],
    date: parseVietnameseDate(header[2]),
    result: extractBallNumbers(block[1]),
  };
}

export type RawHistoryRow = { id: string; date: string; result: number[] };

export type HistoryPageOutcome =
  | { state: "PARSE_SUCCESS"; rows: RawHistoryRow[] }
  | { state: "PARSE_EMPTY_VALID_PAGE" };

/**
 * `trustEmptyPage` is the caller's evidence that the crawl has already reached a known
 * anchor (draw #00001, or the previously synced latest id). Only then may zero matched
 * rows be treated as a legitimate trailing empty page instead of a structure regression.
 */
export function parseHistoryHtml(html: string, trustEmptyPage: boolean): HistoryPageOutcome {
  const hasWrapper = /doso_output_nd/i.test(html) && /<tbody/i.test(html);
  if (!hasWrapper) {
    throw new OfficialParseError(
      "Không tìm thấy khung bảng lịch sử (doso_output_nd/<tbody>) trên trang kết quả — có thể Vietlott đã đổi giao diện.",
    );
  }

  const rows: RawHistoryRow[] = [];
  for (const match of html.matchAll(HISTORY_ROW_RE)) {
    const [, dateStr, , id, numbersFragment] = match;
    rows.push({ id, date: parseVietnameseDate(dateStr), result: extractBallNumbers(numbersFragment) });
  }

  if (rows.length === 0) {
    if (trustEmptyPage) return { state: "PARSE_EMPTY_VALID_PAGE" };
    throw new OfficialParseError(
      "Trang lịch sử có khung bảng hợp lệ nhưng 0 dòng kết quả, và chưa chạm mốc lịch sử đã biết — " +
        "từ chối coi đây là hết lịch sử vì có thể parser đã hỏng do đổi giao diện, không phải EOF thật.",
    );
  }

  return { state: "PARSE_SUCCESS", rows };
}

export function parseAjaxEnvelope(text: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new OfficialFetchError("Phản hồi AjaxPro không phải JSON hợp lệ.");
  }
  const envelope = payload as { error?: unknown; value?: unknown } | null;
  if (envelope?.error) {
    throw new OfficialFetchError(`AjaxPro báo lỗi: ${String(envelope.error)}`);
  }
  const value = envelope?.value as { Error?: unknown; InfoMessage?: unknown; HtmlContent?: unknown } | undefined;
  if (!value || typeof value !== "object") {
    throw new OfficialFetchError("Phản hồi AjaxPro thiếu trường 'value' — coi là phản hồi không đầy đủ.");
  }
  if (value.Error) {
    throw new OfficialFetchError(`Vietlott trả lỗi: ${value.InfoMessage ? String(value.InfoMessage) : JSON.stringify(value)}`);
  }
  if (typeof value.HtmlContent !== "string") {
    throw new OfficialFetchError("Phản hồi AjaxPro thiếu HtmlContent — coi là phản hồi không đầy đủ.");
  }
  return value.HtmlContent;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type VietlottOfficialAdapterOptions = {
  userAgent?: string;
  maxPages?: number;
  pageDelayMs?: number;
};

export class VietlottOfficialAdapter implements DrawSourceAdapter {
  readonly id = OFFICIAL_SOURCE.id;
  readonly sourceUrl = OFFICIAL_SOURCE.url;
  readonly license = OFFICIAL_SOURCE.license;
  private readonly userAgent: string;
  private readonly maxPages: number;
  private readonly pageDelayMs: number;

  constructor({ userAgent = DEFAULT_USER_AGENT, maxPages = DEFAULT_MAX_PAGES, pageDelayMs = DEFAULT_PAGE_DELAY_MS }: VietlottOfficialAdapterOptions = {}) {
    this.userAgent = userAgent;
    this.maxPages = maxPages;
    this.pageDelayMs = pageDelayMs;
  }

  /** Full crawl back to the documented first draw. */
  async fetchAll(options: FetchOptions = {}): Promise<SourceResponse> {
    const rows = await this.crawl(FIRST_DRAW_ID, "exact", options);
    return { raw: rows, etag: rows.length ? maxId(rows) : null };
  }

  /**
   * `etag`'s conditional-request meaning does not apply to this source (there is no
   * HTTP ETag for a server-rendered HTML table); the `sourceEtag` manifest field is
   * repurposed here to carry the last-synced draw id instead, which is exactly what
   * `cursor.latestId` already is. So this ignores `cursor.etag` and anchors on
   * `cursor.latestId`, crawling only as far back as needed to collect newer draws.
   */
  async fetchSince(cursor: SyncCursor, options: FetchOptions = {}): Promise<SourceResponse> {
    if (!cursor.latestId) return this.fetchAll(options);
    const rows = await this.crawl(cursor.latestId, "at-or-below", options);
    if (rows.length === 0) return { raw: null, etag: cursor.latestId };
    return { raw: rows, etag: maxId(rows) };
  }

  normalize(raw: RawDraw): NormalizeOutcome {
    return normalizeDraw(raw);
  }

  private headers(): Record<string, string> {
    return { "User-Agent": this.userAgent, Accept: "text/html,application/xhtml+xml" };
  }

  private async fetchLandingAndKey(options: FetchOptions): Promise<{ landingHtml: string; key: string }> {
    const response = await getGuarded(`${OFFICIAL_BASE_URL}${HISTORY_PATH}`, {
      headers: this.headers(),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
    if (response.text === null) {
      throw new OfficialFetchError("Trang landing lịch sử trả về rỗng bất thường (304 không có ý nghĩa ở đây).");
    }
    return { landingHtml: response.text, key: discoverHistoryKey(response.text) };
  }

  private async fetchPageHtml(pageIndex: number, key: string, options: FetchOptions): Promise<string> {
    const body = JSON.stringify({
      ORenderInfo: {
        SiteId: "main.frontend.vi",
        SiteAlias: "main.vi",
        UserSessionId: "",
        SiteLang: "vi",
        IsPageDesign: false,
        ExtraParam1: "",
        ExtraParam2: "",
        ExtraParam3: "",
        SiteURL: "",
        WebPage: null,
        SiteName: "Vietlott",
        OrgPageAlias: null,
        PageAlias: null,
        FullPageAlias: null,
        RefKey: null,
        System: 1,
      },
      Key: key,
      GameDrawId: "",
      ArrayNumbers: Array.from({ length: 6 }, () => Array(18).fill("")),
      CheckMulti: false,
      PageIndex: pageIndex,
    });
    const response = await postGuarded(`${OFFICIAL_BASE_URL}${AJAX_PATH}`, {
      headers: {
        ...this.headers(),
        Accept: "application/json,text/plain,*/*",
        "Content-Type": "text/plain; charset=utf-8",
        "X-AjaxPro-Method": "ServerSideDrawResult",
      },
      body,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
    if (response.text === null) {
      throw new OfficialFetchError(`Trang ${pageIndex} trả về rỗng bất thường.`);
    }
    return parseAjaxEnvelope(response.text);
  }

  /**
   * Shared crawler for both full (`mode: "exact"`, anchor = #00001) and incremental
   * (`mode: "at-or-below"`, anchor = previously synced latestId) fetches. See the
   * file-level doc comment for why EOF is anchor-verified rather than inferred from
   * an empty page.
   */
  private async crawl(anchorId: string, mode: "exact" | "at-or-below", options: FetchOptions): Promise<RawHistoryRow[]> {
    const { landingHtml, key } = await this.fetchLandingAndKey(options);
    let reachedAnchor = false;
    const collected: RawHistoryRow[] = [];

    for (let page = 0; page < this.maxPages; page += 1) {
      const html = page === 0 ? landingHtml : await this.fetchPageHtml(page, key, options);
      const outcome = parseHistoryHtml(html, reachedAnchor);

      if (outcome.state === "PARSE_EMPTY_VALID_PAGE") break;

      if (!reachedAnchor) {
        reachedAnchor =
          mode === "exact"
            ? outcome.rows.some((row) => row.id === anchorId)
            : outcome.rows.some((row) => Number(row.id) <= Number(anchorId));
      }

      collected.push(
        ...(mode === "at-or-below"
          ? outcome.rows.filter((row) => Number(row.id) > Number(anchorId))
          : outcome.rows),
      );

      const isShortPage = outcome.rows.length < HISTORY_PAGE_SIZE;
      if (isShortPage || reachedAnchor) break;
      if (page + 1 < this.maxPages) await delay(this.pageDelayMs);
    }

    if (!reachedAnchor) {
      throw new OfficialFetchError(
        mode === "exact"
          ? `Crawl toàn bộ lịch sử nhưng chưa từng thấy kỳ #${FIRST_DRAW_ID} sau ${this.maxPages} trang — dừng lại thay vì coi là đã đủ dữ liệu.`
          : `Crawl tăng dần nhưng chưa chạm mốc kỳ đã biết #${anchorId} sau ${this.maxPages} trang — nguồn có thể đã thay đổi; dừng lại để tránh chấp nhận dữ liệu sai.`,
      );
    }

    return collected;
  }
}

function maxId(rows: RawHistoryRow[]): string {
  return rows.reduce((best, row) => (Number(row.id) > Number(best) ? row.id : best), "00000");
}

export const vietlottOfficialAdapter = new VietlottOfficialAdapter();

/** Fetches a single draw by id — used by the cross-check spot verifier and by `data:verify-live`. */
export async function fetchOfficialDraw(drawId: string, options: FetchOptions = {}, userAgent = DEFAULT_USER_AGENT): Promise<RawDraw> {
  const response = await getGuarded(`${OFFICIAL_BASE_URL}${DETAIL_PATH}?id=${drawId}&nocatche=1`, {
    headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" },
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
  if (response.text === null) {
    throw new OfficialFetchError(`Trang chi tiết kỳ ${drawId} trả về rỗng bất thường.`);
  }
  return parseDetailHtml(response.text);
}
