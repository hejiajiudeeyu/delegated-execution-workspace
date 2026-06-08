import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-exposure.mjs");

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
assert.equal(body.current_bundle.change_id, "CHG-2026-126");
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
assert.deepEqual(body.blockers, []);
assert.ok(body.warnings.includes("repos/client: uncommitted worktree changes"));

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
assert.match(text.stdout, /PUBLIC_SITE_ADDRESS/);
assert.match(text.stdout, /http:\/\/localhost/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_exposure_must_not_leak"));

console.log("[deployability-exposure.test] ok");
