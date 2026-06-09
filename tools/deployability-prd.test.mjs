import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-prd.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_prd_index_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:prd");
assert.equal(body.mode, "prd_index");
assert.equal(body.ok, true);
assert.equal(body.goal, "daily-deployable with explicit safety gates");
assert.equal(body.current_bundle.change_id, "CHG-2026-132");
assert.deepEqual(
  body.documents.map((item) => item.key),
  ["ecosystem", "pipelines"]
);
assert.ok(body.documents.every((item) => item.authoritative_language === "zh-CN"));
assert.ok(body.documents.every((item) => item.source_path.endsWith(".md")));
assert.ok(body.documents.every((item) => item.chinese_source_path.endsWith(".zh-CN.md")));
assert.deepEqual(
  body.audiences.map((item) => item.key),
  ["solo_operator", "agent_developer", "selfhost_administrator", "brand_site_reader"]
);
assert.deepEqual(
  body.pipelines.map((item) => item.key),
  [
    "deployability_overview",
    "local_agent_loop",
    "all_in_one_demo",
    "selfhost_platform",
    "public_stack",
    "recovery_evidence",
    "operator_onboarding",
    "published_image"
  ]
);
const publicStack = body.pipelines.find((item) => item.key === "public_stack");
assert.equal(publicStack.status_boundary, "ready-now behind public exposure gates");
assert.ok(publicStack.evidence_commands.includes("corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>"));
assert.ok(publicStack.safety_notes.some((item) => /public exposure/i.test(item)));
assert.ok(body.management_surfaces.some((item) => item.command === "corepack pnpm run deployability:dashboard"));
assert.ok(body.management_surfaces.some((item) => item.command === "corepack pnpm run deployability:prd"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:roadmap"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_prd_index_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability PRD index/);
assert.match(text.stdout, /daily-deployable with explicit safety gates/);
assert.match(text.stdout, /public_stack: ready-now behind public exposure gates/);
assert.match(text.stdout, /corepack pnpm run deployability:prd -- --json/);
assert.ok(!text.stdout.includes("sk_prd_index_must_not_leak"));

const typo = run(["--jsno"]);
assert.equal(typo.status, 1);
assert.match(typo.stderr, /unknown option --jsno/);

console.log("[deployability-prd.test] ok");
