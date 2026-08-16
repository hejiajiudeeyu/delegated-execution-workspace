import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/validate-change-bundle.mjs");

// The SHA that was written into CHG-2026-244 by expanding a short hash by
// hand: forty plausible characters naming nothing.
const PHANTOM = "8c893de0a0bfec70bd0e35e34fa41ee5b5f0a7fe";
// The commit it meant. Same short hash, expanded properly.
const REAL = "8c893de3c5d38fdfa2cb190551ca080258a9ff60";
// A different real commit. Correcting a phantom must not become a way to
// re-point a frozen bundle at this.
const OTHER = "4a1538e19991efd304e4b0abbc163e537419e4ec";
const PLATFORM_SHA = "2f07ae2396fddc7aad3b81c3e0464d7073101026";
const PROTOCOL_SHA = "36d85181e367fe18591d468aa49016e544808611";

function bundle({ changeId = "CHG-0001", clientSha, checks = "passed" }) {
  return [
    `change_id: ${changeId}`,
    "goal: a frozen combination",
    `protocol_sha: ${PROTOCOL_SHA}`,
    `client_sha: ${clientSha}`,
    `platform_sha: ${PLATFORM_SHA}`,
    "owner: tester",
    "risk_level: low",
    "affected_scope:",
    "  - client",
    `contracts_check: ${checks}`,
    `integration_check: ${checks}`,
    "notes: fixture",
    ""
  ].join("\n");
}

function makeFixture({ head, working, extraFile = null }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validate-change-bundle-test-"));
  fs.mkdirSync(path.join(root, "changes"), { recursive: true });
  for (const repo of ["protocol", "client", "platform"]) {
    fs.mkdirSync(path.join(root, "repos", repo, ".git"), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "changes", "CHG-0001.yaml"), working, "utf8");
  if (extraFile) {
    fs.writeFileSync(path.join(root, "changes", "CHG-0002.yaml"), extraFile, "utf8");
  }
  fs.mkdirSync(path.join(root, "bin"), { recursive: true });
  fs.writeFileSync(path.join(root, "head-version.yaml"), head ?? "", "utf8");
  // A git that knows exactly two things: what HEAD says about the bundle, and
  // which SHAs exist. Everything the validator asks flows through these.
  fs.writeFileSync(
    path.join(root, "bin", "git"),
    `#!/usr/bin/env sh
while [ "$1" = "-C" ]; do shift 2; done
case "$1 $2" in
  "show HEAD:changes/CHG-0001.yaml")
    if [ -s "${root}/head-version.yaml" ]; then cat "${root}/head-version.yaml"; exit 0; fi
    exit 1 ;;
  "show HEAD:changes/CHG-0002.yaml") exit 1 ;;
esac
case "$1" in
  cat-file)
    case "$3" in
      ${REAL}|${OTHER}|${PLATFORM_SHA}|${PROTOCOL_SHA}) echo commit; exit 0 ;;
      *) echo "could not get object info" >&2; exit 1 ;;
    esac ;;
  fetch)
    for arg in "$@"; do
      case "$arg" in
        ${PHANTOM}) echo "fatal: remote error: upload-pack: not our ref" >&2; exit 1 ;;
      esac
    done
    exit 0 ;;
  branch) echo "  origin/main"; exit 0 ;;
  rev-parse) echo "${REAL}"; exit 0 ;;
esac
exit 0
`,
    { mode: 0o755 }
  );
  fs.chmodSync(path.join(root, "bin", "git"), 0o755);
  return root;
}

function run(root, extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
      SKIP_ORIGIN_REACHABILITY: "",
      OFFLINE: "",
      ...extraEnv
    }
  });
}

// A frozen bundle whose recorded SHA names nothing may be corrected to the
// same short hash expanded properly. Nothing else can clear it: reachability
// is checked over every bundle, so opening a new CHG leaves this one red.
{
  const root = makeFixture({
    head: bundle({ clientSha: PHANTOM }),
    working: bundle({ clientSha: REAL })
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr + result.stdout, /corrected from 8c893de0/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// But the correction has to be that SHA expanded, not another commit.
{
  const root = makeFixture({
    head: bundle({ clientSha: PHANTOM }),
    working: bundle({ clientSha: OTHER })
  });
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /is not it expanded correctly/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// A frozen SHA that exists stays frozen, phantom exception or not.
{
  const root = makeFixture({
    head: bundle({ clientSha: REAL }),
    working: bundle({ clientSha: OTHER })
  });
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must not be rewritten/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// Absence is claimed from evidence. With the bypass on there is none, so the
// correction is refused rather than taken on trust.
{
  const root = makeFixture({
    head: bundle({ clientSha: PHANTOM }),
    working: bundle({ clientSha: REAL })
  });
  try {
    const result = run(root, { SKIP_ORIGIN_REACHABILITY: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /absence cannot be proven/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// A run that skipped reachability cannot be the run that earns passed/passed —
// which is how the phantom reached a frozen bundle in the first place.
{
  const root = makeFixture({
    head: bundle({ clientSha: REAL }),
    working: bundle({ clientSha: REAL }),
    extraFile: bundle({ changeId: "CHG-0002", clientSha: REAL })
  });
  try {
    const result = run(root, { SKIP_ORIGIN_REACHABILITY: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /origin reachability was skipped/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log("[validate-change-bundle.test] ok");
