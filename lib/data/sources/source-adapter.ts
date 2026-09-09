/**
 * Source adapter contract.
 *
 * Deviation from a plain `fetchAll(): Promise<RawDraw[]>`: the methods return
 * `SourceResponse`, whose `raw: null` means "the source says nothing changed"
 * (HTTP 304). An array cannot express that — an empty array would be
 * indistinguishable from "the source returned zero rows", which is a very
 * different and much more alarming situation.
 */
import type { NormalizeOutcome } from "../schema";
import type { FetchOptions, RawDraw, SourceResponse, SyncCursor } from "../types";

export interface DrawSourceAdapter {
  readonly id: string;
  readonly sourceUrl: string;
  readonly license: string;
  /** Full snapshot fetch. */
  fetchAll(options?: FetchOptions): Promise<SourceResponse>;
  /** Conditional fetch. Falls back to a full fetch when the source has no cursor support. */
  fetchSince(cursor: SyncCursor, options?: FetchOptions): Promise<SourceResponse>;
  normalize(raw: RawDraw): NormalizeOutcome;
}
