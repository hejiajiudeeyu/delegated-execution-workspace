import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-gates.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_gates_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:gates");
assert.equal(body.mode, "gate_checklist");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-123");
assert.deepEqual(body.summary, {
  status: "public_exposure_gated_production_planned",
  gate_count: 2,
  gated_count: 1,
  planned_count: 1,
  blocked_count: 0,
  warning_count: body.warnings.length
});
assert.deepEqual(
  body.gates.map((item) => item.key),
  ["public_stack_exposure", "formal_production_hardening"]
);

const publicStack = body.gates.find((item) => item.key === "public_stack_exposure");
assert.equal(publicStack.status, "gated");
assert.equal(publicStack.profile_key, "public_stack");
assert.equal(publicStack.risk, "public_exposure");
assert.ok(publicStack.required_before.includes("opening edge routes"));
assert.ok(publicStack.commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(publicStack.commands.includes("corepack pnpm run operator:onboarding:check"));
assert.ok(publicStack.commands.includes("corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"));
assert.ok(publicStack.guardrails.some((item) => /localhost public origin/i.test(item)));
assert.ok(publicStack.guardrails.some((item) => /placeholder secrets/i.test(item)));

const production = body.gates.find((item) => item.key === "formal_production_hardening");
assert.equal(production.status, "planned");
assert.equal(production.profile_key, null);
assert.equal(production.risk, "production_readiness");
assert.ok(production.commands.includes("corepack pnpm run published-image:plan"));
assert.ok(production.commands.includes("corepack pnpm run test:deployability-operations"));
assert.ok(production.remaining_work.some((item) => /billing/i.test(item)));
assert.ok(production.remaining_work.some((item) => /email/i.test(item)));
assert.ok(production.remaining_work.some((item) => /marketplace/i.test(item)));

assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:gates"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:gates -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:roadmap -- --json"));
assert.ok(body.source_status.roadmap.ok);
assert.ok(body.source_status.commands.ok);
assert.ok(body.source_status.status.ok);
assert.deepEqual(body.blockers, []);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_gates_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability gates/);
assert.match(text.stdout, /public_stack_exposure: gated/);
assert.match(text.stdout, /formal_production_hardening: planned/);
assert.match(text.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.match(text.stdout, /corepack pnpm run published-image:plan/);
assert.ok(!text.stdout.includes("sk_gates_must_not_leak"));

console.log("[deployability-gates.test] ok");
