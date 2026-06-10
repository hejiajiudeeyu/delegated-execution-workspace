import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/sync-local-contracts.mjs");

function writeFile(root, relativePath, text, mode) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
  if (mode) {
    fs.chmodSync(fullPath, mode);
  }
}

function writePackage(root, relativeDir, dependencies = {}) {
  writeFile(
    root,
    path.join(relativeDir, "package.json"),
    `${JSON.stringify({ name: relativeDir.replaceAll("/", "-"), version: "0.0.0", dependencies }, null, 2)}\n`
  );
}

function assertContractsLink(root, relativeDir) {
  const linkPath = path.join(root, relativeDir, "node_modules/@delexec/contracts");
  const stats = fs.lstatSync(linkPath);
  assert.equal(stats.isSymbolicLink(), true, `${linkPath} should be a symbolic link`);
  assert.equal(
    fs.realpathSync(linkPath),
    fs.realpathSync(path.join(root, "repos/protocol/packages/contracts")),
    `${linkPath} should point at the local protocol contracts package`
  );
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sync-local-contracts-test-"));

try {
  writeFile(tmpRoot, "bin/npm", "#!/usr/bin/env sh\necho npm must not run >&2\nexit 42\n", 0o755);
  writePackage(tmpRoot, "repos/protocol/packages/contracts");
  writeFile(tmpRoot, "repos/protocol/packages/contracts/src/index.js", "export const ok = true;\n");

  writePackage(tmpRoot, "repos/client", { "@delexec/contracts": "^0.1.0" });
  writePackage(tmpRoot, "repos/client/apps/ops", { "@delexec/contracts": "^0.1.0" });
  writePackage(tmpRoot, "repos/client/packages/caller-controller-core", { "@delexec/contracts": "^0.1.0" });
  writePackage(tmpRoot, "repos/platform/apps/platform-api", { "@delexec/contracts": "^0.1.0" });
  writePackage(tmpRoot, "repos/platform/apps/platform-console-gateway", { "@delexec/contracts": "^0.1.0" });
  writePackage(tmpRoot, "repos/platform/apps/transport-relay", { "@delexec/contracts": "^0.1.0" });

  writeFile(tmpRoot, "repos/client/apps/ops/node_modules/.bin/tsc", "#!/usr/bin/env sh\nexit 0\n", 0o755);
  writeFile(tmpRoot, "repos/client/apps/ops/node_modules/.bin/delexec-buyer-controller", "legacy\n");

  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: tmpRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(tmpRoot, "bin")}:${process.env.PATH}`,
      SYNC_LOCAL_CONTRACTS_ROOT: tmpRoot
    }
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[sync-local-contracts\] ok/);
  assertContractsLink(tmpRoot, "repos/client");
  assertContractsLink(tmpRoot, "repos/client/apps/ops");
  assertContractsLink(tmpRoot, "repos/client/packages/caller-controller-core");
  assertContractsLink(tmpRoot, "repos/platform");
  assert.equal(
    fs.existsSync(path.join(tmpRoot, "repos/platform/apps/platform-api/node_modules/@delexec/contracts")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(tmpRoot, "repos/platform/apps/platform-console-gateway/node_modules/@delexec/contracts")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(tmpRoot, "repos/platform/apps/transport-relay/node_modules/@delexec/contracts")),
    false
  );
  assert.equal(fs.existsSync(path.join(tmpRoot, "repos/client/apps/ops/node_modules/.bin/tsc")), true);
  assert.equal(
    fs.existsSync(path.join(tmpRoot, "repos/client/apps/ops/node_modules/.bin/delexec-buyer-controller")),
    false
  );

  console.log("[sync-local-contracts.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
