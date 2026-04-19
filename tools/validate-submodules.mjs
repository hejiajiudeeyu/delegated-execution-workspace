import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertOriginReachable } from "./lib/origin-reachable.mjs";

const SKIPPED = process.env.SKIP_ORIGIN_REACHABILITY === "1" || process.env.OFFLINE === "1";

const ROOT = process.cwd();
const gitmodules = path.join(ROOT, ".gitmodules");

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
const bad = lines.filter((line) => ["-", "+"].includes(line[0]));

if (bad.length > 0) {
  console.error("[validate-submodules] submodule state is not clean:");
  for (const line of bad) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

// Bleeding-prevention: every gitlink SHA recorded in the super-repo must be
// reachable from origin. Otherwise CI's `git submodule update --init` will
// fail with `not our ref` because the SHA only exists in a developer's local
// clone.
for (const line of lines) {
  // line format: " <sha> <path> (<ref-or-sha>)" with leading status char already filtered.
  const match = line.match(/^[\s+\-U]?([0-9a-f]{40})\s+(\S+)/);
  if (!match) continue;
  const [, sha, relPath] = match;
  const repoPath = path.join(ROOT, relPath);
  if (!fs.existsSync(path.join(repoPath, ".git"))) {
    continue;
  }
  assertOriginReachable(repoPath, sha, `submodule ${relPath}`);
}

if (SKIPPED) {
  console.log("[validate-submodules] ok (origin reachability skipped)");
} else {
  console.log("[validate-submodules] ok");
}
