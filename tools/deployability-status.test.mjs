import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getExpectedCurrentBundleChangeId } from "./test-helpers/current-bundle.mjs";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-status.mjs");
const expectedCurrentBundleChangeId = getExpectedCurrentBundleChangeId(REPO_ROOT);

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_status_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:status");
assert.equal(body.mode, "operator_status");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, expectedCurrentBundleChangeId);
assert.deepEqual(body.summary, {
  status: "daily_deployable_with_planned_hardening",
  readiness_status: "daily_deployable_with_safety_gates",
  console_management_status: "ok",
  hardening_plan_status: "ok",
  public_exposure_status: "gated",
  production_hardening_status: "planned",
  blocked_count: 0,
  warning_count: body.warnings.length
});
assert.deepEqual(
  body.status_cards.map((item) => item.key),
  ["daily_deployable", "profile_management", "console_management", "hardening_plan", "public_stack_gate", "production_hardening"]
);
assert.equal(body.status_cards.find((item) => item.key === "daily_deployable").status, "ok");
assert.equal(body.status_cards.find((item) => item.key === "console_management").status, "ok");
assert.equal(body.status_cards.find((item) => item.key === "hardening_plan").status, "ok");
assert.equal(body.status_cards.find((item) => item.key === "public_stack_gate").status, "gated");
assert.equal(body.status_cards.find((item) => item.key === "production_hardening").status, "planned");
assert.ok(
  body.status_cards
    .find((item) => item.key === "console_management")
    .next_commands.includes("corepack pnpm run deployability:console")
);
assert.ok(
  body.status_cards
    .find((item) => item.key === "hardening_plan")
    .next_commands.includes("corepack pnpm run deployability:hardening-plan")
);
assert.ok(
  body.status_cards
    .find((item) => item.key === "public_stack_gate")
    .next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack")
);
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:console"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:hardening-plan"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:status -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:readiness -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:roadmap -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:recipe -- --profile public-stack --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:console -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:hardening-plan -- --json"));
assert.deepEqual(body.blockers, []);
assert.ok(body.source_status.readiness.ok);
assert.ok(body.source_status.roadmap.ok);
assert.equal(body.source_status.recipe, undefined);
assert.equal(body.source_status.console, undefined);
assert.equal(body.source_status.hardening_plan, undefined);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_status_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability status/);
assert.match(text.stdout, /daily_deployable_with_planned_hardening/);
assert.match(text.stdout, /daily_deployable: ok/);
assert.match(text.stdout, /console_management: ok/);
assert.match(text.stdout, /hardening_plan: ok/);
assert.match(text.stdout, /public_stack_gate: gated/);
assert.match(text.stdout, /production_hardening: planned/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_status_must_not_leak"));

console.log("[deployability-status.test] ok");
