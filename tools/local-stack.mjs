#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, ".run", "local-stack");
const SERVICES = ["relay", "supervisor"];

function usage() {
  console.log(`Usage: node tools/local-stack.mjs <command> [--dry-run] [--service name] [--tail lines] [--keep-platform] [--json]

Commands:
  plan    Print the local stack boot order and managed processes
  up      Initialize and start platform, relay, client bootstrap, and supervisor
  status  Show managed process state and the next verification commands
  down    Stop managed relay/supervisor processes and platform compose profile
  logs    Print local-stack managed process logs; supports --service and --tail.
          With --json, prints safe log metadata only, not raw log lines.

Default service for logs: all`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] || "help",
    dryRun: false,
    service: "all",
    tail: 120,
    keepPlatform: false,
    json: false
  };
  for (let index = 3; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (value === "--keep-platform") {
      args.keepPlatform = true;
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--service") {
      args.service = argv[index + 1] || "all";
      index += 1;
      continue;
    }
    if (value.startsWith("--service=")) {
      args.service = value.slice("--service=".length);
      continue;
    }
    if (value === "--tail") {
      args.tail = Number(argv[index + 1] || 120);
      index += 1;
      continue;
    }
    if (value.startsWith("--tail=")) {
      args.tail = Number(value.slice("--tail=".length));
    }
  }
  if (args.service !== "all" && !SERVICES.includes(args.service)) {
    throw new Error(`unknown service ${args.service}; expected all, relay, or supervisor`);
  }
  if (!Number.isFinite(args.tail) || args.tail < 1) {
    args.tail = 120;
  }
  return args;
}

function rel(file) {
  return path.relative(ROOT, file);
}

function commandLine(command, args) {
  return [command, ...args].join(" ");
}

function pidPath(service) {
  return path.join(STATE_DIR, `${service}.pid`);
}

function logPath(service) {
  return path.join(STATE_DIR, `${service}.log`);
}

function printJson(data) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...data
      },
      null,
      2
    )
  );
}

