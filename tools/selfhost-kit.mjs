import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const PROFILES = {
  platform: {
    dir: "repos/platform/deploy/platform",
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
    ]
  },
  "public-stack": {
    dir: "repos/platform/deploy/public-stack",
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
    ]
  },
  "all-in-one": {
    dir: "repos/platform/deploy/all-in-one",
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
  console.log(`Usage: node tools/selfhost-kit.mjs <command> [--profile profile] [--force] [--service name] [--tail lines]

Commands:
  init      Create or harden the selected profile .env file
  preflight Run pre-up secret, compose, and public-route checks
  status    Show compose ps plus configured health endpoint status
  smoke     Run secret hygiene, compose config, and health checks
  config    Validate docker compose config for the selected profile
  urls      Print useful URLs for the selected profile
  plan      Explain services, URLs, and safety checks for the profile
  up        Run preflight, then docker compose up -d for the selected profile
  down      Run docker compose down for the selected profile
  logs      Run docker compose logs for the selected profile; supports --service and --tail
  security-review
            Run non-destructive public exposure review checks
  rotate    Dry-run secret rotation, or write .env with --confirm
  rotate-plan
            Print the manual secret rotation checklist
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
    tail: "120"
  };
  for (let index = 3; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--force") {
      args.force = true;
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
  const { profile } = profilePaths(profileName);
  let ok = true;
  for (const [name, url] of profile.health) {
    try {
      const response = await fetch(url);
      console.log(`[${response.ok ? "ok" : "fail"}] ${name}: ${response.status} ${url}`);
      ok &&= response.ok;
    } catch (error) {
      console.log(`[fail] ${name}: ${error instanceof Error ? error.message : String(error)} ${url}`);
      ok = false;
    }
  }
  return ok;
}

function printUrls(profileName) {
  const { envPath } = profilePaths(profileName);
  console.log(`[selfhost:urls] profile=${profileName}`);
  if (!fs.existsSync(envPath)) {
    console.log(`[selfhost:urls] .env missing; run corepack pnpm run selfhost:init -- --profile ${profileName}`);
  }
  for (const [label, url] of profileUrls(profileName)) {
    console.log(`- ${label}: ${url}`);
  }
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

function composeConfig(profileName, mode = "quiet") {
  const args = mode === "print" ? ["config"] : ["config", "--quiet"];
  return dockerCompose(profileName, args, "inherit");
}

function printPlan(profileName) {
  const { profile, dir, envPath } = profilePaths(profileName);
  console.log(`[selfhost:plan] profile=${profileName}`);
  console.log(`deploy_dir=${path.relative(ROOT, dir)}`);
  console.log(`env=${path.relative(ROOT, envPath)}`);
  console.log("\nServices:");
  for (const [name, role] of profile.services || []) {
    console.log(`- ${name}: ${role}`);
  }
  console.log("\nURLs:");
  for (const [label, url] of profileUrls(profileName)) {
    console.log(`- ${label}: ${url}`);
  }
  console.log("\nSafety checks:");
  console.log("- run selfhost:init before first up");
  console.log("- run selfhost:preflight before up");
  console.log("- run selfhost:smoke after up");
  console.log("- rotate secrets before public exposure");
  console.log("- keep .env out of git; this tool never prints secret values");
  if (profileName === "public-stack") {
    console.log("- set PUBLIC_SITE_ADDRESS to the real public origin before exposure");
  }
}

function printPreflightRoutes(profileName) {
  const heading = profileName === "public-stack" ? "Public routes" : "Local routes";
  console.log(`\n${heading}`);
  for (const [label, url] of profileUrls(profileName)) {
    console.log(`- ${label}: ${url}`);
  }
}

function publicOrigin(profileName) {
  const { envPath } = profilePaths(profileName);
  if (profileName !== "public-stack" || !fs.existsSync(envPath)) {
    return "http://127.0.0.1";
  }
  const entries = parseEnv(fs.readFileSync(envPath, "utf8"));
  return (entries.get("PUBLIC_SITE_ADDRESS") || "http://127.0.0.1").replace(/\/+$/, "");
}

function checkPublicRouteContract(profileName) {
  if (profileName !== "public-stack") {
    return true;
  }

  const { caddyfilePath } = profilePaths(profileName);
  const origin = publicOrigin(profileName);
  let ok = true;
  console.log("\nPublic route contract");
  for (const [label, routePath] of PUBLIC_STACK_ROUTE_CONTRACT) {
    console.log(`- ${label}: GET ${origin}${routePath}`);
  }

  if (!fs.existsSync(caddyfilePath)) {
    console.log(`[fail] Caddyfile: ${path.relative(ROOT, caddyfilePath)} missing`);
    return false;
  }

  const caddyfile = fs.readFileSync(caddyfilePath, "utf8");
  for (const [, , caddyPattern] of PUBLIC_STACK_ROUTE_CONTRACT) {
    const route = caddyPattern.replace(/^handle(?:_path)?\s+/, "");
    const routeOk = caddyfile.includes(caddyPattern);
    console.log(`[${routeOk ? "ok" : "fail"}] Caddyfile route ${route}`);
    ok &&= routeOk;
  }
  return ok;
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
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `backups/selfhost/${profileName}/${stamp}`;
  console.log(`[selfhost:backup-plan] profile=${profileName}`);
  console.log("This command prints a plan only; it does not copy data.");
  console.log(`1. mkdir -p ${backupDir}`);
  console.log(`2. cp ${path.relative(ROOT, profilePaths(profileName).envPath)} ${backupDir}/.env`);
  console.log("3. Store the copied .env in a private encrypted location.");
  if (["platform", "public-stack", "all-in-one"].includes(profileName)) {
    console.log(`4. docker compose --env-file .env exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > ${backupDir}/postgres.sql`);
  }
  console.log("5. Record image tags and compose config:");
  console.log(`   corepack pnpm run selfhost:config -- --profile ${profileName} > ${backupDir}/compose.config.txt`);
}

function printRotatePlan(profileName) {
  console.log(`[selfhost:rotate-plan] profile=${profileName}`);
  console.log("1. Run backup-plan and take a real database backup first.");
  console.log("2. Schedule downtime or restart window for services using rotated secrets.");
  console.log(`3. Dry-run: corepack pnpm run selfhost:rotate -- --profile ${profileName}`);
  console.log(`4. Apply:   corepack pnpm run selfhost:rotate -- --profile ${profileName} --confirm`);
  console.log(`5. Restart: corepack pnpm run selfhost:down -- --profile ${profileName} && corepack pnpm run selfhost:up -- --profile ${profileName}`);
  console.log("6. Run selfhost:smoke and keep the generated .env rotation backup until validated.");
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
  console.log(`- backup-plan: corepack pnpm run selfhost:backup-plan -- --profile ${profileName}`);
  console.log(`- rotate-plan: corepack pnpm run selfhost:rotate-plan -- --profile ${profileName}`);
  console.log(`- smoke: corepack pnpm run selfhost:smoke -- --profile ${profileName}`);
  console.log("- logs/status/health output must stay secret-redacted.");

  const ok = secretsOk && configOk && routeOk;
  console.log(`[${ok ? "ok" : "fail"}] ${ok ? "ready for public exposure review" : "fix findings before public exposure review"}`);
  return ok;
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
    printUrls(args.profile);
    return;
  }

  if (args.command === "plan") {
    printPlan(args.profile);
    return;
  }

  if (args.command === "preflight") {
    process.exit(preflightProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "config") {
    const result = composeConfig(args.profile, "print");
    process.exit(result.status || 0);
  }

  if (args.command === "status") {
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
    const result = dockerCompose(args.profile, ["down"]);
    process.exit(result.status || 0);
  }

  if (args.command === "logs") {
    const logArgs = ["logs", `--tail=${args.tail || "120"}`];
    if (args.service) {
      logArgs.push(args.service);
    }
    const result = dockerCompose(args.profile, logArgs);
    process.exit(result.status || 0);
  }

  if (args.command === "security-review") {
    process.exit(securityReviewProfile(args.profile) ? 0 : 1);
  }

  if (args.command === "backup-plan") {
    printBackupPlan(args.profile);
    return;
  }

  if (args.command === "rotate-plan") {
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
