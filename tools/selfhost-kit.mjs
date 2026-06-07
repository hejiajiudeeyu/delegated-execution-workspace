import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const PROFILES = {
  platform: {
    dir: "repos/platform/deploy/platform",
    purpose: "private platform control plane",
    services: [
      ["postgres", "PostgreSQL metadata and billing persistence"],
      ["platform-api", "control-plane API for catalog, tokens, requests, metrics"]
    ],
    health: [
      ["platform-api", "http://127.0.0.1:8080/healthz"]
    ],
    urls: [
      ["Platform API", "http://127.0.0.1:8080"],
      ["Platform health", "http://127.0.0.1:8080/healthz"]
    ],
    ports: [
      ["5432", "postgres", "PostgreSQL metadata and billing persistence"],
      ["8080", "platform-api", "control-plane API"]
    ]
  },
  "public-stack": {
    dir: "repos/platform/deploy/public-stack",
    purpose: "public edge, gateway, relay, platform API, and console",
    services: [
      ["edge", "Caddy public ingress and TLS termination"],
      ["postgres", "PostgreSQL metadata and billing persistence"],
      ["platform-api", "control-plane API"],
      ["relay", "transport relay data-plane bridge"],
      ["platform-console-gateway", "operator console gateway and static UI host"]
    ],
    health: [
      ["public edge", "http://127.0.0.1/healthz"],
      ["platform-api", "http://127.0.0.1/platform/healthz"],
      ["relay", "http://127.0.0.1/relay/healthz"],
      ["gateway", "http://127.0.0.1/gateway/healthz"]
    ],
    urls: [
      ["Public edge", "http://127.0.0.1"],
      ["Console", "http://127.0.0.1/console/"],
      ["Platform API", "http://127.0.0.1/platform/"],
      ["Relay", "http://127.0.0.1/relay/"],
      ["Gateway", "http://127.0.0.1/gateway/"]
    ],
    ports: [
      ["80", "edge", "HTTP public ingress"],
      ["443", "edge", "HTTPS public ingress"],
      ["5432", "postgres", "PostgreSQL metadata and billing persistence"]
    ]
  },
  "all-in-one": {
    dir: "repos/platform/deploy/all-in-one",
    purpose: "single-machine caller, responder, relay, and platform stack",
    services: [
      ["postgres", "PostgreSQL metadata persistence"],
      ["relay", "local relay transport"],
      ["platform-api", "control-plane API"],
      ["caller-controller", "caller-side request runtime"],
      ["responder-controller", "responder-side worker runtime"]
    ],
    health: [
      ["platform-api", "http://127.0.0.1:8080/healthz"],
      ["caller-controller", "http://127.0.0.1:8081/healthz"],
      ["responder-controller", "http://127.0.0.1:8082/healthz"],
      ["relay", "http://127.0.0.1:8090/healthz"]
    ],
    urls: [
      ["Platform API", "http://127.0.0.1:8080"],
      ["Caller controller", "http://127.0.0.1:8081"],
      ["Responder controller", "http://127.0.0.1:8082"],
      ["Relay", "http://127.0.0.1:8090"]
    ],
    ports: [
      ["5432", "postgres", "PostgreSQL metadata persistence"],
      ["8080", "platform-api", "control-plane API"],
      ["8081", "caller-controller", "caller-side request runtime"],
      ["8082", "responder-controller", "responder-side worker runtime"],
      ["8090", "relay", "local relay transport"]
    ]
  }
};

const PUBLIC_STACK_ROUTE_CONTRACT = [
  ["public edge health", "/healthz", "handle /healthz"],
  ["platform API health", "/platform/healthz", "handle_path /platform/*"],
  ["relay health", "/relay/healthz", "handle_path /relay/*"],
  ["gateway health", "/gateway/healthz", "handle_path /gateway/*"],
  ["operator console", "/console/", "handle_path /console/*"]
];

const SECRET_KEYS = new Set([
  "TOKEN_SECRET",
  "PLATFORM_ADMIN_API_KEY",
  "PLATFORM_CONSOLE_BOOTSTRAP_SECRET",
  "POSTGRES_PASSWORD"
]);

function usage() {
  console.log(`Usage: node tools/selfhost-kit.mjs <command> [--profile profile] [--all] [--json] [--force] [--service name] [--tail lines]

Commands:
  init      Create or harden the selected profile .env file
  preflight Run pre-up secret, compose, and public-route checks
  status    Show compose ps plus configured health endpoint status
  smoke     Run secret hygiene, compose config, and health checks
  config    Validate docker compose config for the selected profile
  urls      Print useful URLs for the selected profile
  ports     Show declared host ports for the selected profile
  summary   Print a one-screen non-secret deployment summary
  readiness
            Print a read-only deployment readiness overview
  doctor    Diagnose local files and tool availability before deployment
  profiles  List built-in self-host deployment profiles
  quickstart
            Print the recommended command sequence for a profile
  plan      Explain services, URLs, and safety checks for the profile
  up        Run preflight, then docker compose up -d; --json omits stdout
  down      Run docker compose down; --json omits stdout and reports metadata
  logs      Run docker compose logs; --json omits log stdout and reports metadata
  ops-report
            Write a non-secret Markdown operations handoff report
  security-review
            Run non-destructive public exposure review checks
  audit-export
            Export platform admin audit events to a local JSON file
  rotate    Dry-run secret rotation, or write .env with --confirm
  rotate-plan
            Print the manual secret rotation checklist
  restore-plan
            Print the manual backup restore checklist
  backup-validate
            Validate a backup directory without printing secrets
  backup-plan
            Print the manual data backup checklist

Profiles: ${Object.keys(PROFILES).join(", ")}
Default profile: platform`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] || "help",
    profile: process.env.DELEXEC_SELFHOST_PROFILE || "platform",
    force: false,
    confirm: false,
    service: null,
    tail: "120",
    limit: "100",
    output: null,
    auditBaseUrl: null,
    backupDir: null,
    all: false,
    json: false
  };
  for (let index = 3; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--force") {
      args.force = true;
      continue;
    }
    if (value === "--all") {
      args.all = true;
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--confirm") {
      args.confirm = true;
      continue;
    }
    if (value === "--service") {
      args.service = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--service=")) {
      args.service = value.slice("--service=".length);
      continue;
    }
    if (value === "--tail") {
      args.tail = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--tail=")) {
      args.tail = value.slice("--tail=".length);
      continue;
    }
    if (value === "--limit") {
      args.limit = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--limit=")) {
      args.limit = value.slice("--limit=".length);
      continue;
    }
    if (value === "--output") {
      args.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length);
      continue;
    }
    if (value === "--audit-base-url") {
      args.auditBaseUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--audit-base-url=")) {
      args.auditBaseUrl = value.slice("--audit-base-url=".length);
      continue;
    }
    if (value === "--backup-dir") {
      args.backupDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--backup-dir=")) {
      args.backupDir = value.slice("--backup-dir=".length);
      continue;
    }
    if (value === "--profile") {
      args.profile = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--profile=")) {
      args.profile = value.slice("--profile=".length);
      continue;
    }
  }
  if (!PROFILES[args.profile]) {
    throw new Error(`unknown profile ${args.profile}; expected one of ${Object.keys(PROFILES).join(", ")}`);
  }
  return args;
}

function profilePaths(profileName) {
  const profile = PROFILES[profileName];
  const dir = path.join(ROOT, profile.dir);
  return {
    profile,
    dir,
    envExamplePath: path.join(dir, ".env.example"),
    envPath: path.join(dir, ".env"),
    caddyfilePath: path.join(dir, "Caddyfile"),
    composePath: path.join(dir, "docker-compose.yml")
  };
}

function randomSecret(prefix = "") {
  return `${prefix}${crypto.randomBytes(24).toString("base64url")}`;
}

function parseEnv(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }
    const index = line.indexOf("=");
    entries.set(line.slice(0, index), line.slice(index + 1));
  }
  return entries;
}

function renderEnv(originalText, entries) {
  return originalText
    .split(/\r?\n/)
    .map((line) => {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) {
        return line;
      }
      const index = line.indexOf("=");
      const key = line.slice(0, index);
      if (!entries.has(key)) {
        return line;
      }
      return `${key}=${entries.get(key)}`;
    })
    .join("\n")
    .replace(/\n?$/, "\n");
}

function hardenEnv(text, profileName) {
  const entries = parseEnv(text);
  const warnings = [];

  for (const key of SECRET_KEYS) {
    if (!entries.has(key)) {
      continue;
    }
    const current = entries.get(key) || "";
    const unsafe =
      current === "" ||
      current.includes("change-me") ||
      current.includes("dev-token-secret") ||
      current === "croc";
    if (!unsafe) {
      continue;
    }
    if (key === "PLATFORM_ADMIN_API_KEY") {
      entries.set(key, randomSecret("sk_admin_"));
    } else if (key === "PLATFORM_CONSOLE_BOOTSTRAP_SECRET") {
      entries.set(key, randomSecret("sc_bootstrap_"));
    } else if (key === "POSTGRES_PASSWORD") {
      entries.set(key, randomSecret("pg_"));
    } else {
      entries.set(key, randomSecret());
    }
  }

  if (entries.has("POSTGRES_PASSWORD") && entries.has("DATABASE_URL")) {
    const user = entries.get("POSTGRES_USER") || "croc";
    const password = entries.get("POSTGRES_PASSWORD");
    const db = entries.get("POSTGRES_DB") || "croc";
    entries.set("DATABASE_URL", `postgresql://${user}:${password}@postgres:5432/${db}`);
  }

  if (profileName === "public-stack" && (entries.get("PUBLIC_SITE_ADDRESS") || "").includes("localhost")) {
    warnings.push("PUBLIC_SITE_ADDRESS still points at localhost; set the public origin before exposing this stack.");
  }

  return {
    text: renderEnv(text, entries),
    warnings
  };
}

