import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

let failures = 0;

function mark(name, ok, detail = "") {
  const icon = ok ? "ok" : "fail";
  console.log(`[${icon}] ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) {
    failures += 1;
  }
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) }
  });
}

async function fetchJson(url) {
  try {
    const response = await fetch(url);
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
  }
}

function checkCommand(command, args, name) {
  const result = run(command, args);
  mark(name, result.status === 0, result.status === 0 ? result.stdout.trim().split("\n")[0] : result.stderr.trim());
}

function checkSubmodules() {
  const result = run("git", ["submodule", "status", "--recursive"]);
  const output = result.stdout.trim();
  const bad = output
    .split("\n")
    .filter(Boolean)
    .filter((line) => ["-", "+"].includes(line[0]));
  mark("submodule gitlinks", result.status === 0 && bad.length === 0, bad.length ? bad.join("; ") : "clean");
}

function checkPlatformEnv() {
  const envPath = path.join(ROOT, "repos/platform/deploy/platform/.env");
  const examplePath = path.join(ROOT, "repos/platform/deploy/platform/.env.example");
  mark("platform env file", fs.existsSync(envPath), fs.existsSync(envPath) ? envPath : `missing; copy ${examplePath}`);
}

function checkDocker() {
  checkCommand("docker", ["--version"], "docker cli");
  const info = run("docker", ["info"]);
  mark("docker daemon", info.status === 0, info.status === 0 ? "reachable" : "not reachable");
}

async function checkHealth(name, url) {
  const response = await fetchJson(url);
  mark(name, response.ok, `status=${response.status}`);
  return response;
}

async function checkCallerSkillSurface() {
  const manifest = await fetchJson("http://127.0.0.1:8091/skills/caller/manifest");
  if (!manifest.ok) {
    mark("caller-skill manifest", false, `status=${manifest.status}`);
    return;
  }
  const actions = new Set((manifest.body?.actions || []).map((action) => action.name));
  const missing = [...REQUIRED_ACTIONS].filter((action) => !actions.has(action));
  mark("caller-skill six-action manifest", missing.length === 0, missing.length ? `missing=${missing.join(",")}` : "complete");
}

async function postJson(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
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
  }
}

async function checkCatalog() {
  const search = await postJson("http://127.0.0.1:8091/skills/caller/search-hotlines-brief", {
    task_type: "text_summarize",
    task_goal: "summarize workspace status",
    limit: 8
  });
  if (!search.ok) {
    mark("example hotline search", false, `status=${search.status}`);
    return;
  }
  const items = search.body?.items || [];
  const target = items.find((item) => item.hotline_id === TEST_HOTLINE_ID);
  mark("example hotline available", Boolean(target), `count=${items.length} hotline=${TEST_HOTLINE_ID}`);
}

async function main() {
  console.log("Delegated Execution daily dev doctor");
  console.log("======================================");

  checkCommand("node", ["--version"], "node");
  checkCommand("corepack", ["--version"], "corepack");
  checkCommand("git", ["--version"], "git");
  checkSubmodules();
  checkPlatformEnv();
  checkDocker();

  console.log("\nRuntime health");
  await checkHealth("platform api", "http://127.0.0.1:8080/healthz");
  await checkHealth("ops supervisor", "http://127.0.0.1:8079/status");
  await checkHealth("caller-skill adapter", "http://127.0.0.1:8091/healthz");
  await checkHealth("mcp adapter", "http://127.0.0.1:8092/healthz");

  console.log("\nCaller-skill surface");
  await checkCallerSkillSurface();
  await checkCatalog();

  if (failures > 0) {
    console.log(`\nDoctor failed with ${failures} issue(s).`);
    console.log("Boot order: corepack pnpm run dev:platform, dev:relay, dev:client:bootstrap, dev:client:supervisor.");
    process.exit(1);
  }
  console.log("\nDoctor passed. Daily local agent/caller-skill development path is ready.");
}

await main();
