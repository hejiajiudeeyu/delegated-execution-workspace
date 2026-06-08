#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildPipelineSummaries } from "./lib/deployability-pipeline-summaries.mjs";

const ROOT = process.cwd();

const SECTION_SCRIPTS = [
  ["overview", "tools/deployability-overview.mjs"],
  ["quickstart", "tools/deployability-quickstart.mjs"],
  ["safety", "tools/deployability-safety.mjs"],
  ["commands", "tools/deployability-commands.mjs"],
  ["doctor", "tools/deployability-doctor.mjs"],
  ["compatibility", "tools/compat-status.mjs"]
];

const SAFETY_DEFAULTS = [
  "deployability dashboard is read-only and does not read .env files directly",
  "deployability dashboard only calls read-only top-level metadata commands",
  "deployability dashboard does not call Docker, bind ports, or probe network endpoints",
  "JSON output combines existing clean JSON sections without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:doctor",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run selfhost:readiness -- --all",
  "corepack pnpm run operator:onboarding:plan",
  "corepack pnpm run check:submodules",
  "corepack pnpm run check:bundles"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function runJsonScript(relativeScript) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env
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
    parse_error: body == null ? "section did not emit valid JSON" : null
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function commandCatalog(sections) {
  return sections.commands?.commands || [];
}

function hasCommand(sections, command) {
  return commandCatalog(sections).some((item) => item.command === command || item.json_command === command);
}

function doctorCheckOk(sections, key) {
  return sections.doctor?.checks?.some((item) => item.key === key && item.ok === true) || false;
}

function readinessCheck(key, label, evidence, ok, nextCommands = []) {
  return {
    key,
    label,
    ok,
    evidence,
    next_commands: nextCommands
  };
}

function ecosystemReadiness(sections) {
  const checks = [
    readinessCheck(
      "profile_choice",
      "operator can choose a named deployment profile",
      [
        "corepack pnpm run deployability:overview",
        "corepack pnpm run selfhost:profiles",
        "corepack pnpm run selfhost:quickstart"
      ],
      hasCommand(sections, "corepack pnpm run deployability:overview") &&
        hasCommand(sections, "corepack pnpm run selfhost:profiles") &&
        hasCommand(sections, "corepack pnpm run selfhost:quickstart"),
      ["corepack pnpm run selfhost:profiles", "corepack pnpm run selfhost:quickstart"]
    ),
    readinessCheck(
      "secret_generation",
      "operator can generate or harden local secrets without printing values",
      ["corepack pnpm run selfhost:init", "corepack pnpm --silent run selfhost:init -- --json"],
      hasCommand(sections, "corepack pnpm run selfhost:init") &&
        hasCommand(sections, "corepack pnpm --silent run selfhost:init -- --json"),
      ["corepack pnpm run selfhost:init"]
    ),
    readinessCheck(
      "startup_path",
      "operator can start the selected profile through documented lifecycle commands",
      [
        "corepack pnpm run dev:local:up",
        "corepack pnpm run selfhost:up",
        "corepack pnpm run selfhost:up -- --profile public-stack"
      ],
      hasCommand(sections, "corepack pnpm run dev:local:up") &&
        hasCommand(sections, "corepack pnpm run selfhost:up") &&
        hasCommand(sections, "corepack pnpm run selfhost:up -- --profile public-stack"),
      ["corepack pnpm run dev:local:up", "corepack pnpm run selfhost:up"]
    ),
    readinessCheck(
      "doctor_path",
      "operator can run doctor/readiness commands before claiming readiness",
      ["corepack pnpm run deployability:doctor", "corepack pnpm run dev:doctor", "corepack pnpm run selfhost:doctor"],
      hasCommand(sections, "corepack pnpm run deployability:doctor") &&
        hasCommand(sections, "corepack pnpm run dev:doctor") &&
        hasCommand(sections, "corepack pnpm run selfhost:doctor"),
      ["corepack pnpm run deployability:doctor", "corepack pnpm run selfhost:readiness"]
    ),
    readinessCheck(
      "runtime_inspection",
      "operator can inspect logs and runtime state from one command surface",
      [
        "corepack pnpm run dev:local:status",
        "corepack pnpm run dev:local:logs",
        "corepack pnpm run selfhost:status",
        "corepack pnpm run selfhost:logs"
      ],
      hasCommand(sections, "corepack pnpm run dev:local:status") &&
        hasCommand(sections, "corepack pnpm run dev:local:logs") &&
        hasCommand(sections, "corepack pnpm run selfhost:status") &&
        hasCommand(sections, "corepack pnpm run selfhost:logs"),
      ["corepack pnpm run dev:local:status", "corepack pnpm run selfhost:status"]
    ),
    readinessCheck(
      "boundary_understanding",
      "operator can understand local/public, metadata, secret, and safety boundaries",
      [
        "corepack pnpm run deployability:safety",
        "corepack pnpm run deployability:commands",
        "corepack pnpm run deployability:handoff",
        "corepack pnpm run compat:status"
      ],
      hasCommand(sections, "corepack pnpm run deployability:safety") &&
        hasCommand(sections, "corepack pnpm run deployability:commands") &&
        hasCommand(sections, "corepack pnpm run compat:status"),
      ["corepack pnpm run deployability:safety", "corepack pnpm run deployability:handoff"]
    ),
    readinessCheck(
      "brand_site_story",
      "operator can find the same deployment story on the public brand site",
      [
        "repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx",
        "repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx",
        "npm run smoke:deployability-content"
      ],
      doctorCheckOk(sections, "brand_site_alignment") && doctorCheckOk(sections, "brand_site_content_smoke"),
      ["corepack pnpm run deployability:doctor"]
    )
  ];
  return {
    goal: "daily-deployable",
    status: checks.every((item) => item.ok) ? "daily_deployable_with_safety_gates" : "blocked",
    checks,
    safety_notes: [
      "public-stack remains ready-now with safety gates, not automatically public-exposure ready",
      "billing, email transport, and marketplace production readiness stay outside this scorecard until their own gates pass"
    ]
  };
}

function dashboardData() {
  const sectionResults = SECTION_SCRIPTS.map(([key, script]) => [key, runJsonScript(script)]);
  const sections = Object.fromEntries(sectionResults.map(([key, result]) => [key, result.body]));
  const sectionStatus = Object.fromEntries(
    sectionResults.map(([key, result]) => [
      key,
      {
        ok: result.ok,
        exit_code: result.exit_code,
        stderr: result.stderr,
        parse_error: result.parse_error
      }
    ])
  );
  const sectionFailures = sectionResults
    .filter(([, result]) => !result.ok)
    .map(([key, result]) => `${key}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`);
  const sectionBlockers = sectionResults.flatMap(([key, result]) => {
    const blockers = result.body?.blockers || [];
    return blockers.map((blocker) => `${key}: ${blocker}`);
  });
  const warnings = unique(
    sectionResults.flatMap(([key, result]) => {
      const warningsForSection = result.body?.warnings || [];
      return warningsForSection.map((warning) => `${warning}`);
    })
  );
  const blockers = [...sectionFailures, ...sectionBlockers];
  const currentBundle = sections.compatibility?.current_bundle || sections.doctor?.checks?.[0]?.data?.current_bundle || null;

  return {
    command: "deployability:dashboard",
    ok: blockers.length === 0,
    current_bundle: currentBundle,
    sections,
    section_status: sectionStatus,
    ecosystem_readiness: ecosystemReadiness(sections),
    pipeline_summaries: buildPipelineSummaries({
      pipelines: sections.overview?.pipelines || [],
      catalogCommands: sections.commands?.commands || []
    }),
    blockers,
    warnings,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the single dashboard payload for the top-level deployability surface",
      "profile-specific doctor, readiness, preflight, status, smoke, and audit commands remain authoritative"
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
  console.log("Deployability dashboard");
  console.log("=======================");
  console.log("Read-only combined payload for top-level deployability dashboards and CI.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`state=${data.ok ? "ready" : "blocked"}`);
  console.log("");

  for (const [key, status] of Object.entries(data.section_status)) {
    console.log(`${key}: ${status.ok ? "ok" : "blocked"} exit=${status.exit_code}`);
  }

  if (data.pipeline_summaries.length) {
    console.log("\nEcosystem readiness:");
    console.log(`- goal=${data.ecosystem_readiness.goal}`);
    console.log(`- status=${data.ecosystem_readiness.status}`);
    for (const check of data.ecosystem_readiness.checks) {
      console.log(`- ${check.key}: ${check.ok ? "ok" : "blocked"}`);
    }

    console.log("\nPipeline summaries:");
    for (const pipeline of data.pipeline_summaries) {
      console.log(
        `- ${pipeline.key}: ${pipeline.status}; commands=${pipeline.command_count}; json=${pipeline.json_command_count}; dashboard-safe=${pipeline.dashboard_safe_command_count}; exposure-gates=${pipeline.public_exposure_gate_count}`
      );
    }
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("\nSafety defaults:");
  for (const note of data.safety_defaults) {
    console.log(`- ${note}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) {
    console.log(`- ${command}`);
  }
}

const args = parseArgs(process.argv);
const data = dashboardData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exit(data.ok ? 0 : 1);
