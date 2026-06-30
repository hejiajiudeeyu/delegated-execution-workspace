import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();
const REQUIRED_ACTIONS = new Set([
  "search_hotlines_brief",
  "search_hotlines_detailed",
  "read_hotline",
  "prepare_request",
  "send_request",
  "report_response"
]);
const TEST_HOTLINE_ID = process.env.AGENT_E2E_HOTLINE_ID || "local.delegated-execution.workspace-summary.v1";
const HTTP_TIMEOUT_MS = Number(process.env.DEV_DOCTOR_HTTP_TIMEOUT_MS || "2000");

const URLS = {
  platformHealth: process.env.DEV_DOCTOR_PLATFORM_HEALTH_URL || "http://127.0.0.1:8080/healthz",
  supervisorStatus: process.env.DEV_DOCTOR_SUPERVISOR_STATUS_URL || "http://127.0.0.1:8079/status",
  callerSkillHealth: process.env.DEV_DOCTOR_CALLER_SKILL_HEALTH_URL || "http://127.0.0.1:8091/healthz",
  callerSkillManifest: process.env.DEV_DOCTOR_CALLER_SKILL_MANIFEST_URL || "http://127.0.0.1:8091/skills/caller/manifest",
  callerSkillSearch: process.env.DEV_DOCTOR_CALLER_SKILL_SEARCH_URL || "http://127.0.0.1:8091/skills/caller/search-hotlines-brief",
  mcpHealth: process.env.DEV_DOCTOR_MCP_HEALTH_URL || "http://127.0.0.1:8092/healthz"
};

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) }
  });
}

