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
assert.equal(byCommand.get("corepack pnpm run deployability:quickstart").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:quickstart").reads_env, false);
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").calls_docker, false);
assert.equal(byCommand.get("corepack pnpm run deployability:doctor").probes_network, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:init").writes_files, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").starts_services, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").calls_docker, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:logs").private_terminal_text, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:audit-export").probes_network, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:security-review").public_exposure_gate, true);
assert.equal(byCommand.get("corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>").starts_services, false);

assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:quickstart"));
assert.ok(body.notes.some((item) => /matrix is descriptive/i.test(item)));
assert.ok(!json.stdout.includes("sk_safety_must_not_leak"));
assert.ok(!json.stdout.includes("[ok]"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability safety matrix/);
assert.match(text.stdout, /selfhost:up/);
assert.match(text.stdout, /starts-services/);
assert.match(text.stdout, /private-terminal-text/);
assert.ok(!text.stdout.includes("sk_safety_must_not_leak"));

console.log("[deployability-safety.test] ok");
