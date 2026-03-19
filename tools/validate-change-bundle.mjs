import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import YAML from "yaml";

const ROOT = process.cwd();
const changesDir = path.join(ROOT, "changes");
const submoduleMap = {
  protocol_sha: "repos/protocol",
  client_sha: "repos/client",
  platform_sha: "repos/platform"
};
const required = [
  "change_id",
  "goal",
  "protocol_sha",
  "client_sha",
  "platform_sha",
  "owner",
  "risk_level",
  "affected_scope",
  "contracts_check",
  "integration_check",
  "notes"
];

if (!fs.existsSync(changesDir)) {
  console.error("[validate-change-bundle] changes/ missing");
  process.exit(1);
}

const files = fs.readdirSync(changesDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
if (files.length === 0) {
  console.error("[validate-change-bundle] no change bundle files found");
  process.exit(1);
}

for (const file of files) {
  if (file.toLowerCase().includes("template")) {
    continue;
  }
  const fullPath = path.join(changesDir, file);
  const body = YAML.parse(fs.readFileSync(fullPath, "utf8"));
  for (const key of required) {
    if (!(key in body)) {
      console.error(`[validate-change-bundle] ${file} missing ${key}`);
      process.exit(1);
    }
  }
  if (!Array.isArray(body.affected_scope) || body.affected_scope.length === 0) {
    console.error(`[validate-change-bundle] ${file} affected_scope must be a non-empty array`);
    process.exit(1);
  }

  for (const [field, submodulePath] of Object.entries(submoduleMap)) {
    const submoduleRoot = path.join(ROOT, submodulePath);
    if (!fs.existsSync(path.join(submoduleRoot, ".git"))) {
      console.error(`[validate-change-bundle] ${submodulePath} is not initialized`);
      process.exit(1);
    }

    const actualSha = execFileSync("git", ["-C", submoduleRoot, "rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim();
    if (body[field] !== actualSha) {
      console.error(
        `[validate-change-bundle] ${file} ${field}=${body[field]} does not match current ${submodulePath} SHA ${actualSha}`
      );
      process.exit(1);
    }
  }
}

console.log("[validate-change-bundle] ok");
