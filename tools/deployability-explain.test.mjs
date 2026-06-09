import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-explain.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_explain_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:explain");
assert.equal(body.mode, "operator_explainer");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-132");
assert.equal(body.summary.status, "daily_deployable_with_planned_hardening");
assert.equal(body.summary.explainer_count, 5);
assert.equal(body.summary.warning_count, body.warnings.length);

const rolesByKey = new Map(body.repo_roles.map((item) => [item.key, item]));
assert.equal(rolesByKey.get("fourth_repo").owns.includes("orchestration scripts"), true);
assert.equal(rolesByKey.get("fourth_repo").does_not_own.includes("protocol schema"), true);
assert.equal(rolesByKey.get("protocol").truth_source_for.includes("protocol contracts"), true);
assert.equal(rolesByKey.get("client").truth_source_for.includes("client runtime"), true);
assert.equal(rolesByKey.get("platform").truth_source_for.includes("platform runtime"), true);

assert.deepEqual(
  body.explainers.map((item) => item.key),
  ["daily_deployability", "profile_selection", "public_exposure_gates", "production_hardening", "cross_repo_validation"]
);
assert.ok(body.explainers.find((item) => item.key === "daily_deployability").commands.includes("corepack pnpm run deployability:status"));
assert.ok(body.explainers.find((item) => item.key === "profile_selection").commands.includes("corepack pnpm run deployability:profiles"));
assert.ok(body.explainers.find((item) => item.key === "public_exposure_gates").commands.includes("corepack pnpm run deployability:gates"));
assert.ok(body.explainers.find((item) => item.key === "production_hardening").warnings.some((item) => /not production readiness/i.test(item)));
assert.ok(body.explainers.find((item) => item.key === "cross_repo_validation").commands.includes("corepack pnpm run check:submodules"));

assert.deepEqual(body.reading_order.slice(0, 4), [
  "corepack pnpm run deployability:explain",
  "corepack pnpm run deployability:status",
  "corepack pnpm run deployability:gates",
  "corepack pnpm run deployability:menu -- --profile public-stack"
]);
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:explain -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:commands -- --json"));
assert.ok(body.source_status.status.ok);
assert.ok(body.source_status.gates.ok);
assert.ok(body.source_status.commands.ok);
assert.ok(body.source_status.compat.ok);
assert.deepEqual(body.blockers, []);
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_explain_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability explainer/);
assert.match(text.stdout, /fourth_repo/);
assert.match(text.stdout, /protocol schema/);
assert.match(text.stdout, /daily_deployability/);
assert.match(text.stdout, /public_exposure_gates/);
assert.match(text.stdout, /corepack pnpm run deployability:gates/);
assert.match(text.stdout, /corepack pnpm run check:submodules/);
assert.ok(!text.stdout.includes("sk_explain_must_not_leak"));

console.log("[deployability-explain.test] ok");
