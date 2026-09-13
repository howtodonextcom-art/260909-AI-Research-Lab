import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("GET /api/health: trả 200 với status ok và timestamp ISO hợp lệ", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { status: string; timestamp: string };
  assert.equal(body.status, "ok");
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)), "timestamp phải parse được thành Date hợp lệ");
});

test("GET /api/health: không cache (Cache-Control: no-store)", async () => {
  const response = await GET();
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("GET /api/health: gắn CSP + X-Request-Id", async () => {
  const response = await GET();
  assert.match(response.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
  assert.match(response.headers.get("X-Request-Id") ?? "", /^req_/);
});

test("GET /api/health: log một dòng JSON có event=health.check", async () => {
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (line: string) => lines.push(line);
  try {
    await GET();
  } finally {
    console.log = originalLog;
  }
  assert.ok(lines.length >= 1, "phải emit ít nhất 1 dòng log");
  const parsed = JSON.parse(lines[lines.length - 1]);
  assert.equal(parsed.event, "health.check");
  assert.equal(parsed.level, "info");
  assert.equal(typeof parsed.requestId, "string");
});
