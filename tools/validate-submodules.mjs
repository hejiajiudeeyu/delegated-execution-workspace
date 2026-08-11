import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertOriginReachable } from "./lib/origin-reachable.mjs";

const SKIPPED = process.env.SKIP_ORIGIN_REACHABILITY === "1" || process.env.OFFLINE === "1";

const ROOT = process.cwd();
const gitmodules = path.join(ROOT, ".gitmodules");

function optionalSubmodules() {
  return new Set(
    String(process.env.CI_OPTIONAL_SUBMODULES || process.env.ALLOW_UNINITIALIZED_SUBMODULES || "")
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseStatusLine(line) {
  const marker = ["-", "+", "U"].includes(line[0]) ? line[0] : " ";
  const match = line.match(/^[\s+\-U]?([0-9a-f]{40})\s+(\S+)/);
  if (!match) {
    return null;
  }
  return { marker, sha: match[1], relPath: match[2], raw: line };
}

if (!fs.existsSync(gitmodules)) {
  console.error("[validate-submodules] .gitmodules missing");
  process.exit(1);
}

const output = execFileSync("git", ["submodule", "status", "--recursive"], { cwd: ROOT, encoding: "utf8" }).trim();
if (!output) {
  console.error("[validate-submodules] no submodules found");
  process.exit(1);
}

const lines = output.split("\n").filter(Boolean);
const parsed = lines.map(parseStatusLine).filter(Boolean);
const optional = optionalSubmodules();
const optionalUninitialized = parsed.filter((item) => item.marker === "-" && optional.has(item.relPath));
const bad = parsed.filter((item) => ["-", "+", "U"].includes(item.marker) && !(item.marker === "-" && optional.has(item.relPath)));

if (bad.length > 0) {
  console.error("[validate-submodules] submodule state is not clean:");
  for (const item of bad) {
    console.error(`  ${item.raw}`);
  }
  process.exit(1);
}

// A recorded SHA describes a commit. It says nothing about what is actually on
// disk, and `git submodule status` marks a submodule only when its checked-out
// COMMIT differs — uncommitted changes in its working tree produce no marker at
// all. So a submodule could carry modified source while every gate reported ok,
// and the combination certified in releases/ would name code that is not the
// code the tests just ran against.
//
// That is not hypothetical: this repository spent an afternoon running gates
// green over an uncommitted protocol change sitting in repos/protocol.
//
// Tracked modifications fail, because they mean the certification is provably
// describing something else. Untracked files only warn: they are usually
// scratch, but they are occasionally a source file somebody forgot to add, and
// staying quiet about them would be the same silence in miniature.
// ALLOW_DIRTY_SUBMODULES=1 exists for deliberate work-in-progress, so that
// running gates over a dirty tree is a conscious act rather than an accident.
const ALLOW_DIRTY = process.env.ALLOW_DIRTY_SUBMODULES === "1";
const dirty = [];
const untracked = [];

for (const item of parsed) {
  if (item.marker === "-" && optional.has(item.relPath)) {
    continue;
  }
  const repoPath = path.join(ROOT, item.relPath);
  if (!fs.existsSync(path.join(repoPath, ".git"))) {
    continue;
  }
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: repoPath, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const tracked = status.filter((line) => !line.startsWith("??"));
  if (tracked.length > 0) {
    dirty.push({ relPath: item.relPath, entries: tracked });
  }
  const others = status.filter((line) => line.startsWith("??"));
  if (others.length > 0) {
    untracked.push({ relPath: item.relPath, count: others.length });
  }
}

if (dirty.length > 0 && !ALLOW_DIRTY) {
  console.error("[validate-submodules] submodule working trees carry uncommitted changes:");
  for (const item of dirty) {
    console.error(`  ${item.relPath}`);
    for (const entry of item.entries.slice(0, 10)) {
      console.error(`    ${entry}`);
    }
  }
  console.error(
    "  The recorded SHA does not describe this code. Commit it, or set ALLOW_DIRTY_SUBMODULES=1 to say so on purpose."
  );
  process.exit(1);
}

if (dirty.length > 0) {
  console.log(
    `[validate-submodules] dirty submodules allowed by ALLOW_DIRTY_SUBMODULES: ${dirty.map((item) => item.relPath).join(", ")}`
  );
}

for (const item of untracked) {
  console.log(`[validate-submodules] note: ${item.relPath} has ${item.count} untracked file(s)`);
}

// Bleeding-prevention: every gitlink SHA recorded in the super-repo must be
// reachable from origin. Otherwise CI's `git submodule update --init` will
// fail with `not our ref` because the SHA only exists in a developer's local
// clone.
for (const item of parsed) {
  const { sha, relPath } = item;
  if (item.marker === "-" && optional.has(relPath)) {
    continue;
  }
  const repoPath = path.join(ROOT, relPath);
  if (!fs.existsSync(path.join(repoPath, ".git"))) {
    continue;
  }
  assertOriginReachable(repoPath, sha, `submodule ${relPath}`);
}

if (optionalUninitialized.length > 0) {
  console.log(
    `[validate-submodules] optional submodules not initialized: ${optionalUninitialized.map((item) => item.relPath).join(", ")}`
  );
}

if (SKIPPED) {
  console.log("[validate-submodules] ok (origin reachability skipped)");
} else {
  console.log("[validate-submodules] ok");
}
