import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SELFHOST_KIT = path.join(REPO_ROOT, "tools/selfhost-kit.mjs");

function run(cwd, args) {
  const result = spawnSync(process.execPath, [SELFHOST_KIT, ...args], {
    cwd,
    encoding: "utf8"
  });
  return result;
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

  const safePublicText = fs
    .readFileSync(publicStack.envPath, "utf8")
    .replace("PUBLIC_SITE_ADDRESS=http://localhost", "PUBLIC_SITE_ADDRESS=https://call.example.com");
  fs.writeFileSync(publicStack.envPath, safePublicText, "utf8");
  const safePreflight = run(tmpRoot, ["preflight", "--profile", "public-stack"]);
  assert.equal(safePreflight.status, 0, safePreflight.stderr || safePreflight.stdout);
  assert.match(safePreflight.stdout, /Public routes/);
  assert.match(safePreflight.stdout, /https:\/\/call.example.com/);

  console.log("[selfhost-kit.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
