import { HttpError } from "./http";
import { OfficialFetchError, OfficialParseError } from "./sources/vietlott-official";

/**
 * Distinguishes "could not reach the official source at all" from a real
 * data/parser finding. Used by `data:verify-live` so network failure exits 2
 * (NOT EXECUTED) instead of being treated as success or as a data error.
 */
export function isNetworkUnreachable(error: unknown): boolean {
  if (error instanceof OfficialParseError) return false;
  if (error instanceof OfficialFetchError) return false;
  if (error instanceof HttpError) return error.status === null;
  return true;
}
