/**
 * Writes `public/_headers` (and post-build `dist/client/_headers` when present)
 * from `lib/security/headers.ts` so Cloudflare Assets and the TypeScript source
 * of truth cannot drift.
 *
 * Usage:
 *   node scripts/write-security-headers.mjs           # public/ only
 *   node scripts/write-security-headers.mjs --dist    # also overwrite dist/client/_headers after build
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);

// Load the compiled-from-TS module via tsx register when available; otherwise
// duplicate the formatter by importing through a dynamic tsx path used elsewhere.
async function loadFormatter() {
  try {
    const mod = await import("../lib/security/headers.ts");
    return mod.formatCloudflareHeadersFile;
  } catch {
    // Fallback for plain node without ts loader: shell out is avoided; inline
    // a minimal fail so CI surfaces the issue instead of writing a blank file.
    throw new Error(
      "Cannot import lib/security/headers.ts — run via `node --import=tsx scripts/write-security-headers.mjs`",
    );
  }
}

const formatCloudflareHeadersFile = await loadFormatter();
const body = formatCloudflareHeadersFile();

const publicPath = path.join(root, "public", "_headers");
mkdirSync(path.dirname(publicPath), { recursive: true });
writeFileSync(publicPath, body, "utf8");
console.log(`wrote ${path.relative(root, publicPath)}`);

if (process.argv.includes("--dist")) {
  const distPath = path.join(root, "dist", "client", "_headers");
  if (!existsSync(path.dirname(distPath))) {
    console.warn("dist/client missing — skip --dist write (run after npm run build)");
  } else {
    writeFileSync(distPath, body, "utf8");
    console.log(`wrote ${path.relative(root, distPath)}`);
  }
}

// silence unused in case createRequire stays for future CJS interop
void require;
