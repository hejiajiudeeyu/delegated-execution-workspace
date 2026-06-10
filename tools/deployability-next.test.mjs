import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-next.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_next_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:next");
assert.equal(body.mode, "operator_next_decision");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-133");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.equal(body.selected_profile.key, "public_stack");
assert.equal(body.decision.key, "run_public_stack_safety_gate");
assert.equal(body.decision.status, "gate_required");
assert.equal(body.decision.profile_key, "public_stack");
assert.equal(body.decision.primary_command, "corepack pnpm run selfhost:security-review -- --profile public-stack");
assert.equal(
  body.decision.primary_json_command,
  "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"
);
assert.equal(body.decision.detail_command, "corepack pnpm run deployability:exposure");
assert.equal(body.decision.detail_json_command, "corepack pnpm --silent run deployability:exposure -- --json");
assert.equal(body.decision.detail_payload, "public_exposure_review");
assert.equal(body.decision.expected_operator_next_action, "configure_public_stack_public_origin");
assert.ok(body.decision.reasons.some((item) => /public exposure/i.test(item)));
assert.ok(body.decision.guardrails.some((item) => /before starting or exposing/i.test(item)));
assert.ok(body.decision.follow_up_commands.includes("corepack pnpm run deployability:exposure"));
assert.ok(body.decision.follow_up_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.operator_status_summary.public_exposure_status === "gated");
assert.ok(body.source_status.menu.ok);
assert.ok(body.source_status.action_plan.ok);
assert.ok(body.source_status.gates.ok);
assert.deepEqual(body.source_status.direct_inputs, ["menu", "action_plan", "gates"]);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(!json.stdout.includes("sk_next_must_not_leak"));

const publicStack = run(["--json", "--profile", "public-stack"]);
assert.equal(publicStack.status, 0, publicStack.stderr || publicStack.stdout);
const publicStackBody = JSON.parse(publicStack.stdout);
assert.deepEqual(publicStackBody.profile_filter, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.equal(publicStackBody.selected_profile.key, "public_stack");
assert.equal(publicStackBody.decision.key, "run_public_stack_safety_gate");
assert.ok(publicStackBody.next_commands.includes("corepack pnpm run deployability:next -- --profile public-stack"));
assert.ok(!publicStack.stdout.includes("sk_next_must_not_leak"));

const allInOne = run(["--json", "--profile", "all-in-one"]);
assert.equal(allInOne.status, 0, allInOne.stderr || allInOne.stdout);
const allInOneBody = JSON.parse(allInOne.stdout);
assert.deepEqual(allInOneBody.profile_filter, {
  requested: "all-in-one",
  resolved: "all_in_one_demo",
  pipeline: "all_in_one_demo"
});
assert.equal(allInOneBody.selected_profile.key, "all_in_one_demo");
assert.equal(allInOneBody.decision.key, "continue_selected_profile");
assert.equal(allInOneBody.decision.status, "ready_next_step");
assert.equal(allInOneBody.decision.profile_key, "all_in_one_demo");
assert.match(allInOneBody.decision.primary_command, /all-in-one/);
assert.ok(allInOneBody.next_commands.includes("corepack pnpm run deployability:dashboard -- --profile all-in-one"));
assert.ok(!allInOneBody.next_commands.includes("corepack pnpm run deployability:dashboard -- --profile public-stack"));
assert.ok(!allInOne.stdout.includes("sk_next_must_not_leak"));

const separator = run(["--", "--json", "--profile", "public-stack"]);
assert.equal(separator.status, 0, separator.stderr || separator.stdout);
const separatorBody = JSON.parse(separator.stdout);
assert.equal(separatorBody.profile_filter.resolved, "public_stack");

const typo = run(["--json", "--profil", "public-stack"]);
assert.equal(typo.status, 1, typo.stderr || typo.stdout);
assert.match(typo.stderr, /unknown option --profil/);
assert.ok(!typo.stdout.includes("sk_next_must_not_leak"));

const unknown = run(["--json", "--profile", "moon-base"]);
assert.equal(unknown.status, 1, unknown.stderr || unknown.stdout);
const unknownBody = JSON.parse(unknown.stdout);
assert.equal(unknownBody.ok, false);
assert.equal(unknownBody.profile_filter.requested, "moon-base");
assert.equal(unknownBody.profile_filter.resolved, null);
assert.equal(unknownBody.selected_profile, null);
assert.equal(unknownBody.decision, null);
assert.ok(unknownBody.blockers.includes("unknown profile: moon-base"));
assert.ok(!unknown.stdout.includes("sk_next_must_not_leak"));

const text = run(["--profile", "public-stack"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability next/);
assert.match(text.stdout, /run_public_stack_safety_gate/);
assert.match(text.stdout, /corepack pnpm run deployability:exposure/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_next_must_not_leak"));

console.log("[deployability-next.test] ok");
