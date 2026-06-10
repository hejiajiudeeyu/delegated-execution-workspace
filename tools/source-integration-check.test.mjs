import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/source-integration-check.mjs");
const INTEGRATION_PORTS = [8079, 8081, 8082, 8090, 8091, 8092];

function writeFile(root, relativePath, text, mode) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
  if (mode) {
    fs.chmodSync(fullPath, mode);
  }
}

function writePackage(root, relativeDir) {
  writeFile(root, path.join(relativeDir, "package.json"), '{"name":"fake","version":"0.0.0"}\n');
}

function portIsListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function assertPortsClosed(ports) {
  const openPorts = [];
  for (const port of ports) {
    if (await portIsListening(port)) {
      openPorts.push(port);
    }
  }
  assert.deepEqual(openPorts, [], `expected integration ports to be closed, found open: ${openPorts.join(", ")}`);
}

function killRecordedProcesses(pidFile) {
  if (!fs.existsSync(pidFile)) {
    return;
  }
  for (const raw of fs.readFileSync(pidFile, "utf8").split(/\s+/)) {
    const pid = Number(raw);
    if (!Number.isInteger(pid) || pid <= 0) {
      continue;
    }
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "source-integration-check-test-"));
const pidFile = path.join(tmpRoot, "fake-service-pids.txt");
const readyFile = path.join(tmpRoot, "fake-service-ready");

try {
  await assertPortsClosed(INTEGRATION_PORTS);

  writePackage(tmpRoot, "repos/client");
  writePackage(tmpRoot, "repos/platform");
  writeFile(
    tmpRoot,
    "repos/platform/deploy/platform/.env.example",
    "TOKEN_SECRET=change-me\nPLATFORM_ADMIN_API_KEY=sk_admin_change_me\n"
  );

  writeFile(
    tmpRoot,
    "fake-listener.mjs",
    `
import http from "node:http";
import fs from "node:fs";
const ports = process.argv.slice(2).map(Number);
const servers = [];
for (const port of ports) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: req.url === "/healthz" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  servers.push(server);
}
fs.writeFileSync(process.env.FAKE_READY_FILE, "ready\\n", "utf8");
process.on("SIGTERM", async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  process.exit(0);
});
setInterval(() => {}, 1000);
`.trimStart()
  );

  writeFile(
    tmpRoot,
    "fake-node.mjs",
    `
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const script = process.argv[2] || "";
const args = process.argv.slice(3);
const root = process.env.FAKE_WORKSPACE_ROOT;
const realNode = process.env.REAL_NODE;
const pidFile = process.env.FAKE_PID_FILE;
const readyFile = process.env.FAKE_READY_FILE;
const listener = path.join(root, "fake-listener.mjs");

function emit(value) {
  console.log(JSON.stringify(value, null, 2));
}

function writeOpsConfig() {
  const home = process.env.DELEXEC_HOME || path.join(process.env.HOME, ".delexec");
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(home, "ops.config.json"),
    JSON.stringify({ responder: { responder_id: "responder_fake" } }, null, 2),
    "utf8"
  );
}

if (script.endsWith("tools/sync-local-contracts.mjs")) {
  console.log("[sync-local-contracts] ok");
  process.exit(0);
}
if (script.endsWith("tools/approve-example.mjs")) {
  process.exit(0);
}
if (script.endsWith("apps/transport-relay/src/server.js")) {
  process.on("SIGTERM", () => process.exit(0));
  setInterval(() => {}, 1000);
} else if (script.endsWith("apps/ops/src/cli.js")) {
  const command = args[0];
  if (command === "setup") {
    writeOpsConfig();
    emit({ ok: true });
  } else if (command === "auth") {
    emit({ ok: true, contact_email: "integration@example.com", mode: "platform" });
  } else if (command === "add-example-hotline") {
    emit({ ok: true, hotline_id: "local.delegated-execution.workspace-summary.v1" });
  } else if (command === "submit-review") {
    emit({ ok: true, submitted: 1 });
  } else if (command === "enable-responder") {
    writeOpsConfig();
    emit({ ok: true, responder: { responder_id: "responder_fake" } });
  } else if (command === "bootstrap") {
    try { fs.rmSync(readyFile, { force: true }); } catch {}
    const child = spawn(realNode, [listener, "8079", "8081", "8082", "8090", "8091", "8092"], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, FAKE_READY_FILE: readyFile }
    });
    child.unref();
    fs.appendFileSync(pidFile, String(child.pid) + "\\n", "utf8");
    const deadline = Date.now() + 3000;
    while (!fs.existsSync(readyFile)) {
      if (Date.now() > deadline) {
        throw new Error("fake_listener_not_ready");
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    emit({ ok: true, status: "SUCCEEDED" });
  } else {
    emit({ ok: true });
  }
} else {
  process.exit(0);
}
`.trimStart()
  );

  writeFile(tmpRoot, "bin/node", '#!/usr/bin/env sh\nexec "$REAL_NODE" "$FAKE_NODE_IMPL" "$@"\n', 0o755);
  writeFile(tmpRoot, "bin/npm", "#!/usr/bin/env sh\necho npm must not run >&2\nexit 42\n", 0o755);
  writeFile(tmpRoot, "bin/corepack", "#!/usr/bin/env sh\necho \"$@\" >> \"$FAKE_COREPACK_LOG\"\nexit 0\n", 0o755);
  writeFile(tmpRoot, "bin/docker", "#!/usr/bin/env sh\necho \"$@\" >> \"$FAKE_DOCKER_LOG\"\nexit 0\n", 0o755);
  writeFile(tmpRoot, "bin/curl", "#!/usr/bin/env sh\nprintf 'ok\\n'\nexit 0\n", 0o755);
  writeFile(tmpRoot, "bin/pkill", "#!/usr/bin/env sh\nexit 0\n", 0o755);
  writeFile(tmpRoot, "bin/rm", "#!/usr/bin/env sh\nexit 0\n", 0o755);

  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: tmpRoot,
    encoding: "utf8",
    timeout: 10_000,
    env: {
      ...process.env,
      PATH: `${path.join(tmpRoot, "bin")}:${process.env.PATH}`,
      HOME: path.join(tmpRoot, "home"),
      REAL_NODE: process.execPath,
      FAKE_NODE_IMPL: path.join(tmpRoot, "fake-node.mjs"),
      FAKE_WORKSPACE_ROOT: tmpRoot,
      FAKE_PID_FILE: pidFile,
      FAKE_READY_FILE: readyFile,
      FAKE_COREPACK_LOG: path.join(tmpRoot, "corepack.log"),
      FAKE_DOCKER_LOG: path.join(tmpRoot, "docker.log")
    }
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[source-integration-check\] ok/);
  const corepackLog = fs.readFileSync(path.join(tmpRoot, "corepack.log"), "utf8");
  assert.match(corepackLog, /pnpm install --frozen-lockfile/);
  assert.match(corepackLog, /pnpm rebuild --pending/);
  await assertPortsClosed(INTEGRATION_PORTS);

  console.log("[source-integration-check.test] ok");
} finally {
  killRecordedProcesses(pidFile);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
