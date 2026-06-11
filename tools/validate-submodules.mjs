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
