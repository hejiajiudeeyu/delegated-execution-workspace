import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

const bad = output
  .split("\n")
  .filter(Boolean)
  .filter((line) => ["-", "+"].includes(line[0]));

if (bad.length > 0) {
  console.error("[validate-submodules] submodule state is not clean:");
  for (const line of bad) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

console.log("[validate-submodules] ok");
