import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-action-plan.mjs");

function run(args) {
  if (args.includes("--json")) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployability-action-plan-test-"));
    const stdoutPath = path.join(tmpDir, "stdout.json");
    const stdoutFd = fs.openSync(stdoutPath, "w");
    const result = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", stdoutFd, "pipe"],
      env: {
        ...process.env,
        PLATFORM_ADMIN_API_KEY: "sk_action_plan_must_not_leak"
      }
    });
    fs.closeSync(stdoutFd);
    return {
      ...result,
      stdout: fs.readFileSync(stdoutPath, "utf8")
    };
  }
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_action_plan_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:action-plan");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-104");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.deepEqual(
  body.profiles.map((item) => item.key),
  [
    "daily_dev",
    "all_in_one_demo",
    "selfhost_platform",
    "public_stack",
    "recovery_evidence",
    "operator_onboarding",
    "published_image"
  ]
);

const publicStack = body.profiles.find((item) => item.key === "public_stack");
assert.equal(publicStack.pipeline_key, "public_stack");
assert.equal(publicStack.status, "ready_now_with_safety_gates");
assert.ok(publicStack.summary.public_exposure_gate_count >= 2);
assert.ok(publicStack.dashboard_safe_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicStack.public_exposure_gate_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicStack.next_json_commands.includes("corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"));

const dailyDev = body.profiles.find((item) => item.key === "daily_dev");
assert.equal(dailyDev.pipeline_key, "local_agent_loop");
assert.ok(dailyDev.recommended_commands.includes("corepack pnpm run dev:local:plan"));
assert.ok(dailyDev.dashboard_safe_commands.includes("corepack pnpm run dev:doctor"));

const recovery = body.profiles.find((item) => item.key === "recovery_evidence");
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:ops-report"));
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:backup-plan"));
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:rotate-plan"));

assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_action_plan_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability action plan/);
assert.match(text.stdout, /daily_dev/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /dashboard-safe/);
assert.match(text.stdout, /public-exposure-gates/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_action_plan_must_not_leak"));

console.log("[deployability-action-plan.test] ok");
