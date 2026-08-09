import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/release-manifest.mjs");

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
  if (mode) {
    fs.chmodSync(fullPath, mode);
  }
}

// A fake `git` that answers rev-parse per submodule directory, so the tool can
// be exercised without real submodule checkouts.
function makeFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-manifest-test-"));
  const shas = { ...SHAS, ...overrides };
  writeFile(
    root,
    "bin/git",
    `#!/usr/bin/env sh
if [ "$1" = "rev-parse" ] && [ "$2" = "HEAD" ]; then
  case "$PWD" in
    */repos/protocol) echo "${shas.protocol}" ;;
    */repos/client) echo "${shas.client}" ;;
    */repos/platform) echo "${shas.platform}" ;;
    */repos/brand-site) echo "${shas.brandSite}" ;;
    *) echo "unexpected cwd $PWD" >&2; exit 9 ;;
  esac
  exit 0
fi
echo "unexpected git args: $*" >&2
exit 99
`,
    0o755
  );
  for (const dir of ["repos/protocol", "repos/client", "repos/platform", "repos/brand-site"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFile(root, "changes/CHG-2026-001.yaml", "change_id: CHG-2026-001\n");
  writeFile(root, "changes/CHG-2026-002.yaml", "change_id: CHG-2026-002\n");
  // the scaffold must never be picked as the newest bundle
  writeFile(root, "changes/CHG-template.yaml", "change_id: CHG-template\n");
  return root;
}

function run(root, args, extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
      ...extraEnv
    }
  });
}

// spawnSync blocks this process's event loop, which would stop the in-process
// fake stack from ever answering a probe. Runtime cases spawn asynchronously.
function runAsync(root, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      cwd: root,
      env: { ...process.env, PATH: `${path.join(root, "bin")}:${process.env.PATH}` }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function readManifestFile(root, releaseId) {
  return fs.readFileSync(path.join(root, "releases/manifests", `${releaseId}.yaml`), "utf8");
}

// --- generate ---------------------------------------------------------------

{
  const root = makeFixture();
  const result = run(root, ["generate", "v1.0.0"]);
  assert.equal(result.status, 0, result.stderr);

  const manifest = readManifestFile(root, "v1.0.0");
  assert.match(manifest, /release_id: v1.0.0/);
  assert.match(manifest, new RegExp(SHAS.platform));
  assert.match(manifest, new RegExp(SHAS.brandSite));
  // the newest change bundle is recorded so a manifest can be traced back
  assert.match(manifest, /change_bundle: CHG-2026-002/);
  assert.match(manifest, /manifest_sha256: [0-9a-f]{64}/);
}

// a frozen manifest is immutable: regenerating the same id must be refused
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  const second = run(root, ["generate", "v1.0.0"]);
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /immutable/);
}

// release ids must stay filename-safe
{
  const root = makeFixture();
  const result = run(root, ["generate", "../escape"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release id/);
}

// artifacts must be freezable in one shot, never hand-patched afterwards
{
  const root = makeFixture();
  const result = run(root, [
    "generate",
    "v1.1.0",
    "--images",
    "rsp-gateway=v0.2.0,rsp-relay=v0.1.2",
    "--packages",
    "@delexec/ops=0.1.6",
    "--notes",
    "frozen with artifacts"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const manifest = readManifestFile(root, "v1.1.0");
  assert.match(manifest, /rsp-gateway: v0\.2\.0/);
  assert.match(manifest, /rsp-relay: v0\.1\.2/);
  assert.match(manifest, /"@delexec\/ops": 0\.1\.6/);
  assert.match(manifest, /notes: frozen with artifacts/);

  // and the frozen hash must cover them
  assert.equal(run(root, ["promote", "v1.1.0"]).status, 0);
  assert.equal(run(root, ["verify"]).status, 0);
}

// malformed key=value input is rejected rather than silently dropped
{
  const root = makeFixture();
  const result = run(root, ["generate", "v1.2.0", "--images", "no-equals-sign"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /malformed key=value/);
}

// --- promote + verify -------------------------------------------------------

{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);

  const pointer = fs.readFileSync(path.join(root, "releases/current.yaml"), "utf8");
  assert.match(pointer, /release_id: v1.0.0/);
  assert.match(pointer, /manifest_sha256: [0-9a-f]{64}/);

  const verify = run(root, ["verify"]);
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /ok release=v1\.0\.0/);
}

// promoting an unknown release must fail rather than invent a pointer
{
  const root = makeFixture();
  const result = run(root, ["promote", "v9.9.9"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown release id/);
}

// verify without a pointer fails loudly
{
  const root = makeFixture();
  const result = run(root, ["verify"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /current\.yaml is missing/);
}

// tampering with a frozen manifest is detected through the hash
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);

  const file = path.join(root, "releases/manifests/v1.0.0.yaml");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(SHAS.platform, "9".repeat(40)), "utf8");

  const verify = run(root, ["verify"]);
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /modified after freezing/);
}

