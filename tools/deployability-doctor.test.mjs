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
assert.equal(checksByKey.get("ecosystem_prd_alignment").ok, true);
assert.equal(checksByKey.get("brand_site_alignment").ok, true);
assert.equal(checksByKey.get("brand_site_content_smoke").ok, true);
assert.equal(checksByKey.get("safety_contract").ok, true);
assert.ok(checksByKey.get("documentation_alignment").evidence.includes("README.md"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").evidence.includes("docs/product/deployability-ecosystem-prd.md"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").evidence.includes("docs/product/deployability-ecosystem-prd.zh-CN.md"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").data.required_strings.includes("daily-deployable"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").data.required_strings.includes("Sub2API"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").data.required_strings.includes("CLIProxyAPI"));
assert.ok(checksByKey.get("ecosystem_prd_alignment").data.required_strings.includes("one obvious quick-start path"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability"));
assert.ok(
  checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-pipeline-summaries")
);
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:readiness"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-readiness"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:roadmap"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-roadmap"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:status"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-status"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:gates"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-gates"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:action-plan"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-action-plan"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:profiles"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-profiles"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:runbook"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-runbook"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:menu"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-menu"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("deployability:recipe"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-recipe"));
assert.ok(checksByKey.get("top_level_scripts").data.required_scripts.includes("test:deployability-operations"));
assert.ok(checksByKey.get("brand_site_alignment").evidence.some((item) => item.includes("DeployabilityProfiles.tsx")));
assert.ok(checksByKey.get("brand_site_content_smoke").evidence.includes("npm run smoke:deployability-content"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:quickstart"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:safety"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:readiness"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:roadmap"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:status"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:gates"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:action-plan"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:profiles"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:commands"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:runbook"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:menu"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.next_commands.includes("corepack pnpm run test:deployability"));
assert.ok(body.next_commands.includes("corepack pnpm run test:deployability-operations"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_doctor_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability doctor/);
assert.match(text.stdout, /compatibility ledger/);
assert.match(text.stdout, /documentation alignment/);
assert.match(text.stdout, /ecosystem PRD alignment/);
assert.match(text.stdout, /brand-site alignment/);
assert.match(text.stdout, /brand-site content smoke/);
assert.match(text.stdout, /corepack pnpm run deployability:readiness/);
assert.match(text.stdout, /corepack pnpm run deployability:roadmap/);
assert.match(text.stdout, /corepack pnpm run deployability:status/);
assert.match(text.stdout, /corepack pnpm run deployability:gates/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.match(text.stdout, /corepack pnpm run deployability:action-plan/);
assert.match(text.stdout, /corepack pnpm run deployability:profiles/);
assert.match(text.stdout, /corepack pnpm run deployability:commands/);
assert.match(text.stdout, /corepack pnpm run deployability:runbook/);
assert.match(text.stdout, /corepack pnpm run deployability:menu/);
assert.match(text.stdout, /corepack pnpm run deployability:recipe -- --profile public-stack/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_doctor_must_not_leak"));

console.log("[deployability-doctor.test] ok");
