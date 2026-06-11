#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { PIPELINES } from "./lib/deployability-pipeline-summaries.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const DOCUMENTS = [
  {
    key: "ecosystem",
    title: "Deployability Ecosystem PRD",
    source_path: "docs/product/deployability-ecosystem-prd.md",
    chinese_source_path: "docs/product/deployability-ecosystem-prd.zh-CN.md",
    authoritative_language: "zh-CN",
    purpose: "Defines the daily-deployable ecosystem goal, personas, ownership boundaries, non-goals, and security defaults."
  },
  {
    key: "pipelines",
    title: "Deployability Pipeline PRDs",
    source_path: "docs/product/deployability-pipelines-prd.md",
    chinese_source_path: "docs/product/deployability-pipelines-prd.zh-CN.md",
    authoritative_language: "zh-CN",
    purpose: "Breaks the ecosystem goal into operator-readable command pipelines with acceptance criteria and verification commands."
  }
];

const AUDIENCES = [
  {
    key: "solo_operator",
    label: "Solo operator",
    need: "Expose one private workflow as a Hotline without learning the full protocol first."
  },
  {
    key: "agent_developer",
    label: "Agent developer",
    need: "Start, inspect, and reset a local caller-skill and MCP loop quickly."
  },
  {
    key: "selfhost_administrator",
    label: "Self-host administrator",
    need: "Manage env, ports, logs, lifecycle, evidence, and public exposure gates."
  },
  {
    key: "brand_site_reader",
    label: "Brand-site reader",
    need: "Understand what can be deployed now and which safety boundaries still apply."
  }
];

const DEPLOYABILITY_OVERVIEW_PIPELINE = {
  key: "deployability_overview",
  label: "Deployability Overview",
  status: "ready_now",
  status_boundary: "read-only management map",
  purpose: "One first map for PRD intent, command discovery, dashboard payloads, roadmap, gates, handoff, and evidence.",
  evidence_commands: [
    "corepack pnpm run deployability:prd",
    "corepack pnpm run deployability:overview",
    "corepack pnpm run deployability:quickstart",
    "corepack pnpm run deployability:commands",
    "corepack pnpm run deployability:dashboard",
    "corepack pnpm run deployability:roadmap"
  ],
  safety_notes: [
    "overview surfaces are read-only and do not execute lifecycle commands",
    "PRD and roadmap views are management metadata, not new business truth sources"
  ]
};

const STATUS_BOUNDARIES = {
  local_agent_loop: "ready-now local development loop",
  all_in_one_demo: "ready-now local evaluation profile",
  selfhost_platform: "ready-now private deployment profile",
  public_stack: "ready-now behind public exposure gates",
  recovery_evidence: "ready-now evidence and recovery path",
  operator_onboarding: "ready-now contract alignment path",
  published_image: "ready-now candidate review path, formal release owned by source repos"
};

const MANAGEMENT_SURFACES = [
  {
    command: "corepack pnpm run deployability:prd",
    json_command: "corepack pnpm --silent run deployability:prd -- --json",
    purpose: "PRD document, audience, pipeline, and safety-boundary index."
  },
  {
    command: "corepack pnpm run deployability:overview",
    json_command: "corepack pnpm --silent run deployability:overview -- --json",
    purpose: "First command map across deployment profiles."
  },
  {
    command: "corepack pnpm run deployability:dashboard",
    json_command: "corepack pnpm --silent run deployability:dashboard -- --json",
    purpose: "Single dashboard payload for management surfaces."
  },
  {
    command: "corepack pnpm run deployability:roadmap",
    json_command: "corepack pnpm --silent run deployability:roadmap -- --json",
    purpose: "Milestone roadmap separating satisfied, gated, blocked, and planned work."
  },
  {
    command: "corepack pnpm run deployability:gates",
    json_command: "corepack pnpm --silent run deployability:gates -- --json",
    purpose: "Public exposure and production hardening gates."
  },
  {
    command: "corepack pnpm run deployability:hardening-plan",
    json_command: "corepack pnpm --silent run deployability:hardening-plan -- --json",
    purpose: "Actionable production hardening plan for owners, stages, blockers, guardrails, and evidence commands."
  },
  {
    command: "corepack pnpm run deployability:console",
    json_command: "corepack pnpm --silent run deployability:console -- --json",
    purpose: "Console management surface index for runtime, settings, logs, billing, public-stack console, and gateway session readiness."
  }
];

const SAFETY_DEFAULTS = [
  "deployability PRD index is read-only and does not read .env files directly",
  "deployability PRD index does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains PRD source, pipeline, command, and safety-boundary metadata without printing secret values",
  "business protocol, client runtime, and platform runtime truth remain in the three formal repositories"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:prd -- --json",
  "corepack pnpm run deployability:roadmap",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run deployability:console",
  "corepack pnpm run deployability:hardening-plan",
  "corepack pnpm run test:deployability"
];

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
}

function runJsonScript(relativeScript) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  let body = null;
  try {
    body = result.stdout.trim() ? JSON.parse(result.stdout) : null;
  } catch (error) {
    body = null;
  }
  return {
    ok: result.status === 0 && body != null && body.ok !== false,
    exit_code: result.status,
    stderr: result.stderr.trim().split("\n").filter(Boolean),
    body,
    parse_error: body == null ? "source did not emit valid JSON" : null
  };
}

function sourceBlocker(label, result) {
  if (result.ok) return null;
  return `${label}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`;
}

function pipelineIndex() {
  return [
    DEPLOYABILITY_OVERVIEW_PIPELINE,
    ...PIPELINES.map((pipeline) => ({
      key: pipeline.key,
      label: pipeline.label,
      status: pipeline.status,
      status_boundary: STATUS_BOUNDARIES[pipeline.key] || pipeline.status,
      purpose: pipeline.purpose,
      evidence_commands: pipeline.commands || [],
      json_commands: pipeline.json_commands || [],
      safety_notes: pipeline.safety_notes || []
    }))
  ];
}

function prdData() {
  const compatibility = runJsonScript("tools/compat-status.mjs");
  const blockers = [sourceBlocker("compatibility", compatibility)].filter(Boolean);

  return {
    command: "deployability:prd",
    mode: "prd_index",
    ok: blockers.length === 0,
    goal: "daily-deployable with explicit safety gates",
    current_bundle: compatibility.body?.current_bundle || null,
    documents: DOCUMENTS,
    audiences: AUDIENCES,
    pipelines: pipelineIndex(),
    management_surfaces: MANAGEMENT_SURFACES,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    blockers,
    warnings: compatibility.body?.warnings || [],
    notes: [
      "use this as the PRD entry point before roadmap, dashboard, or profile-specific runbooks",
      "planned production hardening remains visible but does not turn public production readiness green"
    ]
  };
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

function printText(data) {
  console.log("Deployability PRD index");
  console.log("=======================");
  console.log(`${data.goal}\n`);

  console.log("Documents:");
  for (const doc of data.documents) {
    console.log(`- ${doc.key}: ${doc.source_path} (source: ${doc.chinese_source_path})`);
  }

  console.log("\nPipelines:");
  for (const pipeline of data.pipelines) {
    console.log(`- ${pipeline.key}: ${pipeline.status_boundary}`);
  }

  console.log("\nManagement surfaces:");
  for (const surface of data.management_surfaces) {
    console.log(`- ${surface.command}`);
    console.log(`  JSON: ${surface.json_command}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = prdData();
  if (args.json) {
    printJson(data);
  } else {
    printText(data);
  }
  process.exitCode = data.ok ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