// submodule drift against the certified combination is caught
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);

  // repoint the fake git at a different platform SHA, as a submodule bump would
  const movedPlatform = "5".repeat(40);
  writeFile(
    root,
    "bin/git",
    fs.readFileSync(path.join(root, "bin/git"), "utf8").replace(SHAS.platform, movedPlatform),
    0o755
  );

  const verify = run(root, ["verify"]);
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /platform drift/);
}

// --- probe + check ----------------------------------------------------------

function startFakeStack(factsByPath) {
  const server = http.createServer((req, res) => {
    const facts = factsByPath[req.url];
    if (!facts) {
      res.writeHead(404).end("{}");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(facts));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

function factsFor(overrides = {}) {
  const base = {
    "/platform/buildz": { component: "platform-api", version: "0.1.0", git_sha: SHAS.platform },
    "/relay/buildz": { component: "transport-relay", version: "0.1.0", git_sha: SHAS.platform },
    "/gateway/buildz": {
      component: "platform-console-gateway",
      version: "0.1.0",
      git_sha: SHAS.platform,
      console_asset_hash: "index-abc123.js"
    }
  };
  for (const [key, patch] of Object.entries(overrides)) {
    base[key] = { ...base[key], ...patch };
  }
  return base;
}

function withRelease(facts, releaseId, manifestSha) {
  return Object.fromEntries(
    Object.entries(facts).map(([key, value]) => [key, { ...value, release_id: releaseId, manifest_sha256: manifestSha }])
  );
}

function manifestShaOf(root, releaseId) {
  return readManifestFile(root, releaseId).match(/manifest_sha256: ([0-9a-f]{64})/)[1];
}

// matching runtime passes
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);
  const sha = manifestShaOf(root, "v1.0.0");

  const { server, url } = await startFakeStack(withRelease(factsFor(), "v1.0.0", sha));
  try {
    const check = await runAsync(root, ["check", url]);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /runtime matches release v1\.0\.0/);
    assert.match(check.stdout, /asset=index-abc123\.js/);
  } finally {
    server.close();
  }
}

// a stale deployed release is blocked
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);
  const sha = manifestShaOf(root, "v1.0.0");

  const stale = withRelease(factsFor(), "v1.0.0", sha);
  stale["/gateway/buildz"] = { ...stale["/gateway/buildz"], release_id: "v0.9.0" };

  const { server, url } = await startFakeStack(stale);
  try {
    const check = await runAsync(root, ["check", url]);
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /release v0\.9\.0 vs manifest v1\.0\.0/);
  } finally {
    server.close();
  }
}

// silence is not agreement: a service that cannot state its build blocks too
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);

  const { server, url } = await startFakeStack(factsFor());
  try {
    const check = await runAsync(root, ["check", url]);
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /drift is undetermined/);
    assert.match(check.stdout, /no release_id injected/);
  } finally {
    server.close();
  }
}

