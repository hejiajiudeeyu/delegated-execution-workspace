import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-handoff.mjs");

const SHAS = {
  protocol: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  client: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  platform: "cccccccccccccccccccccccccccccccccccccccc",
  brandSite: "dddddddddddddddddddddddddddddddddddddddd"
};

function writeFile(root, relativePath, text, mode) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
  if (mode) fs.chmodSync(fullPath, mode);
}

function run(cwd, args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_handoff_must_not_leak",
      ...env
    }
  });
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-deployability-handoff-test-"));

try {
  writeFile(
    tmpRoot,
    "changes/CHG-2026-091.yaml",
    [
      "change_id: CHG-2026-091",
      "goal: add deployability handoff report metadata",
      `protocol_sha: ${SHAS.protocol}`,
      `client_sha: ${SHAS.client}`,
      `platform_sha: ${SHAS.platform}`,
      `brand_site_sha: ${SHAS.brandSite}`,
      "owner: hejiajiudeeyu",
      "risk_level: low",
      "affected_scope:",
      "  - orchestration",
      "  - documentation",
      "contracts_check: passed",
      "integration_check: passed",
      "notes: test bundle",
      ""
    ].join("\n")
  );
  writeFile(
    tmpRoot,
    "bin/git",
    [
      "#!/usr/bin/env node",
      "const args = process.argv.slice(2);",
      "if (args[0] === 'submodule' && args[1] === 'status') {",
      `  console.log(' ${SHAS.protocol} repos/protocol (heads/main)');`,
      `  console.log(' ${SHAS.client} repos/client (heads/main)');`,
      `  console.log(' ${SHAS.platform} repos/platform (heads/main)');`,
      `  console.log(' ${SHAS.brandSite} repos/brand-site (heads/main)');`,
      "  process.exit(0);",
      "}",
      "if (args[0] === '-C' && args[2] === 'status' && args[3] === '--short') {",
      "  if (args[1].endsWith('repos/client')) console.log(' M apps/ops-console/src/pages/caller/CallsPage.tsx');",
      "  process.exit(0);",
      "}",
      "process.exit(0);",
      ""
    ].join("\n"),
    0o755
  );

  const output = path.join(tmpRoot, "exports/deployability/test-handoff.md");
  const env = { PATH: `${path.join(tmpRoot, "bin")}:${process.env.PATH}` };
  const json = run(tmpRoot, ["--json", "--output", output], env);
  assert.equal(json.status, 0, json.stderr || json.stdout);
  const body = JSON.parse(json.stdout);
  assert.equal(body.command, "deployability:handoff");
  assert.equal(body.ok, true);
  assert.equal(body.output, output);
  assert.equal(body.current_bundle.change_id, "CHG-2026-091");
  assert.equal(body.compatibility.ledger_matches_current, true);
  assert.equal(body.compatibility.working_tree_clean, false);
  assert.deepEqual(body.compatibility.dirty_submodules, ["repos/client"]);
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:overview"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:quickstart"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:safety"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:doctor"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:dashboard"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:action-plan"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run deployability:commands"));
  assert.ok(body.command_map.some((item) => item.command === "corepack pnpm run compat:status"));
  assert.ok(Array.isArray(body.profile_selector));
  assert.equal(body.profile_selector.length, 7);
  const handoffProfilesByKey = new Map(body.profile_selector.map((item) => [item.key, item]));
  assert.deepEqual(handoffProfilesByKey.get("public_stack"), {
    key: "public_stack",
    aliases: ["public-stack", "public_stack"],
    pipeline_key: "public_stack",
    purpose: "Review public exposure gates before opening edge routes."
  });
  assert.equal(body.ecosystem_readiness.status, "daily_deployable_with_safety_gates");
  assert.equal(body.ecosystem_readiness.goal, "daily-deployable");
  assert.deepEqual(
    body.ecosystem_readiness.checks.map((item) => item.key),
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
  assert.ok(Array.isArray(body.pipeline_summaries));
  assert.deepEqual(
    body.pipeline_summaries.map((item) => item.key),
    [
      "local_agent_loop",
      "all_in_one_demo",
      "selfhost_platform",
      "public_stack",
      "recovery_evidence",
      "operator_onboarding",
      "published_image"
    ]
  );
  const allInOne = body.pipeline_summaries.find((item) => item.key === "all_in_one_demo");
  assert.equal(allInOne.status, "ready_now");
  assert.ok(allInOne.next_commands.includes("corepack pnpm run selfhost:quickstart -- --profile all-in-one"));
  const publicStack = body.pipeline_summaries.find((item) => item.key === "public_stack");
  assert.equal(publicStack.status, "ready_now_with_safety_gates");
  assert.equal(publicStack.public_exposure_gate_count, 2);
  assert.ok(publicStack.next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
  const recoveryEvidence = body.pipeline_summaries.find((item) => item.key === "recovery_evidence");
  assert.equal(recoveryEvidence.status, "ready_now");
  assert.ok(recoveryEvidence.next_commands.includes("corepack pnpm run selfhost:backup-plan"));
  assert.ok(body.next_commands.includes("corepack pnpm run check:submodules"));
  assert.ok(!json.stdout.includes("sk_handoff_must_not_leak"));
  assert.ok(!json.stdout.includes("[ok]"));

  const markdown = fs.readFileSync(output, "utf8");
  assert.match(markdown, /# Deployability Handoff/);
  assert.match(markdown, /## Current Bundle/);
  assert.match(markdown, /## Compatibility/);
  assert.match(markdown, /## Ecosystem Readiness/);
  assert.match(markdown, /daily_deployable_with_safety_gates/);
  assert.match(markdown, /profile_choice: ok/);
  assert.match(markdown, /## Profile Selector/);
  assert.match(markdown, /public_stack -> public_stack/);
  assert.match(markdown, /## Pipeline Summaries/);
  assert.match(markdown, /public_stack: ready_now_with_safety_gates/);
  assert.match(markdown, /exposure-gates=2/);
  assert.match(markdown, /## Next Commands/);
  assert.match(markdown, /CHG-2026-091/);
  assert.match(markdown, /repos\/client: dirty/);
  assert.ok(!markdown.includes("sk_handoff_must_not_leak"));

  const textOutput = path.join(tmpRoot, "exports/deployability/text-handoff.md");
  const text = run(tmpRoot, ["--output", textOutput], env);
  assert.equal(text.status, 0, text.stderr || text.stdout);
  assert.match(text.stdout, /Deployability handoff/);
  assert.match(text.stdout, /deployability:action-plan/);
  assert.match(text.stdout, /CHG-2026-091/);
  assert.match(text.stdout, /text-handoff\.md/);
  assert.ok(fs.existsSync(textOutput));
  assert.ok(!text.stdout.includes("sk_handoff_must_not_leak"));

  console.log("[deployability-handoff.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
