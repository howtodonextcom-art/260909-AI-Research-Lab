/**
 * Local dataset scheduler entrypoint.
 *
 * Runs an idempotent `data:sync` and writes a small run log under
 * `reports/scheduler/`. Intended for OS task schedulers (Windows Task
 * Scheduler / cron) when the UI is closed.
 *
 * Limits (honest):
 * - A powered-off machine cannot run this job.
 * - Catch-up happens on the next successful wake/schedule fire.
 * - Cross-check against the vietlott-data mirror is NOT on this path
 *   (optional: `npm run data:cross-check`).
 *
 * Usage:
 *   npm run data:schedule
 *   npm run data:schedule -- --force
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const lockPath = path.join(projectRoot, "reports", "scheduler", "data-schedule.lock");
const logDir = path.join(projectRoot, "reports", "scheduler");

async function isLocked(): Promise<boolean> {
  try {
    await access(lockPath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await mkdir(logDir, { recursive: true });

  if (await isLocked()) {
    const message = `${new Date().toISOString()} SKIP concurrent run (lock present)\n`;
    await writeFile(path.join(logDir, "last-run.log"), message, { flag: "a" });
    console.error("Scheduler: lần chạy khác đang giữ lock — thoát.");
    process.exit(0);
  }

  await writeFile(lockPath, `${process.pid}\n${new Date().toISOString()}\n`, "utf8");
  const started = new Date().toISOString();
  const args = ["--import=tsx", "scripts/data-sync.ts"];
  if (force) args.push("--force");

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });

  const code: number = await new Promise((resolve) => {
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });

  const finished = new Date().toISOString();
  const log = [
    `started=${started}`,
    `finished=${finished}`,
    `exit=${code}`,
    `force=${force}`,
    "--- stdout ---",
    stdout.trimEnd(),
    "--- stderr ---",
    stderr.trimEnd(),
    "",
  ].join("\n");
  await writeFile(path.join(logDir, "last-run.log"), log, "utf8");
  await writeFile(path.join(logDir, `run-${started.replace(/[:.]/g, "-")}.log`), log, "utf8");

  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  } catch {
    // best-effort unlock
  }

  if (code !== 0) {
    console.error(`Scheduler: data:sync thất bại (exit ${code}). Xem reports/scheduler/last-run.log`);
    process.exit(code);
  }
  console.log("Scheduler: sync hoàn tất. Log: reports/scheduler/last-run.log");
}

main().catch(async (error) => {
  console.error(error);
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  } catch {
    // ignore
  }
  process.exit(1);
});
