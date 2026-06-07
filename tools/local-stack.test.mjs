import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const LOCAL_STACK = path.join(REPO_ROOT, "tools/local-stack.mjs");

function run(cwd, args, env = {}) {
  return spawnSync(process.execPath, [LOCAL_STACK, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_admin_must_not_leak",
      ...env
    }
  });
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-local-stack-test-"));
try {
  const up = run(tmpRoot, ["up", "--dry-run"]);
  assert.equal(up.status, 0, up.stderr || up.stdout);
  assert.match(up.stdout, /\[local-stack:up\]/);
  assert.match(up.stdout, /node tools\/selfhost-kit\.mjs up --profile platform/);
  assert.match(up.stdout, /corepack pnpm --dir repos\/platform --filter @delexec\/transport-relay run start/);
  assert.match(up.stdout, /corepack pnpm --dir repos\/client --filter @delexec\/ops exec node src\/cli\.js bootstrap --platform http:\/\/127\.0\.0\.1:8080/);
  assert.match(up.stdout, /corepack pnpm --dir repos\/client --filter @delexec\/ops exec node src\/cli\.js start/);
  assert.match(up.stdout, /corepack pnpm run dev:doctor/);
  assert.match(up.stdout, /corepack pnpm run test:agent-e2e/);
  assert.match(up.stdout, /corepack pnpm run mcp:golden-four/);
  assert.ok(!up.stdout.includes("sk_admin_must_not_leak"));

  const upJson = run(tmpRoot, ["up", "--dry-run", "--json"]);
  assert.equal(upJson.status, 0, upJson.stderr || upJson.stdout);
  const upBody = JSON.parse(upJson.stdout);
  assert.equal(upBody.command, "dev:local:up");
  assert.equal(upBody.ok, true);
  assert.equal(upBody.dry_run, true);
  assert.equal(upBody.state_dir, ".run/local-stack");
  assert.deepEqual(
    upBody.steps.map((step) => step.label),
    ["platform", "relay", "client bootstrap", "supervisor"]
  );
  assert.match(upBody.steps.map((step) => step.command).join("\n"), /selfhost-kit\.mjs up --profile platform/);
  assert.match(upBody.verification.join("\n"), /corepack pnpm run dev:doctor/);
  assert.match(upBody.notes.join("\n"), /does not print child command stdout/);
  assert.ok(!upJson.stdout.includes("[dry-run]"));
  assert.ok(!upJson.stdout.includes("sk_admin_must_not_leak"));

  const planJson = run(tmpRoot, ["plan", "--json"]);
  assert.equal(planJson.status, 0, planJson.stderr || planJson.stdout);
  const planBody = JSON.parse(planJson.stdout);
  assert.equal(planBody.command, "dev:local:plan");
  assert.equal(planBody.ok, true);
  assert.equal(planBody.state_dir, ".run/local-stack");
  assert.ok(Array.isArray(planBody.steps));
  assert.match(planBody.steps.join("\n"), /selfhost:up -- --profile platform/);
  assert.match(planBody.steps.join("\n"), /dev:client:supervisor/);
  assert.ok(!planJson.stdout.includes("sk_admin_must_not_leak"));

  const stateDir = path.join(tmpRoot, ".run/local-stack");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "relay.pid"), "999999", "utf8");
  fs.writeFileSync(
    path.join(stateDir, "supervisor.log"),
    ["first", "second", "third", "sk_admin_must_not_leak", ""].join("\n"),
    "utf8"
  );

  const status = run(tmpRoot, ["status"]);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.match(status.stdout, /relay: stopped/);
  assert.match(status.stdout, /supervisor: stopped/);
  assert.ok(!status.stdout.includes("sk_admin_must_not_leak"));

  const statusJson = run(tmpRoot, ["status", "--json"]);
  assert.equal(statusJson.status, 0, statusJson.stderr || statusJson.stdout);
  const statusBody = JSON.parse(statusJson.stdout);
  assert.equal(statusBody.command, "dev:local:status");
  assert.equal(statusBody.ok, true);
  assert.equal(statusBody.state_dir, ".run/local-stack");
  assert.deepEqual(
    statusBody.services.map((service) => service.name),
    ["relay", "supervisor"]
  );
  assert.equal(statusBody.services[0].running, false);
  assert.equal(statusBody.services[0].log, ".run/local-stack/relay.log");
  assert.match(statusBody.verification.join("\n"), /corepack pnpm run dev:doctor/);
  assert.ok(!statusJson.stdout.includes("sk_admin_must_not_leak"));

  const logs = run(tmpRoot, ["logs", "--service", "supervisor", "--tail", "2"]);
  assert.equal(logs.status, 0, logs.stderr || logs.stdout);
  assert.match(logs.stdout, /third/);
  assert.match(logs.stdout, /sk_admin_must_not_leak/);
  assert.doesNotMatch(logs.stdout, /second/);

  const logsJson = run(tmpRoot, ["logs", "--service", "supervisor", "--tail", "2", "--json"]);
  assert.equal(logsJson.status, 0, logsJson.stderr || logsJson.stdout);
  const logsBody = JSON.parse(logsJson.stdout);
  assert.equal(logsBody.command, "dev:local:logs");
  assert.equal(logsBody.ok, true);
  assert.equal(logsBody.service, "supervisor");
  assert.equal(logsBody.tail, 2);
  assert.deepEqual(logsBody.logs.map((entry) => entry.service), ["supervisor"]);
  assert.equal(logsBody.logs[0].exists, true);
  assert.equal(logsBody.logs[0].available_lines, 4);
  assert.equal(logsBody.logs[0].printed_lines, 0);
  assert.match(logsBody.notes.join("\n"), /does not print raw log lines/);
  assert.ok(!logsJson.stdout.includes("sk_admin_must_not_leak"));
  assert.ok(!logsJson.stdout.includes("third"));

  const down = run(tmpRoot, ["down", "--dry-run"]);
  assert.equal(down.status, 0, down.stderr || down.stdout);
  assert.match(down.stdout, /\[dry-run\] stop supervisor/);
  assert.match(down.stdout, /\[dry-run\] stop relay/);
  assert.match(down.stdout, /node tools\/selfhost-kit\.mjs down --profile platform/);

  const downJson = run(tmpRoot, ["down", "--dry-run", "--json"]);
  assert.equal(downJson.status, 0, downJson.stderr || downJson.stdout);
  const downBody = JSON.parse(downJson.stdout);
  assert.equal(downBody.command, "dev:local:down");
  assert.equal(downBody.ok, true);
  assert.equal(downBody.dry_run, true);
  assert.equal(downBody.keep_platform, false);
  assert.deepEqual(
    downBody.steps.map((step) => step.label),
    ["supervisor", "relay", "platform down"]
  );
  assert.match(downBody.steps[2].command, /selfhost-kit\.mjs down --profile platform/);
  assert.match(downBody.notes.join("\n"), /does not print child command stdout/);
  assert.ok(!downJson.stdout.includes("[dry-run]"));
  assert.ok(!downJson.stdout.includes("sk_admin_must_not_leak"));

  const downKeepPlatformJson = run(tmpRoot, ["down", "--dry-run", "--keep-platform", "--json"]);
  assert.equal(downKeepPlatformJson.status, 0, downKeepPlatformJson.stderr || downKeepPlatformJson.stdout);
  const downKeepPlatformBody = JSON.parse(downKeepPlatformJson.stdout);
  assert.equal(downKeepPlatformBody.command, "dev:local:down");
  assert.equal(downKeepPlatformBody.ok, true);
  assert.equal(downKeepPlatformBody.keep_platform, true);
  assert.deepEqual(
    downKeepPlatformBody.steps.map((step) => step.label),
    ["supervisor", "relay"]
  );

  console.log("[local-stack.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