function rotateEnv(text) {
  const entries = parseEnv(text);
  for (const key of SECRET_KEYS) {
    if (!entries.has(key)) {
      continue;
    }
    if (key === "PLATFORM_ADMIN_API_KEY") {
      entries.set(key, randomSecret("sk_admin_"));
    } else if (key === "PLATFORM_CONSOLE_BOOTSTRAP_SECRET") {
      entries.set(key, randomSecret("sc_bootstrap_"));
    } else if (key === "POSTGRES_PASSWORD") {
      entries.set(key, randomSecret("pg_"));
    } else {
      entries.set(key, randomSecret());
    }
  }
  if (entries.has("POSTGRES_PASSWORD") && entries.has("DATABASE_URL")) {
    const user = entries.get("POSTGRES_USER") || "croc";
    const password = entries.get("POSTGRES_PASSWORD");
    const db = entries.get("POSTGRES_DB") || "croc";
    entries.set("DATABASE_URL", `postgresql://${user}:${password}@postgres:5432/${db}`);
  }
  return renderEnv(text, entries);
}

function secretFindings(text, profileName) {
  const entries = parseEnv(text);
  const findings = [];
  for (const key of SECRET_KEYS) {
    if (!entries.has(key)) {
      continue;
    }
    const value = entries.get(key) || "";
    const unsafe =
      value === "" ||
      value.includes("change-me") ||
      value.includes("dev-token-secret") ||
      value === "croc";
    findings.push({
      key,
      ok: !unsafe,
      message: unsafe ? "unsafe placeholder or empty value" : "set"
    });
  }
  if (profileName === "public-stack") {
    const site = entries.get("PUBLIC_SITE_ADDRESS") || "";
    findings.push({
      key: "PUBLIC_SITE_ADDRESS",
      ok: Boolean(site) && !site.includes("localhost"),
      message: site.includes("localhost") ? "localhost; set public origin before exposure" : "set"
    });
  }
  return findings;
}

function initProfile(profileName, { force = false } = {}) {
  const { envExamplePath, envPath, dir } = profilePaths(profileName);
  if (!fs.existsSync(envExamplePath)) {
    throw new Error(`${envExamplePath} does not exist`);
  }
  if (fs.existsSync(envPath) && !force) {
    const current = fs.readFileSync(envPath, "utf8");
    const hardened = hardenEnv(current, profileName);
    fs.writeFileSync(envPath, hardened.text, "utf8");
    console.log(`[selfhost:init] hardened existing ${path.relative(ROOT, envPath)}`);
    for (const warning of hardened.warnings) {
      console.log(`[selfhost:init] warning: ${warning}`);
    }
    return;
  }

  const source = fs.readFileSync(envExamplePath, "utf8");
  const hardened = hardenEnv(source, profileName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(envPath, hardened.text, { encoding: "utf8", flag: "w" });
  console.log(`[selfhost:init] wrote ${path.relative(ROOT, envPath)} with generated local secrets`);
  for (const warning of hardened.warnings) {
    console.log(`[selfhost:init] warning: ${warning}`);
  }
}

function dockerCompose(profileName, args, stdio = "inherit") {
  const { dir, envPath } = profilePaths(profileName);
  const composeArgs = ["compose"];
  if (fs.existsSync(envPath)) {
    composeArgs.push("--env-file", ".env");
  }
  composeArgs.push(...args);
  const result = spawnSync("docker", composeArgs, {
    cwd: dir,
    stdio,
    encoding: stdio === "pipe" ? "utf8" : undefined
  });
  return result;
}

async function checkHealth(profileName) {
  const checks = await healthData(profileName);
  let ok = true;
  for (const check of checks) {
    if (check.ok) {
      console.log(`[ok] ${check.name}: ${check.status} ${check.url}`);
    } else {
      console.log(`[fail] ${check.name}: ${check.error || check.status} ${check.url}`);
    }
    ok &&= check.ok;
  }
  return ok;
}

async function healthData(profileName) {
  const { profile } = profilePaths(profileName);
  const checks = [];
  for (const [name, url] of profile.health) {
    try {
      const response = await fetch(url);
      checks.push({
        name,
        url,
        ok: response.ok,
        status: response.status
      });
    } catch (error) {
      checks.push({
        name,
        url,
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return checks;
}

function parseComposePs(stdout) {
  const text = (stdout || "").trim();
  if (!text) {
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const parsedLines = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      try {
        parsedLines.push(JSON.parse(line));
      } catch {
        return [];
      }
    }
    return parsedLines;
  }
}

function statusSecretHygiene(profileName) {
  const { envPath } = profilePaths(profileName);
  const suffix = commandProfileFlag(profileName);
  if (!fs.existsSync(envPath)) {
    return [
      {
        key: "secret hygiene",
        ok: false,
        status: `.env missing; run corepack pnpm run selfhost:init${suffix}`
      }
    ];
  }
  return secretFindings(fs.readFileSync(envPath, "utf8"), profileName).map((finding) => ({
    key: finding.key,
    ok: finding.ok,
    status: finding.ok ? "set" : finding.message
  }));
}

async function statusData(profileName) {
  const composeResult = dockerCompose(profileName, ["ps", "--format", "json"], "pipe");
  const composeOk = composeResult.status === 0;
  const secretHygiene = statusSecretHygiene(profileName);
  const health = await healthData(profileName);
  const blockers = [];
  if (!composeOk) {
    blockers.push("docker compose ps failed");
  }
  for (const finding of secretHygiene) {
    if (!finding.ok) {
      blockers.push(`${finding.key}: ${finding.status}`);
    }
  }
  for (const check of health) {
    if (!check.ok) {
      blockers.push(`health ${check.name}: ${check.error || check.status}`);
    }
  }
  return {
    command: "selfhost:status",
    profile: profileName,
    ok: composeOk && secretHygiene.every((finding) => finding.ok) && health.every((check) => check.ok),
    compose: {
      ok: composeOk,
      exit_code: composeResult.status ?? 1,
      services: parseComposePs(composeResult.stdout || ""),
      stdout_lines: (composeResult.stdout || "").trim().split(/\r?\n/).filter(Boolean),
      stderr_lines: (composeResult.stderr || "").trim().split(/\r?\n/).filter(Boolean)
    },
    secret_hygiene: secretHygiene,
    health,
    blockers,
    notes: [
      "status calls Docker compose ps and probes configured health endpoints",
      "does not print secret values",
      "use selfhost:readiness for a read-only pre-start overview"
    ]
  };
}

async function printStatusJson(profileName) {
  const data = await statusData(profileName);
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
  return data.ok;
}

function logsData(profileName, { service = null, tail = "120" } = {}) {
  const logArgs = ["logs", `--tail=${tail || "120"}`];
  if (service) {
    logArgs.push(service);
  }
  const logsResult = dockerCompose(profileName, logArgs, "pipe");
  const logsOk = logsResult.status === 0;
  return {
    command: "selfhost:logs",
    profile: profileName,
    ok: logsOk,
    service,
    tail: tail || "120",
    compose_logs: {
      ok: logsOk,
      status: logsOk ? "ok" : "fail",
      exit_code: logsResult.status ?? 1,
      args: logArgs,
      stderr_lines: (logsResult.stderr || "").trim().split(/\r?\n/).filter(Boolean)
    },
    blockers: logsOk ? [] : ["docker compose logs failed"],
    notes: [
      "runs docker compose logs for the selected profile",
      "does not include docker compose logs stdout because application logs may contain sensitive values",
      "use text mode in a private operator terminal when raw logs are required"
    ]
  };
}

function printLogsJson(profileName, options) {
  const data = logsData(profileName, options);
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
  return data.ok;
}

function downData(profileName) {
  const downArgs = ["down"];
  const downResult = dockerCompose(profileName, downArgs, "pipe");
  const downOk = downResult.status === 0;
  return {
    command: "selfhost:down",
    profile: profileName,
    ok: downOk,
    compose_down: {
      ok: downOk,
      status: downOk ? "ok" : "fail",
      exit_code: downResult.status ?? 1,
      args: downArgs,
      stderr_lines: (downResult.stderr || "").trim().split(/\r?\n/).filter(Boolean)
    },
    blockers: downOk ? [] : ["docker compose down failed"],
    notes: [
      "runs docker compose down for the selected profile",
      "does not include docker compose down stdout because compose output may include sensitive values",
      "use text mode in a private operator terminal when raw compose output is required"
    ]
  };
}

function printDownJson(profileName) {
  const data = downData(profileName);
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
  return data.ok;
}

function withCapturedConsole(fn) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...values) => {
    lines.push(values.map((value) => String(value)).join(" "));
  };
  try {
    const value = fn();
    return { ok: true, value, lines };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      lines
    };
  } finally {
    console.log = originalLog;
  }
}

function upData(profileName, { force = false } = {}) {
  const blockers = [];
  const initResult = withCapturedConsole(() => initProfile(profileName, { force: false }));
  if (!initResult.ok) {
    blockers.push(`init failed: ${initResult.error}`);
  }

  const preflight = preflightData(profileName);
  if (!preflight.ok) {
    blockers.push(...preflight.blockers);
    if (!force) {
      blockers.push("preflight failed; rerun with --force to override");
    }
  }

  const shouldStart = initResult.ok && (preflight.ok || force);
  const upArgs = ["up", "-d"];
  let composeUp = {
    ok: false,
    status: "skipped",
    exit_code: null,
    args: upArgs,
    stderr_lines: []
  };

  if (shouldStart) {
    const upResult = dockerCompose(profileName, upArgs, "pipe");
    const upOk = upResult.status === 0;
    composeUp = {
      ok: upOk,
      status: upOk ? "ok" : "fail",
      exit_code: upResult.status ?? 1,
      args: upArgs,
      stderr_lines: (upResult.stderr || "").trim().split(/\r?\n/).filter(Boolean)
    };
    if (!upOk) {
      blockers.push("docker compose up failed");
    }
  }

  return {
    command: "selfhost:up",
    profile: profileName,
    ok: initResult.ok && composeUp.ok && (preflight.ok || force),
    force,
    init: {
      ok: initResult.ok,
      status: initResult.ok ? "ok" : "fail",
      message: initResult.ok ? "env initialized or hardened" : initResult.error
    },
    preflight,
    compose_up: composeUp,
    blockers: Array.from(new Set(blockers)),
    notes: [
      "runs init, preflight, then docker compose up -d for the selected profile",
      "does not include docker compose up stdout because command output may contain sensitive values",
      "does not include init or preflight stdout",
      "use text mode in a private operator terminal when raw command output is required"
    ]
  };
}

function printUpJson(profileName, options) {
  const data = upData(profileName, options);
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
  return data.ok;
}

function urlsData(profileName) {
  const { dir, envPath } = profilePaths(profileName);
  return {
    command: "selfhost:urls",
    profile: profileName,
    deploy_dir: path.relative(ROOT, dir),
    env_path: path.relative(ROOT, envPath),
    env_status: fs.existsSync(envPath) ? "present" : "missing",
    urls: profileUrls(profileName).map(([label, url]) => ({ label, url })),
    notes: ["read-only", "does not call Docker", "does not bind ports", "does not probe the network"]
  };
}

function printUrlsJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...urlsData(profileName)
      },
      null,
      2
    )
  );
}

