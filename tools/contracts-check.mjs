import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();

function run(cwd, command, args, extraEnv = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });
}

run(ROOT, "node", ["tools/check-boundaries.mjs"]);
run(path.join(ROOT, "repos/protocol"), "node", ["scripts/check-contracts-package.mjs"]);
run(path.join(ROOT, "repos/client"), "node", ["scripts/check-client-packages.mjs"]);
run(path.join(ROOT, "repos/platform"), "node", ["scripts/check-service-packages.mjs"]);
run(path.join(ROOT, "repos/platform"), "node", ["scripts/check-deploy-configs.mjs"]);

console.log("[contracts-check] ok");
