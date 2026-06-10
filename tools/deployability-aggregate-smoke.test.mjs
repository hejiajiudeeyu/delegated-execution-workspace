import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);

function run(script, args) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, script), ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      DELEXEC_JSON_SOURCE_FIXTURE_DIR: "",
      PLATFORM_ADMIN_API_KEY: "sk_aggregate_smoke_must_not_leak"
    },
    maxBuffer: 40 * 1024 * 1024
  });
}

const dashboard = run("tools/deployability-dashboard.mjs", ["--json", "--profile", "public-stack"]);
assert.equal(dashboard.status, 0, dashboard.stderr || dashboard.stdout);
const dashboardBody = JSON.parse(dashboard.stdout);
assert.equal(dashboardBody.command, "deployability:dashboard");
assert.equal(dashboardBody.ok, true);
assert.equal(dashboardBody.profile_filter.resolved, "public_stack");
assert.ok(!dashboard.stdout.includes("sk_aggregate_smoke_must_not_leak"));

const release = run("tools/deployability-release.mjs", ["--json", "--image-tag", "candidate-2026-06-09"]);
assert.equal(release.status, 0, release.stderr || release.stdout);
const releaseBody = JSON.parse(release.stdout);
assert.equal(releaseBody.command, "deployability:release");
assert.equal(releaseBody.ok, true);
assert.equal(releaseBody.image_tag, "candidate-2026-06-09");
assert.equal(releaseBody.summary.dry_run_ready, true);
assert.ok(!release.stdout.includes("sk_aggregate_smoke_must_not_leak"));

console.log("[deployability-aggregate-smoke.test] ok");