function printUrls(profileName) {
  const { env_path, env_status, urls } = urlsData(profileName);
  console.log(`[selfhost:urls] profile=${profileName}`);
  if (env_status === "missing") {
    console.log(`[selfhost:urls] .env missing at ${env_path}; run corepack pnpm run selfhost:init -- --profile ${profileName}`);
  }
  for (const { label, url } of urls) {
    console.log(`- ${label}: ${url}`);
  }
}

function portsData(profileName) {
  const { profile, dir, envPath } = profilePaths(profileName);
  return {
    command: "selfhost:ports",
    profile: profileName,
    deploy_dir: path.relative(ROOT, dir),
    env_path: path.relative(ROOT, envPath),
    env_status: fs.existsSync(envPath) ? "present" : "missing",
    ports: (profile.ports || []).map(([port, service, role]) => ({ port, service, role })),
    notes: ["read-only", "does not call Docker", "does not bind ports", "does not probe the network"]
  };
}

function printPortsJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...portsData(profileName)
      },
      null,
      2
    )
  );
}

function printPorts(profileName) {
  const { ports } = portsData(profileName);
  console.log(`[selfhost:ports] profile=${profileName}`);
  console.log("Declared host ports; this command does not check whether ports are currently free.");
  for (const { port, service, role } of ports) {
    console.log(`- ${port}: ${service} - ${role}`);
  }
}

function profileSummary(profileName) {
  const profile = PROFILES[profileName];
  const suffix = commandProfileFlag(profileName);
  return {
    profile: profileName,
    purpose: profile.purpose || "deployment profile",
    deploy_dir: profile.dir,
    services: (profile.services || []).map(([name, role]) => ({ name, role })),
    ports: (profile.ports || []).map(([port, service, role]) => ({ port, service, role })),
    next: `corepack pnpm run selfhost:doctor${suffix}`
  };
}

function printProfilesJson() {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        command: "selfhost:profiles",
        profiles: Object.keys(PROFILES).map((profileName) => profileSummary(profileName))
      },
      null,
      2
    )
  );
}

function printProfiles() {
  console.log("[selfhost:profiles]");
  console.log("Built-in deployment profiles; this command is read-only and does not inspect .env or Docker.");
  for (const summary of Object.keys(PROFILES).map((profileName) => profileSummary(profileName))) {
    const serviceNames = summary.services.map(({ name }) => name).join(",");
    const ports = summary.ports.map(({ port }) => port).join(",");
    console.log(`\n## ${summary.profile}`);
    console.log(`purpose=${summary.purpose}`);
    console.log(`deploy_dir=${summary.deploy_dir}`);
    console.log(`services=${summary.services.length} ${serviceNames}`);
    console.log(`ports=${ports || "none"}`);
    console.log(`next=${summary.next}`);
  }
}

function quickstartPlan(profileName) {
  const suffix = commandProfileFlag(profileName);
  const commands = [
    "corepack pnpm run selfhost:profiles",
    `corepack pnpm run selfhost:doctor${suffix}`,
    `corepack pnpm run selfhost:init${suffix}`,
    `corepack pnpm run selfhost:summary${suffix}`,
    `corepack pnpm run selfhost:ports${suffix}`,
    `corepack pnpm run selfhost:preflight${suffix}`,
    `corepack pnpm run selfhost:up${suffix}`,
    `corepack pnpm run selfhost:smoke${suffix}`,
    `corepack pnpm run selfhost:ops-report${suffix}`
  ];
  if (profileName === "public-stack") {
    commands.push(
      `corepack pnpm run selfhost:security-review${suffix}`,
      "corepack pnpm run published-image:smoke -- --image-tag latest",
      "corepack pnpm run operator:onboarding:check"
    );
  }
  return {
    command: "selfhost:quickstart",
    profile: profileName,
    commands: commands.map((command, index) => ({ step: index + 1, command })),
    safety: [
      "prints recommended commands only",
      "does not run Docker",
      "does not read or print secret values"
    ]
  };
}

function printQuickstartJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...quickstartPlan(profileName)
      },
      null,
      2
    )
  );
}

function printQuickstart(profileName) {
  const plan = quickstartPlan(profileName);
  console.log(`[selfhost:quickstart] profile=${profileName}`);
  console.log("This command prints a recommended sequence only; it does not run Docker or read secret values.");
  plan.commands.forEach(({ step, command }) => {
    console.log(`${step}. ${command}`);
  });
}

function profileUrls(profileName) {
  const { profile, envPath } = profilePaths(profileName);
  if (profileName !== "public-stack" || !fs.existsSync(envPath)) {
    return profile.urls;
  }
  const entries = parseEnv(fs.readFileSync(envPath, "utf8"));
  const origin = (entries.get("PUBLIC_SITE_ADDRESS") || "http://127.0.0.1").replace(/\/+$/, "");
  return [
    ["Public edge", origin],
    ["Console", `${origin}/console/`],
    ["Platform API", `${origin}/platform/`],
    ["Relay", `${origin}/relay/`],
    ["Gateway", `${origin}/gateway/`]
  ];
}

function checkSecrets(profileName) {
  const { envPath } = profilePaths(profileName);
  if (!fs.existsSync(envPath)) {
    console.log(`[fail] secrets: .env missing; run corepack pnpm run selfhost:init -- --profile ${profileName}`);
    return false;
  }
  const findings = secretFindings(fs.readFileSync(envPath, "utf8"), profileName);
  let ok = true;
  for (const finding of findings) {
    console.log(`[${finding.ok ? "ok" : "warn"}] ${finding.key}: ${finding.message}`);
    ok &&= finding.ok;
  }
  return ok;
}

function composeConfig(profileName, mode = "quiet", stdio = "inherit") {
  const args = mode === "print" ? ["config"] : ["config", "--quiet"];
  return dockerCompose(profileName, args, stdio);
}

function configData(profileName) {
  const { dir, envPath, composePath } = profilePaths(profileName);
  const result = composeConfig(profileName, "quiet", "pipe");
  const ok = result.status === 0;
  return {
    command: "selfhost:config",
    profile: profileName,
    ok,
    deploy_dir: path.relative(ROOT, dir),
    compose_path: path.relative(ROOT, composePath),
    env_path: path.relative(ROOT, envPath),
    env_status: fs.existsSync(envPath) ? "present" : "missing",
    compose_config: {
      ok,
      status: ok ? "ok" : "fail",
      exit_code: result.status ?? 1,
      stderr_lines: (result.stderr || "").trim().split(/\r?\n/).filter(Boolean)
    },
    blockers: ok ? [] : ["docker compose config failed"],
    notes: [
      "runs docker compose config --quiet",
      "does not include docker compose config stdout because it can contain expanded environment values",
      "does not print secret values"
    ]
  };
}

