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
assert.equal(body.current_bundle.change_id, "CHG-2026-124");
assert.deepEqual(body.profile_selector, body.sections.commands.filters.profiles);
assert.equal(body.profile_selector.length, 7);
const dashboardProfilesByKey = new Map(body.profile_selector.map((item) => [item.key, item]));
assert.deepEqual(dashboardProfilesByKey.get("public_stack"), {
  key: "public_stack",
  aliases: ["public-stack", "public_stack"],
  pipeline_key: "public_stack",
  purpose: "Review public exposure gates before opening edge routes."
});
assert.equal(body.profile_summaries.length, 7);
const dashboardProfileSummariesByKey = new Map(body.profile_summaries.map((item) => [item.key, item]));
assert.deepEqual(dashboardProfileSummariesByKey.get("public_stack").aliases, ["public-stack", "public_stack"]);
assert.equal(dashboardProfileSummariesByKey.get("public_stack").pipeline_key, "public_stack");
assert.equal(dashboardProfileSummariesByKey.get("public_stack").purpose, "Review public exposure gates before opening edge routes.");
assert.equal(dashboardProfileSummariesByKey.get("public_stack").status, "ready_now_with_safety_gates");
assert.equal(dashboardProfileSummariesByKey.get("public_stack").command_count, 5);
assert.equal(dashboardProfileSummariesByKey.get("public_stack").attention.level, "safety_gate");
assert.equal(dashboardProfileSummariesByKey.get("public_stack").attention.primary_command, "corepack pnpm run selfhost:readiness -- --profile public-stack");
assert.equal(dashboardProfileSummariesByKey.get("public_stack").attention.primary_json_command, "corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json");
assert.ok(dashboardProfileSummariesByKey.get("public_stack").attention.reasons.some((item) => /public exposure gate/i.test(item)));
assert.equal(body.recommended_profile_keys[0], "public_stack");
assert.deepEqual(
  body.recommended_profile_keys,
  [...body.profile_summaries].sort((left, right) => left.attention.rank - right.attention.rank).map((item) => item.key)
);
assert.ok(
  dashboardProfileSummariesByKey
    .get("public_stack")
    .next_json_commands.includes("corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json")
);
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
  [
    "local_agent_loop",
    "all_in_one_demo",
    "selfhost_platform",
    "public_stack",
    "recovery_evidence",
    "operator_onboarding",
    "published_image"
  ]
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
const recoveryEvidence = body.pipeline_summaries.find((item) => item.key === "recovery_evidence");
assert.equal(recoveryEvidence.status, "ready_now");
assert.ok(recoveryEvidence.next_commands.includes("corepack pnpm run selfhost:ops-report"));
assert.ok(recoveryEvidence.next_commands.includes("corepack pnpm run selfhost:backup-plan"));
assert.ok(recoveryEvidence.next_commands.includes("corepack pnpm run selfhost:restore-plan"));
assert.ok(recoveryEvidence.next_commands.includes("corepack pnpm run selfhost:rotate-plan"));
assert.ok(recoveryEvidence.dashboard_safe_command_count >= 4);
const operatorOnboarding = body.pipeline_summaries.find((item) => item.key === "operator_onboarding");
assert.ok(operatorOnboarding.dashboard_safe_command_count >= 2);
const publishedImage = body.pipeline_summaries.find((item) => item.key === "published_image");
assert.ok(publishedImage.dashboard_safe_command_count >= 2);
assert.ok(body.warnings.includes("repos/client: uncommitted worktree changes"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:doctor"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:action-plan"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_dashboard_must_not_leak"));

const publicStackJson = run(["--json", "--profile", "public-stack"]);
assert.equal(publicStackJson.status, 0, publicStackJson.stderr || publicStackJson.stdout);
const publicStackBody = JSON.parse(publicStackJson.stdout);
assert.equal(publicStackBody.profile_filter.requested, "public-stack");
assert.equal(publicStackBody.profile_filter.resolved, "public_stack");
assert.equal(publicStackBody.profile_filter.pipeline, "public_stack");
assert.equal(publicStackBody.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.deepEqual(publicStackBody.pipeline_summaries.map((item) => item.key), ["public_stack"]);
assert.deepEqual(publicStackBody.profile_summaries.map((item) => item.key), ["public_stack"]);
assert.deepEqual(publicStackBody.recommended_profile_keys, ["public_stack"]);
assert.equal(publicStackBody.profile_summaries[0].status, "ready_now_with_safety_gates");
assert.equal(publicStackBody.profile_summaries[0].attention.level, "safety_gate");
assert.ok(publicStackBody.profile_summaries[0].public_exposure_gate_count >= 2);
assert.equal(publicStackBody.sections.commands.filters_applied.profile.resolved, "public_stack");
assert.ok(
  publicStackBody.sections.commands.commands.some(
    (item) => item.command === "corepack pnpm run selfhost:security-review -- --profile public-stack"
  )
);
assert.ok(
  !publicStackBody.sections.commands.commands.some((item) => item.command === "corepack pnpm run dev:local:plan")
);
assert.deepEqual(publicStackBody.profile_selector, body.profile_selector);
assert.ok(!publicStackJson.stdout.includes("sk_dashboard_must_not_leak"));

const publicStackText = run(["--profile", "public-stack"]);
assert.equal(publicStackText.status, 0, publicStackText.stderr || publicStackText.stdout);
assert.match(publicStackText.stdout, /Profile filter/);
assert.match(publicStackText.stdout, /requested=public-stack/);
assert.match(publicStackText.stdout, /resolved=public_stack/);
assert.match(publicStackText.stdout, /public_stack/);
assert.doesNotMatch(publicStackText.stdout, /- local_agent_loop:/);
assert.doesNotMatch(publicStackText.stdout, /status=blocked/);

const pipedJson = spawnSync(process.execPath, [SCRIPT, "--json"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
  env: {
    ...process.env,
    PLATFORM_ADMIN_API_KEY: "sk_dashboard_must_not_leak"
  }
});
assert.equal(pipedJson.status, 0, pipedJson.stderr || pipedJson.stdout);
assert.ok(pipedJson.stdout.length > 65536);
const pipedBody = JSON.parse(pipedJson.stdout);
assert.equal(pipedBody.command, "deployability:dashboard");
assert.equal(pipedBody.current_bundle.change_id, "CHG-2026-124");
assert.ok(!pipedJson.stdout.includes("sk_dashboard_must_not_leak"));

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
assert.match(text.stdout, /recovery_evidence/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /Profile selector/);
assert.match(text.stdout, /public_stack -> public_stack/);
assert.match(text.stdout, /CHG-2026-124/);
assert.match(text.stdout, /corepack pnpm run deployability:action-plan/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_dashboard_must_not_leak"));

console.log("[deployability-dashboard.test] ok");
