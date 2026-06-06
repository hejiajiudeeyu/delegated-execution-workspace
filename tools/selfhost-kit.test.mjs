import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SELFHOST_KIT = path.join(REPO_ROOT, "tools/selfhost-kit.mjs");

function run(cwd, args) {
  const result = spawnSync(process.execPath, [SELFHOST_KIT, ...args], {
    cwd,
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

  const backupPlan = run(tmpRoot, ["backup-plan"]);
  assert.equal(backupPlan.status, 0, backupPlan.stderr || backupPlan.stdout);
  assert.match(backupPlan.stdout, /This command prints a plan only/);

  const restorePlan = run(tmpRoot, ["restore-plan", "--backup-dir", "backups/selfhost/platform/sample"]);
  assert.equal(restorePlan.status, 0, restorePlan.stderr || restorePlan.stdout);
  assert.match(restorePlan.stdout, /selfhost:restore-plan/);
  assert.match(restorePlan.stdout, /backups\/selfhost\/platform\/sample/);
  assert.match(restorePlan.stdout, /postgres\.sql/);
  assert.match(restorePlan.stdout, /selfhost:down/);
  assert.match(restorePlan.stdout, /selfhost:up/);
  assert.match(restorePlan.stdout, /selfhost:smoke/);
  assert.ok(!restorePlan.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

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

  const ports = run(tmpRoot, ["ports"]);
  assert.equal(ports.status, 0, ports.stderr || ports.stdout);
  assert.match(ports.stdout, /selfhost:ports/);
  assert.match(ports.stdout, /profile=platform/);
  assert.match(ports.stdout, /8080/);
  assert.match(ports.stdout, /platform-api/);
  assert.match(ports.stdout, /5432/);
  assert.match(ports.stdout, /postgres/);
  assert.ok(!ports.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

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

  const doctor = run(tmpRoot, ["doctor"]);
  assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
  assert.match(doctor.stdout, /selfhost:doctor/);
  assert.match(doctor.stdout, /\[ok\] profile deploy dir/);
  assert.match(doctor.stdout, /\[ok\] \.env\.example/);
  assert.match(doctor.stdout, /\[ok\] docker-compose\.yml/);
  assert.match(doctor.stdout, /\[ok\] secret hygiene/);
  assert.match(doctor.stdout, /corepack pnpm run selfhost:summary/);
  assert.ok(!doctor.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

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

  const unsafeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
  assert.equal(unsafeReview.status, 1, unsafeReview.stderr || unsafeReview.stdout);
  assert.match(unsafeReview.stdout, /selfhost:security-review/);
  assert.match(unsafeReview.stdout, /PUBLIC_SITE_ADDRESS/);
  assert.match(unsafeReview.stdout, /backup-plan/);
  assert.match(unsafeReview.stdout, /rotate-plan/);
  assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

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

  const safeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
  assert.equal(safeReview.status, 0, safeReview.stderr || safeReview.stdout);
  assert.match(safeReview.stdout, /Public route contract/);
  assert.match(safeReview.stdout, /\[ok\] Caddyfile route \/console\/\*/);
  assert.match(safeReview.stdout, /ready for public exposure review/);
  assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
  assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));

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
