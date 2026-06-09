import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-evidence.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_evidence_must_not_leak"
    },
    maxBuffer: 30 * 1024 * 1024
  });
}

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-deployability-evidence-test-"));

try {
  const json = run(["--json", "--profile", "public-stack", "--output-dir", outputDir]);
  assert.equal(json.status, 0, json.stderr || json.stdout);
  const body = JSON.parse(json.stdout);

  assert.equal(body.command, "deployability:evidence");
  assert.equal(body.ok, true);
  assert.equal(body.mode, "evidence_bundle");
  assert.equal(body.current_bundle.change_id, "CHG-2026-130");
  assert.deepEqual(body.profile_filter, {
    requested: "public-stack",
    resolved: "public_stack",
    pipeline: "public_stack"
  });
  assert.equal(body.output_dir, outputDir);
  assert.equal(body.manifest_path, path.join(outputDir, "manifest.json"));
  assert.equal(body.artifacts.length, 7);
  assert.deepEqual(
    body.artifacts.map((item) => item.key),
    ["manifest", "dashboard", "menu", "recipe", "handoff_json", "handoff_markdown", "commands"]
  );
  assert.ok(body.artifacts.every((item) => item.path.startsWith(outputDir)));
  assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
  assert.ok(body.safety_defaults.some((item) => /does not call Docker/i.test(item)));
  assert.ok(body.next_commands.includes(`corepack pnpm run deployability:evidence -- --profile public-stack --output-dir ${outputDir}`));
  assert.ok(!json.stdout.includes("sk_evidence_must_not_leak"));

  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8"));
  assert.equal(manifest.command, "deployability:evidence");
  assert.equal(manifest.current_bundle.change_id, "CHG-2026-130");
  assert.equal(manifest.profile_filter.resolved, "public_stack");
  assert.deepEqual(
    manifest.artifacts.map((item) => item.key),
    body.artifacts.map((item) => item.key)
  );
  assert.ok(!JSON.stringify(manifest).includes("sk_evidence_must_not_leak"));

  const dashboard = JSON.parse(fs.readFileSync(path.join(outputDir, "dashboard.json"), "utf8"));
  assert.equal(dashboard.command, "deployability:dashboard");
  assert.equal(dashboard.profile_filter.resolved, "public_stack");
  assert.deepEqual(dashboard.pipeline_summaries.map((item) => item.key), ["public_stack"]);

  const menu = JSON.parse(fs.readFileSync(path.join(outputDir, "menu.json"), "utf8"));
  assert.equal(menu.command, "deployability:menu");
  assert.equal(menu.selected_profile.key, "public_stack");
  assert.equal(menu.selected_onboarding_plan.command, "operator:onboarding:plan");

  const recipe = JSON.parse(fs.readFileSync(path.join(outputDir, "recipe.json"), "utf8"));
  assert.equal(recipe.command, "deployability:recipe");
  assert.equal(recipe.profile_filter.resolved, "public_stack");
  assert.ok(recipe.copy_paste_commands.includes("corepack pnpm run deployability:handoff -- --profile public-stack"));

  const handoffJson = JSON.parse(fs.readFileSync(path.join(outputDir, "handoff.json"), "utf8"));
  assert.equal(handoffJson.command, "deployability:handoff");
  assert.equal(handoffJson.profile_filter.resolved, "public_stack");
  assert.deepEqual(handoffJson.pipeline_summaries.map((item) => item.key), ["public_stack"]);

  const handoffMarkdown = fs.readFileSync(path.join(outputDir, "handoff.md"), "utf8");
  assert.match(handoffMarkdown, /# Deployability Handoff/);
  assert.match(handoffMarkdown, /## Profile Filter/);
  assert.match(handoffMarkdown, /Resolved: public_stack/);
  assert.ok(!handoffMarkdown.includes("sk_evidence_must_not_leak"));

  const commands = JSON.parse(fs.readFileSync(path.join(outputDir, "commands.json"), "utf8"));
  assert.equal(commands.command, "deployability:commands");
  assert.equal(commands.filters_applied.profile.resolved, "public_stack");
  assert.ok(commands.commands.every((item) => item.pipeline_keys.includes("public_stack") || item.command.includes("deployability:")));

  const textOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-deployability-evidence-text-"));
  const text = run(["--profile", "public-stack", "--output-dir", textOutputDir]);
  assert.equal(text.status, 0, text.stderr || text.stdout);
  assert.match(text.stdout, /Deployability evidence/);
  assert.match(text.stdout, /manifest\.json/);
  assert.match(text.stdout, /handoff\.md/);
  assert.ok(!text.stdout.includes("sk_evidence_must_not_leak"));

  const separatorOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-deployability-evidence-separator-"));
  const separator = run(["--", "--json", "--profile", "public-stack", "--output-dir", separatorOutputDir]);
  assert.equal(separator.status, 0, separator.stderr || separator.stdout);
  const separatorBody = JSON.parse(separator.stdout);
  assert.equal(separatorBody.ok, true);
  assert.equal(separatorBody.profile_filter.resolved, "public_stack");
  assert.equal(separatorBody.output_dir, separatorOutputDir);
  assert.ok(fs.existsSync(path.join(separatorOutputDir, "manifest.json")));
  fs.rmSync(separatorOutputDir, { recursive: true, force: true });

  const typo = run(["--json", "--profil", "public-stack", "--output-dir", outputDir]);
  assert.equal(typo.status, 1, typo.stderr || typo.stdout);
  assert.match(typo.stderr, /unknown option --profil/);
  assert.ok(!typo.stdout.includes("sk_evidence_must_not_leak"));

  const unknown = run(["--json", "--profile", "not-a-profile", "--output-dir", outputDir]);
  assert.equal(unknown.status, 1, unknown.stderr || unknown.stdout);
  const unknownBody = JSON.parse(unknown.stdout);
  assert.equal(unknownBody.ok, false);
  assert.ok(unknownBody.blockers.includes("unknown profile: not-a-profile"));
  assert.ok(!unknown.stdout.includes("sk_evidence_must_not_leak"));

  console.log("[deployability-evidence.test] ok");
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
