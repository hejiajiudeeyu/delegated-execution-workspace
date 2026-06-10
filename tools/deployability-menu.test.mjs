import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-menu.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_menu_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:menu");
assert.equal(body.mode, "operator_menu");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-133");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.ok(body.operator_status_summary);
assert.deepEqual(body.operator_status_summary, {
  status: "daily_deployable_with_planned_hardening",
  readiness_status: "daily_deployable_with_safety_gates",
  console_management_status: "ok",
  hardening_plan_status: "ok",
  public_exposure_status: "gated",
  production_hardening_status: "planned",
  blocked_count: 0,
  warning_count: body.operator_status_summary.warning_count
});
assert.deepEqual(
  body.operator_status_cards.map((item) => item.key),
  ["daily_deployable", "profile_management", "console_management", "hardening_plan", "public_stack_gate", "production_hardening"]
);
assert.equal(body.operator_status_cards.find((item) => item.key === "console_management").status, "ok");
assert.equal(body.operator_status_cards.find((item) => item.key === "public_stack_gate").status, "gated");
assert.deepEqual(body.source_status.operator_status, {
  ok: true,
  direct_inputs: ["profiles", "commands", "console"],
  avoids_recursive_status_cli: true
});
assert.equal(body.source_status.status, undefined);
assert.equal(body.operator_next_decision.key, "run_public_stack_safety_gate");
assert.equal(body.operator_next_decision.status, "gate_required");
assert.equal(body.operator_next_decision.profile_key, "public_stack");
assert.equal(
  body.operator_next_decision.primary_command,
  "corepack pnpm run selfhost:security-review -- --profile public-stack"
);
assert.equal(body.operator_next_decision.detail_command, "corepack pnpm run deployability:exposure");
assert.equal(
  body.operator_next_decision.detail_json_command,
  "corepack pnpm --silent run deployability:exposure -- --json"
);
assert.equal(body.operator_next_decision.expected_operator_next_action, "configure_public_stack_public_origin");
assert.ok(body.recommended_profile_keys.includes("public_stack"));
assert.ok(Array.isArray(body.choices));
assert.ok(body.choices.length >= 7);
assert.ok(!json.stdout.includes("sk_menu_must_not_leak"));

const choicesByKey = new Map(body.choices.map((item) => [item.key, item]));
assert.equal(choicesByKey.get("daily_dev").commands.runbook, "corepack pnpm run deployability:runbook -- --profile daily-dev");
assert.equal(
  choicesByKey.get("daily_dev").commands.primary,
  "corepack pnpm run dev:local:plan"
);
assert.equal(choicesByKey.get("public_stack").attention.level, "safety_gate");
assert.equal(choicesByKey.get("public_stack").requires_gate, true);
assert.equal(
  choicesByKey.get("public_stack").commands.action_plan,
  "corepack pnpm run deployability:action-plan -- --profile public-stack"
);
assert.equal(
  choicesByKey.get("public_stack").commands.runbook,
  "corepack pnpm run deployability:runbook -- --profile public-stack"
);
assert.equal(
  choicesByKey.get("public_stack").commands.dashboard,
  "corepack pnpm run deployability:dashboard -- --profile public-stack"
);
assert.equal(
  choicesByKey.get("public_stack").commands.handoff,
  "corepack pnpm run deployability:handoff -- --profile public-stack"
);
assert.ok(body.next_commands.includes("corepack pnpm run deployability:menu -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:profiles"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:runbook"));
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));

