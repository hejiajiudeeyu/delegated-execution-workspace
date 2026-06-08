import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-safety.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_safety_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:safety");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.ok(Array.isArray(body.matrix));
assert.ok(body.matrix.length >= 12);

const byCommand = new Map(body.matrix.map((item) => [item.command, item]));
for (const command of [
  "corepack pnpm run selfhost:ops-report",
  "corepack pnpm run selfhost:backup-plan",
  "corepack pnpm run selfhost:backup-validate",
  "corepack pnpm run selfhost:restore-plan",
  "corepack pnpm run selfhost:rotate-plan",
  "corepack pnpm run selfhost:rotate",
  "corepack pnpm run dev:doctor",
  "corepack pnpm run test:agent-e2e",
  "corepack pnpm run mcp:golden-four",
  "corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>"
]) {
  assert.ok(byCommand.has(command), `${command} should be in the safety matrix`);
}
assert.equal(byCommand.get("corepack pnpm run deployability:quickstart").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:quickstart").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:safety").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:safety").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:readiness").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:readiness").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:readiness").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:readiness").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run deployability:readiness").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run deployability:recipe").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:recipe").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:recipe").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:recipe").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run deployability:recipe").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run deployability:commands").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:commands").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:commands").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run dev:local:status").posture, "runtime_snapshot");
assert.equal(byCommand.get("corepack pnpm run dev:local:status").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run dev:doctor").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run dev:doctor").posture, "runtime_diagnostic");
assert.equal(byCommand.get("corepack pnpm run dev:doctor").calls_docker, true);
assert.equal(byCommand.get("corepack pnpm run dev:doctor").probes_network, true);
assert.equal(byCommand.get("corepack pnpm run dev:doctor").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").posture, "runtime_acceptance");
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").probes_network, true);
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").posture, "runtime_acceptance");
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").probes_network, true);
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:doctor").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:doctor").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").posture, "writes_report");
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").reads_env, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").writes_files, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").writes_files, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").writes_files, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").writes_files, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").writes_files, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").posture, "writes_env");
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").reads_env, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").writes_files, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run test:deployability").posture, "contract_test");
assert.equal(byCommand.get("corepack pnpm run test:deployability").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability").ci_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").posture, "contract_test");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").ci_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:init").writes_files, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").starts_services, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").calls_docker, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:logs").private_terminal_text, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:audit-export").probes_network, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:security-review").public_exposure_gate, true);
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>").starts_services, false);
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>").posture, "delegated_smoke");
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>").starts_services, true);
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>").calls_docker, true);
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>").dashboard_safe, false);

assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:quickstart"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:readiness"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.notes.some((item) => /matrix is descriptive/i.test(item)));
assert.ok(!json.stdout.includes("sk_safety_must_not_leak"));
assert.ok(!json.stdout.includes("[ok]"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability safety matrix/);
assert.match(text.stdout, /deployability:readiness/);
assert.match(text.stdout, /deployability:recipe/);
assert.match(text.stdout, /selfhost:up/);
assert.match(text.stdout, /starts-services/);
assert.match(text.stdout, /private-terminal-text/);
assert.ok(!text.stdout.includes("sk_safety_must_not_leak"));

console.log("[deployability-safety.test] ok");
