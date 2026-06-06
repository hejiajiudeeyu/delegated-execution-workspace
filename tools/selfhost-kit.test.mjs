import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SELFHOST_KIT = path.join(REPO_ROOT, "tools/selfhost-kit.mjs");

function run(cwd, args, options = {}) {
  const result = spawnSync(process.execPath, [SELFHOST_KIT, ...args], {
    cwd,
    env: options.env || process.env,
    encoding: "utf8"
  });
  return result;
}

function runAsync(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SELFHOST_KIT, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

async function withAuditServer(expectedToken, handler) {
  const server = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, `Bearer ${expectedToken}`);
    assert.equal(req.url, "/v1/admin/audit-events?limit=5");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        items: [{ id: "audit_test_1", action: "security.reviewed" }],
        pagination: { limit: 5, offset: 0, total: 1, has_more: false }
      })
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function readEnv(file) {
  const entries = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    entries.set(line.slice(0, index), line.slice(index + 1));
  }
  return entries;
}

function writeMinimalProfile(root) {
  const dir = path.join(root, "repos/platform/deploy/platform");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".env.example"),
    [
      "POSTGRES_DB=croc",
      "POSTGRES_USER=croc",
      "POSTGRES_PASSWORD=croc",
      "DATABASE_URL=postgresql://croc:croc@postgres:5432/croc",
      "TOKEN_SECRET=change-me-platform-token-secret",
      "PLATFORM_ADMIN_API_KEY=sk_admin_change_me",
      ""
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "docker-compose.yml"),
    [
      "services:",
      "  platform-api:",
      "    image: alpine:3.20",
      "    command: ['sh', '-c', 'sleep 60']",
      ""
    ].join("\n"),
    "utf8"
  );
  return {
    dir,
    envPath: path.join(dir, ".env")
  };
}

function writeMinimalPublicStackProfile(root) {
  const dir = path.join(root, "repos/platform/deploy/public-stack");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".env.example"),
    [
      "POSTGRES_DB=croc",
      "POSTGRES_USER=croc",
      "POSTGRES_PASSWORD=croc",
      "DATABASE_URL=postgresql://croc:croc@postgres:5432/croc",
      "TOKEN_SECRET=change-me-public-token-secret",
      "PLATFORM_ADMIN_API_KEY=sk_admin_change_me",
      "PLATFORM_CONSOLE_BOOTSTRAP_SECRET=change-me-public-bootstrap-secret",
      "PUBLIC_SITE_ADDRESS=http://localhost",
      ""
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "docker-compose.yml"),
    [
      "services:",
      "  edge:",
      "    image: alpine:3.20",
      "    command: ['sh', '-c', 'sleep 60']",
      ""
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "Caddyfile"),
    [
      "{$PUBLIC_SITE_ADDRESS:http://localhost} {",
      "  handle /healthz {",
      "    respond \"ok\" 200",
      "  }",
      "  handle_path /platform/* {",
      "    reverse_proxy platform-api:8080",
      "  }",
      "  handle_path /relay/* {",
      "    reverse_proxy relay:8090",
      "  }",
      "  handle_path /gateway/* {",
      "    reverse_proxy platform-console-gateway:8085",
      "  }",
      "  handle_path /console/* {",
      "    reverse_proxy platform-console-gateway:8085",
      "  }",
      "}",
      ""
    ].join("\n"),
    "utf8"
  );
  return {
    dir,
    envPath: path.join(dir, ".env")
  };
}

function writeMinimalAllInOneProfile(root) {
  const dir = path.join(root, "repos/platform/deploy/all-in-one");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".env.example"),
    [
      "POSTGRES_DB=croc",
      "POSTGRES_USER=croc",
      "POSTGRES_PASSWORD=croc",
      "DATABASE_URL=postgresql://croc:croc@postgres:5432/croc",
      "TOKEN_SECRET=change-me-all-in-one-token-secret",
      "PLATFORM_ADMIN_API_KEY=sk_admin_change_me",
      ""
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "docker-compose.yml"),
    [
      "services:",
      "  platform-api:",
      "    image: alpine:3.20",
      "    command: ['sh', '-c', 'sleep 60']",
      ""
    ].join("\n"),
    "utf8"
  );
  return {
    dir,
    envPath: path.join(dir, ".env")
  };
}

