import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/compat-status.mjs");

const SHAS = {
  protocol: "1111111111111111111111111111111111111111",
  client: "2222222222222222222222222222222222222222",
  platform: "3333333333333333333333333333333333333333",
  brandSite: "4444444444444444444444444444444444444444"
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
      PLATFORM_ADMIN_API_KEY: "sk_compat_must_not_leak",
      ...env
    }
  });
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-compat-status-test-"));

try {
  writeFile(
    tmpRoot,
    "changes/CHG-2026-090.yaml",
    [
      "change_id: CHG-2026-090",
      "goal: verify compatible status",
      `protocol_sha: ${SHAS.protocol}`,
      `client_sha: ${SHAS.client}`,
      `platform_sha: ${SHAS.platform}`,
      `brand_site_sha: ${SHAS.brandSite}`,
      "owner: hejiajiudeeyu",
      "risk_level: low",
      "affected_scope:",
      "  - orchestration",
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

  const env = { PATH: `${path.join(tmpRoot, "bin")}:${process.env.PATH}` };
  const json = run(tmpRoot, ["--json"], env);
  assert.equal(json.status, 0, json.stderr || json.stdout);
  const body = JSON.parse(json.stdout);
  assert.equal(body.command, "compat:status");
  assert.equal(body.ok, true);
  assert.equal(body.current_bundle.change_id, "CHG-2026-090");
  assert.equal(body.ledger_matches_current, true);
  assert.equal(body.working_tree_clean, false);
  assert.deepEqual(body.dirty_submodules, ["repos/client"]);
  assert.equal(body.submodules.find((item) => item.path === "repos/client").dirty, true);
  assert.equal(body.submodules.find((item) => item.path === "repos/protocol").matches_bundle, true);
  assert.ok(body.next_commands.includes("corepack pnpm run check:submodules"));
  assert.ok(!json.stdout.includes("[ok]"));
  assert.ok(!json.stdout.includes("sk_compat_must_not_leak"));

  const text = run(tmpRoot, [], env);
  assert.equal(text.status, 0, text.stderr || text.stdout);
  assert.match(text.stdout, /Compatibility status/);
  assert.match(text.stdout, /CHG-2026-090/);
  assert.match(text.stdout, /repos\/client: dirty/);
  assert.ok(!text.stdout.includes("sk_compat_must_not_leak"));

  console.log("[compat-status.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
