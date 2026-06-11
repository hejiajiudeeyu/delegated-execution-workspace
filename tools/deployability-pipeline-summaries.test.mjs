import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);

function runJson(script) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployability-pipeline-summaries-test-"));
  const stdoutPath = path.join(tmpDir, "stdout.json");
  const stdoutFd = fs.openSync(stdoutPath, "w");
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, script), "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", stdoutFd, "pipe"],
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_pipeline_summary_must_not_leak"
    }
  });
  fs.closeSync(stdoutFd);
  const stdout = fs.readFileSync(stdoutPath, "utf8");
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || stdout);
  assert.ok(!stdout.includes("sk_pipeline_summary_must_not_leak"));
  return JSON.parse(stdout);
}

const dashboard = runJson("tools/deployability-dashboard.mjs");
const handoff = runJson("tools/deployability-handoff.mjs");

assert.deepEqual(
  handoff.pipeline_summaries,
  dashboard.pipeline_summaries,
  "deployability handoff must expose the same pipeline summaries as deployability dashboard"
);

assert.deepEqual(
  handoff.ecosystem_readiness,
  dashboard.ecosystem_readiness,
  "deployability handoff must expose the same ecosystem readiness scorecard as deployability dashboard"
);

console.log("[deployability-pipeline-summaries.test] ok");
