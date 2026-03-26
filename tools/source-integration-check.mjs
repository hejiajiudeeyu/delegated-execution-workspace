import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const platformRoot = path.join(ROOT, "repos/platform");
const clientRoot = path.join(ROOT, "repos/client");
const relayDbPath = path.join(os.tmpdir(), "fourth-repo-relay.sqlite");
const platformEnvPath = path.join(platformRoot, "deploy/platform/.env");
const platformEnvExample = path.join(platformRoot, "deploy/platform/.env.example");

function run(cwd, command, args, extraEnv = {}, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    ...options
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function parseJsonFromCommandOutput(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnBackground(cwd, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  return {
    child,
    readOutput: () => output
  };
}

async function waitFor(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = spawnSync("curl", ["-sf", url], { encoding: "utf8" });
    if (res.status === 0) {
      return res.stdout.trim();
    }
    await sleep(1000);
  }
  throw new Error(`timeout waiting for ${url}`);
}

function cleanupOpsProcesses() {
  for (const pattern of [
    "node src/cli.js start",
    "apps/ops/src/cli.js start",
    "apps/buyer-controller/src/server.js",
    "buyer-controller/src/server.js",
    "apps/caller-controller/src/server.js",
    "caller-controller/src/server.js",
    "apps/seller-controller/src/server.js",
    "seller-controller/src/server.js",
    "apps/responder-controller/src/server.js",
    "responder-controller/src/server.js",
    "apps/transport-relay/src/server.js",
    "transport-relay/src/server.js"
  ]) {
    spawnSync("pkill", ["-f", pattern], { stdio: "ignore" });
  }

  for (const port of [8079, 8081, 8082, 8090]) {
    const listeners = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
    if (listeners.status !== 0 || !listeners.stdout.trim()) {
      continue;
    }
    for (const pid of listeners.stdout.trim().split(/\s+/)) {
      if (!pid) {
        continue;
      }
      spawnSync("kill", ["-TERM", pid], { stdio: "ignore" });
    }
  }
}

if (!fs.existsSync(platformEnvPath)) {
  fs.copyFileSync(platformEnvExample, platformEnvPath);
}
let envText = fs.readFileSync(platformEnvPath, "utf8");
envText = envText.replace(/^TOKEN_SECRET=.*$/m, "TOKEN_SECRET=fourth-repo-local-dev-secret");
envText = envText.replace(/^PLATFORM_ADMIN_API_KEY=.*$/m, "PLATFORM_ADMIN_API_KEY=sk_admin_local_dev");
fs.writeFileSync(platformEnvPath, envText, "utf8");

run(clientRoot, "npm", ["install"]);
run(platformRoot, "npm", ["install"]);
run(ROOT, "node", ["tools/sync-local-contracts.mjs"]);

cleanupOpsProcesses();
spawnSync("rm", ["-rf", path.join(os.homedir(), ".delexec")], { stdio: "ignore" });

const relay = spawnBackground(platformRoot, "node", ["apps/transport-relay/src/server.js"], {
  PORT: "8090",
  SERVICE_NAME: "transport-relay",
  RELAY_SQLITE_PATH: relayDbPath
});

try {
  run(platformRoot, "docker", [
    "compose",
    "-f",
    "deploy/platform/docker-compose.yml",
    "--env-file",
    "deploy/platform/.env",
    "down",
    "-v"
  ]);
} catch {}

run(platformRoot, "docker", [
  "compose",
  "-f",
  "deploy/platform/docker-compose.yml",
  "--env-file",
  "deploy/platform/.env",
  "up",
  "-d",
  "--build"
]);

await waitFor("http://127.0.0.1:8080/healthz");
await waitFor("http://127.0.0.1:8090/healthz").catch((error) => {
  if (relay.child.exitCode !== null) {
    process.stderr.write(relay.readOutput());
  }
  throw error;
});

const opsEnv = {
  TRANSPORT_TYPE: "relay_http",
  TRANSPORT_BASE_URL: "http://127.0.0.1:8090",
  PLATFORM_ADMIN_API_KEY: "sk_admin_local_dev",
  ADMIN_API_KEY: "sk_admin_local_dev"
};

run(clientRoot, "node", ["apps/ops/src/cli.js", "setup"], opsEnv);
run(clientRoot, "node", ["apps/ops/src/cli.js", "auth", "register", "--email", "integration@example.com", "--platform", "http://127.0.0.1:8080"], opsEnv);
run(clientRoot, "node", ["apps/ops/src/cli.js", "add-example-hotline"], opsEnv);
run(clientRoot, "node", ["apps/ops/src/cli.js", "submit-review"], opsEnv);
run(clientRoot, "node", ["apps/ops/src/cli.js", "enable-responder"], opsEnv);

const setupState = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".delexec/ops.config.json"), "utf8"));
const responderId = setupState.responder.responder_id;

run(ROOT, "node", ["tools/approve-example.mjs", responderId], {
  PLATFORM_API_KEY: "sk_admin_local_dev",
  PLATFORM_ADMIN_API_KEY: "sk_admin_local_dev"
});

const bootstrapOutput = run(clientRoot, "node", [
  "apps/ops/src/cli.js",
  "bootstrap",
  "--email",
  "integration@example.com",
  "--platform",
  "http://127.0.0.1:8080",
  "--text",
  "Summarize this request in one sentence."
], opsEnv);

if (!bootstrapOutput.includes("\"status\": \"SUCCEEDED\"")) {
  process.stderr.write(bootstrapOutput);
  throw new Error("source integration request did not succeed");
}

console.log("[source-integration-check] ok");

relay.child.kill("SIGTERM");