function printConfigJson(profileName) {
  const data = configData(profileName);
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
  return data.ok;
}

function printPlan(profileName) {
  const data = planData(profileName);
  console.log(`[selfhost:plan] profile=${profileName}`);
  console.log(`deploy_dir=${data.deploy_dir}`);
  console.log(`env=${data.env_path}`);
  console.log("\nServices:");
  for (const service of data.services) {
    console.log(`- ${service.name}: ${service.role}`);
  }
  console.log("\nURLs:");
  for (const url of data.urls) {
    console.log(`- ${url.label}: ${url.url}`);
  }
  console.log("\nSafety checks:");
  for (const check of data.safety_checks) {
    console.log(`- ${check}`);
  }
}

function planData(profileName) {
  const { profile, dir, envPath } = profilePaths(profileName);
  const safetyChecks = [
    "run selfhost:init before first up",
    "run selfhost:preflight before up",
    "run selfhost:smoke after up",
    "rotate secrets before public exposure",
    "keep .env out of git; this tool never prints secret values"
  ];
  if (profileName === "public-stack") {
    safetyChecks.push("set PUBLIC_SITE_ADDRESS to the real public origin before exposure");
  }
  return {
    command: "selfhost:plan",
    profile: profileName,
    purpose: profile.purpose,
    deploy_dir: path.relative(ROOT, dir),
    env_path: path.relative(ROOT, envPath),
    services: (profile.services || []).map(([name, role]) => ({ name, role })),
    urls: profileUrls(profileName).map(([label, url]) => ({ label, url })),
    safety_checks: safetyChecks,
    notes: [
      "read-only",
      "does not call Docker",
      "does not bind ports",
      "does not print secret values"
    ]
  };
}

function printPlanJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...planData(profileName)
      },
      null,
      2
    )
  );
}

function commandProfileFlag(profileName) {
  return profileName === "platform" ? "" : ` -- --profile ${profileName}`;
}

function summaryData(profileName) {
  const { profile, dir, envPath } = profilePaths(profileName);
  const envExists = fs.existsSync(envPath);
  const findings = envExists ? secretFindings(fs.readFileSync(envPath, "utf8"), profileName) : [];
  const suffix = commandProfileFlag(profileName);
  return {
    command: "selfhost:summary",
    profile: profileName,
    deploy_dir: path.relative(ROOT, dir),
    env_path: path.relative(ROOT, envPath),
    env_status: envExists ? "present" : "missing",
    urls: profileUrls(profileName).map(([label, url]) => ({ label, url })),
    ports: (profile.ports || []).map(([port, service, role]) => ({ port, service, role })),
    secret_hygiene: envExists
      ? findings.map((finding) => ({
          key: finding.key,
          ok: finding.ok,
          status: finding.ok ? "set" : finding.message
        }))
      : [],
    next_commands: [
      `corepack pnpm run selfhost:preflight${suffix}`,
      `corepack pnpm run selfhost:up${suffix}`,
      `corepack pnpm run selfhost:smoke${suffix}`,
      `corepack pnpm run selfhost:ops-report${suffix}`,
      `corepack pnpm run selfhost:security-review${suffix}`
    ],
    notes: ["read-only", "does not call Docker", "does not bind ports", "does not print secret values"]
  };
}

function printSummaryJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...summaryData(profileName)
      },
      null,
      2
    )
  );
}

function printSummary(profileName) {
  const summary = summaryData(profileName);
  const suffix = commandProfileFlag(profileName);

  console.log(`[selfhost:summary] profile=${profileName}`);
  console.log(`deploy_dir=${summary.deploy_dir}`);
  console.log(`env=${summary.env_path}`);
  console.log(`env_status=${summary.env_status}`);

  console.log("\n## URLs");
  for (const { label, url } of summary.urls) {
    console.log(`- ${label}: ${url}`);
  }

  console.log("\n## Ports");
  for (const { port, service, role } of summary.ports) {
    console.log(`- ${port}: ${service} - ${role}`);
  }

  console.log("\n## Secret hygiene");
  if (summary.env_status === "missing") {
    console.log(`- .env missing: run corepack pnpm run selfhost:init${suffix}`);
  } else {
    for (const finding of summary.secret_hygiene) {
      console.log(`- ${finding.key}: ${finding.status}`);
    }
  }

  console.log("\n## Next commands");
  for (const command of summary.next_commands) {
    console.log(`- ${command}`);
  }
  console.log("\nThis summary is read-only and does not call Docker, bind ports, or print secret values.");
}

function readinessItem(label, ok, detail = "") {
  console.log(`[${ok ? "ok" : "fail"}] ${label}${detail ? `: ${detail}` : ""}`);
  return ok;
}

function silentPublicRouteContractOk(profileName) {
  if (profileName !== "public-stack") {
    return true;
  }
  const { caddyfilePath } = profilePaths(profileName);
  if (!fs.existsSync(caddyfilePath)) {
    return false;
  }
  const caddyfile = fs.readFileSync(caddyfilePath, "utf8");
  return PUBLIC_STACK_ROUTE_CONTRACT.every(([, , caddyPattern]) => caddyfile.includes(caddyPattern));
}

function readinessSummary(profileName) {
  const { dir, envExamplePath, envPath, composePath, caddyfilePath } = profilePaths(profileName);
  const blockers = [];
  if (!fs.existsSync(dir)) {
    blockers.push("profile deploy dir missing");
  }
  if (!fs.existsSync(envExamplePath)) {
    blockers.push(".env.example missing");
  }
  if (!fs.existsSync(composePath)) {
    blockers.push("docker-compose.yml missing");
  }
  if (!fs.existsSync(envPath)) {
    blockers.push("env file missing");
  } else {
    const findings = secretFindings(fs.readFileSync(envPath, "utf8"), profileName);
    for (const finding of findings) {
      if (!finding.ok) {
        blockers.push(`${finding.key}: ${finding.message}`);
      }
    }
  }
  if (profileName === "public-stack") {
    const origin = publicOrigin(profileName);
    const hasPublicOriginFinding = blockers.some((blocker) => blocker.startsWith("PUBLIC_SITE_ADDRESS:"));
    if ((!origin || origin.includes("localhost")) && !hasPublicOriginFinding) {
      blockers.push(`PUBLIC_SITE_ADDRESS: ${origin}; set public origin before exposure`);
    }
    if (!fs.existsSync(caddyfilePath)) {
      blockers.push("Caddyfile missing");
    } else if (!silentPublicRouteContractOk(profileName)) {
      blockers.push("public route contract mismatch");
    }
  }
  return {
    profileName,
    ok: blockers.length === 0,
    blockers: Array.from(new Set(blockers))
  };
}

function readinessNextCommand(profileName) {
  return `corepack pnpm run selfhost:readiness${commandProfileFlag(profileName)}`;
}

function readinessJsonSummary(profileName) {
  const summary = readinessSummary(profileName);
  return {
    profile: summary.profileName,
    ok: summary.ok,
    blockers: summary.blockers,
    next: readinessNextCommand(summary.profileName)
  };
}

function printReadinessJson(profileName) {
  const summary = readinessJsonSummary(profileName);
  const body = {
    generated_at: new Date().toISOString(),
    mode: "profile",
    profile: summary.profile,
    ok: summary.ok,
    blockers: summary.blockers,
    next: summary.next
  };
  console.log(JSON.stringify(body, null, 2));
  return summary.ok;
}

function printReadinessAllJson() {
  const profiles = Object.keys(PROFILES).map((profileName) => readinessJsonSummary(profileName));
  const ok = profiles.every((profile) => profile.ok);
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        mode: "all",
        ok,
        profiles
      },
      null,
      2
    )
  );
  return ok;
}

function readinessAllProfiles() {
  console.log("[selfhost:readiness] mode=all");
  console.log("This command is read-only; it does not call Docker, bind ports, probe the network, mutate files, or print secret values.");
  const summaries = Object.keys(PROFILES).map((profileName) => readinessSummary(profileName));
  for (const summary of summaries) {
    console.log(`\n## ${summary.profileName}: ${summary.ok ? "ok" : "fail"}`);
    if (summary.ok) {
      console.log("- no readiness blockers found");
    } else {
      for (const blocker of summary.blockers) {
        console.log(`- ${blocker}`);
      }
    }
    console.log(`- next: ${readinessNextCommand(summary.profileName)}`);
  }
  const ok = summaries.every((summary) => summary.ok);
  console.log(`[${ok ? "ok" : "fail"}] ${ok ? "all profiles passed readiness" : "one or more profiles have readiness blockers"}`);
  return ok;
}

