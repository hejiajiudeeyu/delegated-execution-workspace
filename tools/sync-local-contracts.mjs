import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const platformRoot = path.join(ROOT, "repos", "platform");
const contractsPath = path.join(ROOT, "repos", "protocol", "packages", "contracts");

function run(cwd, command, args) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env
  });
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function syncPlatformContracts() {
  run(platformRoot, "npm", [
    "install",
    "--no-save",
    "--workspace",
    "@delexec/platform-api",
    "--workspace",
    "@delexec/platform-console-gateway",
    "--workspace",
    "@delexec/transport-relay",
    contractsPath
  ]);
}

function cleanupLegacyArtifacts() {
  for (const target of [
    path.join(ROOT, "repos/client/apps/ops/node_modules/.bin/delexec-buyer-controller"),
    path.join(ROOT, "repos/client/apps/ops/node_modules/.bin/croc-buyer-controller"),
    path.join(ROOT, "repos/client/apps/ops/node_modules/.bin/delexec-seller-controller"),
    path.join(ROOT, "repos/client/apps/ops/node_modules/.bin/croc-seller-controller"),
    path.join(ROOT, "node_modules/.pnpm/@delexec+contracts@0.1.0")
  ]) {
    removeIfExists(target);
  }
}

syncPlatformContracts();
cleanupLegacyArtifacts();

console.log("[sync-local-contracts] ok");
