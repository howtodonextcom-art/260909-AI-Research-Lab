import assert from "node:assert/strict";
import test from "node:test";
import { formatLogLine, generateRequestId, logEvent } from "./logger";

const FIXED_NOW = () => new Date("2026-09-13T12:00:00.000Z");

test("formatLogLine: sinh ra JSON hợp lệ với level/event/time cố định trước", () => {
  const line = formatLogLine({ level: "info", event: "test.event", requestId: "req_1", extra: 42 }, FIXED_NOW);
  const parsed = JSON.parse(line);
  assert.equal(parsed.level, "info");
  assert.equal(parsed.event, "test.event");
  assert.equal(parsed.time, "2026-09-13T12:00:00.000Z");
  assert.equal(parsed.requestId, "req_1");
  assert.equal(parsed.extra, 42);
  // level/event/time must be the first three keys, in that order.
  assert.deepEqual(Object.keys(parsed).slice(0, 3), ["level", "event", "time"]);
});

test("logEvent: info/debug đi ra stdout (console.log)", () => {
  const originalLog = console.log;
  const originalError = console.error;
  const logLines: string[] = [];
  const errorLines: string[] = [];
  console.log = (line: string) => logLines.push(line);
  console.error = (line: string) => errorLines.push(line);
  try {
    logEvent({ level: "info", event: "x" }, FIXED_NOW);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  assert.equal(logLines.length, 1);
  assert.equal(errorLines.length, 0);
});

test("logEvent: warn/error đi ra stderr (console.error), không ra stdout", () => {
  const originalLog = console.log;
  const originalError = console.error;
  const logLines: string[] = [];
  const errorLines: string[] = [];
  console.log = (line: string) => logLines.push(line);
  console.error = (line: string) => errorLines.push(line);
  try {
    logEvent({ level: "warn", event: "x" }, FIXED_NOW);
    logEvent({ level: "error", event: "y" }, FIXED_NOW);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  assert.equal(logLines.length, 0);
  assert.equal(errorLines.length, 2);
});

test("generateRequestId: mỗi lần gọi trả về id khác nhau, đúng format req_<time>_<random>", () => {
  const a = generateRequestId();
  const b = generateRequestId();
  assert.notEqual(a, b);
  assert.match(a, /^req_[0-9a-z]+_[0-9a-z]{8}$/);
});
