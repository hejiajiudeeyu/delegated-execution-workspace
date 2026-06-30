import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function getExpectedCurrentBundleChangeId(repoRoot) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, "tools/compat-status.mjs"), "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.ok(body.current_bundle?.change_id, "compat:status must report current_bundle.change_id");
  return body.current_bundle.change_id;
}
