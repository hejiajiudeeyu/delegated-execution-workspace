import { spawnSync } from "node:child_process";

const cache = new Map();
const refreshed = new Set();

const GIT_SSH_COMMAND_DEFAULT = "ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=10 -o ConnectTimeout=30";

function shouldSkip() {
  return (
    process.env.SKIP_ORIGIN_REACHABILITY === "1" ||
    process.env.OFFLINE === "1"
  );
}

function gitEnv() {
  const env = { ...process.env };
  if (!env.GIT_SSH_COMMAND) {
    env.GIT_SSH_COMMAND = GIT_SSH_COMMAND_DEFAULT;
  }
  return env;
}

function fetchRemoteRefs(repoPath, retries = 3) {
  const env = gitEnv();
  let last = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = spawnSync(
      "git",
      ["-C", repoPath, "fetch", "--quiet", "--no-tags", "--prune", "origin"],
      { encoding: "utf8", env }
    );
    if (result.status === 0) {
      return { ok: true };
    }
    last = { ok: false, attempt, stderr: (result.stderr || "").trim() };
  }
  return last;
}

function shaExistsLocally(repoPath, sha) {
  const result = spawnSync(
    "git",
    ["-C", repoPath, "cat-file", "-t", sha],
    { encoding: "utf8", env: gitEnv() }
  );
  return result.status === 0 && (result.stdout || "").trim() === "commit";
}

function isReachableFromRemoteRefs(repoPath, sha) {
  // git branch -r --contains <sha> lists every remote-tracking branch whose
  // tip has <sha> in its history. Empty output means the SHA is not reachable
  // from any ref on origin.
  const result = spawnSync(
    "git",
    ["-C", repoPath, "branch", "-r", "--contains", sha],
    { encoding: "utf8", env: gitEnv() }
  );
  if (result.status !== 0) {
    return { ok: false, reason: (result.stderr || "").trim() || "git branch -r --contains failed" };
  }
  const lines = (result.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { ok: false, reason: "no remote-tracking branch contains this SHA" };
  }
  return { ok: true, refs: lines };
}

function tryFetchSha(repoPath, sha, retries = 3) {
  const env = gitEnv();
  let last = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = spawnSync(
      "git",
      [
        "-C",
        repoPath,
        "fetch",
        "--quiet",
        "--no-tags",
        "--no-write-fetch-head",
        "origin",
        sha
      ],
      { encoding: "utf8", env }
    );
    if (result.status === 0) {
      return { ok: true };
    }
    last = { ok: false, attempt, stderr: (result.stderr || "").trim() };
  }
  return last;
}

export function isOriginReachable(repoPath, sha) {
  if (shouldSkip()) {
    return { ok: true, skipped: true };
  }
  const key = `${repoPath}::${sha}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  // Two cases to handle:
  //
  //   A. The SHA is already an object in our local clone. We want to verify
  //      it's *also* on origin (catches the local-only commit bug). The right
  //      check is `git branch -r --contains <sha>` after refreshing remote
  //      refs.
  //
  //   B. The SHA is NOT an object in our local clone (e.g. CI runs with a
  //      shallow `actions/checkout` so historical SHAs from old CHG entries
  //      aren't fetched). The right check is `git fetch origin <sha>`, which
  //      asks the remote whether that SHA exists in its object store. We do
  //      NOT use this in case A because git short-circuits when the SHA is
  //      already local, masking the bug.

  if (shaExistsLocally(repoPath, sha)) {
    let fetchWarning = null;
    if (!refreshed.has(repoPath)) {
      const fetchResult = fetchRemoteRefs(repoPath);
      if (fetchResult.ok) {
        refreshed.add(repoPath);
      } else {
        fetchWarning = `git fetch origin failed after ${fetchResult.attempt} attempts (${fetchResult.stderr || "no stderr"}); falling back to cached remote refs`;
        console.warn(`[origin-reachable] WARN: ${repoPath}: ${fetchWarning}`);
      }
    }
    const result = isReachableFromRemoteRefs(repoPath, sha);
    if (fetchWarning) result.staleRefs = true;
    cache.set(key, result);
    return result;
  }

  // Case B: SHA isn't local. A successful `git fetch origin <sha>` proves
  // origin has it (because origin actually transferred objects to us).
  const fetchByShaResult = tryFetchSha(repoPath, sha);
  if (fetchByShaResult.ok) {
    const ok = { ok: true, fetchedFromOrigin: true };
    cache.set(key, ok);
    return ok;
  }
  const failure = {
    ok: false,
    reason: `SHA not in local objects and git fetch origin <sha> failed: ${fetchByShaResult.stderr || "unknown error"}`
  };
  cache.set(key, failure);
  return failure;
}

export function assertOriginReachable(repoPath, sha, label) {
  const result = isOriginReachable(repoPath, sha);
  if (result.ok) {
    return;
  }
  const tag = label ? `${label} ` : "";
  console.error(
    `[origin-reachable] ${tag}SHA ${sha} in ${repoPath} is NOT reachable from any ref on origin.`
  );
  if (result.reason) {
    console.error(`[origin-reachable] reason: ${result.reason}`);
  }
  console.error(
    "[origin-reachable] Push the missing commits to origin (e.g. `git -C " +
      repoPath +
      " push origin HEAD:main`), or set SKIP_ORIGIN_REACHABILITY=1 to bypass when offline."
  );
  process.exit(1);
}
