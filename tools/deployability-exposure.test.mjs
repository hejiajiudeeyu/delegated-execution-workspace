import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getExpectedCurrentBundleChangeId } from "./test-helpers/current-bundle.mjs";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-exposure.mjs");
const expectedCurrentBundleChangeId = getExpectedCurrentBundleChangeId(REPO_ROOT);

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_exposure_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:exposure");
assert.equal(body.mode, "public_exposure_review");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, expectedCurrentBundleChangeId);
assert.deepEqual(body.summary, {
  status: "public_exposure_blocked",
  public_exposure_ready: false,
  exposure_blocker_count: 1,
  gate_count: 1,
  route_count: 5,
  route_ready_count: 5,
  secret_hygiene_check_count: 5,
  secret_hygiene_ready_count: 4,
  warning_count: body.warnings.length
});
assert.deepEqual(body.profile, {
  key: "public_stack",
  name: "public-stack"
});
assert.ok(body.exposure_blockers.some((item) => /PUBLIC_SITE_ADDRESS/.test(item)));
assert.ok(body.exposure_blockers.some((item) => /localhost/.test(item)));
assert.equal(body.operator_next_action.key, "configure_public_stack_public_origin");
assert.equal(body.operator_next_action.status, "blocked_by_public_origin");
assert.equal(body.operator_next_action.env_key, "PUBLIC_SITE_ADDRESS");
assert.equal(body.operator_next_action.target_file, "repos/platform/deploy/public-stack/.env");
assert.equal(body.operator_next_action.current_value_class, "localhost");
assert.match(body.operator_next_action.manual_step, /Set PUBLIC_SITE_ADDRESS/);
assert.equal(
  body.operator_next_action.plan_command,
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin>"
);
assert.equal(
  body.operator_next_action.plan_json_command,
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --json"
);
assert.equal(
  body.operator_next_action.apply_command,
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm"
);
assert.equal(
  body.operator_next_action.apply_json_command,
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm --json"
);
assert.equal(
  body.operator_next_action.verify_command,
  "corepack pnpm run selfhost:security-review -- --profile public-stack"
);
assert.equal(
  body.operator_next_action.verify_json_command,
  "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"
);
assert.ok(body.operator_next_action.follow_up_commands.includes("corepack pnpm run deployability:exposure"));
assert.ok(body.operator_next_action.follow_up_commands.includes("corepack pnpm run operator:onboarding:check"));
assert.equal(body.pre_exposure_remediation_plan.key, "public_stack_pre_exposure_remediation");
assert.equal(body.pre_exposure_remediation_plan.status, "blocked_by_public_origin");
assert.equal(body.pre_exposure_remediation_plan.profile, "public-stack");
assert.equal(body.pre_exposure_remediation_plan.public_exposure_ready, false);
assert.deepEqual(
  body.pre_exposure_remediation_plan.steps.map((item) => item.key),
  [
    "configure_public_origin",
    "rerun_security_review",
    "confirm_route_contract",
    "run_operator_onboarding_check",
    "run_published_image_dry_run",
    "export_public_stack_evidence"
  ]
);
const remediationSteps = new Map(body.pre_exposure_remediation_plan.steps.map((item) => [item.key, item]));
assert.equal(remediationSteps.get("configure_public_origin").status, "blocked");
assert.equal(remediationSteps.get("configure_public_origin").owner_repo, "repos/platform");
assert.equal(remediationSteps.get("configure_public_origin").target_file, "repos/platform/deploy/public-stack/.env");
assert.equal(remediationSteps.get("configure_public_origin").env_key, "PUBLIC_SITE_ADDRESS");
assert.match(remediationSteps.get("configure_public_origin").manual_step, /real public HTTPS origin/i);
assert.deepEqual(remediationSteps.get("configure_public_origin").commands, [
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin>",
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --json",
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm",
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm --json"
]);
assert.equal(remediationSteps.get("rerun_security_review").status, "next_after_blocker");
assert.ok(
  remediationSteps
    .get("rerun_security_review")
    .commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack")
);
assert.equal(remediationSteps.get("confirm_route_contract").status, "ready");
assert.equal(remediationSteps.get("confirm_route_contract").route_count, 5);
assert.equal(remediationSteps.get("confirm_route_contract").route_ready_count, 5);
assert.equal(remediationSteps.get("run_operator_onboarding_check").status, "pending_after_security_review");
assert.equal(remediationSteps.get("run_published_image_dry_run").status, "pending_after_onboarding");
assert.equal(remediationSteps.get("export_public_stack_evidence").status, "pending_after_gate_evidence");
assert.ok(
  body.pre_exposure_remediation_plan.guardrails.some((item) => /do not start or expose public-stack/i.test(item))
);
assert.ok(
  body.pre_exposure_remediation_plan.machine_payloads.includes(
    "corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json"
  )
);
assert.deepEqual(body.blockers, []);
assert.deepEqual(body.warnings, []);

assert.equal(body.security_review.command, "selfhost:security-review");
assert.equal(body.security_review.profile, "public-stack");
assert.equal(body.security_review.ok, false);
assert.equal(body.security_review.compose_config.ok, true);
assert.equal(body.security_review.public_route_contract.ok, true);
assert.equal(body.security_review.public_route_contract.origin, "http://localhost");
assert.equal(body.security_review.public_route_contract.routes.length, 5);
assert.ok(body.security_review.public_route_contract.routes.every((route) => route.ok));
assert.ok(body.security_review.secret_hygiene.some((item) => item.key === "PUBLIC_SITE_ADDRESS" && item.ok === false));
assert.ok(body.security_review.secret_hygiene.some((item) => item.key === "TOKEN_SECRET" && item.ok === true));
assert.ok(body.security_review.operational_prerequisites.some((item) => item.command.includes("selfhost:backup-plan")));
assert.ok(body.security_review.notes.includes("does not start services"));
assert.ok(body.security_review.notes.includes("does not bind ports"));
assert.ok(body.security_review.notes.includes("does not print secret values"));

assert.equal(body.gate.key, "public_stack_exposure");
assert.equal(body.gate.status, "gated");
assert.equal(body.gate.risk, "public_exposure");
assert.ok(body.gate.commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.gate.guardrails.some((item) => /localhost public origin/i.test(item)));

assert.ok(body.primary_next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run operator:onboarding:check"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:exposure"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:exposure -- --json"));
assert.ok(body.safety_defaults.some((item) => /does not start services/i.test(item)));
assert.ok(body.safety_defaults.some((item) => /calls docker compose config/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_exposure_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability public exposure/);
assert.match(text.stdout, /public_exposure_blocked/);
assert.match(text.stdout, /configure_public_stack_public_origin/);
assert.match(text.stdout, /Pre-exposure remediation plan/);
assert.match(text.stdout, /configure_public_origin/);
assert.match(text.stdout, /PUBLIC_SITE_ADDRESS/);
assert.match(text.stdout, /http:\/\/localhost/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_exposure_must_not_leak"));

console.log("[deployability-exposure.test] ok");