function readinessProfile(profileName) {
  const { profile, dir, envExamplePath, envPath, composePath, caddyfilePath } = profilePaths(profileName);
  const suffix = commandProfileFlag(profileName);
  const envExists = fs.existsSync(envPath);
  let ok = true;

  console.log(`[selfhost:readiness] profile=${profileName}`);
  console.log("This command is read-only; it does not call Docker, bind ports, probe the network, mutate files, or print secret values.");
  console.log(`deploy_dir=${path.relative(ROOT, dir)}`);
  console.log(`env=${path.relative(ROOT, envPath)}`);

  console.log("\n## Deployment readiness");
  const profileFilesOk = readinessItem("profile files", fs.existsSync(dir) && fs.existsSync(envExamplePath) && fs.existsSync(composePath), path.relative(ROOT, dir));
  const envFileOk = readinessItem("env file", envExists, envExists ? "present" : `missing; run corepack pnpm run selfhost:init${suffix}`);
  ok &&= profileFilesOk && envFileOk;

  console.log("\n## Secret hygiene");
  if (!envExists) {
    ok = false;
    console.log(`[fail] secret hygiene: .env missing; run corepack pnpm run selfhost:init${suffix}`);
  } else {
    const findings = secretFindings(fs.readFileSync(envPath, "utf8"), profileName);
    const failed = findings.filter((finding) => !finding.ok);
    for (const finding of findings) {
      console.log(`[${finding.ok ? "ok" : "fail"}] ${finding.key}: ${finding.ok ? "set" : finding.message}`);
    }
    ok &&= failed.length === 0;
    console.log(`[${failed.length === 0 ? "ok" : "fail"}] secret hygiene`);
  }

  if (profileName === "public-stack") {
    const origin = publicOrigin(profileName);
    const originOk = Boolean(origin) && !origin.includes("localhost");
    const publicOriginOk = readinessItem("public origin", originOk, originOk ? origin : `${origin}; set PUBLIC_SITE_ADDRESS before exposure`);
    const caddyfileOk = readinessItem("Caddyfile", fs.existsSync(caddyfilePath), path.relative(ROOT, caddyfilePath));
    const routeContractOk = checkPublicRouteContract(profileName);
    ok &&= publicOriginOk && caddyfileOk && routeContractOk;
  }

  console.log("\n## URLs");
  for (const [label, url] of profileUrls(profileName)) {
    console.log(`- ${label}: ${url}`);
  }

  console.log("\n## Declared ports");
  for (const [port, service, role] of profile.ports || []) {
    console.log(`- ${port}: ${service} - ${role}`);
  }

  console.log("\n## Next commands");
  console.log(`- corepack pnpm run selfhost:preflight${suffix}`);
  console.log(`- corepack pnpm run selfhost:up${suffix}`);
  console.log(`- corepack pnpm run selfhost:smoke${suffix}`);
  console.log(`- corepack pnpm run selfhost:ops-report${suffix}`);
  if (profileName === "public-stack") {
    console.log(`- corepack pnpm run selfhost:security-review${suffix}`);
    console.log("- corepack pnpm run operator:onboarding:check");
  }

  console.log(`[${ok ? "ok" : "fail"}] ${ok ? "readiness passed" : "readiness found deployment blockers"}`);
  return ok;
}

function doctorCheck(label, ok, detail = "", level = "fail") {
  return {
    label,
    ok,
    status: ok ? "ok" : level,
    detail,
    blocking: !ok && level !== "warn"
  };
}

function printDoctorCheck(check) {
  console.log(`[${check.status}] ${check.label}${check.detail ? `: ${check.detail}` : ""}`);
  return !check.blocking;
}

function commandAvailable(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8"
  });
  const output = result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : result.stderr.trim().split(/\r?\n/)[0];
  return {
    ok: result.status === 0,
    detail: output || (result.status === 0 ? "available" : "not available")
  };
}

function doctorData(profileName) {
  const { dir, envExamplePath, envPath, composePath } = profilePaths(profileName);
  const suffix = commandProfileFlag(profileName);
  const nodeCheck = commandAvailable(process.execPath, ["--version"]);
  const corepackCheck = commandAvailable("corepack", ["--version"]);
  const dockerCheck = commandAvailable("docker", ["--version"]);
  const envExists = fs.existsSync(envPath);
  const localTools = [
    doctorCheck("node runtime", nodeCheck.ok, nodeCheck.detail),
    doctorCheck("corepack", corepackCheck.ok, corepackCheck.detail),
    doctorCheck("docker cli", dockerCheck.ok, dockerCheck.detail, "warn")
  ];
  const profileFiles = [
    doctorCheck("profile deploy dir", fs.existsSync(dir), path.relative(ROOT, dir)),
    doctorCheck(".env.example", fs.existsSync(envExamplePath), path.relative(ROOT, envExamplePath)),
    doctorCheck("docker-compose.yml", fs.existsSync(composePath), path.relative(ROOT, composePath)),
    doctorCheck(".env", envExists, envExists ? path.relative(ROOT, envPath) : `missing; run corepack pnpm run selfhost:init${suffix}`)
  ];
  const secretHygiene = envExists
    ? secretFindings(fs.readFileSync(envPath, "utf8"), profileName).map((finding) => ({
        key: finding.key,
        ok: finding.ok,
        status: finding.ok ? "set" : finding.message
      }))
    : [{ key: "secret hygiene", ok: false, status: `.env missing; run corepack pnpm run selfhost:init${suffix}` }];
  const nextCommands = [
    `corepack pnpm run selfhost:init${suffix}`,
    `corepack pnpm run selfhost:summary${suffix}`,
    `corepack pnpm run selfhost:preflight${suffix}`,
    `corepack pnpm run selfhost:up${suffix}`
  ];
  const ok =
    localTools.every((check) => !check.blocking) &&
    profileFiles.every((check) => !check.blocking) &&
    secretHygiene.every((finding) => finding.ok);

  return {
    command: "selfhost:doctor",
    profile: profileName,
    ok,
    local_tools: localTools,
    profile_files: profileFiles,
    secret_hygiene: secretHygiene,
    next_commands: nextCommands,
    notes: ["read-only", "does not call docker compose", "does not start services", "does not probe the network", "does not print secret values"]
  };
}

function printDoctorJson(profileName) {
  const data = doctorData(profileName);
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
  return data.ok;
}

function doctorProfile(profileName) {
  const data = doctorData(profileName);
  console.log(`[selfhost:doctor] profile=${profileName}`);
  console.log("This command is read-only; it does not call docker compose, start services, probe the network, or print secret values.");

  console.log("\n## Local tools");
  for (const check of data.local_tools) {
    printDoctorCheck(check);
  }

  console.log("\n## Profile files");
  for (const check of data.profile_files) {
    printDoctorCheck(check);
  }

  console.log("\n## Secret hygiene");
  for (const finding of data.secret_hygiene) {
    console.log(`[${finding.ok ? "ok" : "fail"}] ${finding.key}: ${finding.status}`);
  }
  if (data.secret_hygiene.length > 0 && data.secret_hygiene.every((finding) => finding.ok)) {
    console.log("[ok] secret hygiene: deployable values are set");
  }

  console.log("\n## Next commands");
  for (const command of data.next_commands) {
    console.log(`- ${command}`);
  }

  console.log(`[${data.ok ? "ok" : "fail"}] ${data.ok ? "doctor passed" : "doctor found deployment blockers"}`);
  return data.ok;
}

function printPreflightRoutes(profileName) {
  const heading = profileName === "public-stack" ? "Public routes" : "Local routes";
  console.log(`\n${heading}`);
  for (const [label, url] of profileUrls(profileName)) {
    console.log(`- ${label}: ${url}`);
  }
}

function secretHygieneData(profileName) {
  const { envPath } = profilePaths(profileName);
  const suffix = commandProfileFlag(profileName);
  const envExists = fs.existsSync(envPath);
  return envExists
    ? secretFindings(fs.readFileSync(envPath, "utf8"), profileName).map((finding) => ({
        key: finding.key,
        ok: finding.ok,
        status: finding.ok ? "set" : finding.message
      }))
    : [{ key: "secret hygiene", ok: false, status: `.env missing; run corepack pnpm run selfhost:init${suffix}` }];
}

function preflightData(profileName) {
  const secretHygiene = secretHygieneData(profileName);
  const configResult = composeConfig(profileName, "quiet", "pipe");
  const configOk = configResult.status === 0;
  const blockers = secretHygiene
    .filter((finding) => !finding.ok)
    .map((finding) => `${finding.key}: ${finding.status}`);
  if (!configOk) {
    blockers.push("docker compose config failed");
  }
  return {
    command: "selfhost:preflight",
    profile: profileName,
    ok: secretHygiene.every((finding) => finding.ok) && configOk,
    secret_hygiene: secretHygiene,
    compose_config: {
      ok: configOk,
      status: configOk ? "ok" : "fail",
      exit_code: configResult.status ?? 1
    },
    routes: profileUrls(profileName).map(([label, url]) => ({ label, url })),
    blockers: Array.from(new Set(blockers)),
    notes: [
      "runs docker compose config",
      "does not start services",
      "does not bind ports",
      "does not print secret values"
    ]
  };
}

function printPreflightJson(profileName) {
  const data = preflightData(profileName);
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
  return data.ok;
}

