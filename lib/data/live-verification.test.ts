import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "./http";
import { isNetworkUnreachable } from "./live-verification";
import { OfficialFetchError, OfficialParseError } from "./sources/vietlott-official";

test("isNetworkUnreachable: parse/fetch lỗi từ site không phải mất mạng", () => {
  assert.equal(isNetworkUnreachable(new OfficialParseError("markup")), false);
  assert.equal(isNetworkUnreachable(new OfficialFetchError("payload")), false);
  assert.equal(isNetworkUnreachable(new HttpError("500", 500, true)), false);
});

test("isNetworkUnreachable: không có HTTP response hoặc lỗi hạ tầng → NOT EXECUTED", () => {
  assert.equal(isNetworkUnreachable(new HttpError("timeout", null, true)), true);
  assert.equal(isNetworkUnreachable(new TypeError("fetch failed")), true);
  assert.equal(isNetworkUnreachable(new Error("ENOTFOUND")), true);
});
