import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-recipe.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_recipe_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json", "--profile", "public-stack"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:recipe");
assert.equal(body.mode, "profile_recipe");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-123");
assert.deepEqual(body.profile_filter, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.equal(body.profile.key, "public_stack");
assert.equal(body.readiness.status, "daily_deployable_with_safety_gates");
assert.equal(body.readiness.summary.safety_gate_required, true);
assert.equal(body.selected_onboarding_plan.command, "operator:onboarding:plan");
assert.equal(body.selected_onboarding_plan.profile, "public-stack");

assert.deepEqual(
  body.recipe_steps.map((item) => item.key),
  ["inspect", "gate", "start", "verify", "operate", "evidence"]
);
const stepsByKey = new Map(body.recipe_steps.map((item) => [item.key, item]));
assert.ok(stepsByKey.get("inspect").commands.includes("corepack pnpm run deployability:readiness"));
assert.ok(stepsByKey.get("inspect").commands.includes("corepack pnpm run selfhost:readiness -- --profile public-stack"));
assert.ok(stepsByKey.get("gate").commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(stepsByKey.get("start").commands.includes("corepack pnpm run selfhost:up -- --profile public-stack"));
assert.ok(stepsByKey.get("verify").commands.includes("corepack pnpm run selfhost:smoke -- --profile public-stack"));
assert.ok(stepsByKey.get("operate").commands.includes("corepack pnpm run selfhost:status -- --profile public-stack"));
assert.ok(stepsByKey.get("evidence").commands.includes("corepack pnpm run deployability:handoff -- --profile public-stack"));
assert.ok(stepsByKey.get("evidence").commands.includes("corepack pnpm run selfhost:ops-report -- --profile public-stack"));
assert.equal(stepsByKey.get("gate").safety_gate, true);
assert.ok(body.copy_paste_commands.includes("corepack pnpm run deployability:readiness"));
assert.ok(body.copy_paste_commands.indexOf("corepack pnpm run selfhost:security-review -- --profile public-stack") < body.copy_paste_commands.indexOf("corepack pnpm run selfhost:up -- --profile public-stack"));
assert.ok(body.copy_paste_commands.indexOf("corepack pnpm run selfhost:up -- --profile public-stack") < body.copy_paste_commands.indexOf("corepack pnpm run selfhost:smoke -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:menu -- --profile public-stack"));
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(body.source_status.menu.ok);
assert.ok(body.source_status.runbook.ok);
assert.ok(body.source_status.readiness.ok);
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_recipe_must_not_leak"));

const dailyDev = run(["--json", "--profile", "daily-dev"]);
assert.equal(dailyDev.status, 0, dailyDev.stderr || dailyDev.stdout);
const dailyDevBody = JSON.parse(dailyDev.stdout);
assert.equal(dailyDevBody.profile.key, "daily_dev");
assert.deepEqual(
  dailyDevBody.recipe_steps.map((item) => item.key),
  ["inspect", "start", "verify", "operate", "evidence"]
);
assert.ok(dailyDevBody.copy_paste_commands.includes("corepack pnpm run dev:local:plan"));
assert.ok(dailyDevBody.copy_paste_commands.includes("corepack pnpm run dev:local:up"));
assert.ok(dailyDevBody.copy_paste_commands.includes("corepack pnpm run mcp:golden-four"));
assert.ok(dailyDevBody.copy_paste_commands.includes("corepack pnpm run deployability:handoff -- --profile daily-dev"));

const unknown = run(["--json", "--profile", "not-a-profile"]);
assert.equal(unknown.status, 1, unknown.stderr || unknown.stdout);
const unknownBody = JSON.parse(unknown.stdout);
assert.equal(unknownBody.ok, false);
assert.deepEqual(unknownBody.recipe_steps, []);
assert.ok(unknownBody.blockers.includes("unknown profile: not-a-profile"));
assert.ok(!unknown.stdout.includes("sk_recipe_must_not_leak"));

const text = run(["--profile", "public-stack"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability recipe/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /gate/);
assert.match(text.stdout, /selfhost:security-review -- --profile public-stack/);
assert.match(text.stdout, /deployability:handoff -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_recipe_must_not_leak"));

console.log("[deployability-recipe.test] ok");
