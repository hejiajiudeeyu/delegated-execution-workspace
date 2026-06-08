import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-profiles.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_profiles_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:profiles");
assert.equal(body.ok, true);
assert.equal(body.mode, "profile_catalog");
assert.equal(body.current_bundle.change_id, "CHG-2026-120");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.equal(body.profile_filter.requested, null);
assert.equal(body.profile_filter.resolved, null);
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
assert.equal(publicStack.label, "Public Stack");
assert.ok(publicStack.aliases.includes("public-stack"));
assert.equal(publicStack.pipeline_key, "public_stack");
assert.equal(publicStack.status, "ready_now_with_safety_gates");
assert.equal(publicStack.attention.level, "safety_gate");
assert.equal(publicStack.attention.primary_command, publicStack.next_commands[0]);
assert.equal(publicStack.attention.primary_json_command, publicStack.next_json_commands[0]);
assert.ok(publicStack.attention.reasons.some((item) => /public exposure gate/i.test(item)));
assert.ok(publicStack.dashboard_safe_command_count >= 1);
assert.ok(publicStack.public_exposure_gate_count >= 1);
assert.ok(publicStack.safety_notes.some((item) => /public/i.test(item)));

const dailyDev = body.profiles.find((item) => item.key === "daily_dev");
assert.equal(dailyDev.pipeline_key, "local_agent_loop");
assert.equal(dailyDev.attention.level, "operational");
assert.ok(publicStack.attention.rank < dailyDev.attention.rank);
assert.ok(dailyDev.next_commands.includes("corepack pnpm run dev:local:plan"));
assert.ok(dailyDev.next_json_commands.includes("corepack pnpm --silent run dev:doctor -- --json"));

assert.equal(body.recommended_profile_keys[0], "public_stack");
assert.deepEqual(
  body.recommended_profile_keys,
  [...body.profiles].sort((left, right) => left.attention.rank - right.attention.rank).map((item) => item.key)
);
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:action-plan"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_profiles_must_not_leak"));

const publicStackOnly = run(["--json", "--profile", "public-stack"]);
assert.equal(publicStackOnly.status, 0, publicStackOnly.stderr || publicStackOnly.stdout);
const publicStackOnlyBody = JSON.parse(publicStackOnly.stdout);
assert.equal(publicStackOnlyBody.ok, true);
assert.deepEqual(publicStackOnlyBody.profile_filter, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.deepEqual(publicStackOnlyBody.profiles.map((item) => item.key), ["public_stack"]);
assert.deepEqual(publicStackOnlyBody.recommended_profile_keys, ["public_stack"]);
assert.equal(publicStackOnlyBody.profiles[0].attention.level, "safety_gate");

const unknownProfile = run(["--json", "--profile", "mars"]);
assert.equal(unknownProfile.status, 1, unknownProfile.stderr || unknownProfile.stdout);
const unknownBody = JSON.parse(unknownProfile.stdout);
assert.equal(unknownBody.ok, false);
assert.deepEqual(unknownBody.profile_filter, {
  requested: "mars",
  resolved: null,
  pipeline: null
});
assert.deepEqual(unknownBody.profiles, []);
assert.ok(unknownBody.blockers.includes("unknown profile: mars"));
assert.ok(!unknownProfile.stdout.includes("sk_profiles_must_not_leak"));

const text = run(["--profile", "public-stack"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability profiles/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /attention=safety_gate/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_profiles_must_not_leak"));

console.log("[deployability-profiles.test] ok");
