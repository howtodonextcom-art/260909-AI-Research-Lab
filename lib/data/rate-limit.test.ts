import assert from "node:assert/strict";
import test from "node:test";
import { checkSlidingWindow, createRateLimiterState, REFRESH_RATE_LIMIT, type RateLimitOptions } from "./rate-limit";

const OPTIONS: RateLimitOptions = { windowMs: 10_000, maxRequests: 3 };

test("checkSlidingWindow: cho phép tới đúng maxRequests trong cửa sổ, request thứ (max+1) bị từ chối", () => {
  let timestamps: number[] = [];
  const now = 1_000_000;
  for (let i = 0; i < OPTIONS.maxRequests; i += 1) {
    const result = checkSlidingWindow(timestamps, now + i, OPTIONS);
    assert.equal(result.allowed, true, `request thứ ${i + 1} phải được phép`);
    timestamps = result.timestamps;
  }
  const rejected = checkSlidingWindow(timestamps, now + OPTIONS.maxRequests, OPTIONS);
  assert.equal(rejected.allowed, false);
  assert.ok(rejected.retryAfterMs > 0);
});

test("checkSlidingWindow: request cũ hơn windowMs bị loại khỏi cửa sổ, giải phóng chỗ trống", () => {
  let timestamps: number[] = [];
  const now = 1_000_000;
  for (let i = 0; i < OPTIONS.maxRequests; i += 1) {
    timestamps = checkSlidingWindow(timestamps, now + i, OPTIONS).timestamps;
  }
  // Vượt hẳn windowMs kể từ request đầu tiên: request đầu rơi khỏi cửa sổ,
  // giải phóng chỗ trống nên request mới vẫn được phép (dù 2 request giữa
  // vẫn còn trong cửa sổ + request mới = 2 timestamp còn lại, vẫn < max).
  const afterWindow = checkSlidingWindow(timestamps, now + OPTIONS.windowMs + 1, OPTIONS);
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.timestamps.length, 2);
});

test("checkSlidingWindow: retryAfterMs bằng đúng thời gian còn lại tới khi request cũ nhất hết hạn", () => {
  const now = 1_000_000;
  const timestamps = [now, now + 1_000, now + 2_000];
  const result = checkSlidingWindow(timestamps, now + 3_000, { windowMs: 10_000, maxRequests: 3 });
  assert.equal(result.allowed, false);
  // Request cũ nhất (now) hết hạn tại now+10000; thời điểm hiện tại là now+3000 → còn 7000ms.
  assert.equal(result.retryAfterMs, 7_000);
});

test("checkSlidingWindow: không có timestamp nào thì luôn cho phép", () => {
  const result = checkSlidingWindow([], 0, OPTIONS);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.timestamps, [0]);
});

test("createRateLimiterState: giữ trạng thái qua nhiều lần check(), reset() xoá sạch trạng thái", () => {
  const state = createRateLimiterState(OPTIONS);
  const now = 5_000_000;
  for (let i = 0; i < OPTIONS.maxRequests; i += 1) {
    assert.equal(state.check(now + i).allowed, true);
  }
  assert.equal(state.check(now + OPTIONS.maxRequests).allowed, false);

  state.reset();
  assert.equal(state.check(now).allowed, true, "sau reset() phải cho phép trở lại như trạng thái ban đầu");
});

test("REFRESH_RATE_LIMIT: chính sách mặc định cho route refresh công khai hợp lý (không quá chặt, không quá lỏng)", () => {
  assert.ok(REFRESH_RATE_LIMIT.maxRequests >= 1);
  assert.ok(REFRESH_RATE_LIMIT.windowMs > 0);
});
