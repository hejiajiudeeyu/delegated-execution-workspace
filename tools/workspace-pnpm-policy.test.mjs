import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const ROOT_PACKAGE = path.join(REPO_ROOT, "package.json");
const REPOS_ROOT = path.join(REPO_ROOT, "repos");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectPackageJsonFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name === "package.json") {
        files.push(entryPath);
      }
    }
  }
  return files.sort();
}

const rootPackage = readJson(ROOT_PACKAGE);
assert.equal(
  rootPackage.pnpm?.overrides?.vite,
  "6.3.5",
  "workspace-wide Vite override should live at the fourth-repo root"
);

for (const manifestPath of collectPackageJsonFiles(REPOS_ROOT)) {
  const manifest = readJson(manifestPath);
  assert.equal(
    manifest.pnpm?.overrides,
    undefined,
    `${path.relative(REPO_ROOT, manifestPath)} must not define pnpm.overrides because pnpm ignores submodule package overrides in this workspace`
  );
}

console.log("[workspace-pnpm-policy.test] ok");
