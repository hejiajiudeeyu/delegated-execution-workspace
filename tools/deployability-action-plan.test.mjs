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
assert.equal(body.current_bundle.change_id, "CHG-2026-133");
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
assert.equal(publicStack.attention.level, "safety_gate");
assert.equal(publicStack.attention.primary_command, publicStack.recommended_commands[0]);
assert.equal(publicStack.attention.primary_json_command, publicStack.next_json_commands[0]);
assert.ok(publicStack.attention.reasons.some((item) => /public exposure gate/i.test(item)));
assert.ok(publicStack.summary.public_exposure_gate_count >= 2);
assert.ok(publicStack.dashboard_safe_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicStack.public_exposure_gate_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicStack.next_json_commands.includes("corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"));

const dailyDev = body.profiles.find((item) => item.key === "daily_dev");
assert.equal(dailyDev.pipeline_key, "local_agent_loop");
assert.equal(dailyDev.attention.level, "operational");
assert.ok(publicStack.attention.rank < dailyDev.attention.rank);
assert.ok(dailyDev.recommended_commands.includes("corepack pnpm run dev:local:plan"));
assert.ok(dailyDev.dashboard_safe_commands.includes("corepack pnpm run dev:doctor"));

const recovery = body.profiles.find((item) => item.key === "recovery_evidence");
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:ops-report"));
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:backup-plan"));
assert.ok(recovery.dashboard_safe_commands.includes("corepack pnpm run selfhost:rotate-plan"));

const publicStackOnly = run(["--json", "--profile", "public-stack"]);
assert.equal(publicStackOnly.status, 0, publicStackOnly.stderr || publicStackOnly.stdout);
const publicStackOnlyBody = JSON.parse(publicStackOnly.stdout);
assert.equal(publicStackOnlyBody.ok, true);
assert.equal(publicStackOnlyBody.profile_filter.requested, "public-stack");
assert.equal(publicStackOnlyBody.profile_filter.resolved, "public_stack");
assert.deepEqual(publicStackOnlyBody.profiles.map((item) => item.key), ["public_stack"]);
assert.deepEqual(publicStackOnlyBody.recommended_profile_keys, ["public_stack"]);
assert.equal(publicStackOnlyBody.profiles[0].attention.level, "safety_gate");
assert.ok(
  publicStackOnlyBody.profiles[0].public_exposure_gate_commands.includes(
    "corepack pnpm run selfhost:security-review -- --profile public-stack"
  )
);

