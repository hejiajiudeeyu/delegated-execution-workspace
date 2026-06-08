import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-dashboard.mjs");

function run(args) {
  if (args.includes("--json")) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployability-dashboard-test-"));
    const stdoutPath = path.join(tmpDir, "stdout.json");
    const stdoutFd = fs.openSync(stdoutPath, "w");
    const result = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", stdoutFd, "pipe"],
      env: {
        ...process.env,
        PLATFORM_ADMIN_API_KEY: "sk_dashboard_must_not_leak"
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
      PLATFORM_ADMIN_API_KEY: "sk_dashboard_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:dashboard");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.deepEqual(
  Object.keys(body.sections),
  ["overview", "quickstart", "safety", "commands", "doctor", "compatibility"]
);
assert.equal(body.sections.overview.command, "deployability:overview");
assert.equal(body.sections.quickstart.command, "deployability:quickstart");
assert.equal(body.sections.safety.command, "deployability:safety");
assert.equal(body.sections.commands.command, "deployability:commands");
assert.equal(body.sections.doctor.command, "deployability:doctor");
assert.equal(body.sections.compatibility.command, "compat:status");
assert.equal(body.current_bundle.change_id, "CHG-2026-101");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.equal(body.ecosystem_readiness.goal, "daily-deployable");
assert.deepEqual(
  body.ecosystem_readiness.checks.map((item) => item.key),
  [
    "profile_choice",
    "secret_generation",
    "startup_path",
    "doctor_path",
    "runtime_inspection",
    "boundary_understanding",
    "brand_site_story"
  ]
);
assert.ok(body.ecosystem_readiness.checks.every((item) => item.ok === true));
assert.ok(
  body.ecosystem_readiness.checks
    .find((item) => item.key === "profile_choice")
    .evidence.includes("corepack pnpm run selfhost:profiles")
);
assert.ok(
  body.ecosystem_readiness.checks
    .find((item) => item.key === "secret_generation")
    .evidence.includes("corepack pnpm run selfhost:init")
);
assert.ok(
  body.ecosystem_readiness.checks
    .find((item) => item.key === "runtime_inspection")
    .evidence.includes("corepack pnpm run selfhost:status")
);
assert.ok(
  body.ecosystem_readiness.checks
    .find((item) => item.key === "boundary_understanding")
    .evidence.includes("corepack pnpm run deployability:safety")
);
assert.ok(Array.isArray(body.pipeline_summaries));
assert.deepEqual(
  body.pipeline_summaries.map((item) => item.key),
  ["local_agent_loop", "all_in_one_demo", "selfhost_platform", "public_stack", "operator_onboarding", "published_image"]
);
const allInOne = body.pipeline_summaries.find((item) => item.key === "all_in_one_demo");
assert.equal(allInOne.status, "ready_now");
assert.ok(allInOne.next_commands.includes("corepack pnpm run selfhost:quickstart -- --profile all-in-one"));
assert.ok(allInOne.next_json_commands.includes("corepack pnpm --silent run selfhost:quickstart -- --profile all-in-one --json"));
const publicStack = body.pipeline_summaries.find((item) => item.key === "public_stack");
assert.equal(publicStack.status, "ready_now_with_safety_gates");
assert.equal(publicStack.command_count, 5);
assert.equal(publicStack.json_command_count, 5);
assert.ok(publicStack.dashboard_safe_command_count >= 3);
assert.ok(publicStack.public_exposure_gate_count >= 2);
assert.ok(
  publicStack.next_json_commands.includes(
    "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"
  )
);
assert.ok(publicStack.safety_notes.some((item) => /unsafe public origins/i.test(item)));
const operatorOnboarding = body.pipeline_summaries.find((item) => item.key === "operator_onboarding");
assert.ok(operatorOnboarding.dashboard_safe_command_count >= 2);
const publishedImage = body.pipeline_summaries.find((item) => item.key === "published_image");
assert.ok(publishedImage.dashboard_safe_command_count >= 2);
assert.ok(body.warnings.includes("repos/client: uncommitted worktree changes"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:doctor"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_dashboard_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability dashboard/);
assert.match(text.stdout, /overview/);
assert.match(text.stdout, /commands/);
assert.match(text.stdout, /compatibility/);
assert.match(text.stdout, /Ecosystem readiness/);
assert.match(text.stdout, /daily_deployable_with_safety_gates/);
assert.match(text.stdout, /Pipeline summaries/);
assert.match(text.stdout, /all_in_one_demo/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /CHG-2026-101/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_dashboard_must_not_leak"));

console.log("[deployability-dashboard.test] ok");
