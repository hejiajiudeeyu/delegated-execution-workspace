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
assert.equal(body.current_bundle.change_id, "CHG-2026-126");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
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
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /Runbook/);
assert.match(text.stdout, /corepack pnpm run deployability:runbook -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_menu_must_not_leak"));

console.log("[deployability-menu.test] ok");
