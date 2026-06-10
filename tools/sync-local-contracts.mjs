import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.env.SYNC_LOCAL_CONTRACTS_ROOT
  ? path.resolve(process.env.SYNC_LOCAL_CONTRACTS_ROOT)
  : path.resolve(__dirname, "..");
const platformRoot = path.join(ROOT, "repos", "platform");
const clientRoot = path.join(ROOT, "repos", "client");
const contractsPath = path.join(ROOT, "repos", "protocol", "packages", "contracts");

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectPackageDirs(root) {
  const packageDirs = [];
  if (!fs.existsSync(root)) {
    return packageDirs;
  }
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "package.json")) {
      packageDirs.push(current);
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      stack.push(path.join(current, entry.name));
    }
  }
  return packageDirs.sort();
}

function dependsOnLocalContracts(packageDir) {
  const manifest = readJson(path.join(packageDir, "package.json"));
  return Boolean(
    manifest.dependencies?.["@delexec/contracts"] ||
      manifest.devDependencies?.["@delexec/contracts"] ||
      manifest.peerDependencies?.["@delexec/contracts"] ||
      manifest.optionalDependencies?.["@delexec/contracts"]
  );
}

function linkLocalContracts(packageDir) {
  const scopeDir = path.join(packageDir, "node_modules", "@delexec");
  const target = path.join(scopeDir, "contracts");
  fs.mkdirSync(scopeDir, { recursive: true });
  removeIfExists(target);
  fs.symlinkSync(path.relative(scopeDir, contractsPath), target, "dir");
}

function syncContractsForRoot(root) {
  for (const packageDir of collectPackageDirs(root)) {
    if (packageDir === contractsPath || !dependsOnLocalContracts(packageDir)) {
      continue;
    }
    linkLocalContracts(packageDir);
  }
}

function syncClientContracts() {
  syncContractsForRoot(clientRoot);
}

function syncPlatformContracts() {
  linkLocalContracts(platformRoot);
  for (const packageDir of collectPackageDirs(platformRoot)) {
    if (packageDir === platformRoot || packageDir === contractsPath || !dependsOnLocalContracts(packageDir)) {
      continue;
    }
    removeIfExists(path.join(packageDir, "node_modules", "@delexec", "contracts"));
  }
}

function syncLocalContracts() {
  syncClientContracts();
  syncPlatformContracts();
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

syncLocalContracts();
cleanupLegacyArtifacts();

console.log("[sync-local-contracts] ok");
