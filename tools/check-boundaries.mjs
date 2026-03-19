import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const ROOT = process.cwd();
const boundaryConfigPath = path.join(ROOT, "tools/project-boundaries.yaml");

function packageJsonPaths(root) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile() && entry.name === "package.json") {
        results.push(full);
      }
    }
  }
  walk(root);
  return results;
}

function workspacePackages(repoDir) {
  return packageJsonPaths(repoDir)
    .map((file) => ({ file, manifest: JSON.parse(fs.readFileSync(file, "utf8")) }))
    .filter(({ manifest }) => manifest.name);
}

function allDeps(manifest) {
  return {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies
  };
}

const boundaryConfig = YAML.parse(fs.readFileSync(boundaryConfigPath, "utf8"));
const projects = boundaryConfig.projects ?? {};

const repoDirs = [
  path.join(ROOT, "repos/protocol"),
  path.join(ROOT, "repos/client"),
  path.join(ROOT, "repos/platform")
];

const packageToProject = new Map();
for (const [projectName, config] of Object.entries(projects)) {
  for (const packageName of config.package_names ?? []) {
    packageToProject.set(packageName, projectName);
  }
}

const workspaceManifests = repoDirs.flatMap((repoDir) => workspacePackages(repoDir));
const workspacePackageNames = new Set(workspaceManifests.map(({ manifest }) => manifest.name));

const uncoveredPackages = workspaceManifests
  .map(({ manifest }) => manifest.name)
  .filter((name) => !packageToProject.has(name))
  .filter((name) => !name.startsWith("delegated-execution-"));

if (uncoveredPackages.length > 0) {
  console.error(`[check-boundaries] uncovered workspace packages: ${uncoveredPackages.join(", ")}`);
  process.exit(1);
}

for (const [packageName, projectName] of packageToProject) {
  if (!workspacePackageNames.has(packageName)) {
    console.error(`[check-boundaries] boundary config references unknown package ${packageName} in ${projectName}`);
    process.exit(1);
  }
}

function assertRule(fromManifest, depName) {
  const fromProject = packageToProject.get(fromManifest.name);
  const toProject = packageToProject.get(depName);
  if (!toProject) {
    return;
  }
  const allowed = new Set(projects[fromProject]?.allow_dependencies ?? []);
  if (!allowed.has(toProject)) {
    console.error(`[check-boundaries] ${fromManifest.name} (${fromProject}) must not depend on ${depName} (${toProject})`);
    process.exit(1);
  }
}

for (const { manifest } of workspaceManifests) {
  for (const depName of Object.keys(allDeps(manifest))) {
    if (workspacePackageNames.has(depName)) {
      assertRule(manifest, depName);
    }
  }
}

console.log("[check-boundaries] ok");