function readPid(service) {
  try {
    const value = fs.readFileSync(pidPath(service), "utf8").trim();
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

function isAlive(pid) {
  if (!pid || !Number.isFinite(pid)) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runBlocking(label, command, args, { dryRun = false } = {}) {
  const line = commandLine(command, args);
  if (dryRun) {
    console.log(`[dry-run] ${line}`);
    return 0;
  }
  console.log(`[local-stack] ${label}: ${line}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env
  });
  return result.status || 0;
}

function startManaged(service, command, args, { dryRun = false } = {}) {
  const currentPid = readPid(service);
  if (isAlive(currentPid)) {
    console.log(`[local-stack] ${service}: already running pid=${currentPid}`);
    return 0;
  }
  const line = commandLine(command, args);
  if (dryRun) {
    console.log(`[dry-run] ${line}`);
    return 0;
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const out = fs.openSync(logPath(service), "a");
  const child = spawn(command, args, {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    env: process.env
  });
  child.unref();
  fs.writeFileSync(pidPath(service), `${child.pid}\n`, "utf8");
  fs.closeSync(out);
  console.log(`[local-stack] ${service}: started pid=${child.pid} log=${rel(logPath(service))}`);
  return 0;
}

function stopManaged(service, { dryRun = false } = {}) {
  const pid = readPid(service);
  if (dryRun) {
    console.log(`[dry-run] stop ${service}${pid ? ` pid=${pid}` : ""}`);
    return 0;
  }
  if (!pid) {
    console.log(`[local-stack] ${service}: no pid file`);
    return 0;
  }
  if (!isAlive(pid)) {
    console.log(`[local-stack] ${service}: stopped pid=${pid}`);
    return 0;
  }
  process.kill(pid, "SIGTERM");
  console.log(`[local-stack] ${service}: sent SIGTERM pid=${pid}`);
  return 0;
}

function planData() {
  return {
    command: "dev:local:plan",
    ok: true,
    state_dir: rel(STATE_DIR),
    steps: [
      "corepack pnpm run selfhost:up -- --profile platform",
      "corepack pnpm run dev:relay",
      "corepack pnpm run dev:client:bootstrap",
      "corepack pnpm run dev:client:supervisor",
      "corepack pnpm run dev:doctor",
      "corepack pnpm run test:agent-e2e",
      "corepack pnpm run mcp:golden-four"
    ],
    managed_services: SERVICES.map((service) => ({
      name: service,
      pid_file: rel(pidPath(service)),
      log: rel(logPath(service))
    })),
    notes: [
      "does not start services",
      "does not read or print secret values",
      "use dev:local:status -- --json after startup for runtime metadata"
    ]
  };
}

function printPlan() {
  const data = planData();
  console.log("[local-stack:plan] one-command local agent loop bootstrap");
  console.log(`1. ${data.steps[0]}`);
  console.log("2. corepack pnpm run dev:relay          # managed as relay");
  console.log(`3. ${data.steps[2]}`);
  console.log("4. corepack pnpm run dev:client:supervisor  # managed as supervisor");
  console.log("5. Verify with dev:doctor, test:agent-e2e, and mcp:golden-four");
  console.log(`state_dir=${data.state_dir}`);
}

function statusData() {
  return {
    command: "dev:local:status",
    ok: true,
    state_dir: rel(STATE_DIR),
    services: SERVICES.map((service) => {
      const pid = readPid(service);
      const running = isAlive(pid);
      return {
        name: service,
        running,
        pid: pid || null,
        log: rel(logPath(service))
      };
    }),
    verification: [
      "corepack pnpm run dev:doctor",
      "corepack pnpm run test:agent-e2e",
      "corepack pnpm run mcp:golden-four"
    ],
    notes: [
      "does not print secret values",
      "log files may contain sensitive local runtime output; use dev:local:logs -- --json for metadata-only log checks"
    ]
  };
}

function printStatus() {
  const data = statusData();
  console.log("[local-stack:status]");
  for (const service of data.services) {
    const state = service.running ? `running pid=${service.pid}` : "stopped";
    console.log(`- ${service.name}: ${state} log=${service.log}`);
  }
  console.log("\nVerification:");
  for (const command of data.verification) {
    console.log(`- ${command}`);
  }
}

function logEntriesData(serviceName, tail) {
  const services = serviceName === "all" ? SERVICES : [serviceName];
  return services.map((service) => {
    const file = logPath(service);
    const entry = {
      service,
      log: rel(file),
      exists: fs.existsSync(file),
      available_lines: 0,
      requested_tail: tail,
      printed_lines: 0
    };
    if (entry.exists) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      entry.available_lines = lines.filter((line, index) => line || index < lines.length - 1).length;
    }
    return entry;
  });
}

function logsData(serviceName, tail) {
  return {
    command: "dev:local:logs",
    ok: true,
    service: serviceName,
    tail,
    logs: logEntriesData(serviceName, tail),
    notes: [
      "does not print raw log lines because local agent and supervisor logs may contain sensitive values",
      "use text mode only in a private operator terminal when raw logs are needed"
    ]
  };
}

function printLogs(serviceName, tail) {
  const services = serviceName === "all" ? SERVICES : [serviceName];
  for (const service of services) {
    const file = logPath(service);
    console.log(`[local-stack:logs] ${service} ${rel(file)}`);
    if (!fs.existsSync(file)) {
      console.log("(no log file)");
      continue;
    }
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const printable = lines.filter((line, index) => line || index < lines.length - 1).slice(-tail);
    for (const line of printable) {
      console.log(line);
    }
  }
}

function up({ dryRun }) {
  console.log("[local-stack:up] bootstrap local agent loop");
  let status = runBlocking("platform", "node", ["tools/selfhost-kit.mjs", "up", "--profile", "platform"], { dryRun });
  if (status !== 0) return status;
  status = startManaged(
    "relay",
    "corepack",
    ["pnpm", "--dir", "repos/platform", "--filter", "@delexec/transport-relay", "run", "start"],
    { dryRun }
  );
  if (status !== 0) return status;
  status = runBlocking(
    "client bootstrap",
    "corepack",
    [
      "pnpm",
      "--dir",
      "repos/client",
      "--filter",
      "@delexec/ops",
      "exec",
      "node",
      "src/cli.js",
      "bootstrap",
      "--platform",
      "http://127.0.0.1:8080"
    ],
    { dryRun }
  );
  if (status !== 0) return status;
  status = startManaged(
    "supervisor",
    "corepack",
    ["pnpm", "--dir", "repos/client", "--filter", "@delexec/ops", "exec", "node", "src/cli.js", "start"],
    { dryRun }
  );
  if (status !== 0) return status;
  console.log("\nNext verification:");
  console.log("- corepack pnpm run dev:doctor");
  console.log("- corepack pnpm run test:agent-e2e");
  console.log("- corepack pnpm run mcp:golden-four");
  return 0;
}

function down({ dryRun, keepPlatform }) {
  console.log("[local-stack:down]");
  stopManaged("supervisor", { dryRun });
  stopManaged("relay", { dryRun });
  if (keepPlatform) {
    console.log("[local-stack] platform: keeping platform profile up");
    return 0;
  }
  return runBlocking("platform down", "node", ["tools/selfhost-kit.mjs", "down", "--profile", "platform"], { dryRun });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    usage();
    return;
  }
  if (args.command === "plan") {
    if (args.json) {
      printJson(planData());
      return;
    }
    printPlan();
    return;
  }
  if (args.command === "up") {
    process.exit(up(args));
  }
  if (args.command === "status") {
    if (args.json) {
      printJson(statusData());
      return;
    }
    printStatus();
    return;
  }
  if (args.command === "down") {
    process.exit(down(args));
  }
  if (args.command === "logs") {
    if (args.json) {
      printJson(logsData(args.service, args.tail));
      return;
    }
    printLogs(args.service, args.tail);
    return;
  }
  usage();
  process.exit(1);
}

await main().catch((error) => {
  console.error(`[local-stack] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