// an unreachable component is a drift failure, not a skip
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);
  const sha = manifestShaOf(root, "v1.0.0");

  const partial = withRelease(factsFor(), "v1.0.0", sha);
  delete partial["/relay/buildz"];

  const { server, url } = await startFakeStack(partial);
  try {
    const check = await runAsync(root, ["check", url]);
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /transport-relay: unreachable/);
  } finally {
    server.close();
  }
}

// per-component url override: the public edge does not expose the relay
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);
  const sha = manifestShaOf(root, "v1.0.0");

  const edge = withRelease(factsFor(), "v1.0.0", sha);
  const internalRelay = { "/buildz": edge["/relay/buildz"] };
  delete edge["/relay/buildz"];

  const edgeStack = await startFakeStack(edge);
  const relayStack = await startFakeStack(internalRelay);
  try {
    const blocked = await runAsync(root, ["check", edgeStack.url]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /transport-relay: unreachable/);

    const routed = await runAsync(root, [
      "check",
      edgeStack.url,
      "--component",
      `transport-relay=${relayStack.url}/buildz`
    ]);
    assert.equal(routed.status, 0, routed.stderr);
  } finally {
    edgeStack.server.close();
    relayStack.server.close();
  }
}

// probe reports without asserting, so it stays usable for diagnosis
{
  const root = makeFixture();
  assert.equal(run(root, ["generate", "v1.0.0"]).status, 0);
  assert.equal(run(root, ["promote", "v1.0.0"]).status, 0);

  const { server, url } = await startFakeStack(factsFor());
  try {
    const probe = await runAsync(root, ["probe", url]);
    assert.equal(probe.status, 0, probe.stderr);
    assert.match(probe.stdout, /observed platform-api/);
  } finally {
    server.close();
  }
}

// unknown subcommand is a usage error
{
  const root = makeFixture();
  const result = run(root, ["nonsense"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /usage/);
}

// a client-only release: same images, a combination name of its own
//
// A service reports the release_id baked into its IMAGE, so when only the npm
// package moves, every service keeps reporting the old image tag while running
// exactly what the manifest names. Comparing against the combination's name
// read that as total drift; comparing against the declared image tag is both
// correct and stricter.
{
  const root = makeFixture();
  assert.equal(
    run(root, ["generate", "v1.1.0-ops.2", "--images", "rsp-platform=v1.0.0,rsp-relay=v1.0.0,rsp-gateway=v1.0.0"]).status,
    0
  );
  assert.equal(run(root, ["promote", "v1.1.0-ops.2"]).status, 0);
  const sha = manifestShaOf(root, "v1.1.0-ops.2");

  const { server, url } = await startFakeStack(withRelease(factsFor(), "v1.0.0", sha));
  try {
    const check = await runAsync(root, ["check", url]);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /runtime matches release v1\.1\.0-ops\.2/);
  } finally {
    server.close();
  }
}

// and the gate still catches an image the combination does not name
{
  const root = makeFixture();
  assert.equal(
    run(root, ["generate", "v1.1.0-ops.2", "--images", "rsp-platform=v1.0.0,rsp-relay=v1.0.0,rsp-gateway=v1.0.0"]).status,
    0
  );
  assert.equal(run(root, ["promote", "v1.1.0-ops.2"]).status, 0);
  const sha = manifestShaOf(root, "v1.1.0-ops.2");

  const wrong = withRelease(factsFor(), "v1.0.0", sha);
  wrong["/gateway/buildz"] = { ...wrong["/gateway/buildz"], release_id: "v0.9.0" };

  const { server, url } = await startFakeStack(wrong);
  try {
    const check = await runAsync(root, ["check", url]);
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /release v0\.9\.0 vs manifest v1\.0\.0/);
  } finally {
    server.close();
  }
}

console.log("[release-manifest.test] ok");