function writeFakeDocker(root) {
  const binDir = path.join(root, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const dockerPath = path.join(binDir, "docker");
  fs.writeFileSync(
    dockerPath,
    [
      "#!/usr/bin/env node",
      "const args = process.argv.slice(2);",
      "if (args[0] !== 'compose') process.exit(2);",
      "if (args.includes('ps')) {",
      "  if (args.includes('--format') && args.includes('json')) {",
      "    console.log(JSON.stringify([{ Service: 'platform-api', State: 'running', Health: 'healthy' }]));",
      "  } else {",
      "    console.log('NAME SERVICE STATUS');",
      "    console.log('platform-api platform-api running');",
      "  }",
      "  process.exit(0);",
      "}",
      "process.exit(0);",
      ""
    ].join("\n"),
    "utf8"
  );
  fs.chmodSync(dockerPath, 0o755);
  return binDir;
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-selfhost-kit-test-"));
try {
  const { envPath } = writeMinimalProfile(tmpRoot);

  const init = run(tmpRoot, ["init"]);
  assert.equal(init.status, 0, init.stderr || init.stdout);
  assert.match(init.stdout, /wrote repos\/platform\/deploy\/platform\/\.env/);
  assert.ok(fs.existsSync(envPath), ".env should be created");

  const env = readEnv(envPath);
  assert.notEqual(env.get("TOKEN_SECRET"), "change-me-platform-token-secret");
  assert.match(env.get("PLATFORM_ADMIN_API_KEY") || "", /^sk_admin_/);
  assert.match(env.get("POSTGRES_PASSWORD") || "", /^pg_/);
  assert.equal(
    env.get("DATABASE_URL"),
    `postgresql://croc:${env.get("POSTGRES_PASSWORD")}@postgres:5432/croc`
  );

  const beforeDryRun = fs.readFileSync(envPath, "utf8");
  const dryRun = run(tmpRoot, ["rotate"]);
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  assert.match(dryRun.stdout, /dry-run/);
  assert.equal(fs.readFileSync(envPath, "utf8"), beforeDryRun, "dry-run must not modify .env");

  const rotate = run(tmpRoot, ["rotate", "--confirm"]);
  assert.equal(rotate.status, 0, rotate.stderr || rotate.stdout);
  assert.match(rotate.stdout, /backup written/);
  const afterRotate = fs.readFileSync(envPath, "utf8");
  assert.notEqual(afterRotate, beforeDryRun, "confirmed rotation should modify .env");
  const backups = fs.readdirSync(path.dirname(envPath)).filter((file) => file.startsWith(".env.rotate-backup-"));
  assert.equal(backups.length, 1, "confirmed rotation should create exactly one backup");

  const rotatePlanJson = run(tmpRoot, ["rotate-plan", "--json"]);
  assert.equal(rotatePlanJson.status, 0, rotatePlanJson.stderr || rotatePlanJson.stdout);
  const rotatePlanBody = JSON.parse(rotatePlanJson.stdout);
  assert.equal(rotatePlanBody.command, "selfhost:rotate-plan");
  assert.equal(rotatePlanBody.profile, "platform");
  assert.equal(rotatePlanBody.ok, true);
  assert.ok(rotatePlanBody.generated_at);
  assert.equal(rotatePlanBody.env_path, "repos/platform/deploy/platform/.env");
  assert.ok(Array.isArray(rotatePlanBody.steps));
  assert.match(rotatePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /backup-plan/);
  assert.match(rotatePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:rotate -- --profile platform/);
  assert.match(rotatePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /--confirm/);
  assert.match(rotatePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:down/);
  assert.match(rotatePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:smoke/);
  assert.match(rotatePlanBody.next, /selfhost:rotate -- --profile platform/);
  assert.ok(Array.isArray(rotatePlanBody.notes));
  assert.match(rotatePlanBody.notes.join("\n"), /plan-only/);
  assert.match(rotatePlanBody.notes.join("\n"), /does not rotate secrets/);
  assert.ok(!rotatePlanJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const backupPlan = run(tmpRoot, ["backup-plan"]);
  assert.equal(backupPlan.status, 0, backupPlan.stderr || backupPlan.stdout);
  assert.match(backupPlan.stdout, /This command prints a plan only/);

  const backupPlanJson = run(tmpRoot, ["backup-plan", "--json"]);
  assert.equal(backupPlanJson.status, 0, backupPlanJson.stderr || backupPlanJson.stdout);
  const backupPlanBody = JSON.parse(backupPlanJson.stdout);
  assert.equal(backupPlanBody.command, "selfhost:backup-plan");
  assert.equal(backupPlanBody.profile, "platform");
  assert.equal(backupPlanBody.ok, true);
  assert.ok(backupPlanBody.generated_at);
  assert.match(backupPlanBody.backup_dir, /^backups\/selfhost\/platform\//);
  assert.equal(backupPlanBody.env_path, "repos/platform/deploy/platform/.env");
  assert.ok(Array.isArray(backupPlanBody.steps));
  assert.match(backupPlanBody.steps.map((item) => item.command || item.detail).join("\n"), /mkdir -p backups\/selfhost\/platform\//);
  assert.match(backupPlanBody.steps.map((item) => item.command || item.detail).join("\n"), /cp repos\/platform\/deploy\/platform\/\.env/);
  assert.match(backupPlanBody.steps.map((item) => item.command || item.detail).join("\n"), /pg_dump/);
  assert.match(backupPlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:config/);
  assert.match(backupPlanBody.next, /backup-validate/);
  assert.ok(Array.isArray(backupPlanBody.notes));
  assert.match(backupPlanBody.notes.join("\n"), /plan-only/);
  assert.ok(!backupPlanJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const restorePlan = run(tmpRoot, ["restore-plan", "--backup-dir", "backups/selfhost/platform/sample"]);
  assert.equal(restorePlan.status, 0, restorePlan.stderr || restorePlan.stdout);
  assert.match(restorePlan.stdout, /selfhost:restore-plan/);
  assert.match(restorePlan.stdout, /backups\/selfhost\/platform\/sample/);
  assert.match(restorePlan.stdout, /postgres\.sql/);
  assert.match(restorePlan.stdout, /selfhost:down/);
  assert.match(restorePlan.stdout, /selfhost:up/);
  assert.match(restorePlan.stdout, /selfhost:smoke/);
  assert.ok(!restorePlan.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const restorePlanJson = run(tmpRoot, ["restore-plan", "--backup-dir", "backups/selfhost/platform/sample", "--json"]);
  assert.equal(restorePlanJson.status, 0, restorePlanJson.stderr || restorePlanJson.stdout);
  const restorePlanBody = JSON.parse(restorePlanJson.stdout);
  assert.equal(restorePlanBody.command, "selfhost:restore-plan");
  assert.equal(restorePlanBody.profile, "platform");
  assert.equal(restorePlanBody.backup_dir, "backups/selfhost/platform/sample");
  assert.equal(restorePlanBody.ok, true);
  assert.ok(Array.isArray(restorePlanBody.steps));
  assert.match(restorePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:down/);
  assert.match(restorePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /postgres\.sql/);
  assert.match(restorePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:up/);
  assert.match(restorePlanBody.steps.map((item) => item.command || item.detail).join("\n"), /selfhost:smoke/);
  assert.ok(Array.isArray(restorePlanBody.notes));
  assert.match(restorePlanBody.notes.join("\n"), /does not stop services/);
  assert.ok(!restorePlanJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const backupDir = path.join(tmpRoot, "backups/selfhost/platform/sample");
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, ".env"), fs.readFileSync(envPath, "utf8"), "utf8");
  fs.writeFileSync(path.join(backupDir, "postgres.sql"), "-- sample dump\n", "utf8");
  fs.writeFileSync(path.join(backupDir, "compose.config.txt"), "services: {}\n", "utf8");
  const backupValidate = run(tmpRoot, ["backup-validate", "--backup-dir", "backups/selfhost/platform/sample"]);
  assert.equal(backupValidate.status, 0, backupValidate.stderr || backupValidate.stdout);
  assert.match(backupValidate.stdout, /selfhost:backup-validate/);
  assert.match(backupValidate.stdout, /backup_dir=backups\/selfhost\/platform\/sample/);
  assert.match(backupValidate.stdout, /\[ok\] \.env present/);
  assert.match(backupValidate.stdout, /\[ok\] postgres\.sql present/);
  assert.match(backupValidate.stdout, /\[ok\] compose\.config\.txt present/);
  assert.match(backupValidate.stdout, /ready for restore-plan review/);
  assert.ok(!backupValidate.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const backupValidateJson = run(tmpRoot, ["backup-validate", "--backup-dir", "backups/selfhost/platform/sample", "--json"]);
  assert.equal(backupValidateJson.status, 0, backupValidateJson.stderr || backupValidateJson.stdout);
  const backupValidateBody = JSON.parse(backupValidateJson.stdout);
  assert.equal(backupValidateBody.command, "selfhost:backup-validate");
  assert.equal(backupValidateBody.profile, "platform");
  assert.equal(backupValidateBody.ok, true);
  assert.equal(backupValidateBody.backup_dir, "backups/selfhost/platform/sample");
  assert.equal(backupValidateBody.files.find((item) => item.name === ".env").status, "ok");
  assert.equal(backupValidateBody.files.find((item) => item.name === ".env").required, true);
  assert.equal(backupValidateBody.files.find((item) => item.name === "postgres.sql").status, "ok");
  assert.equal(backupValidateBody.files.find((item) => item.name === "compose.config.txt").required, false);
  assert.deepEqual(backupValidateBody.blockers, []);
  assert.match(backupValidateBody.next, /restore-plan/);
  assert.ok(Array.isArray(backupValidateBody.notes));
  assert.ok(!backupValidateJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const incompleteBackupDir = path.join(tmpRoot, "backups/selfhost/platform/incomplete");
  fs.mkdirSync(incompleteBackupDir, { recursive: true });
  fs.writeFileSync(path.join(incompleteBackupDir, ".env"), fs.readFileSync(envPath, "utf8"), "utf8");
  const incompleteBackupJson = run(tmpRoot, ["backup-validate", "--backup-dir", "backups/selfhost/platform/incomplete", "--json"]);
  assert.equal(incompleteBackupJson.status, 1, incompleteBackupJson.stderr || incompleteBackupJson.stdout);
  const incompleteBackupBody = JSON.parse(incompleteBackupJson.stdout);
  assert.equal(incompleteBackupBody.ok, false);
  assert.equal(incompleteBackupBody.files.find((item) => item.name === "postgres.sql").status, "missing");
  assert.equal(incompleteBackupBody.files.find((item) => item.name === "compose.config.txt").status, "missing");
  assert.equal(incompleteBackupBody.files.find((item) => item.name === "compose.config.txt").required, false);
  assert.match(incompleteBackupBody.blockers.join("\n"), /postgres\.sql missing/);
  assert.ok(!incompleteBackupJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const opsReportPath = path.join(tmpRoot, "exports/selfhost/platform/ops-report.md");
  const opsReport = run(tmpRoot, ["ops-report", "--output", opsReportPath]);
  assert.equal(opsReport.status, 0, opsReport.stderr || opsReport.stdout);
  assert.match(opsReport.stdout, /selfhost:ops-report/);
  assert.match(opsReport.stdout, /exports\/selfhost\/platform\/ops-report\.md/);
  assert.ok(fs.existsSync(opsReportPath), "ops report should be written");
  const opsReportText = fs.readFileSync(opsReportPath, "utf8");
  assert.match(opsReportText, /# Selfhost Ops Report/);
  assert.match(opsReportText, /profile: platform/);
  assert.match(opsReportText, /Platform API/);
  assert.match(opsReportText, /## Ports/);
  assert.match(opsReportText, /8080: platform-api/);
  assert.match(opsReportText, /5432: postgres/);
  assert.match(opsReportText, /selfhost:security-review/);
  assert.match(opsReportText, /selfhost:backup-validate/);
  assert.match(opsReportText, /selfhost:restore-plan/);
  assert.match(opsReportText, /TOKEN_SECRET: set/);
  assert.ok(!opsReport.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!opsReportText.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const opsReportJson = run(tmpRoot, ["ops-report", "--json"]);
  assert.equal(opsReportJson.status, 0, opsReportJson.stderr || opsReportJson.stdout);
  const opsReportBody = JSON.parse(opsReportJson.stdout);
  assert.equal(opsReportBody.command, "selfhost:ops-report");
  assert.equal(opsReportBody.profile, "platform");
  assert.ok(opsReportBody.generated_at);
  assert.equal(opsReportBody.deploy_dir, "repos/platform/deploy/platform");
  assert.equal(opsReportBody.env_path, "repos/platform/deploy/platform/.env");
  assert.equal(opsReportBody.env_status, "present");
  assert.ok(Array.isArray(opsReportBody.urls));
  assert.equal(opsReportBody.urls.find((item) => item.label === "Platform API").url, "http://127.0.0.1:8080");
  assert.ok(Array.isArray(opsReportBody.ports));
  assert.equal(opsReportBody.ports.find((item) => item.port === "8080").service, "platform-api");
  assert.ok(Array.isArray(opsReportBody.secret_hygiene));
  assert.equal(opsReportBody.secret_hygiene.find((item) => item.key === "TOKEN_SECRET").status, "set");
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:preflight/);
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:security-review/);
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:backup-plan/);
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:backup-validate/);
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:restore-plan/);
  assert.match(opsReportBody.operator_commands.join("\n"), /selfhost:rotate-plan/);
  assert.ok(Array.isArray(opsReportBody.notes));
  assert.match(opsReportBody.notes.join("\n"), /does not print secret values/);
  assert.ok(!opsReportJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const urls = run(tmpRoot, ["urls"]);
  assert.equal(urls.status, 0, urls.stderr || urls.stdout);
  assert.match(urls.stdout, /selfhost:urls/);
  assert.match(urls.stdout, /profile=platform/);
  assert.match(urls.stdout, /Platform API/);
  assert.match(urls.stdout, /http:\/\/127\.0\.0\.1:8080/);
  assert.ok(!urls.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const urlsJson = run(tmpRoot, ["urls", "--json"]);
  assert.equal(urlsJson.status, 0, urlsJson.stderr || urlsJson.stdout);
  const urlsBody = JSON.parse(urlsJson.stdout);
  assert.equal(urlsBody.command, "selfhost:urls");
  assert.equal(urlsBody.profile, "platform");
  assert.ok(urlsBody.generated_at);
  assert.equal(urlsBody.deploy_dir, "repos/platform/deploy/platform");
  assert.equal(urlsBody.env_path, "repos/platform/deploy/platform/.env");
  assert.equal(urlsBody.env_status, "present");
  assert.ok(Array.isArray(urlsBody.urls));
  assert.equal(urlsBody.urls.find((item) => item.label === "Platform API").url, "http://127.0.0.1:8080");
  assert.ok(Array.isArray(urlsBody.notes));
  assert.match(urlsBody.notes.join("\n"), /does not probe the network/);
  assert.ok(!urlsJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const ports = run(tmpRoot, ["ports"]);
  assert.equal(ports.status, 0, ports.stderr || ports.stdout);
  assert.match(ports.stdout, /selfhost:ports/);
  assert.match(ports.stdout, /profile=platform/);
  assert.match(ports.stdout, /8080/);
  assert.match(ports.stdout, /platform-api/);
  assert.match(ports.stdout, /5432/);
  assert.match(ports.stdout, /postgres/);
  assert.ok(!ports.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const portsJson = run(tmpRoot, ["ports", "--json"]);
  assert.equal(portsJson.status, 0, portsJson.stderr || portsJson.stdout);
  const portsBody = JSON.parse(portsJson.stdout);
  assert.equal(portsBody.command, "selfhost:ports");
  assert.equal(portsBody.profile, "platform");
  assert.ok(portsBody.generated_at);
  assert.equal(portsBody.deploy_dir, "repos/platform/deploy/platform");
  assert.equal(portsBody.env_path, "repos/platform/deploy/platform/.env");
  assert.equal(portsBody.env_status, "present");
  assert.ok(Array.isArray(portsBody.ports));
  assert.deepEqual(
    portsBody.ports.map((item) => item.port),
    ["5432", "8080"]
  );
  assert.equal(portsBody.ports.find((item) => item.port === "8080").service, "platform-api");
  assert.ok(Array.isArray(portsBody.notes));
  assert.match(portsBody.notes.join("\n"), /does not bind ports/);
  assert.ok(!portsJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const plan = run(tmpRoot, ["plan"]);
  assert.equal(plan.status, 0, plan.stderr || plan.stdout);
  assert.match(plan.stdout, /selfhost:plan/);
  assert.match(plan.stdout, /profile=platform/);
  assert.match(plan.stdout, /deploy_dir=repos\/platform\/deploy\/platform/);
  assert.match(plan.stdout, /Services:/);
  assert.match(plan.stdout, /platform-api/);
  assert.match(plan.stdout, /URLs:/);
  assert.match(plan.stdout, /Platform API/);
  assert.match(plan.stdout, /Safety checks:/);
  assert.match(plan.stdout, /selfhost:init/);
  assert.ok(!plan.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const planJson = run(tmpRoot, ["plan", "--json"]);
  assert.equal(planJson.status, 0, planJson.stderr || planJson.stdout);
  const planBody = JSON.parse(planJson.stdout);
  assert.equal(planBody.command, "selfhost:plan");
  assert.equal(planBody.profile, "platform");
  assert.ok(planBody.generated_at);
  assert.equal(planBody.purpose, "private platform control plane");
  assert.equal(planBody.deploy_dir, "repos/platform/deploy/platform");
  assert.equal(planBody.env_path, "repos/platform/deploy/platform/.env");
  assert.ok(Array.isArray(planBody.services));
  assert.equal(planBody.services.find((item) => item.name === "platform-api").role, "control-plane API for catalog, tokens, requests, metrics");
  assert.ok(Array.isArray(planBody.urls));
  assert.equal(planBody.urls.find((item) => item.label === "Platform API").url, "http://127.0.0.1:8080");
  assert.ok(Array.isArray(planBody.safety_checks));
  assert.match(planBody.safety_checks.join("\n"), /selfhost:init/);
  assert.match(planBody.safety_checks.join("\n"), /selfhost:preflight/);
  assert.match(planBody.safety_checks.join("\n"), /never prints secret values/);
  assert.ok(Array.isArray(planBody.notes));
  assert.match(planBody.notes.join("\n"), /read-only/);
  assert.ok(!planJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const fakeDockerBin = writeFakeDocker(tmpRoot);
  const statusJson = run(tmpRoot, ["status", "--json"], {
    env: {
      ...process.env,
      PATH: `${fakeDockerBin}${path.delimiter}${process.env.PATH || ""}`
    }
  });
  assert.ok([0, 1].includes(statusJson.status), statusJson.stderr || statusJson.stdout);
  const statusBody = JSON.parse(statusJson.stdout);
  assert.equal(statusBody.command, "selfhost:status");
  assert.equal(statusBody.profile, "platform");
  assert.equal(statusBody.compose.ok, true);
  assert.equal(statusBody.compose.exit_code, 0);
  assert.equal(statusBody.compose.services[0].Service, "platform-api");
  assert.equal(statusBody.secret_hygiene.find((item) => item.key === "PLATFORM_ADMIN_API_KEY").status, "set");
  assert.ok(Array.isArray(statusBody.health));
  const statusHealth = statusBody.health.find((item) => item.name === "platform-api");
  assert.equal(typeof statusHealth.ok, "boolean");
  assert.equal(statusHealth.url, "http://127.0.0.1:8080/healthz");
  assert.equal(statusBody.ok, statusBody.compose.ok && statusBody.secret_hygiene.every((item) => item.ok) && statusBody.health.every((item) => item.ok));
  if (!statusBody.ok) {
    assert.ok(statusBody.blockers.length > 0);
  }
  assert.ok(Array.isArray(statusBody.notes));
  assert.match(statusBody.notes.join("\n"), /does not print secret values/);
  assert.ok(!statusJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const profiles = run(tmpRoot, ["profiles"]);
  assert.equal(profiles.status, 0, profiles.stderr || profiles.stdout);
  assert.match(profiles.stdout, /selfhost:profiles/);
  assert.match(profiles.stdout, /platform/);
  assert.match(profiles.stdout, /repos\/platform\/deploy\/platform/);
  assert.match(profiles.stdout, /public-stack/);
  assert.match(profiles.stdout, /repos\/platform\/deploy\/public-stack/);
  assert.match(profiles.stdout, /all-in-one/);
  assert.match(profiles.stdout, /repos\/platform\/deploy\/all-in-one/);
  assert.match(profiles.stdout, /services=2/);
  assert.match(profiles.stdout, /ports=5432,8080/);
  assert.match(profiles.stdout, /corepack pnpm run selfhost:doctor -- --profile public-stack/);
  assert.ok(!profiles.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const profilesJson = run(tmpRoot, ["profiles", "--json"]);
  assert.equal(profilesJson.status, 0, profilesJson.stderr || profilesJson.stdout);
  const profilesBody = JSON.parse(profilesJson.stdout);
  assert.equal(profilesBody.command, "selfhost:profiles");
  assert.ok(profilesBody.generated_at);
  assert.ok(Array.isArray(profilesBody.profiles));
  assert.equal(profilesBody.profiles.length, 3);
  assert.equal(profilesBody.profiles.find((item) => item.profile === "platform").deploy_dir, "repos/platform/deploy/platform");
  assert.equal(profilesBody.profiles.find((item) => item.profile === "platform").services.length, 2);
  assert.deepEqual(
    profilesBody.profiles.find((item) => item.profile === "platform").ports.map((item) => item.port),
    ["5432", "8080"]
  );
  assert.equal(
    profilesBody.profiles.find((item) => item.profile === "public-stack").next,
    "corepack pnpm run selfhost:doctor -- --profile public-stack"
  );
  assert.ok(!profilesJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const quickstart = run(tmpRoot, ["quickstart"]);
  assert.equal(quickstart.status, 0, quickstart.stderr || quickstart.stdout);
  assert.match(quickstart.stdout, /selfhost:quickstart/);
  assert.match(quickstart.stdout, /profile=platform/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:profiles/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:doctor/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:init/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:summary/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:preflight/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:up/);
  assert.match(quickstart.stdout, /corepack pnpm run selfhost:smoke/);
  assert.ok(!quickstart.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const quickstartJson = run(tmpRoot, ["quickstart", "--json"]);
  assert.equal(quickstartJson.status, 0, quickstartJson.stderr || quickstartJson.stdout);
  const quickstartBody = JSON.parse(quickstartJson.stdout);
  assert.equal(quickstartBody.command, "selfhost:quickstart");
  assert.equal(quickstartBody.profile, "platform");
  assert.ok(quickstartBody.generated_at);
  assert.ok(Array.isArray(quickstartBody.commands));
  assert.equal(quickstartBody.commands[0].command, "corepack pnpm run selfhost:profiles");
  assert.match(quickstartBody.commands.map((item) => item.command).join("\n"), /corepack pnpm run selfhost:init/);
  assert.match(quickstartBody.commands.map((item) => item.command).join("\n"), /corepack pnpm run selfhost:ops-report/);
  assert.ok(Array.isArray(quickstartBody.safety));
  assert.ok(!quickstartJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const summary = run(tmpRoot, ["summary"]);
  assert.equal(summary.status, 0, summary.stderr || summary.stdout);
  assert.match(summary.stdout, /selfhost:summary/);
  assert.match(summary.stdout, /profile=platform/);
  assert.match(summary.stdout, /deploy_dir=repos\/platform\/deploy\/platform/);
  assert.match(summary.stdout, /## URLs/);
  assert.match(summary.stdout, /Platform API/);
  assert.match(summary.stdout, /## Ports/);
  assert.match(summary.stdout, /8080: platform-api/);
  assert.match(summary.stdout, /## Secret hygiene/);
  assert.match(summary.stdout, /TOKEN_SECRET: set/);
  assert.match(summary.stdout, /## Next commands/);
  assert.match(summary.stdout, /selfhost:preflight/);
  assert.match(summary.stdout, /selfhost:ops-report/);
  assert.ok(!summary.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const summaryJson = run(tmpRoot, ["summary", "--json"]);
  assert.equal(summaryJson.status, 0, summaryJson.stderr || summaryJson.stdout);
  const summaryBody = JSON.parse(summaryJson.stdout);
  assert.equal(summaryBody.command, "selfhost:summary");
  assert.equal(summaryBody.profile, "platform");
  assert.ok(summaryBody.generated_at);
  assert.equal(summaryBody.deploy_dir, "repos/platform/deploy/platform");
  assert.equal(summaryBody.env_status, "present");
  assert.ok(Array.isArray(summaryBody.urls));
  assert.ok(Array.isArray(summaryBody.ports));
  assert.equal(summaryBody.ports.find((item) => item.port === "8080").service, "platform-api");
  assert.ok(Array.isArray(summaryBody.secret_hygiene));
  assert.equal(summaryBody.secret_hygiene.find((item) => item.key === "TOKEN_SECRET").status, "set");
  assert.match(summaryBody.next_commands.join("\n"), /selfhost:preflight/);
  assert.match(summaryBody.next_commands.join("\n"), /selfhost:ops-report/);
  assert.ok(!summaryJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const readiness = run(tmpRoot, ["readiness"]);
  assert.equal(readiness.status, 0, readiness.stderr || readiness.stdout);
  assert.match(readiness.stdout, /selfhost:readiness/);
  assert.match(readiness.stdout, /profile=platform/);
  assert.match(readiness.stdout, /## Deployment readiness/);
  assert.match(readiness.stdout, /\[ok\] profile files/);
  assert.match(readiness.stdout, /\[ok\] env file/);
  assert.match(readiness.stdout, /\[ok\] secret hygiene/);
  assert.match(readiness.stdout, /## Declared ports/);
  assert.match(readiness.stdout, /8080: platform-api/);
  assert.match(readiness.stdout, /## Next commands/);
  assert.match(readiness.stdout, /selfhost:preflight/);
  assert.match(readiness.stdout, /selfhost:up/);
  assert.match(readiness.stdout, /selfhost:smoke/);
  assert.ok(!readiness.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const readinessJson = run(tmpRoot, ["readiness", "--json"]);
  assert.equal(readinessJson.status, 0, readinessJson.stderr || readinessJson.stdout);
  const readinessBody = JSON.parse(readinessJson.stdout);
  assert.equal(readinessBody.mode, "profile");
  assert.equal(readinessBody.profile, "platform");
  assert.equal(readinessBody.ok, true);
  assert.deepEqual(readinessBody.blockers, []);
  assert.equal(readinessBody.next, "corepack pnpm run selfhost:readiness");
  assert.ok(readinessBody.generated_at);
  assert.ok(!readinessJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const doctor = run(tmpRoot, ["doctor"]);
  assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
  assert.match(doctor.stdout, /selfhost:doctor/);
  assert.match(doctor.stdout, /\[ok\] profile deploy dir/);
  assert.match(doctor.stdout, /\[ok\] \.env\.example/);
  assert.match(doctor.stdout, /\[ok\] docker-compose\.yml/);
  assert.match(doctor.stdout, /\[ok\] secret hygiene/);
  assert.match(doctor.stdout, /corepack pnpm run selfhost:summary/);
  assert.ok(!doctor.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const doctorJson = run(tmpRoot, ["doctor", "--json"]);
  assert.equal(doctorJson.status, 0, doctorJson.stderr || doctorJson.stdout);
  const doctorBody = JSON.parse(doctorJson.stdout);
  assert.equal(doctorBody.command, "selfhost:doctor");
  assert.equal(doctorBody.profile, "platform");
  assert.equal(doctorBody.ok, true);
  assert.ok(doctorBody.generated_at);
  assert.ok(Array.isArray(doctorBody.local_tools));
  assert.equal(doctorBody.local_tools.find((item) => item.label === "node runtime").status, "ok");
  assert.equal(doctorBody.local_tools.find((item) => item.label === "docker cli").blocking, false);
  assert.ok(Array.isArray(doctorBody.profile_files));
  assert.equal(doctorBody.profile_files.find((item) => item.label === ".env").status, "ok");
  assert.ok(Array.isArray(doctorBody.secret_hygiene));
  assert.equal(doctorBody.secret_hygiene.find((item) => item.key === "TOKEN_SECRET").status, "set");
  assert.match(doctorBody.next_commands.join("\n"), /selfhost:summary/);
  assert.ok(Array.isArray(doctorBody.notes));
  assert.match(doctorBody.notes.join("\n"), /does not probe the network/);
  assert.ok(!doctorJson.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

  const rotatedEnv = readEnv(envPath);
  await withAuditServer(rotatedEnv.get("PLATFORM_ADMIN_API_KEY") || "", async (auditBaseUrl) => {
    const exportPath = path.join(tmpRoot, "exports/audit/platform/test-audit.json");
    const auditExport = await runAsync(tmpRoot, [
      "audit-export",
      "--audit-base-url",
      auditBaseUrl,
      "--limit",
      "5",
      "--output",
      exportPath
    ]);
    assert.equal(auditExport.status, 0, auditExport.stderr || auditExport.stdout);
    assert.match(auditExport.stdout, /selfhost:audit-export/);
    assert.match(auditExport.stdout, /items=1/);
    assert.ok(!auditExport.stdout.includes(rotatedEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
    const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    assert.equal(exported.profile, "platform");
    assert.equal(exported.body.items[0].action, "security.reviewed");
  });

  const publicStack = writeMinimalPublicStackProfile(tmpRoot);
  const publicInit = run(tmpRoot, ["init", "--profile", "public-stack"]);
  assert.equal(publicInit.status, 0, publicInit.stderr || publicInit.stdout);
  assert.match(publicInit.stdout, /PUBLIC_SITE_ADDRESS still points at localhost/);

  const unsafePreflight = run(tmpRoot, ["preflight", "--profile", "public-stack"]);
  assert.equal(unsafePreflight.status, 1, unsafePreflight.stderr || unsafePreflight.stdout);
  assert.match(unsafePreflight.stdout, /PUBLIC_SITE_ADDRESS/);
  assert.match(unsafePreflight.stdout, /localhost/);
  const publicEnv = readEnv(publicStack.envPath);
  assert.ok(!unsafePreflight.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafePreflight.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const unsafePreflightJson = run(tmpRoot, ["preflight", "--profile", "public-stack", "--json"]);
  assert.equal(unsafePreflightJson.status, 1, unsafePreflightJson.stderr || unsafePreflightJson.stdout);
  const unsafePreflightBody = JSON.parse(unsafePreflightJson.stdout);
  assert.equal(unsafePreflightBody.command, "selfhost:preflight");
  assert.equal(unsafePreflightBody.profile, "public-stack");
  assert.equal(unsafePreflightBody.ok, false);
  assert.ok(Array.isArray(unsafePreflightBody.secret_hygiene));
  assert.equal(
    unsafePreflightBody.secret_hygiene.find((item) => item.key === "PUBLIC_SITE_ADDRESS").ok,
    false
  );
  assert.equal(unsafePreflightBody.compose_config.status, "ok");
  assert.match(unsafePreflightBody.blockers.join("\n"), /PUBLIC_SITE_ADDRESS/);
  assert.ok(Array.isArray(unsafePreflightBody.routes));
  assert.ok(Array.isArray(unsafePreflightBody.notes));
  assert.ok(!unsafePreflightJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafePreflightJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const unsafeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
  assert.equal(unsafeReview.status, 1, unsafeReview.stderr || unsafeReview.stdout);
  assert.match(unsafeReview.stdout, /selfhost:security-review/);
  assert.match(unsafeReview.stdout, /PUBLIC_SITE_ADDRESS/);
  assert.match(unsafeReview.stdout, /backup-plan/);
  assert.match(unsafeReview.stdout, /rotate-plan/);
  assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const unsafeReviewJson = run(tmpRoot, ["security-review", "--profile", "public-stack", "--json"]);
  assert.equal(unsafeReviewJson.status, 1, unsafeReviewJson.stderr || unsafeReviewJson.stdout);
  const unsafeReviewBody = JSON.parse(unsafeReviewJson.stdout);
  assert.equal(unsafeReviewBody.command, "selfhost:security-review");
  assert.equal(unsafeReviewBody.profile, "public-stack");
  assert.equal(unsafeReviewBody.ok, false);
  assert.equal(unsafeReviewBody.compose_config.status, "ok");
  assert.equal(
    unsafeReviewBody.secret_hygiene.find((item) => item.key === "PUBLIC_SITE_ADDRESS").ok,
    false
  );
  assert.equal(unsafeReviewBody.public_route_contract.ok, true);
  assert.match(JSON.stringify(unsafeReviewBody.public_route_contract.routes), /\/console\//);
  assert.match(unsafeReviewBody.blockers.join("\n"), /PUBLIC_SITE_ADDRESS/);
  assert.match(unsafeReviewBody.operational_prerequisites.map((item) => item.command).join("\n"), /backup-plan/);
  assert.match(unsafeReviewBody.operational_prerequisites.map((item) => item.command).join("\n"), /rotate-plan/);
  assert.ok(Array.isArray(unsafeReviewBody.notes));
  assert.ok(!unsafeReviewJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafeReviewJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const unsafeDoctor = run(tmpRoot, ["doctor", "--profile", "public-stack"]);
  assert.equal(unsafeDoctor.status, 1, unsafeDoctor.stderr || unsafeDoctor.stdout);
  assert.match(unsafeDoctor.stdout, /selfhost:doctor/);
  assert.match(unsafeDoctor.stdout, /PUBLIC_SITE_ADDRESS/);
  assert.match(unsafeDoctor.stdout, /corepack pnpm run selfhost:init -- --profile public-stack/);
  assert.ok(!unsafeDoctor.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafeDoctor.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const publicQuickstart = run(tmpRoot, ["quickstart", "--profile", "public-stack"]);
  assert.equal(publicQuickstart.status, 0, publicQuickstart.stderr || publicQuickstart.stdout);
  assert.match(publicQuickstart.stdout, /profile=public-stack/);
  assert.match(publicQuickstart.stdout, /corepack pnpm run selfhost:doctor -- --profile public-stack/);
  assert.match(publicQuickstart.stdout, /corepack pnpm run selfhost:ports -- --profile public-stack/);
  assert.match(publicQuickstart.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
  assert.match(publicQuickstart.stdout, /corepack pnpm run selfhost:ops-report -- --profile public-stack/);
  assert.match(publicQuickstart.stdout, /corepack pnpm run published-image:smoke -- --image-tag latest/);
  assert.ok(!publicQuickstart.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!publicQuickstart.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const publicQuickstartJson = run(tmpRoot, ["quickstart", "--profile", "public-stack", "--json"]);
  assert.equal(publicQuickstartJson.status, 0, publicQuickstartJson.stderr || publicQuickstartJson.stdout);
  const publicQuickstartBody = JSON.parse(publicQuickstartJson.stdout);
  assert.equal(publicQuickstartBody.profile, "public-stack");
  assert.match(
    publicQuickstartBody.commands.map((item) => item.command).join("\n"),
    /corepack pnpm run selfhost:security-review -- --profile public-stack/
  );
  assert.match(publicQuickstartBody.commands.map((item) => item.command).join("\n"), /operator:onboarding:check/);
  assert.ok(!publicQuickstartJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!publicQuickstartJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const unsafeReadiness = run(tmpRoot, ["readiness", "--profile", "public-stack"]);
  assert.equal(unsafeReadiness.status, 1, unsafeReadiness.stderr || unsafeReadiness.stdout);
  assert.match(unsafeReadiness.stdout, /selfhost:readiness/);
  assert.match(unsafeReadiness.stdout, /profile=public-stack/);
  assert.match(unsafeReadiness.stdout, /\[fail\] public origin/);
  assert.match(unsafeReadiness.stdout, /localhost/);
  assert.match(unsafeReadiness.stdout, /selfhost:security-review -- --profile public-stack/);
  assert.ok(!unsafeReadiness.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafeReadiness.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  writeMinimalAllInOneProfile(tmpRoot);
  const readinessAll = run(tmpRoot, ["readiness", "--all"]);
  assert.equal(readinessAll.status, 1, readinessAll.stderr || readinessAll.stdout);
  assert.match(readinessAll.stdout, /selfhost:readiness/);
  assert.match(readinessAll.stdout, /mode=all/);
  assert.match(readinessAll.stdout, /platform: ok/);
  assert.match(readinessAll.stdout, /public-stack: fail/);
  assert.match(readinessAll.stdout, /all-in-one: fail/);
  assert.match(readinessAll.stdout, /PUBLIC_SITE_ADDRESS/);
  assert.match(readinessAll.stdout, /all-in-one: fail[\s\S]*env file missing/);
  assert.match(readinessAll.stdout, /corepack pnpm run selfhost:readiness -- --profile public-stack/);
  assert.ok(!readinessAll.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!readinessAll.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const readinessAllJson = run(tmpRoot, ["readiness", "--all", "--json"]);
  assert.equal(readinessAllJson.status, 1, readinessAllJson.stderr || readinessAllJson.stdout);
  const readinessAllBody = JSON.parse(readinessAllJson.stdout);
  assert.equal(readinessAllBody.mode, "all");
  assert.equal(readinessAllBody.ok, false);
  assert.ok(readinessAllBody.generated_at);
  assert.ok(Array.isArray(readinessAllBody.profiles));
  assert.equal(readinessAllBody.profiles.find((item) => item.profile === "platform").ok, true);
  assert.equal(readinessAllBody.profiles.find((item) => item.profile === "public-stack").ok, false);
  assert.equal(readinessAllBody.profiles.find((item) => item.profile === "all-in-one").ok, false);
  assert.match(readinessAllBody.profiles.find((item) => item.profile === "public-stack").blockers.join("\n"), /PUBLIC_SITE_ADDRESS/);
  assert.match(readinessAllBody.profiles.find((item) => item.profile === "all-in-one").blockers.join("\n"), /env file missing/);
  assert.equal(
    readinessAllBody.profiles.find((item) => item.profile === "public-stack").next,
    "corepack pnpm run selfhost:readiness -- --profile public-stack"
  );
  assert.ok(!readinessAllJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!readinessAllJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const publicPorts = run(tmpRoot, ["ports", "--profile", "public-stack"]);
  assert.equal(publicPorts.status, 0, publicPorts.stderr || publicPorts.stdout);
  assert.match(publicPorts.stdout, /profile=public-stack/);
  assert.match(publicPorts.stdout, /80/);
  assert.match(publicPorts.stdout, /443/);
  assert.match(publicPorts.stdout, /edge/);

  const unsafeUp = run(tmpRoot, ["up", "--profile", "public-stack"]);
  assert.equal(unsafeUp.status, 1, unsafeUp.stderr || unsafeUp.stdout);
  assert.match(unsafeUp.stdout, /selfhost:preflight/);
  assert.match(unsafeUp.stdout, /preflight failed/);

  const safePublicText = fs
    .readFileSync(publicStack.envPath, "utf8")
    .replace("PUBLIC_SITE_ADDRESS=http://localhost", "PUBLIC_SITE_ADDRESS=https://call.example.com");
  fs.writeFileSync(publicStack.envPath, safePublicText, "utf8");
  const safePreflight = run(tmpRoot, ["preflight", "--profile", "public-stack"]);
  assert.equal(safePreflight.status, 0, safePreflight.stderr || safePreflight.stdout);
  assert.match(safePreflight.stdout, /Public routes/);
  assert.match(safePreflight.stdout, /https:\/\/call.example.com/);

  const safePreflightJson = run(tmpRoot, ["preflight", "--profile", "public-stack", "--json"]);
  assert.equal(safePreflightJson.status, 0, safePreflightJson.stderr || safePreflightJson.stdout);
  const safePreflightBody = JSON.parse(safePreflightJson.stdout);
  assert.equal(safePreflightBody.command, "selfhost:preflight");
  assert.equal(safePreflightBody.profile, "public-stack");
  assert.equal(safePreflightBody.ok, true);
  assert.equal(safePreflightBody.compose_config.status, "ok");
  assert.deepEqual(safePreflightBody.blockers, []);
  assert.match(JSON.stringify(safePreflightBody.routes), /https:\/\/call.example.com/);
  assert.ok(Array.isArray(safePreflightBody.notes));
  assert.ok(!safePreflightJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!safePreflightJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const safeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
  assert.equal(safeReview.status, 0, safeReview.stderr || safeReview.stdout);
  assert.match(safeReview.stdout, /Public route contract/);
  assert.match(safeReview.stdout, /\[ok\] Caddyfile route \/console\/\*/);
  assert.match(safeReview.stdout, /ready for public exposure review/);
  assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const safeReviewJson = run(tmpRoot, ["security-review", "--profile", "public-stack", "--json"]);
  assert.equal(safeReviewJson.status, 0, safeReviewJson.stderr || safeReviewJson.stdout);
  const safeReviewBody = JSON.parse(safeReviewJson.stdout);
  assert.equal(safeReviewBody.command, "selfhost:security-review");
  assert.equal(safeReviewBody.profile, "public-stack");
  assert.equal(safeReviewBody.ok, true);
  assert.equal(safeReviewBody.compose_config.status, "ok");
  assert.equal(safeReviewBody.public_route_contract.ok, true);
  assert.deepEqual(safeReviewBody.blockers, []);
  assert.match(JSON.stringify(safeReviewBody.public_route_contract.routes), /https:\/\/call.example.com\/console\//);
  assert.match(safeReviewBody.operational_prerequisites.map((item) => item.command).join("\n"), /smoke/);
  assert.ok(Array.isArray(safeReviewBody.notes));
  assert.ok(!safeReviewJson.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!safeReviewJson.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  const publicSmoke = run(tmpRoot, ["smoke", "--profile", "public-stack"]);
  assert.equal(publicSmoke.status, 1, publicSmoke.stderr || publicSmoke.stdout);
  assert.match(publicSmoke.stdout, /Public route contract/);
  assert.match(publicSmoke.stdout, /GET https:\/\/call.example.com\/platform\/healthz/);
  assert.match(publicSmoke.stdout, /GET https:\/\/call.example.com\/relay\/healthz/);
  assert.match(publicSmoke.stdout, /GET https:\/\/call.example.com\/gateway\/healthz/);
  assert.match(publicSmoke.stdout, /GET https:\/\/call.example.com\/console\//);
  assert.match(publicSmoke.stdout, /\[ok\] Caddyfile route \/console\/\*/);
  assert.ok(!publicSmoke.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!publicSmoke.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

  console.log("[selfhost-kit.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