function firstLine(text) {
  return text.trim().split("\n").filter(Boolean)[0] || "";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: text ? JSON.parse(text) : null
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: text ? JSON.parse(text) : null
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function checkCommand(command, args, key, label) {
  const result = run(command, args);
  return {
    key,
    label,
    ok: result.status === 0,
    detail: result.status === 0 ? firstLine(result.stdout) : firstLine(result.stderr) || `exit=${result.status}`,
    section: "prerequisites"
  };
}

function checkSubmodules() {
  const result = run("git", ["submodule", "status", "--recursive"]);
  const output = result.stdout.trim();
  const bad = output
    .split("\n")
    .filter(Boolean)
    .filter((line) => ["-", "+"].includes(line[0]));
  return {
    key: "submodule_gitlinks",
    label: "submodule gitlinks",
    ok: result.status === 0 && bad.length === 0,
    detail: bad.length ? bad.join("; ") : "clean",
    section: "prerequisites"
  };
}

function checkPlatformEnv() {
  const envPath = path.join(ROOT, "repos/platform/deploy/platform/.env");
  const examplePath = path.join(ROOT, "repos/platform/deploy/platform/.env.example");
  return {
    key: "platform_env_file",
    label: "platform env file",
    ok: fs.existsSync(envPath),
    detail: fs.existsSync(envPath) ? path.relative(ROOT, envPath) : `missing; copy ${path.relative(ROOT, examplePath)}`,
    section: "prerequisites"
  };
}

function dockerChecks() {
  const version = checkCommand("docker", ["--version"], "docker_cli", "docker cli");
  const info = run("docker", ["info"]);
  return [
    version,
    {
      key: "docker_daemon",
      label: "docker daemon",
      ok: info.status === 0,
      detail: info.status === 0 ? "reachable" : "not reachable",
      section: "prerequisites"
    }
  ];
}

async function healthCheck(key, label, url) {
  const response = await fetchJson(url);
  return {
    key,
    label,
    ok: response.ok,
    detail: `status=${response.status}`,
    section: "runtime_health",
    url
  };
}

async function callerSkillManifestCheck() {
  const manifest = await fetchJson(URLS.callerSkillManifest);
  if (!manifest.ok) {
    return {
      key: "caller_skill_six_action_manifest",
      label: "caller-skill six-action manifest",
      ok: false,
      detail: `status=${manifest.status}`,
      section: "caller_skill_surface",
      url: URLS.callerSkillManifest
    };
  }
  const actions = new Set((manifest.body?.actions || []).map((action) => action.name));
  const missing = [...REQUIRED_ACTIONS].filter((action) => !actions.has(action));
  return {
    key: "caller_skill_six_action_manifest",
    label: "caller-skill six-action manifest",
    ok: missing.length === 0,
    detail: missing.length ? `missing=${missing.join(",")}` : "complete",
    section: "caller_skill_surface",
    url: URLS.callerSkillManifest
  };
}

async function catalogCheck() {
  const search = await postJson(URLS.callerSkillSearch, {
    task_type: "workspace_diagnose",
    task_goal: "diagnose workspace status",
    limit: 8
  });
  if (!search.ok) {
    return {
      key: "example_hotline_available",
      label: "example hotline search",
      ok: false,
      detail: `status=${search.status}`,
      section: "caller_skill_surface",
      url: URLS.callerSkillSearch
    };
  }
  const items = search.body?.items || [];
  const target = items.find((item) => item.hotline_id === TEST_HOTLINE_ID);
  return {
    key: "example_hotline_available",
    label: "example hotline available",
    ok: Boolean(target),
    detail: `count=${items.length} hotline=${TEST_HOTLINE_ID}`,
    section: "caller_skill_surface",
    url: URLS.callerSkillSearch
  };
}

async function doctorData() {
  const checks = [
    checkCommand("node", ["--version"], "node", "node"),
    checkCommand("corepack", ["--version"], "corepack", "corepack"),
    checkCommand("git", ["--version"], "git", "git"),
    checkSubmodules(),
    checkPlatformEnv(),
    ...dockerChecks(),
    await healthCheck("platform_api", "platform api", URLS.platformHealth),
    await healthCheck("ops_supervisor", "ops supervisor", URLS.supervisorStatus),
    await healthCheck("caller_skill_adapter", "caller-skill adapter", URLS.callerSkillHealth),
    await healthCheck("mcp_adapter", "mcp adapter", URLS.mcpHealth),
    await callerSkillManifestCheck(),
    await catalogCheck()
  ];
  const blockers = checks.filter((check) => !check.ok).map((check) => `${check.label}: ${check.detail}`);
  return {
    command: "dev:doctor",
    ok: blockers.length === 0,
    checks,
    blockers,
    next_commands: blockers.length
      ? [
          "corepack pnpm run dev:platform",
          "corepack pnpm run dev:relay",
          "corepack pnpm run dev:client:bootstrap",
          "corepack pnpm run dev:client:supervisor"
        ]
      : ["corepack pnpm run test:agent-e2e", "corepack pnpm run mcp:golden-four"],
    notes: [
      "checks daily local agent/caller-skill development prerequisites and runtime health",
      "JSON output avoids raw service logs and secret values",
      "use dev:local:* --json for lifecycle metadata"
    ]
  };
}

function printText(data) {
  console.log("Delegated Execution daily dev doctor");
  console.log("======================================");

  for (const section of ["prerequisites", "runtime_health", "caller_skill_surface"]) {
    if (section === "runtime_health") {
      console.log("\nRuntime health");
    }
    if (section === "caller_skill_surface") {
      console.log("\nCaller-skill surface");
    }
    for (const check of data.checks.filter((item) => item.section === section)) {
      console.log(`[${check.ok ? "ok" : "fail"}] ${check.label}${check.detail ? `: ${check.detail}` : ""}`);
    }
  }

  if (!data.ok) {
    console.log(`\nDoctor failed with ${data.blockers.length} issue(s).`);
    console.log("Boot order: corepack pnpm run dev:platform, dev:relay, dev:client:bootstrap, dev:client:supervisor.");
    return;
  }
  console.log("\nDoctor passed. Daily local agent/caller-skill development path is ready.");
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

const args = parseArgs(process.argv);
const data = await doctorData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exit(data.ok ? 0 : 1);