function publicOrigin(profileName) {
  const { envPath } = profilePaths(profileName);
  if (profileName !== "public-stack" || !fs.existsSync(envPath)) {
    return "http://127.0.0.1";
  }
  const entries = parseEnv(fs.readFileSync(envPath, "utf8"));
  return (entries.get("PUBLIC_SITE_ADDRESS") || "http://127.0.0.1").replace(/\/+$/, "");
}

function publicRouteContractData(profileName) {
  if (profileName !== "public-stack") {
    return {
      ok: true,
      status: "not_applicable",
      origin: null,
      caddyfile: null,
      routes: []
    };
  }

  const { caddyfilePath } = profilePaths(profileName);
  const origin = publicOrigin(profileName);
  const caddyfileExists = fs.existsSync(caddyfilePath);
  const caddyfile = caddyfileExists ? fs.readFileSync(caddyfilePath, "utf8") : "";
  const routes = PUBLIC_STACK_ROUTE_CONTRACT.map(([label, routePath, caddyPattern]) => {
    const caddyRoute = caddyPattern.replace(/^handle(?:_path)?\s+/, "");
    return {
      label,
      path: routePath,
      url: `${origin}${routePath}`,
      caddy_route: caddyRoute,
      caddy_pattern: caddyPattern,
      ok: caddyfileExists && caddyfile.includes(caddyPattern)
    };
  });
  const ok = caddyfileExists && routes.every((route) => route.ok);
  return {
    ok,
    status: ok ? "ok" : "fail",
    origin,
    caddyfile: {
      ok: caddyfileExists,
      path: path.relative(ROOT, caddyfilePath),
      status: caddyfileExists ? "present" : "missing"
    },
    routes
  };
}

function platformAdminBaseUrl(profileName, override = null) {
  if (override) {
    return override.replace(/\/+$/, "");
  }
  if (profileName === "public-stack") {
    return `${publicOrigin(profileName)}/platform`;
  }
  return "http://127.0.0.1:8080";
}

function checkPublicRouteContract(profileName) {
  if (profileName !== "public-stack") {
    return true;
  }

  const contract = publicRouteContractData(profileName);
  console.log("\nPublic route contract");
  for (const route of contract.routes) {
    console.log(`- ${route.label}: GET ${route.url}`);
  }

  if (!contract.caddyfile?.ok) {
    console.log(`[fail] Caddyfile: ${contract.caddyfile?.path || "Caddyfile"} missing`);
    return false;
  }

  for (const route of contract.routes) {
    console.log(`[${route.ok ? "ok" : "fail"}] Caddyfile route ${route.caddy_route}`);
  }
  return contract.ok;
}

function preflightProfile(profileName) {
  console.log(`[selfhost:preflight] profile=${profileName}`);
  console.log("\nSecret hygiene");
  const secretsOk = checkSecrets(profileName);
  console.log("\nCompose config");
  const configResult = composeConfig(profileName);
  const configOk = configResult.status === 0;
  console.log(`[${configOk ? "ok" : "fail"}] docker compose config`);
  printPreflightRoutes(profileName);
  return secretsOk && configOk;
}

function printBackupPlan(profileName) {
  const data = backupPlanData(profileName);
  console.log(`[selfhost:backup-plan] profile=${profileName}`);
  console.log("This command prints a plan only; it does not copy data.");
  for (const step of data.steps) {
    console.log(`${step.step}. ${step.detail}${step.command ? `: ${step.command}` : ""}`);
  }
}

function backupPlanData(profileName) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `backups/selfhost/${profileName}/${stamp}`;
  const envPath = path.relative(ROOT, profilePaths(profileName).envPath);
  const steps = [
    {
      step: 1,
      action: "create-backup-directory",
      detail: "Create backup directory",
      command: `mkdir -p ${backupDir}`
    },
    {
      step: 2,
      action: "copy-env-privately",
      detail: "Copy the selected profile .env into the backup artifact",
      command: `cp ${envPath} ${backupDir}/.env`
    },
    {
      step: 3,
      action: "store-env-privately",
      detail: "Store the copied .env in a private encrypted location."
    }
  ];
  if (["platform", "public-stack", "all-in-one"].includes(profileName)) {
    steps.push({
      step: 4,
      action: "dump-postgres",
      detail: "Export PostgreSQL data",
      command: `docker compose --env-file .env exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > ${backupDir}/postgres.sql`
    });
  }
  steps.push({
    step: steps.length + 1,
    action: "record-compose-config",
    detail: "Record image tags and compose config",
    command: `corepack pnpm run selfhost:config -- --profile ${profileName} > ${backupDir}/compose.config.txt`
  });
  return {
    command: "selfhost:backup-plan",
    profile: profileName,
    ok: true,
    backup_dir: backupDir,
    env_path: envPath,
    steps,
    next: `corepack pnpm run selfhost:backup-validate -- --profile ${profileName} --backup-dir ${backupDir}`,
    notes: [
      "plan-only",
      "does not copy files",
      "does not dump the database",
      "does not read or print .env secret values",
      "store .env backups privately because they may contain secret values"
    ]
  };
}

function printBackupPlanJson(profileName) {
  const data = backupPlanData(profileName);
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
  return data.ok;
}

function printRotatePlan(profileName) {
  const data = rotatePlanData(profileName);
  console.log(`[selfhost:rotate-plan] profile=${profileName}`);
  for (const step of data.steps) {
    console.log(`${step.step}. ${step.detail}${step.command ? `: ${step.command}` : ""}`);
  }
}

function rotatePlanData(profileName) {
  const envPath = path.relative(ROOT, profilePaths(profileName).envPath);
  return {
    command: "selfhost:rotate-plan",
    profile: profileName,
    ok: true,
    env_path: envPath,
    steps: [
      {
        step: 1,
        action: "backup-first",
        detail: "Run backup-plan and take a real database backup first.",
        command: `corepack pnpm run selfhost:backup-plan -- --profile ${profileName}`
      },
      {
        step: 2,
        action: "schedule-window",
        detail: "Schedule downtime or restart window for services using rotated secrets."
      },
      {
        step: 3,
        action: "dry-run-rotation",
        detail: "Dry-run secret rotation",
        command: `corepack pnpm run selfhost:rotate -- --profile ${profileName}`
      },
      {
        step: 4,
        action: "apply-rotation",
        detail: "Apply secret rotation",
        command: `corepack pnpm run selfhost:rotate -- --profile ${profileName} --confirm`
      },
      {
        step: 5,
        action: "restart-services",
        detail: "Restart services",
        command: `corepack pnpm run selfhost:down -- --profile ${profileName} && corepack pnpm run selfhost:up -- --profile ${profileName}`
      },
      {
        step: 6,
        action: "validate-rotation",
        detail: "Run selfhost:smoke and keep the generated .env rotation backup until validated.",
        command: `corepack pnpm run selfhost:smoke -- --profile ${profileName}`
      }
    ],
    next: `corepack pnpm run selfhost:rotate -- --profile ${profileName}`,
    notes: [
      "plan-only",
      "does not rotate secrets",
      "does not read or print .env secret values",
      "confirmed rotation writes a .env rotation backup next to the selected profile env file",
      "keep the generated .env rotation backup until smoke validation passes"
    ]
  };
}

function printRotatePlanJson(profileName) {
  const data = rotatePlanData(profileName);
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
  return data.ok;
}

function printRestorePlan(profileName, backupDir) {
  if (!backupDir) {
    throw new Error("--backup-dir is required for restore-plan");
  }
  const data = restorePlanData(profileName, backupDir);
  console.log(`[selfhost:restore-plan] profile=${profileName}`);
  console.log("This command prints a plan only; it does not stop services, copy files, or import data.");
  console.log(`backup_dir=${data.backup_dir}`);
  for (const step of data.steps) {
    console.log(`${step.step}. ${step.detail}${step.command ? `: ${step.command}` : ""}`);
  }
}

function restorePlanData(profileName, backupDir) {
  if (!backupDir) {
    throw new Error("--backup-dir is required for restore-plan");
  }
  const { envPath } = profilePaths(profileName);
  const normalizedBackupDir = backupDir.replace(/\/+$/, "");
  return {
    command: "selfhost:restore-plan",
    profile: profileName,
    ok: true,
    backup_dir: normalizedBackupDir,
    env_path: path.relative(ROOT, envPath),
    steps: [
      {
        step: 1,
        action: "confirm-backup-source",
        detail: "Confirm the backup directory was produced by selfhost:backup-plan and stored privately."
      },
      {
        step: 2,
        action: "schedule-downtime",
        detail: "Schedule downtime",
        command: `corepack pnpm run selfhost:down -- --profile ${profileName}`
      },
      {
        step: 3,
        action: "review-env",
        detail: `Review ${normalizedBackupDir}/.env privately, then copy it to ${path.relative(ROOT, envPath)} if it matches the target environment.`
      },
      {
        step: 4,
        action: "import-database",
        detail: "Import database dump",
        command: `docker compose --env-file .env exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB" < ${normalizedBackupDir}/postgres.sql`
      },
      {
        step: 5,
        action: "restart-services",
        detail: "Restart services",
        command: `corepack pnpm run selfhost:up -- --profile ${profileName}`
      },
      {
        step: 6,
        action: "validate-recovery",
        detail: "Validate recovery",
        command: `corepack pnpm run selfhost:smoke -- --profile ${profileName}`
      },
      {
        step: 7,
        action: "retain-artifacts",
        detail: "Keep original volumes and the backup artifact until the recovered stack is validated."
      }
    ],
    notes: [
      "plan-only",
      "does not stop services",
      "does not copy files",
      "does not import SQL",
      "review .env privately because it may contain secret values"
    ]
  };
}