const focused = run(["--json", "--profile", "public-stack"]);
assert.equal(focused.status, 0, focused.stderr || focused.stdout);
const focusedBody = JSON.parse(focused.stdout);
assert.equal(focusedBody.mode, "operator_menu_profile");
assert.deepEqual(focusedBody.profile_filter, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.equal(focusedBody.choices.length, 1);
assert.equal(focusedBody.choices[0].key, "public_stack");
assert.equal(focusedBody.selected_profile.key, "public_stack");
assert.equal(focusedBody.operator_next_decision.key, "run_public_stack_safety_gate");
assert.equal(focusedBody.operator_next_decision.detail_payload, "public_exposure_review");
assert.equal(focusedBody.operator_status_summary.public_exposure_status, "gated");
assert.equal(focusedBody.operator_status_cards.find((item) => item.key === "production_hardening").status, "planned");
assert.ok(focusedBody.selected_runbook.phases.some((item) => item.key === "gate"));
assert.ok(focusedBody.selected_runbook.phases.some((item) => item.key === "start"));
assert.ok(focusedBody.selected_runbook.phase_order.indexOf("gate") < focusedBody.selected_runbook.phase_order.indexOf("start"));
assert.equal(
  focusedBody.selected_runbook.phases
    .find((item) => item.key === "gate")
    .commands.some((item) => item.command === "corepack pnpm run selfhost:security-review -- --profile public-stack"),
  true
);
assert.equal(focusedBody.selected_onboarding_plan.command, "operator:onboarding:plan");
assert.equal(focusedBody.selected_onboarding_plan.profile, "public-stack");
assert.ok(focusedBody.selected_onboarding_plan.phases.some((item) => item.id === "preflight"));
assert.ok(focusedBody.selected_onboarding_plan.phases.some((item) => item.id === "operator_surface"));
assert.ok(
  focusedBody.selected_onboarding_plan.phases
    .find((item) => item.id === "operator_surface")
    .commands.some((item) => item.includes("/console/"))
);
assert.equal(focusedBody.selected_onboarding_plan.next, "corepack pnpm run operator:onboarding:check");
assert.equal(
  focusedBody.source_status.operator_onboarding.ok,
  true
);
assert.ok(!focused.stdout.includes("sk_menu_must_not_leak"));

const separator = run(["--", "--json", "--profile", "public-stack"]);
assert.equal(separator.status, 0, separator.stderr || separator.stdout);
const separatorBody = JSON.parse(separator.stdout);
assert.equal(separatorBody.profile_filter.resolved, "public_stack");
assert.deepEqual(separatorBody.choices.map((item) => item.key), ["public_stack"]);

const allInOne = run(["--json", "--profile", "all-in-one"]);
assert.equal(allInOne.status, 0, allInOne.stderr || allInOne.stdout);
const allInOneBody = JSON.parse(allInOne.stdout);
assert.deepEqual(allInOneBody.profile_filter, {
  requested: "all-in-one",
  resolved: "all_in_one_demo",
  pipeline: "all_in_one_demo"
});
assert.deepEqual(allInOneBody.choices.map((item) => item.key), ["all_in_one_demo"]);
assert.equal(allInOneBody.operator_next_decision.key, "continue_selected_profile");
assert.equal(allInOneBody.operator_next_decision.profile_key, "all_in_one_demo");
assert.match(allInOneBody.operator_next_decision.primary_command, /all-in-one/);
assert.ok(!allInOneBody.operator_next_decision.follow_up_commands.includes("corepack pnpm run deployability:dashboard -- --profile public-stack"));
assert.ok(allInOneBody.next_commands.includes("corepack pnpm run deployability:menu -- --profile all-in-one"));
assert.ok(allInOneBody.next_commands.includes("corepack pnpm --silent run deployability:menu -- --profile all-in-one --json"));
assert.ok(allInOneBody.next_commands.includes("corepack pnpm run deployability:dashboard -- --profile all-in-one"));
assert.ok(allInOneBody.next_commands.includes("corepack pnpm run deployability:handoff -- --profile all-in-one"));
assert.ok(!allInOneBody.next_commands.includes("corepack pnpm run deployability:menu -- --profile public-stack"));
assert.ok(!allInOne.stdout.includes("sk_menu_must_not_leak"));

const typo = run(["--json", "--profil", "public-stack"]);
assert.equal(typo.status, 1, typo.stderr || typo.stdout);
assert.match(typo.stderr, /unknown option --profil/);
assert.ok(!typo.stdout.includes("sk_menu_must_not_leak"));

const unknown = run(["--json", "--profile", "not-a-profile"]);
assert.equal(unknown.status, 1, unknown.stderr || unknown.stdout);
const unknownBody = JSON.parse(unknown.stdout);
assert.equal(unknownBody.ok, false);
assert.deepEqual(unknownBody.choices, []);
assert.ok(unknownBody.blockers.includes("unknown profile: not-a-profile"));
assert.ok(!unknown.stdout.includes("sk_menu_must_not_leak"));

const text = run(["--profile", "public-stack"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability menu/);
assert.match(text.stdout, /Operator status/);
assert.match(text.stdout, /public_exposure=gated/);
assert.match(text.stdout, /Next decision/);
assert.match(text.stdout, /run_public_stack_safety_gate/);
assert.match(text.stdout, /console_management: ok/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /Runbook/);
assert.match(text.stdout, /corepack pnpm run deployability:runbook -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_menu_must_not_leak"));

console.log("[deployability-menu.test] ok");
