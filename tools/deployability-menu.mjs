#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { profileDirectory, resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability menu is read-only and does not read .env files directly",
  "deployability menu only calls read-only deployability profile, dashboard, and runbook metadata",
  "deployability menu does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains operator menu choices and next commands without printing secret values"
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

function runJsonScript(relativeScript, extraArgs = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json", ...extraArgs], {
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

function commandProfileAlias(profile) {
  return (profile.aliases || []).find((alias) => alias.includes("-")) || profile.key.replace(/_/g, "-");
}

function buildChoice(profile) {
  const alias = commandProfileAlias(profile);
  return {
    key: profile.key,
    aliases: profile.aliases || [],
    label: profile.label || profile.key,
    purpose: profile.purpose || "",
    pipeline_key: profile.pipeline_key,
    status: profile.status,
    attention: profile.attention || null,
    requires_gate: profile.attention?.level === "safety_gate" || (profile.public_exposure_gate_count || 0) > 0,
    command_count: profile.command_count,
    dashboard_safe_command_count: profile.dashboard_safe_command_count,
    public_exposure_gate_count: profile.public_exposure_gate_count,
    safety_notes: profile.safety_notes || [],
    commands: {
      primary: profile.attention?.primary_command || profile.next_commands?.[0] || null,
      primary_json: profile.attention?.primary_json_command || profile.next_json_commands?.[0] || null,
      profile_catalog: `corepack pnpm run deployability:profiles -- --profile ${alias}`,
      action_plan: `corepack pnpm run deployability:action-plan -- --profile ${alias}`,
      runbook: `corepack pnpm run deployability:runbook -- --profile ${alias}`,
      dashboard: `corepack pnpm run deployability:dashboard -- --profile ${alias}`,
      handoff: `corepack pnpm run deployability:handoff -- --profile ${alias}`,
      command_catalog: `corepack pnpm run deployability:commands -- --profile ${alias}`
    }
  };
}

function menuData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const profileArgs = args.profile == null ? [] : ["--profile", args.profile];
  const profilesResult = runJsonScript("tools/deployability-profiles.mjs", profileArgs);
  const runbookResult =
    args.profile == null || profileFilter.resolved == null
      ? null
      : runJsonScript("tools/deployability-runbook.mjs", ["--profile", args.profile]);
  const sourceBlockers = [
    sourceBlocker("profiles", profilesResult),
    ...(runbookResult ? [sourceBlocker("runbook", runbookResult)] : [])
  ].filter(Boolean);
  const blockers = [
    ...(args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...sourceBlockers.filter((blocker) => !blocker.includes(`unknown profile: ${args.profile}`))
  ];
  const profiles = blockers.length ? [] : profilesResult.body?.profiles || [];
  const choices = profiles.map(buildChoice);
  const selectedProfile = choices[0] || null;

  return {
    command: "deployability:menu",
    mode: args.profile == null ? "operator_menu" : "operator_menu_profile",
    ok: blockers.length === 0,
    current_bundle: profilesResult.body?.current_bundle || null,
    ecosystem_readiness: profilesResult.body?.ecosystem_readiness || null,
    profile_filter: profileFilter,
    selected_profile: selectedProfile,
    selected_runbook: runbookResult?.body
      ? {
          phase_order: runbookResult.body.phase_order,
          phases: runbookResult.body.phases,
          next_commands: runbookResult.body.next_commands
        }
      : null,
    recommended_profile_keys: profilesResult.body?.recommended_profile_keys || [],
    choices,
    blockers,
    warnings: profilesResult.body?.warnings || [],
    source_status: {
      profiles: {
        ok: profilesResult.ok,
        exit_code: profilesResult.exit_code,
        stderr: profilesResult.stderr,
        parse_error: profilesResult.parse_error
      },
      ...(runbookResult
        ? {
            runbook: {
              ok: runbookResult.ok,
              exit_code: runbookResult.exit_code,
              stderr: runbookResult.stderr,
              parse_error: runbookResult.parse_error
            }
          }
        : {})
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      "corepack pnpm run deployability:menu -- --profile public-stack",
      "corepack pnpm --silent run deployability:menu -- --profile public-stack --json",
      "corepack pnpm run deployability:profiles",
      "corepack pnpm run deployability:action-plan",
      "corepack pnpm run deployability:runbook",
      "corepack pnpm run deployability:dashboard",
      "corepack pnpm run deployability:handoff"
    ],
    notes: [
      "use this as the first operator menu when a human or management UI needs profile choices plus next commands",
      "menu choices are convenience projections over deployability profiles, action plans, runbooks, dashboard, and handoff metadata"
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
  console.log("Deployability menu");
  console.log("==================");
  console.log("Read-only first operator menu for profile choice, runbooks, dashboards, and handoff.\n");

  if (data.profile_filter.requested != null) {
    console.log(`profile=${JSON.stringify(data.profile_filter)}`);
    console.log("");
  }

  for (const choice of data.choices) {
    console.log(`## ${choice.key}: ${choice.label}`);
    console.log(choice.purpose);
    console.log(`status=${choice.status}; attention=${choice.attention?.level || "unknown"}; gate=${choice.requires_gate}`);
    console.log(`Primary: ${choice.commands.primary || "none"}`);
    console.log(`Runbook: ${choice.commands.runbook}`);
    console.log(`Action plan: ${choice.commands.action_plan}`);
    console.log(`Dashboard: ${choice.commands.dashboard}`);
    console.log(`Handoff: ${choice.commands.handoff}`);
    console.log("");
  }

  if (data.blockers.length) {
    console.log("Blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
    console.log("");
  }

  console.log("Next commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = menuData(args);
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