function printRestorePlanJson(profileName, backupDir) {
  const data = restorePlanData(profileName, backupDir);
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
  return data.ok;
}

function validateBackup(profileName, backupDir) {
  if (!backupDir) {
    throw new Error("--backup-dir is required for backup-validate");
  }
  const data = backupValidateData(profileName, backupDir);
  console.log(`[selfhost:backup-validate] profile=${profileName}`);
  console.log("This command is non-destructive; it checks file presence and size only.");
  console.log(`backup_dir=${data.backup_dir}`);

  for (const file of data.files) {
    if (file.status === "missing") {
      const level = file.required ? "fail" : "warn";
      console.log(`[${level}] ${file.name} missing`);
      continue;
    }
    console.log(`[${file.ok ? "ok" : "fail"}] ${file.name} present (${file.size_bytes} bytes)`);
  }
  console.log(`[${data.ok ? "ok" : "fail"}] ${data.ok ? "ready for restore-plan review" : "backup artifact is incomplete"}`);
  return data.ok;
}

function backupValidateData(profileName, backupDir) {
  if (!backupDir) {
    throw new Error("--backup-dir is required for backup-validate");
  }
  const normalizedBackupDir = backupDir.replace(/\/+$/, "");
  const absoluteBackupDir = path.resolve(ROOT, normalizedBackupDir);
  const checks = [
    [".env", true],
    ["postgres.sql", true],
    ["compose.config.txt", false]
  ];
  const files = checks.map(([name, required]) => {
    const filePath = path.join(absoluteBackupDir, name);
    if (!fs.existsSync(filePath)) {
      return {
        name,
        required,
        ok: !required,
        status: "missing",
        size_bytes: 0
      };
    }
    const stats = fs.statSync(filePath);
    const fileOk = stats.isFile() && stats.size > 0;
    return {
      name,
      required,
      ok: fileOk || !required,
      status: fileOk ? "ok" : "invalid",
      size_bytes: stats.size
    };
  });
  const blockers = files
    .filter((file) => file.required && !file.ok)
    .map((file) => `${file.name} ${file.status}`);
  return {
    command: "selfhost:backup-validate",
    profile: profileName,
    ok: blockers.length === 0,
    backup_dir: normalizedBackupDir,
    files,
    blockers,
    next: `corepack pnpm run selfhost:restore-plan -- --profile ${profileName} --backup-dir ${normalizedBackupDir}`,
    notes: [
      "non-destructive",
      "checks file presence and size only",
      "does not read or print .env secret values",
      "compose.config.txt is recommended but non-blocking"
    ]
  };
}

function printBackupValidateJson(profileName, backupDir) {
  const data = backupValidateData(profileName, backupDir);
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
  return data.ok;
}

function defaultOpsReportPath(profileName) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(ROOT, "exports", "selfhost", profileName, `${stamp}-ops-report.md`);
}

function backupStampPlaceholder(profileName) {
  return `backups/selfhost/${profileName}/<stamp>`;
}

function opsReportData(profileName) {
  const { profile, dir, envPath } = profilePaths(profileName);
  const envExists = fs.existsSync(envPath);
  const findings = envExists ? secretFindings(fs.readFileSync(envPath, "utf8"), profileName) : [];
  const backupDir = backupStampPlaceholder(profileName);
  const suffix = commandProfileFlag(profileName);
  const commandWithBackupDir =
    profileName === "platform"
      ? ` -- --backup-dir ${backupDir}`
      : ` -- --profile ${profileName} --backup-dir ${backupDir}`;
  return {
    command: "selfhost:ops-report",
    profile: profileName,
    deploy_dir: path.relative(ROOT, dir),
    env_path: path.relative(ROOT, envPath),
    env_status: envExists ? "present" : "missing",
    urls: profileUrls(profileName).map(([label, url]) => ({ label, url })),
    ports: (profile.ports || []).map(([port, service, role]) => ({ port, service, role })),
    secret_hygiene: envExists
      ? findings.map((finding) => ({
          key: finding.key,
          ok: finding.ok,
          status: finding.ok ? "set" : finding.message
        }))
      : [],
    operator_commands: [
      `corepack pnpm run selfhost:preflight${suffix}`,
      `corepack pnpm run selfhost:security-review${suffix}`,
      `corepack pnpm run selfhost:audit-export${suffix}`,
      `corepack pnpm run selfhost:backup-plan${suffix}`,
      `corepack pnpm run selfhost:backup-validate${commandWithBackupDir}`,
      `corepack pnpm run selfhost:restore-plan${commandWithBackupDir}`,
      `corepack pnpm run selfhost:rotate-plan${suffix}`,
      `corepack pnpm run selfhost:smoke${suffix}`,
      `corepack pnpm run selfhost:status${suffix}`
    ],
    notes: [
      "non-secret handoff",
      "does not print secret values",
      "run backup validation before restore rehearsal",
      "keep audit exports, backups, and copied .env files in private storage"
    ]
  };
}

function writeOpsReport(profileName, { output = null } = {}) {
  const data = opsReportData(profileName);
  const reportPath = path.resolve(ROOT, output || defaultOpsReportPath(profileName));
  const lines = [
    "# Selfhost Ops Report",
    "",
    `generated_at: ${new Date().toISOString()}`,
    `profile: ${data.profile}`,
    `deploy_dir: ${data.deploy_dir}`,
    `env_path: ${data.env_path}`,
    `env_status: ${data.env_status}`,
    "",
    "## URLs",
    "",
    ...data.urls.map((item) => `- ${item.label}: ${item.url}`),
    "",
    "## Ports",
    "",
    ...data.ports.map((item) => `- ${item.port}: ${item.service} - ${item.role}`),
    "",
    "## Secret Hygiene",
    ""
  ];

  if (data.env_status !== "present") {
    lines.push("- .env missing: run selfhost:init before treating this profile as ready");
  } else {
    for (const finding of data.secret_hygiene) {
      lines.push(`- ${finding.key}: ${finding.status}`);
    }
  }

  lines.push(
    "",
    "## Operator Commands",
    "",
    ...data.operator_commands.map((command) => `- ${command}`),
    "",
    "## Safety Notes",
    "",
    ...data.notes.map((note) => `- ${note}`),
    ""
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`[selfhost:ops-report] profile=${profileName}`);
  console.log(`output=${path.relative(ROOT, reportPath)}`);
}

function printOpsReportJson(profileName) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...opsReportData(profileName)
      },
      null,
      2
    )
  );
}

function securityReviewPrerequisites(profileName) {
  return [
    {
      label: "backup-plan",
      command: `corepack pnpm run selfhost:backup-plan -- --profile ${profileName}`
    },
    {
      label: "rotate-plan",
      command: `corepack pnpm run selfhost:rotate-plan -- --profile ${profileName}`
    },
    {
      label: "smoke",
      command: `corepack pnpm run selfhost:smoke -- --profile ${profileName}`
    }
  ];
}

function securityReviewData(profileName) {
  const secretHygiene = secretHygieneData(profileName);
  const configResult = composeConfig(profileName, "quiet", "pipe");
  const configOk = configResult.status === 0;
  const routeContract = publicRouteContractData(profileName);
  const blockers = secretHygiene
    .filter((finding) => !finding.ok)
    .map((finding) => `${finding.key}: ${finding.status}`);
  if (!configOk) {
    blockers.push("docker compose config failed");
  }
  if (!routeContract.ok) {
    if (routeContract.caddyfile && !routeContract.caddyfile.ok) {
      blockers.push("Caddyfile missing");
    } else {
      blockers.push("public route contract mismatch");
    }
  }
  const ok = secretHygiene.every((finding) => finding.ok) && configOk && routeContract.ok;
  return {
    command: "selfhost:security-review",
    profile: profileName,
    ok,
    secret_hygiene: secretHygiene,
    compose_config: {
      ok: configOk,
      status: configOk ? "ok" : "fail",
      exit_code: configResult.status ?? 1
    },
    public_route_contract: routeContract,
    operational_prerequisites: securityReviewPrerequisites(profileName),
    blockers: Array.from(new Set(blockers)),
    notes: [
      "non-destructive",
      "runs docker compose config",
      "does not start services",
      "does not bind ports",
      "does not print secret values",
      "logs/status/health output must stay secret-redacted"
    ]
  };
}

function printSecurityReviewJson(profileName) {
  const data = securityReviewData(profileName);
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
  return data.ok;
}

