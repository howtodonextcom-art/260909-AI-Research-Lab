/**
 * Secondary source: the vietvudanh/vietlott-data mirror (MIT licensed).
 *
 * Verified characteristics as of this implementation:
 *  - serves `Access-Control-Allow-Origin: *`, so the browser can fetch it
 *    directly and the app needs no server-side proxy;
 *  - serves a strong `ETag`, so an unchanged dataset costs a single 304;
 *  - publishes one JSONL file per product; Mega 6/45 is `data/power645.jsonl`
 *    (the repository's own naming; the product is Vietlott Mega 6/45).
 *
 * The whole file is a single snapshot with no pagination, so `fetchSince`
 * differs from `fetchAll` only by sending a conditional request. The product
 * uses this adapter for cross-checking only; authoritative sync is the
 * official Vietlott adapter.
 */
import { fetchGuarded } from "../http";
import { parseJsonlRows } from "../jsonl";
import { normalizeDraw } from "../schema";
import type { NormalizeOutcome } from "../schema";
import type { FetchOptions, RawDraw, SourceDescriptor, SourceResponse, SyncCursor } from "../types";
import type { DrawSourceAdapter } from "./source-adapter";

export const VIETLOTT_DATA_URL =
  "https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data/power645.jsonl";

export const VIETLOTT_DATA_SOURCE: SourceDescriptor = {
  id: "vietlott-data",
  url: VIETLOTT_DATA_URL,
  license: "MIT",
};

/** Guards against an upstream path that starts returning something else entirely. */
const MIN_PLAUSIBLE_ROWS = 100;

export type VietlottAdapterOptions = {
  url?: string;
};

export class VietlottDataAdapter implements DrawSourceAdapter {
  readonly id = VIETLOTT_DATA_SOURCE.id;
  readonly sourceUrl = VIETLOTT_DATA_URL;
  readonly license = VIETLOTT_DATA_SOURCE.license;
  private readonly url: string;

  constructor({ url = VIETLOTT_DATA_URL }: VietlottAdapterOptions = {}) {
    this.url = url;
  }

  async fetchAll(options: FetchOptions = {}): Promise<SourceResponse> {
    return this.load(null, options);
  }

  async fetchSince(cursor: SyncCursor, options: FetchOptions = {}): Promise<SourceResponse> {
    return this.load(cursor.etag, options);
  }

  normalize(raw: RawDraw): NormalizeOutcome {
    return normalizeDraw(raw);
  }

  private async load(etag: string | null, options: FetchOptions): Promise<SourceResponse> {
    const response = await fetchGuarded(this.url, {
      ...options,
      etag,
    });
    if (response.text === null) {
      return { raw: null, etag: response.etag };
    }

    const { rows } = parseJsonlRows(response.text);
    if (rows.length < MIN_PLAUSIBLE_ROWS) {
      throw new Error(
        `Nguồn trả về ${rows.length} bản ghi, dưới ngưỡng hợp lý ${MIN_PLAUSIBLE_ROWS}. ` +
          "Nghi ngờ upstream đổi định dạng hoặc đường dẫn — từ chối để không ghi đè dữ liệu tốt.",
      );
    }

    return { raw: rows, etag: response.etag };
  }
}

/** Node/CLI: conditional requests are available and cheap. */
export const vietlottDataAdapter = new VietlottDataAdapter();
