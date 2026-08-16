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
run(ROOT, "node", ["tools/sync-local-contracts.mjs"]);
run(path.join(ROOT, "repos/protocol"), "node", ["scripts/check-contracts-package.mjs"]);
run(path.join(ROOT, "repos/client"), "node", ["scripts/check-client-packages.mjs"]);
run(path.join(ROOT, "repos/platform"), "node", ["scripts/check-service-packages.mjs"]);
run(path.join(ROOT, "repos/platform"), "node", ["scripts/check-deploy-configs.mjs"]);
// The contract fields each repo agrees on individually, checked once as the
// thing they exist for: a worker declares them and the catalogue publishes
// them. Four separate bugs dropped a declared field between the two, so this
// asserts the property rather than waiting for the fifth.
run(ROOT, "node", ["tools/contract-conformance.mjs"]);

console.log("[contracts-check] ok");
