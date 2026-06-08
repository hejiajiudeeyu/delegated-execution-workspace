#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const PROFILE_PIPELINES = [
  {
    key: "daily_dev",
    label: "Daily Development",
    pipeline_key: "local_agent_loop",
    purpose: "Start with the local caller-skill and MCP development loop."
  },
  {
    key: "all_in_one_demo",
    label: "All-in-One Demo",
    pipeline_key: "all_in_one_demo",
    purpose: "Evaluate the full product shape on one machine before splitting components."
  },
  {
    key: "selfhost_platform",
    label: "Selfhost Platform",
    pipeline_key: "selfhost_platform",
    purpose: "Prepare and manage the private platform profile."
  },
  {
    key: "public_stack",
    label: "Public Stack",
    pipeline_key: "public_stack",
    purpose: "Review public exposure gates before opening edge routes."
  },
  {
    key: "recovery_evidence",
    label: "Recovery & Evidence",
    pipeline_key: "recovery_evidence",
    purpose: "Prepare handoff, audit, backup, restore rehearsal, and rotation evidence."
  },
  {
    key: "operator_onboarding",
    label: "Operator Onboarding",
    pipeline_key: "operator_onboarding",
    purpose: "Follow the public-stack first-use operator path."
  },
  {
    key: "published_image",
    label: "Published Image",
    pipeline_key: "published_image",
    purpose: "Review published-image smoke metadata before running Docker."
  }
];

const SAFETY_DEFAULTS = [
  "deployability action plan is read-only and does not read .env files directly",
  "deployability action plan only calls read-only deployability metadata commands",
  "deployability action plan does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains profile action metadata without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function runJsonScript(relativeScript) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployability-action-plan-"));
  const stdoutPath = path.join(tmpDir, "stdout.json");
  const stdoutFd = fs.openSync(stdoutPath, "w");
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", stdoutFd, "pipe"],
    env: process.env
  });
  fs.closeSync(stdoutFd);
  const stdout = fs.readFileSync(stdoutPath, "utf8");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  let body = null;
  try {
    body = stdout.trim() ? JSON.parse(stdout) : null;
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

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function commandsForPipeline(commands, pipelineKey) {
  return commands.filter((item) => (item.pipeline_keys || []).includes(pipelineKey));
}

function commandNames(commands) {
  return unique(commands.map((item) => item.command));
}

function buildProfiles({ dashboard, commandCatalog }) {
  return PROFILE_PIPELINES.map((profile) => {
    const summary = dashboard.pipeline_summaries.find((item) => item.key === profile.pipeline_key) || null;
    const commands = commandsForPipeline(commandCatalog.commands || [], profile.pipeline_key);
    const dashboardSafe = commands.filter((item) => item.dashboard_safe === true);
    const publicExposure = commands.filter((item) => item.public_exposure_gate === true);
    const serviceTouching = commands.filter(
      (item) => item.starts_services === true || item.stops_services === true || item.calls_docker === true
    );

    return {
      key: profile.key,
      label: profile.label,
      pipeline_key: profile.pipeline_key,
      purpose: profile.purpose,
      status: summary?.status || "unknown",
      summary: summary
        ? {
            command_count: summary.command_count,
            json_command_count: summary.json_command_count,
            catalog_command_count: summary.catalog_command_count,
            dashboard_safe_command_count: summary.dashboard_safe_command_count,
            ci_safe_command_count: summary.ci_safe_command_count,
            public_exposure_gate_count: summary.public_exposure_gate_count
          }
        : null,
      recommended_commands: summary?.next_commands || commandNames(commands),
      next_json_commands: summary?.next_json_commands || unique(commands.map((item) => item.json_command)),
      dashboard_safe_commands: commandNames(dashboardSafe),
      public_exposure_gate_commands: commandNames(publicExposure),
      service_touching_commands: commandNames(serviceTouching),
      safety_notes: unique([...(summary?.safety_notes || []), ...commands.flatMap((item) => item.notes || [])])
    };
  });
}

function actionPlanData() {
  const dashboardResult = runJsonScript("tools/deployability-dashboard.mjs");
  const commandCatalogResult = runJsonScript("tools/deployability-commands.mjs");
  const sourceResults = {
    dashboard: dashboardResult,
    commands: commandCatalogResult
  };
  const blockers = Object.entries(sourceResults)
    .filter(([, result]) => !result.ok)
    .map(([key, result]) => `${key}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`);

  const dashboard = dashboardResult.body || {};
  const commandCatalog = commandCatalogResult.body || { commands: [] };

  return {
    command: "deployability:action-plan",
    ok: blockers.length === 0,
    current_bundle: dashboard.current_bundle || null,
    ecosystem_readiness: dashboard.ecosystem_readiness || null,
    source_status: Object.fromEntries(
      Object.entries(sourceResults).map(([key, result]) => [
        key,
        {
          ok: result.ok,
          exit_code: result.exit_code,
          stderr: result.stderr,
          parse_error: result.parse_error
        }
      ])
    ),
    profiles: buildProfiles({ dashboard, commandCatalog }),
    blockers,
    warnings: unique(dashboard.warnings || []),
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the operator-facing action plan for choosing the next deployability command",
      "profile-specific doctor, readiness, preflight, status, smoke, audit, backup, and rotation commands remain authoritative"
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
  console.log("Deployability action plan");
  console.log("=========================");
  console.log("Read-only operator action plan for choosing the next deployability command.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`ecosystem=${data.ecosystem_readiness?.status || "unknown"}`);
  console.log(`state=${data.ok ? "ready" : "blocked"}`);

  console.log("\nProfiles:");
  for (const profile of data.profiles) {
    const summary = profile.summary || {};
    console.log(`- ${profile.key}: ${profile.status}`);
    console.log(`  purpose: ${profile.purpose}`);
    console.log(
      `  commands=${summary.command_count || 0}; json=${summary.json_command_count || 0}; dashboard-safe=${summary.dashboard_safe_command_count || 0}; public-exposure-gates=${summary.public_exposure_gate_count || 0}`
    );
    for (const command of profile.recommended_commands.slice(0, 3)) {
      console.log(`  next: ${command}`);
    }
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nSafety defaults:");
  for (const note of data.safety_defaults) console.log(`- ${note}`);

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = actionPlanData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exit(data.ok ? 0 : 1);
