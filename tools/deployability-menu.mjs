#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { profileDirectory, resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";
import { buildOperatorDecision } from "./lib/deployability-operator-decision.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability menu is read-only and does not read .env files directly",
  "deployability menu only calls read-only deployability status-card, profile, runbook, and onboarding metadata",
  "deployability menu does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains operator status, menu choices, and next commands without printing secret values"
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

function runOperatorOnboardingPlan() {
  const result = spawnSync(process.execPath, [path.join(ROOT, "tools/operator-onboarding.mjs"), "plan", "--json"], {
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

function hasCommand(commands, command) {
  return commands.some((item) => item.command === command || item.json_command === command);
}

function cardStatus(condition) {
  return condition ? "ok" : "blocked";
}

function operatorStatusCards({ profiles, commands, consoleIndex }) {
  const readinessOk = profiles?.ecosystem_readiness?.status === "daily_deployable_with_safety_gates";
  const profileManagementOk =
    hasCommand(commands, "corepack pnpm run deployability:profiles") &&
    hasCommand(commands, "corepack pnpm run deployability:action-plan") &&
    hasCommand(commands, "corepack pnpm run deployability:menu") &&
    hasCommand(commands, "corepack pnpm run deployability:commands");
  const consoleManagementOk =
    consoleIndex?.summary?.status === "console_management_visible_with_client_surface_evidence" &&
    consoleIndex?.console_surfaces?.some((item) => item.key === "runtime_status") &&
    consoleIndex?.console_surfaces?.some((item) => item.key === "public_stack_console") &&
    consoleIndex?.console_surfaces?.some((item) => item.key === "gateway_session");
  const hardeningPlanVisible = hasCommand(commands, "corepack pnpm run deployability:hardening-plan");

  return [
    {
      key: "daily_deployable",
      label: "Daily deployable",
      status: cardStatus(readinessOk),
      detail: "profile choice, generated secrets, startup path, doctors, runtime inspection, boundaries, and brand-site story are visible",
      next_commands: ["corepack pnpm run deployability:readiness", "corepack pnpm --silent run deployability:readiness -- --json"]
    },
    {
      key: "profile_management",
      label: "Profile management",
      status: cardStatus(profileManagementOk),
      detail: "operators and management UIs can choose, sort, inspect, and continue from named deployment profiles",
      next_commands: [
        "corepack pnpm run deployability:profiles",
        "corepack pnpm run deployability:action-plan",
        "corepack pnpm run deployability:menu",
        "corepack pnpm run deployability:commands"
      ]
    },
    {
      key: "console_management",
      label: "Management Console",
      status: cardStatus(consoleManagementOk),
      detail: "runtime, settings, logs, billing readiness, public-stack console, and gateway session surfaces are visible before starting console services",
      next_commands: ["corepack pnpm run deployability:console", "corepack pnpm --silent run deployability:console -- --json"]
    },
    {
      key: "hardening_plan",
      label: "Production hardening plan",
      status: cardStatus(hardeningPlanVisible),
      detail: "owners, stages, blockers, guardrails, and evidence commands are visible without claiming production readiness",
      next_commands: [
        "corepack pnpm run deployability:hardening-plan",
        "corepack pnpm --silent run deployability:hardening-plan -- --json"
      ]
    },
    {
      key: "public_stack_gate",
      label: "Public-stack safety gate",
      status: "gated",
      detail: "public exposure remains behind explicit security review, onboarding contract, and smoke gates",
      next_commands: ["corepack pnpm run selfhost:security-review -- --profile public-stack"]
    },
    {
      key: "production_hardening",
      label: "Formal production hardening",
      status: "planned",
      detail: "formal production readiness remains separate from daily deployability until billing, email, marketplace, and release gates pass",
      next_commands: ["corepack pnpm run published-image:plan"]
    }
  ];
}

function summarizeOperatorStatus({ profiles, cards, blockers, warnings }) {
  const card = (key) => cards.find((item) => item.key === key);
  return {
    status: blockers.length
      ? "blocked"
      : card("production_hardening")?.status === "planned"
        ? "daily_deployable_with_planned_hardening"
        : "daily_deployable",
    readiness_status: profiles?.ecosystem_readiness?.status || "unknown",
    console_management_status: card("console_management")?.status || "unknown",
    hardening_plan_status: card("hardening_plan")?.status || "unknown",
    public_exposure_status: card("public_stack_gate")?.status || "unknown",
    production_hardening_status: card("production_hardening")?.status || "unknown",
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function commandProfileAlias(profile) {
  return (profile.aliases || []).find((alias) => alias.includes("-")) || profile.key.replace(/_/g, "-");
}

function buildChoice(profile) {
  const alias = commandProfileAlias(profile);
  const onboardingCommands =
    profile.key === "public_stack" || profile.key === "operator_onboarding"
      ? {
          operator_onboarding_plan: "corepack pnpm run operator:onboarding:plan",
          operator_onboarding_plan_json: "corepack pnpm --silent run operator:onboarding:plan -- --json",
          operator_onboarding_check: "corepack pnpm run operator:onboarding:check",
          operator_onboarding_check_json: "corepack pnpm --silent run operator:onboarding:check -- --json"
        }
      : {};
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
      command_catalog: `corepack pnpm run deployability:commands -- --profile ${alias}`,
      ...onboardingCommands
    }
  };
}

function defaultNextCommands() {
  return [
    "corepack pnpm run deployability:menu -- --profile public-stack",
    "corepack pnpm --silent run deployability:menu -- --profile public-stack --json",
    "corepack pnpm run deployability:profiles",
    "corepack pnpm run deployability:action-plan",
    "corepack pnpm run deployability:runbook",
    "corepack pnpm run operator:onboarding:plan",
    "corepack pnpm run deployability:dashboard",
    "corepack pnpm run deployability:handoff"
  ];
}

function focusedNextCommands(profile) {
  const alias = commandProfileAlias(profile);
  return [
    `corepack pnpm run deployability:menu -- --profile ${alias}`,
    `corepack pnpm --silent run deployability:menu -- --profile ${alias} --json`,
    `corepack pnpm run deployability:profiles -- --profile ${alias}`,
    `corepack pnpm run deployability:action-plan -- --profile ${alias}`,
    `corepack pnpm run deployability:runbook -- --profile ${alias}`,
    `corepack pnpm run deployability:dashboard -- --profile ${alias}`,
    `corepack pnpm run deployability:handoff -- --profile ${alias}`,
    `corepack pnpm run deployability:commands -- --profile ${alias}`
  ];
}

function menuData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const profileArgs = args.profile == null ? [] : ["--profile", args.profile];
  const profilesResult = runJsonScript("tools/deployability-profiles.mjs", profileArgs);
  const commandsResult = runJsonScript("tools/deployability-commands.mjs");
  const consoleResult = runJsonScript("tools/deployability-console.mjs");
  const runbookResult =
    args.profile == null || profileFilter.resolved == null
      ? null
      : runJsonScript("tools/deployability-runbook.mjs", ["--profile", args.profile]);
  const onboardingResult =
    args.profile != null && ["public_stack", "operator_onboarding"].includes(profileFilter.resolved)
      ? runOperatorOnboardingPlan()
      : null;
  const sourceBlockers = [
    sourceBlocker("profiles", profilesResult),
    sourceBlocker("commands", commandsResult),
    sourceBlocker("console", consoleResult),
    ...(runbookResult ? [sourceBlocker("runbook", runbookResult)] : []),
    ...(onboardingResult ? [sourceBlocker("operator_onboarding", onboardingResult)] : [])
  ].filter(Boolean);
  const blockers = [
    ...(args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...sourceBlockers.filter((blocker) => !blocker.includes(`unknown profile: ${args.profile}`))
  ];
  const profiles = blockers.length ? [] : profilesResult.body?.profiles || [];
  const warnings = unique([
    ...(profilesResult.body?.warnings || []),
    ...(commandsResult.body?.warnings || []),
    ...(consoleResult.body?.warnings || [])
  ]);
  const operatorCards = operatorStatusCards({
    profiles: profilesResult.body || null,
    commands: commandsResult.body?.commands || [],
    consoleIndex: consoleResult.body || null
  });
  const operatorSummary = summarizeOperatorStatus({
    profiles: profilesResult.body || null,
    cards: operatorCards,
    blockers,
    warnings
  });
  const choices = profiles.map(buildChoice);
  const selectedProfile = choices[0] || null;
  const recommendedProfileKeys = profilesResult.body?.recommended_profile_keys || [];
  const decisionProfile =
    args.profile == null
      ? choices.find((choice) => choice.key === recommendedProfileKeys[0]) || selectedProfile
      : selectedProfile;
  const operatorNextDecision =
    blockers.length || decisionProfile == null ? null : buildOperatorDecision({ selectedProfile: decisionProfile });

  return {
    command: "deployability:menu",
    mode: args.profile == null ? "operator_menu" : "operator_menu_profile",
    ok: blockers.length === 0,
    current_bundle: profilesResult.body?.current_bundle || null,
    ecosystem_readiness: profilesResult.body?.ecosystem_readiness || null,
    operator_status_summary: operatorSummary,
    operator_status_cards: operatorCards,
    operator_next_decision: operatorNextDecision,
    profile_filter: profileFilter,
    selected_profile: selectedProfile,
    selected_runbook: runbookResult?.body
      ? {
          phase_order: runbookResult.body.phase_order,
          phases: runbookResult.body.phases,
          next_commands: runbookResult.body.next_commands
        }
      : null,
    selected_onboarding_plan: onboardingResult?.body
      ? {
          command: onboardingResult.body.command,
          profile: onboardingResult.body.profile,
          phases: onboardingResult.body.phases,
          safety: onboardingResult.body.safety,
          next: onboardingResult.body.next
        }
      : null,
    recommended_profile_keys: recommendedProfileKeys,
    choices,
    blockers,
    warnings,
    source_status: {
      operator_status: {
        ok: blockers.length === 0,
        direct_inputs: ["profiles", "commands", "console"],
        avoids_recursive_status_cli: true
      },
      operator_next_decision: {
        ok: blockers.length === 0 && operatorNextDecision != null,
        direct_inputs: ["selected_profile"],
        avoids_recursive_next_cli: true
      },
      profiles: {
        ok: profilesResult.ok,
        exit_code: profilesResult.exit_code,
        stderr: profilesResult.stderr,
        parse_error: profilesResult.parse_error
      },
      commands: {
        ok: commandsResult.ok,
        exit_code: commandsResult.exit_code,
        stderr: commandsResult.stderr,
        parse_error: commandsResult.parse_error
      },
      console: {
        ok: consoleResult.ok,
        exit_code: consoleResult.exit_code,
        stderr: consoleResult.stderr,
        parse_error: consoleResult.parse_error
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
        : {}),
      ...(onboardingResult
        ? {
            operator_onboarding: {
              ok: onboardingResult.ok,
              exit_code: onboardingResult.exit_code,
              stderr: onboardingResult.stderr,
              parse_error: onboardingResult.parse_error
            }
          }
        : {})
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: args.profile != null && selectedProfile ? focusedNextCommands(profiles[0]) : defaultNextCommands(),
    notes: [
      "use this as the first operator menu when a human or management UI needs profile choices plus next commands",
      "menu choices are convenience projections over deployability profiles, action plans, runbooks, onboarding plans, dashboard, and handoff metadata"
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

  if (data.operator_status_summary) {
    console.log("Operator status:");
    console.log(`status=${data.operator_status_summary.status}`);
    console.log(`readiness=${data.operator_status_summary.readiness_status}`);
    console.log(`public_exposure=${data.operator_status_summary.public_exposure_status}`);
    console.log(`production_hardening=${data.operator_status_summary.production_hardening_status}`);
    for (const card of data.operator_status_cards) {
      console.log(`${card.key}: ${card.status}`);
    }
    console.log("");
  }

  if (data.operator_next_decision) {
    console.log("Next decision:");
    console.log(`${data.operator_next_decision.key}: ${data.operator_next_decision.status}`);
    console.log(`Primary: ${data.operator_next_decision.primary_command || "none"}`);
    if (data.operator_next_decision.detail_command) {
      console.log(`Detail: ${data.operator_next_decision.detail_command}`);
    }
    console.log("");
  }

  for (const choice of data.choices) {
    console.log(`## ${choice.key}: ${choice.label}`);
    console.log(choice.purpose);
    console.log(`status=${choice.status}; attention=${choice.attention?.level || "unknown"}; gate=${choice.requires_gate}`);
    console.log(`Primary: ${choice.commands.primary || "none"}`);
    console.log(`Runbook: ${choice.commands.runbook}`);
    if (choice.commands.operator_onboarding_plan) {
      console.log(`Onboarding: ${choice.commands.operator_onboarding_plan}`);
    }
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

try {
  const args = parseArgs(process.argv);
  const data = menuData(args);
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
