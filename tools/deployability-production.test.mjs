import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getExpectedCurrentBundleChangeId } from "./test-helpers/current-bundle.mjs";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-production.mjs");
const expectedCurrentBundleChangeId = getExpectedCurrentBundleChangeId(REPO_ROOT);

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_production_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:production");
assert.equal(body.mode, "production_hardening_review");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, expectedCurrentBundleChangeId);
assert.deepEqual(body.summary, {
  status: "daily_deployable_production_planned",
  production_ready: false,
  daily_deployable: true,
  hardening_track_count: 5,
  planned_count: 4,
  gated_count: 1,
  blocked_count: 0,
  warning_count: body.warnings.length
});
assert.deepEqual(
  body.readiness_boundary,
  {
    daily_deployable: true,
    public_exposure_ready: false,
    production_ready: false,
    reason: "daily deployability is available, while public exposure and formal production hardening remain gated or planned"
  }
);

const tracksByKey = new Map(body.hardening_tracks.map((item) => [item.key, item]));
assert.deepEqual([...tracksByKey.keys()], [
  "public_exposure",
  "billing_production",
  "email_transport",
  "marketplace_readiness",
  "formal_release"
]);

assert.equal(body.production_readiness_remediation_plan.key, "formal_production_readiness_remediation");
assert.equal(body.production_readiness_remediation_plan.status, "planned");
assert.equal(body.production_readiness_remediation_plan.daily_deployable, true);
assert.equal(body.production_readiness_remediation_plan.public_exposure_ready, false);
assert.equal(body.production_readiness_remediation_plan.production_ready, false);
assert.deepEqual(
  body.production_readiness_remediation_plan.steps.map((item) => item.key),
  [
    "prove_public_exposure_gate",
    "define_billing_production_gate",
    "define_email_transport_gate",
    "define_marketplace_readiness_gate",
    "define_formal_release_gate",
    "export_management_evidence"
  ]
);
const productionSteps = new Map(body.production_readiness_remediation_plan.steps.map((item) => [item.key, item]));
assert.equal(productionSteps.get("prove_public_exposure_gate").status, "gated");
assert.equal(productionSteps.get("prove_public_exposure_gate").owner_scope, "fourth_repo_plus_formal_repos");
assert.equal(productionSteps.get("define_billing_production_gate").owner_repo, "repos/platform");
assert.equal(productionSteps.get("define_email_transport_gate").owner_repo, "repos/client");
assert.equal(productionSteps.get("define_marketplace_readiness_gate").owner_scope, "formal_repos");
assert.equal(productionSteps.get("define_formal_release_gate").owner_scope, "formal_repos");
assert.ok(
  productionSteps
    .get("export_management_evidence")
    .commands.includes("corepack pnpm run deployability:production")
);
assert.ok(
  body.production_readiness_remediation_plan.machine_payloads.includes(
    "corepack pnpm --silent run deployability:production -- --json"
  )
);
assert.ok(
  body.production_readiness_remediation_plan.guardrails.some((item) =>
    /do not treat daily deployability as formal production readiness/i.test(item)
  )
);
assert.equal(tracksByKey.get("public_exposure").status, "gated");
assert.equal(tracksByKey.get("public_exposure").owner_scope, "fourth_repo_plus_formal_repos");
assert.ok(tracksByKey.get("public_exposure").evidence_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(tracksByKey.get("public_exposure").evidence_commands.includes("corepack pnpm run operator:onboarding:check"));
assert.equal(tracksByKey.get("billing_production").status, "planned");
assert.equal(tracksByKey.get("billing_production").owner_repo, "repos/platform");
assert.ok(tracksByKey.get("billing_production").remaining_work.some((item) => /billing/i.test(item)));
assert.equal(tracksByKey.get("email_transport").owner_repo, "repos/client");
assert.ok(tracksByKey.get("email_transport").remaining_work.some((item) => /email/i.test(item)));
assert.equal(tracksByKey.get("marketplace_readiness").owner_scope, "formal_repos");
assert.ok(tracksByKey.get("marketplace_readiness").remaining_work.some((item) => /marketplace/i.test(item)));
assert.equal(tracksByKey.get("formal_release").owner_scope, "formal_repos");
assert.ok(tracksByKey.get("formal_release").guardrails.some((item) => /owning repositories/i.test(item)));

assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:production"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run published-image:plan"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:production -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:roadmap -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:gates -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:status -- --json"));
assert.ok(body.source_status.roadmap.ok);
assert.equal(body.source_status.gates, undefined);
assert.equal(body.source_status.status, undefined);
assert.deepEqual(body.blockers, []);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_production_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability production hardening/);
assert.match(text.stdout, /daily_deployable_production_planned/);
assert.match(text.stdout, /public_exposure: gated/);
assert.match(text.stdout, /billing_production: planned/);
assert.match(text.stdout, /email_transport: planned/);
assert.match(text.stdout, /formal_release: planned/);
assert.match(text.stdout, /Production readiness remediation plan/);
assert.match(text.stdout, /define_billing_production_gate/);
assert.match(text.stdout, /corepack pnpm run published-image:plan/);
assert.ok(!text.stdout.includes("sk_production_must_not_leak"));

console.log("[deployability-production.test] ok");
