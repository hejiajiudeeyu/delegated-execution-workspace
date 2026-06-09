import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-readiness.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_readiness_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:readiness");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-131");
assert.equal(body.ecosystem_readiness.goal, "daily-deployable");
assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
assert.deepEqual(
  body.checks.map((item) => item.key),
  [
    "profile_choice",
    "secret_generation",
    "startup_path",
    "doctor_path",
    "runtime_inspection",
    "boundary_understanding",
    "brand_site_story"
  ]
);
assert.ok(body.checks.every((item) => item.ok === true));
assert.deepEqual(body.checks, body.ecosystem_readiness.checks);
assert.deepEqual(body.summary, {
  total_checks: 7,
  passed_checks: 7,
  blocked_checks: 0,
  status: "daily_deployable_with_safety_gates",
  safety_gate_required: true
});
assert.ok(body.checks.find((item) => item.key === "profile_choice").evidence.includes("corepack pnpm run selfhost:profiles"));
assert.ok(body.checks.find((item) => item.key === "secret_generation").next_commands.includes("corepack pnpm run selfhost:init"));
assert.ok(body.checks.find((item) => item.key === "boundary_understanding").evidence.includes("corepack pnpm run deployability:safety"));
assert.ok(body.safety_notes.some((item) => /public-stack remains ready-now with safety gates/i.test(item)));
assert.ok(body.source_status.commands.ok);
assert.ok(body.source_status.doctor.ok);
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:menu -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run selfhost:readiness -- --all"));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_readiness_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability readiness/);
assert.match(text.stdout, /daily_deployable_with_safety_gates/);
assert.match(text.stdout, /profile_choice: ok/);
assert.match(text.stdout, /brand_site_story: ok/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.ok(!text.stdout.includes("sk_readiness_must_not_leak"));

console.log("[deployability-readiness.test] ok");
