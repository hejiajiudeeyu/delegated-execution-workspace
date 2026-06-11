import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/validate-submodules.mjs");
const CLEAN_SHA = "1111111111111111111111111111111111111111";
const OPTIONAL_SHA = "2222222222222222222222222222222222222222";

function writeFile(root, relativePath, text, mode) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
  if (mode) {
    fs.chmodSync(fullPath, mode);
  }
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validate-submodules-test-"));
  writeFile(
    root,
    ".gitmodules",
    `[submodule "repos/client"]\n\tpath = repos/client\n\turl = https://example.invalid/client.git\n[submodule "repos/brand-site"]\n\tpath = repos/brand-site\n\turl = https://example.invalid/brand-site.git\n`
  );
  writeFile(
    root,
    "bin/git",
    `#!/usr/bin/env sh\nif [ "$1" = "submodule" ] && [ "$2" = "status" ]; then\n  echo " ${CLEAN_SHA} repos/client (heads/main)"\n  echo "-${OPTIONAL_SHA} repos/brand-site (heads/main)"\n  exit 0\nfi\necho "unexpected git args: $*" >&2\nexit 99\n`,
    0o755
  );
  return root;
}

function run(root, extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
      SKIP_ORIGIN_REACHABILITY: "1",
      CI_OPTIONAL_SUBMODULES: "",
      ALLOW_UNINITIALIZED_SUBMODULES: "",
      ...extraEnv
    }
  });
}

{
  const root = makeFixture();
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /submodule state is not clean/);
    assert.match(result.stderr, /repos\/brand-site/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = makeFixture();
  try {
    const result = run(root, { CI_OPTIONAL_SUBMODULES: "repos/brand-site" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /optional submodules not initialized: repos\/brand-site/);
    assert.match(result.stdout, /\[validate-submodules\] ok/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log("[validate-submodules.test] ok");
