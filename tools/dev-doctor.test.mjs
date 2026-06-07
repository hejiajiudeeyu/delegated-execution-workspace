import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/dev-doctor.mjs");
const REQUIRED_ACTIONS = [
  "search_hotlines_brief",
  "search_hotlines_detailed",
  "read_hotline",
  "prepare_request",
  "send_request",
  "report_response"
];

function writeFile(root, relativePath, text, mode) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
  if (mode) {
    fs.chmodSync(fullPath, mode);
  }
}

function writeFakeBin(root, name, body) {
  writeFile(root, `bin/${name}`, `#!/usr/bin/env sh\n${body}\n`, 0o755);
}

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function address(server) {
  const value = server.address();
  assert.ok(value && typeof value === "object");
  return `http://127.0.0.1:${value.port}`;
}

async function makeServers() {
  const platform = await listen((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: req.url === "/healthz" }));
  });
  const supervisor = await listen((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ running: req.url === "/status" }));
  });
  const caller = await listen((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/healthz") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url === "/skills/caller/manifest") {
      res.end(JSON.stringify({ actions: REQUIRED_ACTIONS.map((name) => ({ name })) }));
      return;
    }
    if (req.url === "/skills/caller/search-hotlines-brief") {
      res.end(JSON.stringify({ items: [{ hotline_id: "local.delegated-execution.workspace-summary.v1" }] }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found" }));
  });
  const mcp = await listen((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: req.url === "/healthz" }));
  });
  const failingCallerSearch = await listen((req, res) => {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "search_failed" }));
  });
  return { platform, supervisor, caller, mcp, failingCallerSearch };
}

function closeServers(servers) {
  return Promise.all(
    Object.values(servers).map(
      (server) =>
        new Promise((resolve) => {
          server.closeAllConnections?.();
          server.close(resolve);
        })
    )
  );
}

function run(cwd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      cwd,
      env: {
        ...process.env,
        PLATFORM_ADMIN_API_KEY: "sk_admin_must_not_leak",
        ...env
      }
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`dev-doctor test command timed out: ${args.join(" ")}`));
    }, 10_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    });
  });
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-dev-doctor-test-"));
let servers;

try {
  servers = await makeServers();
  writeFakeBin(tmpRoot, "corepack", "echo corepack-fake-1.0");
  writeFakeBin(
    tmpRoot,
    "git",
    [
      "if [ \"$1\" = \"submodule\" ]; then",
      "  exit 0",
      "fi",
      "echo git-fake-1.0"
    ].join("\n")
  );
  writeFakeBin(
    tmpRoot,
    "docker",
    [
      "if [ \"$1\" = \"info\" ]; then",
      "  echo reachable",
      "  exit 0",
      "fi",
      "echo docker-fake-1.0"
    ].join("\n")
  );
  writeFile(tmpRoot, "repos/platform/deploy/platform/.env", "TOKEN_SECRET=test\n");

  const env = {
    PATH: `${path.join(tmpRoot, "bin")}:${process.env.PATH}`,
    DEV_DOCTOR_PLATFORM_HEALTH_URL: `${address(servers.platform)}/healthz`,
    DEV_DOCTOR_SUPERVISOR_STATUS_URL: `${address(servers.supervisor)}/status`,
    DEV_DOCTOR_CALLER_SKILL_HEALTH_URL: `${address(servers.caller)}/healthz`,
    DEV_DOCTOR_CALLER_SKILL_MANIFEST_URL: `${address(servers.caller)}/skills/caller/manifest`,
    DEV_DOCTOR_CALLER_SKILL_SEARCH_URL: `${address(servers.caller)}/skills/caller/search-hotlines-brief`,
    DEV_DOCTOR_MCP_HEALTH_URL: `${address(servers.mcp)}/healthz`
  };

  const doctorJson = await run(tmpRoot, ["--json"], env);
  assert.equal(doctorJson.status, 0, doctorJson.stderr || doctorJson.stdout);
  const body = JSON.parse(doctorJson.stdout);
  assert.equal(body.command, "dev:doctor");
  assert.equal(body.ok, true);
  assert.ok(body.generated_at);
  assert.ok(Array.isArray(body.checks));
  assert.ok(body.checks.find((item) => item.key === "node"));
  assert.ok(body.checks.find((item) => item.key === "caller_skill_six_action_manifest"));
  assert.ok(body.checks.find((item) => item.key === "example_hotline_available"));
  assert.deepEqual(body.blockers, []);
  assert.match(body.next_commands.join("\n"), /test:agent-e2e/);
  assert.ok(!doctorJson.stdout.includes("[ok]"));
  assert.ok(!doctorJson.stdout.includes("sk_admin_must_not_leak"));

  const failingJson = await run(tmpRoot, ["--json"], {
    ...env,
    DEV_DOCTOR_CALLER_SKILL_SEARCH_URL: `${address(servers.failingCallerSearch)}/search-hotlines-brief`
  });
  assert.equal(failingJson.status, 1, failingJson.stderr || failingJson.stdout);
  const failingBody = JSON.parse(failingJson.stdout);
  assert.equal(failingBody.command, "dev:doctor");
  assert.equal(failingBody.ok, false);
  assert.match(failingBody.blockers.join("\n"), /example hotline search/);
  assert.ok(!failingJson.stdout.includes("[fail]"));
  assert.ok(!failingJson.stdout.includes("sk_admin_must_not_leak"));

  console.log("[dev-doctor.test] ok");
} finally {
  if (servers) {
    await closeServers(servers);
  }
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
