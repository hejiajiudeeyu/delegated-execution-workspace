#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";
import { buildOperatorDecision, commandProfileAlias } from "./lib/deployability-operator-decision.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability next is read-only and does not read .env files directly",
  "deployability next only calls read-only menu, action-plan, and gate metadata",
  "deployability next does not call Docker, bind ports, probe network endpoints, or start services",
  "JSON output contains one recommended next action without printing secret values"
];

function parseArgs(argv) {
  return parseStrictArgs(
    argv,
    [
      { flag: "--json", name: "json", type: "boolean" },
      { flag: "--profile", name: "profile", type: "string" }
    ],
    { json: false, profile: null }
  );
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

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function nextCommands(selectedProfile, requestedProfile) {
  const alias = commandProfileAlias(selectedProfile) || requestedProfile || "public-stack";
  return [
    `corepack pnpm run deployability:next -- --profile ${alias}`,
    `corepack pnpm --silent run deployability:next -- --profile ${alias} --json`,
    `corepack pnpm run deployability:dashboard -- --profile ${alias}`,
    `corepack pnpm run deployability:commands -- --profile ${alias}`,
    `corepack pnpm run deployability:handoff -- --profile ${alias}`
  ];
}

function unknownProfileData(profileFilter) {
  return {
    command: "deployability:next",
    mode: "operator_next_decision",
    ok: false,
    current_bundle: null,
    ecosystem_readiness: null,
    profile_filter: profileFilter,
    selected_profile: null,
    operator_status_summary: null,
    decision: null,
    blockers: [`unknown profile: ${profileFilter.requested}`],
    warnings: [],
    source_status: {
      direct_inputs: ["menu", "action_plan", "gates"]
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: ["corepack pnpm run deployability:next -- --profile public-stack"],
    notes: ["unknown profiles are rejected before calling nested metadata commands"]
  };
}

function nextData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  if (args.profile != null && profileFilter.resolved == null) return unknownProfileData(profileFilter);

  const profileArgs = args.profile == null ? [] : ["--profile", args.profile];
  const menuResult = runJsonScript("tools/deployability-menu.mjs", profileArgs);
  const actionPlanResult = runJsonScript("tools/deployability-action-plan.mjs", profileArgs);
  const gatesResult = runJsonScript("tools/deployability-gates.mjs");
  const blockers = [
    sourceBlocker("menu", menuResult),
    sourceBlocker("action_plan", actionPlanResult),
    sourceBlocker("gates", gatesResult)
  ].filter(Boolean);
  const menu = menuResult.body || {};
  const actionPlan = actionPlanResult.body || {};
  const selectedKey =
    profileFilter.resolved ||
    actionPlan.recommended_profile_keys?.[0] ||
    menu.recommended_profile_keys?.[0] ||
    menu.selected_profile?.key ||
    null;
  const selectedProfile =
    (menu.choices || []).find((item) => item.key === selectedKey) ||
    menu.selected_profile ||
    null;
  const decision =
    blockers.length || selectedProfile == null
      ? null
      : buildOperatorDecision({ selectedProfile, actionPlan, gates: gatesResult.body });
  const warnings = unique([...(menu.warnings || []), ...(actionPlan.warnings || []), ...(gatesResult.body?.warnings || [])]);

  return {
    command: "deployability:next",
    mode: "operator_next_decision",
    ok: blockers.length === 0 && decision != null,
    current_bundle: menu.current_bundle || actionPlan.current_bundle || gatesResult.body?.current_bundle || null,
    ecosystem_readiness: menu.ecosystem_readiness || actionPlan.ecosystem_readiness || null,
    profile_filter: {
      requested: profileFilter.requested,
      resolved: profileFilter.resolved,
      pipeline: profileFilter.pipeline
    },
    selected_profile: selectedProfile,
    operator_status_summary: menu.operator_status_summary || null,
    decision,
    blockers,
    warnings,
    source_status: {
      direct_inputs: ["menu", "action_plan", "gates"],
      menu: {
        ok: menuResult.ok,
        exit_code: menuResult.exit_code,
        stderr: menuResult.stderr,
        parse_error: menuResult.parse_error
      },
      action_plan: {
        ok: actionPlanResult.ok,
        exit_code: actionPlanResult.exit_code,
        stderr: actionPlanResult.stderr,
        parse_error: actionPlanResult.parse_error
      },
      gates: {
        ok: gatesResult.ok,
        exit_code: gatesResult.exit_code,
        stderr: gatesResult.stderr,
        parse_error: gatesResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: selectedProfile ? nextCommands(selectedProfile, args.profile) : [],
    notes: [
      "use this as the single next-action payload when a human, dashboard, or agent needs one safe command to run next",
      "this is a convenience decision over menu, action-plan, and gate metadata; it does not execute the recommended command"
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
  console.log("Deployability next");
  console.log("==================");
  console.log("Read-only single next-action decision for operators and management surfaces.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`profile=${data.selected_profile?.key || "none"}`);
  console.log(`status=${data.decision?.status || "blocked"}`);
  if (data.decision) {
    console.log(`decision=${data.decision.key}`);
    console.log(`primary=${data.decision.primary_command || "none"}`);
    if (data.decision.primary_json_command) console.log(`primary_json=${data.decision.primary_json_command}`);
    if (data.decision.detail_command) console.log(`detail=${data.decision.detail_command}`);
    if (data.decision.detail_json_command) console.log(`detail_json=${data.decision.detail_json_command}`);
    for (const reason of data.decision.reasons || []) console.log(`reason: ${reason}`);
    for (const guardrail of data.decision.guardrails || []) console.log(`guardrail: ${guardrail}`);
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
  const data = nextData(args);
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
