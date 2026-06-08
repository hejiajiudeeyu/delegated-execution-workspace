import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-roadmap.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_roadmap_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:roadmap");
assert.equal(body.mode, "prd_roadmap");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-124");
assert.equal(body.summary.status, "daily_deployable_with_planned_hardening");
assert.equal(body.summary.total_milestones, 6);
assert.equal(body.summary.satisfied_milestones, 4);
assert.equal(body.summary.gated_milestones, 1);
assert.equal(body.summary.planned_milestones, 1);
assert.deepEqual(
  body.milestones.map((item) => item.key),
  [
    "ecosystem_prd_alignment",
    "daily_deployable_scorecard",
    "profile_management_surface",
    "linear_first_run_recipe",
    "public_stack_safety_gate",
    "formal_production_hardening"
  ]
);
assert.equal(body.milestones.find((item) => item.key === "daily_deployable_scorecard").status, "satisfied");
assert.equal(body.milestones.find((item) => item.key === "public_stack_safety_gate").status, "gated");
assert.equal(body.milestones.find((item) => item.key === "formal_production_hardening").status, "planned");
assert.ok(
  body.milestones
    .find((item) => item.key === "profile_management_surface")
    .evidence_commands.includes("corepack pnpm run deployability:profiles")
);
assert.ok(
  body.milestones
    .find((item) => item.key === "linear_first_run_recipe")
    .evidence_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack")
);
assert.ok(
  body.milestones
    .find((item) => item.key === "formal_production_hardening")
    .remaining_work.some((item) => /billing/i.test(item))
);
assert.ok(body.prd_sources.includes("docs/product/deployability-ecosystem-prd.md"));
assert.ok(body.prd_sources.includes("docs/product/deployability-pipelines-prd.md"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(body.source_status.commands.ok);
assert.ok(body.source_status.readiness.ok);
assert.ok(body.source_status.recipe.ok);
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_roadmap_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability roadmap/);
assert.match(text.stdout, /daily_deployable_with_planned_hardening/);
assert.match(text.stdout, /public_stack_safety_gate: gated/);
assert.match(text.stdout, /formal_production_hardening: planned/);
assert.match(text.stdout, /corepack pnpm run deployability:recipe -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_roadmap_must_not_leak"));

console.log("[deployability-roadmap.test] ok");
