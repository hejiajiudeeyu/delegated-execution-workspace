#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildEcosystemReadiness } from "./lib/deployability-ecosystem-readiness.mjs";
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
  "corepack pnpm run deployability:action-plan",
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

function doctorCheckOk(sections, key) {
  return sections.doctor?.checks?.some((item) => item.key === key && item.ok === true) || false;
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
    profile_selector: sections.commands?.filters?.profiles || [],
    ecosystem_readiness: buildEcosystemReadiness({
      catalogCommands: sections.commands?.commands || [],
      brandSiteOk: doctorCheckOk(sections, "brand_site_alignment") && doctorCheckOk(sections, "brand_site_content_smoke")
    }),
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

  if (data.profile_selector.length) {
    console.log("\nProfile selector:");
    for (const profile of data.profile_selector) {
      console.log(`- ${profile.key} -> ${profile.pipeline_key}; aliases=${profile.aliases.join(", ")}`);
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
process.exitCode = data.ok ? 0 : 1;