const allInOneOnly = run(["--json", "--profile", "all-in-one"]);
assert.equal(allInOneOnly.status, 0, allInOneOnly.stderr || allInOneOnly.stdout);
const allInOneOnlyBody = JSON.parse(allInOneOnly.stdout);
assert.equal(allInOneOnlyBody.ok, true);
assert.equal(allInOneOnlyBody.profile_filter.requested, "all-in-one");
assert.equal(allInOneOnlyBody.profile_filter.resolved, "all_in_one_demo");
assert.deepEqual(allInOneOnlyBody.profiles.map((item) => item.key), ["all_in_one_demo"]);
assert.deepEqual(allInOneOnlyBody.recommended_profile_keys, ["all_in_one_demo"]);
assert.ok(allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:dashboard -- --profile all-in-one"));
assert.ok(allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:commands -- --profile all-in-one"));
assert.ok(allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:handoff -- --profile all-in-one"));
assert.ok(!allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(!allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:commands"));
assert.ok(!allInOneOnlyBody.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(!allInOneOnly.stdout.includes("sk_action_plan_must_not_leak"));

const equalsProfile = run(["--json", "--profile=public-stack"]);
assert.equal(equalsProfile.status, 0, equalsProfile.stderr || equalsProfile.stdout);
const equalsProfileBody = JSON.parse(equalsProfile.stdout);
assert.equal(equalsProfileBody.profile_filter.resolved, "public_stack");
assert.deepEqual(equalsProfileBody.profiles.map((item) => item.key), ["public_stack"]);

const separator = run(["--", "--json", "--profile", "public-stack"]);
assert.equal(separator.status, 0, separator.stderr || separator.stdout);
const separatorBody = JSON.parse(separator.stdout);
assert.equal(separatorBody.profile_filter.resolved, "public_stack");
assert.deepEqual(separatorBody.profiles.map((item) => item.key), ["public_stack"]);

const typo = run(["--json", "--profil", "public-stack"]);
assert.equal(typo.status, 1, typo.stderr || typo.stdout);
assert.match(typo.stderr, /unknown option --profil/);
assert.ok(!typo.stdout.includes("sk_action_plan_must_not_leak"));

const unknownProfile = run(["--json", "--profile", "moon-base"]);
assert.equal(unknownProfile.status, 1, unknownProfile.stderr || unknownProfile.stdout);
const unknownProfileBody = JSON.parse(unknownProfile.stdout);
assert.equal(unknownProfileBody.ok, false);
assert.equal(unknownProfileBody.profile_filter.requested, "moon-base");
assert.equal(unknownProfileBody.profile_filter.resolved, null);
assert.deepEqual(unknownProfileBody.profiles, []);
assert.ok(unknownProfileBody.blockers.some((item) => /unknown profile/i.test(item)));
assert.ok(!unknownProfile.stdout.includes("sk_action_plan_must_not_leak"));

const profileList = run(["--json", "--list-profiles"]);
assert.equal(profileList.status, 0, profileList.stderr || profileList.stdout);
const profileListBody = JSON.parse(profileList.stdout);
assert.equal(profileListBody.command, "deployability:action-plan");
assert.equal(profileListBody.ok, true);
assert.equal(profileListBody.mode, "profile_list");
assert.equal(profileListBody.profile_filter.requested, null);
assert.equal(profileListBody.profile_filter.resolved, null);
assert.deepEqual(
  profileListBody.profiles.map((item) => item.key),
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
const publicStackProfile = profileListBody.profiles.find((item) => item.key === "public_stack");
assert.ok(publicStackProfile.aliases.includes("public-stack"));
assert.equal(publicStackProfile.pipeline_key, "public_stack");
assert.match(publicStackProfile.purpose, /public exposure/i);
assert.ok(profileListBody.next_commands.includes("corepack pnpm run deployability:action-plan -- --profile public-stack"));
assert.deepEqual(profileListBody.source_status, {});
assert.ok(!profileList.stdout.includes("sk_action_plan_must_not_leak"));

const profileListText = run(["--profiles"]);
assert.equal(profileListText.status, 0, profileListText.stderr || profileListText.stdout);
assert.match(profileListText.stdout, /Available deployability profiles/);
assert.match(profileListText.stdout, /public_stack/);
assert.match(profileListText.stdout, /aliases: public-stack, public_stack/);
assert.ok(!profileListText.stdout.includes("sk_action_plan_must_not_leak"));

assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.equal(body.recommended_profile_keys[0], "public_stack");
assert.deepEqual(
  body.recommended_profile_keys,
  [...body.profiles].sort((left, right) => left.attention.rank - right.attention.rank).map((item) => item.key)
);
assert.ok(body.profiles.every((item) => Number.isInteger(item.attention.rank)));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_action_plan_must_not_leak"));

const pipedJson = spawnSync(process.execPath, [SCRIPT, "--json"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
  env: {
    ...process.env,
    PLATFORM_ADMIN_API_KEY: "sk_action_plan_must_not_leak"
  }
});
assert.equal(pipedJson.status, 0, pipedJson.stderr || pipedJson.stdout);
const pipedBody = JSON.parse(pipedJson.stdout);
assert.equal(pipedBody.command, "deployability:action-plan");
assert.equal(pipedBody.current_bundle.change_id, "CHG-2026-133");
assert.ok(!pipedJson.stdout.includes("sk_action_plan_must_not_leak"));

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
