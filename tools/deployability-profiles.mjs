#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { recommendedProfileKeys } from "./lib/deployability-profile-attention.mjs";
import { profileDirectory, resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability profile catalog is read-only and does not read .env files directly",
  "deployability profile catalog only calls read-only deployability dashboard metadata",
  "deployability profile catalog does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains profile metadata, attention ranking, and next commands without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:action-plan",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run test:deployability"
];

function parseArgs(argv) {
  const args = {
    json: false,
    profile: null
  };
  const values = argv.slice(2);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--profile") {
      args.profile = values[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--profile=")) {
      args.profile = value.slice("--profile=".length);
    }
  }
  return args;
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

function buildProfileCards({ dashboard, profileFilter }) {
  if (profileFilter.resolved == null && profileFilter.requested != null) return [];

  const profileByKey = new Map(profileDirectory({ includeLabel: true }).map((profile) => [profile.key, profile]));
  return (dashboard.profile_summaries || [])
    .filter((summary) => profileFilter.resolved == null || summary.key === profileFilter.resolved)
    .map((summary) => {
      const profile = profileByKey.get(summary.key) || {};
      return {
        key: summary.key,
        aliases: summary.aliases || profile.aliases || [],
        label: profile.label || summary.key,
        pipeline_key: summary.pipeline_key,
        purpose: summary.purpose || profile.purpose || "",
        status: summary.status,
        attention: summary.attention,
        command_count: summary.command_count,
        json_command_count: summary.json_command_count,
        catalog_command_count: summary.catalog_command_count,
        dashboard_safe_command_count: summary.dashboard_safe_command_count,
        ci_safe_command_count: summary.ci_safe_command_count,
        public_exposure_gate_count: summary.public_exposure_gate_count,
        next_commands: summary.next_commands || [],
        next_json_commands: summary.next_json_commands || [],
        safety_notes: summary.safety_notes || []
      };
    });
}

function profilesData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const dashboardResult = runJsonScript("tools/deployability-dashboard.mjs");
  const blockers = [
    ...(args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...(!dashboardResult.ok
      ? [`dashboard: ${dashboardResult.parse_error || dashboardResult.stderr.join("; ") || `exit=${dashboardResult.exit_code}`}`]
      : [])
  ];
  const dashboard = dashboardResult.body || {};
  const profiles = buildProfileCards({ dashboard, profileFilter });

  return {
    command: "deployability:profiles",
    mode: "profile_catalog",
    ok: blockers.length === 0,
    current_bundle: dashboard.current_bundle || null,
    ecosystem_readiness: dashboard.ecosystem_readiness || null,
    profile_filter: profileFilter,
    profiles,
    recommended_profile_keys: recommendedProfileKeys(profiles),
    blockers,
    warnings: dashboard.warnings || [],
    source_status: {
      dashboard: {
        ok: dashboardResult.ok,
        exit_code: dashboardResult.exit_code,
        stderr: dashboardResult.stderr,
        parse_error: dashboardResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the read-only profile catalog for management UIs, CI dashboards, and operator docs",
      "profile cards are derived from deployability dashboard summaries and the shared profile registry"
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
  console.log("Deployability profiles");
  console.log("======================");
  console.log("Read-only profile catalog with attention ranking and next commands.\n");
  if (data.profile_filter.requested != null) {
    console.log(`profile=${JSON.stringify(data.profile_filter)}`);
    console.log("");
  }

  for (const profile of data.profiles) {
    console.log(`- ${profile.key}: ${profile.label}`);
    console.log(`  status: ${profile.status}`);
    console.log(`  aliases: ${profile.aliases.join(", ")}`);
    console.log(`  pipeline: ${profile.pipeline_key}`);
    console.log(`  attention=${profile.attention?.level || "unknown"}; rank=${profile.attention?.rank ?? "unknown"}`);
    console.log(`  purpose: ${profile.purpose}`);
    for (const command of profile.next_commands.slice(0, 3)) {
      console.log(`  next: ${command}`);
    }
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = profilesData(args);
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
