import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getExpectedCurrentBundleChangeId } from "./test-helpers/current-bundle.mjs";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-hardening-plan.mjs");
const expectedCurrentBundleChangeId = getExpectedCurrentBundleChangeId(REPO_ROOT);

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_hardening_plan_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:hardening-plan");
assert.equal(body.mode, "production_hardening_plan");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, expectedCurrentBundleChangeId);
assert.deepEqual(body.summary, {
  status: "hardening_plan_visible",
  production_ready: false,
  track_count: 5,
  stage_count: 15,
  planned_track_count: 4,
  gated_track_count: 1,
  blocker_count: 0,
  warning_count: body.warnings.length
});
assert.deepEqual(
  body.readiness_boundary,
  {
    daily_deployable: true,
    public_exposure_ready: false,
    production_ready: false,
    reason: "hardening plan is actionable management metadata, not evidence that public production readiness has passed"
  }
);

const tracksByKey = new Map(body.hardening_plan.map((item) => [item.key, item]));
assert.deepEqual([...tracksByKey.keys()], [
  "public_exposure",
  "billing_production",
  "email_transport",
  "marketplace_readiness",
  "formal_release"
]);

const publicExposure = tracksByKey.get("public_exposure");
assert.equal(publicExposure.status, "gated");
assert.equal(publicExposure.owner_scope, "fourth_repo_plus_formal_repos");
assert.equal(publicExposure.owner_repo, null);
assert.deepEqual(
  publicExposure.stages.map((item) => item.key),
  ["review", "prove", "operate"]
);
assert.ok(publicExposure.stages.find((item) => item.key === "review").commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicExposure.blocked_by.some((item) => /localhost public origin/i.test(item)));
assert.ok(publicExposure.next_commands.includes("corepack pnpm run deployability:exposure"));

const billing = tracksByKey.get("billing_production");
assert.equal(billing.status, "planned");
assert.equal(billing.owner_repo, "repos/platform");
assert.equal(billing.owner_scope, "formal_repo");
assert.deepEqual(
  billing.stages.map((item) => item.key),
  ["define_gate", "prove_gate", "wire_operator_surface"]
);
assert.ok(billing.blocked_by.some((item) => /billing/i.test(item)));
assert.ok(billing.guardrails.some((item) => /platform owning repository/i.test(item)));

const email = tracksByKey.get("email_transport");
assert.equal(email.owner_repo, "repos/client");
assert.ok(email.blocked_by.some((item) => /email/i.test(item)));
assert.ok(email.guardrails.some((item) => /owning client repository/i.test(item)));

const marketplace = tracksByKey.get("marketplace_readiness");
assert.equal(marketplace.owner_scope, "formal_repos");
assert.ok(marketplace.blocked_by.some((item) => /marketplace/i.test(item)));

const release = tracksByKey.get("formal_release");
assert.equal(release.owner_scope, "formal_repos");
assert.ok(release.blocked_by.some((item) => /npm|image|release/i.test(item)));
assert.ok(release.stages.some((item) => item.commands.includes("corepack pnpm run published-image:plan")));

assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:hardening-plan"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:production"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:hardening-plan -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:roadmap -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:production -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:gates -- --json"));
assert.ok(body.source_status.roadmap.ok);
assert.deepEqual(body.blockers, []);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(body.notes.some((item) => /direct input is roadmap metadata/i.test(item)));
assert.ok(!body.notes.some((item) => /projections over existing production, gates, and status metadata/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_hardening_plan_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability hardening plan/);
assert.match(text.stdout, /hardening_plan_visible/);
assert.match(text.stdout, /public_exposure: gated/);
assert.match(text.stdout, /billing_production: planned/);
assert.match(text.stdout, /email_transport: planned/);
assert.match(text.stdout, /marketplace_readiness: planned/);
assert.match(text.stdout, /formal_release: planned/);
assert.match(text.stdout, /define_gate/);
assert.match(text.stdout, /corepack pnpm run published-image:plan/);
assert.ok(!text.stdout.includes("sk_hardening_plan_must_not_leak"));

console.log("[deployability-hardening-plan.test] ok");
