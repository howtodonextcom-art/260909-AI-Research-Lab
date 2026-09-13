import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  applySecurityHeaders,
  formatCloudflareHeadersFile,
} from "./headers";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "../..");

test("CSP baseline forbids framing and objects, allows only self connect", () => {
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /connect-src 'self'/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /vietlott\.vn/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /script-src[^;]*'unsafe-inline'/);
});

test("SECURITY_HEADERS includes CSP + nosniff + frame deny", () => {
  const map = Object.fromEntries(SECURITY_HEADERS);
  assert.equal(map["Content-Security-Policy"], CONTENT_SECURITY_POLICY);
  assert.equal(map["X-Content-Type-Options"], "nosniff");
  assert.equal(map["X-Frame-Options"], "DENY");
});

test("applySecurityHeaders sets every declared header", () => {
  const headers = applySecurityHeaders(new Headers());
  for (const [name, value] of SECURITY_HEADERS) {
    assert.equal(headers.get(name), value);
  }
});

test("public/_headers matches formatCloudflareHeadersFile() (single source of truth)", () => {
  const onDisk = readFileSync(path.join(root, "public/_headers"), "utf8");
  assert.equal(onDisk, formatCloudflareHeadersFile());
});

test("middleware.ts applies SECURITY_HEADERS to document responses", () => {
  const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8");
  assert.match(middleware, /SECURITY_HEADERS/);
  assert.match(middleware, /NextResponse\.next/);
  assert.match(middleware, /export function middleware/);
});
