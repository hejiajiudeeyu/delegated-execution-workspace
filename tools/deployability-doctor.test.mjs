import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-doctor.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_doctor_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:doctor");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.ok(Array.isArray(body.checks));
assert.ok(body.checks.length >= 5);
assert.deepEqual(body.blockers, []);
assert.ok(Array.isArray(body.warnings));

const checksByKey = new Map(body.checks.map((item) => [item.key, item]));
assert.equal(checksByKey.get("compatibility_ledger").ok, true);
assert.equal(checksByKey.get("top_level_scripts").ok, true);
assert.equal(checksByKey.get("documentation_alignment").ok, true);
assert.equal(checksByKey.get("brand_site_alignment").ok, true);
assert.equal(checksByKey.get("safety_contract").ok, true);
assert.ok(checksByKey.get("documentation_alignment").evidence.includes("README.md"));
assert.ok(checksByKey.get("brand_site_alignment").evidence.some((item) => item.includes("DeployabilityProfiles.tsx")));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:quickstart"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:safety"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_doctor_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability doctor/);
assert.match(text.stdout, /compatibility ledger/);
assert.match(text.stdout, /documentation alignment/);
assert.match(text.stdout, /brand-site alignment/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_doctor_must_not_leak"));

console.log("[deployability-doctor.test] ok");
