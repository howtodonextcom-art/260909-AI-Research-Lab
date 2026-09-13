/**
 * `npm run test:discovery` — closes a real gap found in Round 4's provenance
 * audit: Node's built-in test runner silently ignores a nonexistent file
 * path given on its command line (exit 0, zero complaint), and this repo's
 * `test:business`/`data:test` scripts are plain hand-maintained file lists.
 * That combination means two failure modes are possible with NO other
 * signal: a file gets added on disk but forgotten from the list (a real
 * orphan — silently never executed by `npm test`), or a file gets listed
 * but never actually written, or later deleted (a phantom — looks tested,
 * contributes zero coverage). Both happened for real in this repo before
 * this check existed: `lib/data/explorer.test.ts` and
 * `lib/research/prospective-summary.test.ts` were orphaned, and
 * `lib/research/provenance-registry.test.ts` was listed but never written.
 *
 * This script is the single source of truth going forward: it scans the
 * repo for every `*.test.ts`/`*.test.tsx` file, parses the exact file lists
 * out of `package.json`'s `test:business` and `data:test` scripts, and fails
 * loudly on any mismatch in either direction. No filesystem writes.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".next", ".git", ".wrangler", ".vercel", ".open-next"]);

async function findTestFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      await findTestFiles(path.join(dir, entry.name), out);
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      out.push(path.relative(projectRoot, path.join(dir, entry.name)).split(path.sep).join("/"));
    }
  }
}

function extractListedFiles(scriptCommand: string): string[] {
  return (scriptCommand.match(/[A-Za-z0-9_./-]+\.test\.tsx?/g) ?? []);
}

const pkg = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

// Every npm script whose command line looks like it runs the test runner
// against an explicit file list is a source of truth to check — not just
// `test:business`/`data:test` by name, in case a new suite is added later.
const testRunnerScriptNames = Object.entries(scripts as Record<string, string>)
  .filter(([, command]) => /--test\b/.test(command))
  .map(([name]) => name);

if (!testRunnerScriptNames.length) {
  console.error("KHÔNG TÌM THẤY script nào chạy `node --test` trong package.json — kiểm tra lại quy ước đặt tên.");
  process.exit(1);
}

const listedFiles = new Set<string>();
for (const name of testRunnerScriptNames) {
  for (const file of extractListedFiles(scripts[name])) listedFiles.add(file);
}

const onDiskFiles: string[] = [];
await findTestFiles(projectRoot, onDiskFiles);
const onDiskSet = new Set(onDiskFiles);

const orphans = onDiskFiles.filter((file) => !listedFiles.has(file)).sort();
const phantoms = [...listedFiles].filter((file) => !onDiskSet.has(file)).sort();

if (orphans.length || phantoms.length) {
  console.error(`XÁC MINH TEST DISCOVERY THẤT BẠI: ${orphans.length + phantoms.length} vấn đề.\n`);
  if (orphans.length) {
    console.error(`  MỒ CÔI (tồn tại trên đĩa nhưng KHÔNG có trong bất kỳ script test nào — không bao giờ được chạy):`);
    for (const file of orphans) console.error(`    - ${file}`);
  }
  if (phantoms.length) {
    console.error(`\n  ẢO (được liệt kê trong script test nhưng KHÔNG tồn tại trên đĩa — không đóng góp coverage nào):`);
    for (const file of phantoms) console.error(`    - ${file}`);
  }
  console.error(
    "\n  Sửa bằng cách thêm file mồ côi vào đúng script (test:business cho lib/research,app,components; " +
      "data:test cho lib/data), hoặc viết file test còn thiếu, hoặc xóa dòng liệt kê nếu file thật sự không còn cần thiết " +
      "(và ghi rõ lý do trong commit message).",
  );
  process.exit(1);
}

console.log(`XÁC MINH TEST DISCOVERY THÀNH CÔNG — ${onDiskFiles.length} file test trên đĩa, tất cả đều được liệt kê đúng một lần, không có file ảo.`);