function securityReviewProfile(profileName) {
  console.log(`[selfhost:security-review] profile=${profileName}`);
  console.log("This command is non-destructive; it reviews local files and compose output only.");

  console.log("\nSecret hygiene");
  const secretsOk = checkSecrets(profileName);

  console.log("\nCompose config");
  const configResult = composeConfig(profileName);
  const configOk = configResult.status === 0;
  console.log(`[${configOk ? "ok" : "fail"}] docker compose config`);

  const routeOk = checkPublicRouteContract(profileName);

  console.log("\nOperational prerequisites");
  for (const prerequisite of securityReviewPrerequisites(profileName)) {
    console.log(`- ${prerequisite.label}: ${prerequisite.command}`);
  }
  console.log("- logs/status/health output must stay secret-redacted.");

  const ok = secretsOk && configOk && routeOk;
  console.log(`[${ok ? "ok" : "fail"}] ${ok ? "ready for public exposure review" : "fix findings before public exposure review"}`);
  return ok;
}

function defaultAuditExportPath(profileName) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(ROOT, "exports", "audit", profileName, `${stamp}.json`);
}

async function auditExportProfile(profileName, { limit = "100", output = null, auditBaseUrl = null } = {}) {
  const { envPath } = profilePaths(profileName);
  if (!fs.existsSync(envPath)) {
    throw new Error(`${path.relative(ROOT, envPath)} missing; run selfhost:init first`);
  }
  const entries = parseEnv(fs.readFileSync(envPath, "utf8"));
  const adminKey = entries.get("PLATFORM_ADMIN_API_KEY") || "";
  if (!adminKey) {
    throw new Error("PLATFORM_ADMIN_API_KEY missing from selected profile .env");
  }

  const numericLimit = Number.parseInt(String(limit), 10);
  if (!Number.isFinite(numericLimit) || numericLimit < 1 || numericLimit > 1000) {
    throw new Error("--limit must be an integer between 1 and 1000");
  }

  const baseUrl = platformAdminBaseUrl(profileName, auditBaseUrl);
  const sourceUrl = `${baseUrl}/v1/admin/audit-events?limit=${numericLimit}`;
  const response = await fetch(sourceUrl, {
    headers: {
      Authorization: `Bearer ${adminKey}`
    }
  });
  if (!response.ok) {
    throw new Error(`audit export request failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const outputPath = path.resolve(ROOT, output || defaultAuditExportPath(profileName));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        profile: profileName,
        source_url: sourceUrl,
        body
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const itemCount = Array.isArray(body?.items) ? body.items.length : 0;
  console.log(`[selfhost:audit-export] profile=${profileName}`);
  console.log(`source=${sourceUrl}`);
  console.log(`output=${path.relative(ROOT, outputPath)}`);
  console.log(`items=${itemCount}`);
}

function rotateProfile(profileName, { confirm = false } = {}) {
  const { envPath } = profilePaths(profileName);
  if (!fs.existsSync(envPath)) {
    throw new Error(`${path.relative(ROOT, envPath)} missing; run selfhost:init first`);
  }
  if (!confirm) {
    console.log(`[selfhost:rotate] dry-run profile=${profileName}`);
    console.log("Would rotate these keys when --confirm is provided:");
    for (const key of SECRET_KEYS) {
      console.log(`- ${key}`);
    }
    console.log("No files were changed.");
    return;
  }
  const current = fs.readFileSync(envPath, "utf8");
  const backupPath = `${envPath}.rotate-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.writeFileSync(backupPath, current, "utf8");
  fs.writeFileSync(envPath, rotateEnv(current), "utf8");
  console.log(`[selfhost:rotate] rotated secrets in ${path.relative(ROOT, envPath)}`);
  console.log(`[selfhost:rotate] backup written to ${path.relative(ROOT, backupPath)}`);
  console.log("[selfhost:rotate] restart the profile and run selfhost:smoke before deleting the backup.");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    usage();
    return;
  }

  if (args.command === "init") {
    initProfile(args.profile, { force: args.force });
    printUrls(args.profile);
    return;
  }

  if (args.command === "urls") {
    if (args.json) {
      printUrlsJson(args.profile);
    } else {
      printUrls(args.profile);
    }
    return;
  }

  if (args.command === "ports") {
    if (args.json) {
      printPortsJson(args.profile);
    } else {
      printPorts(args.profile);
    }
    return;
  }

  if (args.command === "profiles") {
    if (args.json) {
      printProfilesJson();
    } else {
      printProfiles();
    }
    return;
  }

  if (args.command === "quickstart") {
    if (args.json) {
      printQuickstartJson(args.profile);
    } else {
      printQuickstart(args.profile);
    }
    return;
  }

  if (args.command === "summary") {
    if (args.json) {
      printSummaryJson(args.profile);
    } else {
      printSummary(args.profile);
    }
    return;
  }

  if (args.command === "readiness") {
    if (args.json && args.all) {
      process.exit(printReadinessAllJson() ? 0 : 1);
    }
    if (args.json) {
      process.exit(printReadinessJson(args.profile) ? 0 : 1);
    }
    if (args.all) {
      process.exit(readinessAllProfiles() ? 0 : 1);
    }
    process.exit(readinessProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "doctor") {
    if (args.json) {
      process.exit(printDoctorJson(args.profile) ? 0 : 1);
    }
    process.exit(doctorProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "plan") {
    if (args.json) {
      printPlanJson(args.profile);
      return;
    }
    printPlan(args.profile);
    return;
  }

  if (args.command === "preflight") {
    if (args.json) {
      process.exit(printPreflightJson(args.profile) ? 0 : 1);
    }
    process.exit(preflightProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "config") {
    if (args.json) {
      process.exit(printConfigJson(args.profile) ? 0 : 1);
    }
    const result = composeConfig(args.profile, "print");
    process.exit(result.status || 0);
  }

  if (args.command === "status") {
    if (args.json) {
      process.exit((await printStatusJson(args.profile)) ? 0 : 1);
    }
    const result = dockerCompose(args.profile, ["ps"], "inherit");
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
    console.log("\nSecret hygiene");
    checkSecrets(args.profile);
    console.log("\nHealth endpoints");
    await checkHealth(args.profile);
    return;
  }

  if (args.command === "smoke") {
    console.log(`[selfhost:smoke] profile=${args.profile}`);
    console.log("\nSecret hygiene");
    const secretsOk = checkSecrets(args.profile);
    console.log("\nCompose config");
    const configResult = composeConfig(args.profile);
    const configOk = configResult.status === 0;
    console.log(`[${configOk ? "ok" : "fail"}] docker compose config`);
    const routeOk = checkPublicRouteContract(args.profile);
    console.log("\nHealth endpoints");
    const healthOk = await checkHealth(args.profile);
    process.exit(secretsOk && configOk && routeOk && healthOk ? 0 : 1);
  }

  if (args.command === "up") {
    if (args.json) {
      process.exit(printUpJson(args.profile, { force: args.force }) ? 0 : 1);
    }
    initProfile(args.profile, { force: false });
    const preflightOk = preflightProfile(args.profile);
    if (!preflightOk && !args.force) {
      console.log("[selfhost:up] preflight failed; fix the findings or rerun with --force to override.");
      process.exit(1);
    }
    if (!preflightOk && args.force) {
      console.log("[selfhost:up] warning: preflight failed; continuing because --force was provided.");
    }
    const result = dockerCompose(args.profile, ["up", "-d"]);
    process.exit(result.status || 0);
  }

  if (args.command === "down") {
    if (args.json) {
      process.exit(printDownJson(args.profile) ? 0 : 1);
    }
    const result = dockerCompose(args.profile, ["down"]);
    process.exit(result.status || 0);
  }

  if (args.command === "logs") {
    if (args.json) {
      process.exit(printLogsJson(args.profile, { service: args.service, tail: args.tail }) ? 0 : 1);
    }
    const logArgs = ["logs", `--tail=${args.tail || "120"}`];
    if (args.service) {
      logArgs.push(args.service);
    }
    const result = dockerCompose(args.profile, logArgs);
    process.exit(result.status || 0);
  }

  if (args.command === "ops-report") {
    if (args.json) {
      printOpsReportJson(args.profile);
      return;
    }
    writeOpsReport(args.profile, { output: args.output });
    return;
  }

  if (args.command === "security-review") {
    if (args.json) {
      process.exit(printSecurityReviewJson(args.profile) ? 0 : 1);
    }
    process.exit(securityReviewProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "audit-export") {
    await auditExportProfile(args.profile, {
      limit: args.limit,
      output: args.output,
      auditBaseUrl: args.auditBaseUrl
    });
    return;
  }

  if (args.command === "restore-plan") {
    if (args.json) {
      printRestorePlanJson(args.profile, args.backupDir);
      return;
    }
    printRestorePlan(args.profile, args.backupDir);
    return;
  }

  if (args.command === "backup-validate") {
    if (args.json) {
      process.exit(printBackupValidateJson(args.profile, args.backupDir) ? 0 : 1);
    }
    process.exit(validateBackup(args.profile, args.backupDir) ? 0 : 1);
  }

  if (args.command === "backup-plan") {
    if (args.json) {
      printBackupPlanJson(args.profile);
      return;
    }
    printBackupPlan(args.profile);
    return;
  }

  if (args.command === "rotate-plan") {
    if (args.json) {
      printRotatePlanJson(args.profile);
      return;
    }
    printRotatePlan(args.profile);
    return;
  }

  if (args.command === "rotate") {
    rotateProfile(args.profile, { confirm: args.confirm });
    return;
  }

  usage();
  process.exit(1);
}

await main().catch((error) => {
  console.error(`[selfhost-kit] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
