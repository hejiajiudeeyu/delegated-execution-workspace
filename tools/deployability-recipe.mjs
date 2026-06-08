#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability recipe is read-only and does not read .env files directly",
  "deployability recipe only calls read-only deployability menu, runbook, and readiness metadata",
  "deployability recipe does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains copy-paste command order without printing secret values"
];

const PHASES = [
  {
    key: "inspect",
    label: "Inspect",
    purpose: "Read readiness, profile, and declared deployment metadata before touching runtime state."
  },
  {
    key: "gate",
    label: "Gate",
    purpose: "Stop for safety review before public exposure or risky startup."
  },
  {
    key: "start",
    label: "Start",
    purpose: "Start the selected local or self-host profile after inspection and gates."
  },
  {
    key: "verify",
    label: "Verify",
    purpose: "Run smoke or acceptance checks after startup."
  },
  {
    key: "operate",
    label: "Operate",
    purpose: "Inspect runtime state, private logs, or stop commands during normal operation."
  },
  {
    key: "evidence",
    label: "Evidence",
    purpose: "Create non-secret handoff or recovery evidence for the selected profile."
  }
];

function parseArgs(argv) {
  const args = {
    json: false,
    profile: "public-stack"
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

function commandAlias(profileFilter) {
  return profileFilter.requested || profileFilter.resolved?.replace(/_/g, "-") || "public-stack";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function commandsForPhase(runbook, phaseKey) {
  return runbook?.phases?.find((phase) => phase.key === phaseKey)?.commands?.map((item) => item.command) || [];
}

function publicStackAdditions(alias) {
  return {
    inspect: [
      `corepack pnpm run selfhost:readiness -- --profile ${alias}`,
      `corepack pnpm run selfhost:ports -- --profile ${alias}`,
      `corepack pnpm run selfhost:urls -- --profile ${alias}`
    ],
    gate: [`corepack pnpm run selfhost:security-review -- --profile ${alias}`],
    start: [`corepack pnpm run selfhost:up -- --profile ${alias}`],
    verify: [`corepack pnpm run selfhost:smoke -- --profile ${alias}`],
    operate: [
      `corepack pnpm run selfhost:status -- --profile ${alias}`,
      `corepack pnpm run selfhost:logs -- --profile ${alias}`,
      `corepack pnpm run selfhost:down -- --profile ${alias}`
    ],
    evidence: [
      `corepack pnpm run deployability:handoff -- --profile ${alias}`,
      `corepack pnpm run selfhost:ops-report -- --profile ${alias}`,
      "corepack pnpm run operator:onboarding:check"
    ]
  };
}

function genericAdditions(alias) {
  return {
    inspect: [],
    gate: [],
    start: [],
    verify: [],
    operate: [],
    evidence: [`corepack pnpm run deployability:handoff -- --profile ${alias}`]
  };
}

function recipeStep({ phase, runbook, additions, prefix = [] }) {
  const commands = unique([...prefix, ...commandsForPhase(runbook, phase.key), ...(additions[phase.key] || [])]);
  if (commands.length === 0) return null;
  return {
    key: phase.key,
    label: phase.label,
    purpose: phase.purpose,
    safety_gate: phase.key === "gate",
    commands
  };
}

function buildRecipeSteps({ profileFilter, runbook }) {
  const alias = commandAlias(profileFilter);
  const additions = profileFilter.resolved === "public_stack" ? publicStackAdditions(alias) : genericAdditions(alias);
  return PHASES.map((phase) =>
    recipeStep({
      phase,
      runbook,
      additions,
      prefix:
        phase.key === "inspect"
          ? [
              "corepack pnpm run deployability:readiness",
              `corepack pnpm run deployability:menu -- --profile ${alias}`,
              `corepack pnpm run deployability:runbook -- --profile ${alias}`
            ]
          : []
    })
  ).filter(Boolean);
}

function recipeData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const profileArgs = ["--profile", args.profile];
  const menuResult = runJsonScript("tools/deployability-menu.mjs", profileArgs);
  const runbookResult = runJsonScript("tools/deployability-runbook.mjs", profileArgs);
  const readinessResult = runJsonScript("tools/deployability-readiness.mjs");
  const sourceBlockers = [
    sourceBlocker("menu", menuResult),
    sourceBlocker("runbook", runbookResult),
    sourceBlocker("readiness", readinessResult)
  ].filter(Boolean);
  const blockers = [
    ...(profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...sourceBlockers.filter((blocker) => !blocker.includes(`unknown profile: ${args.profile}`))
  ];
  const runbook = blockers.length ? null : runbookResult.body;
  const recipeSteps = blockers.length ? [] : buildRecipeSteps({ profileFilter, runbook });

  return {
    command: "deployability:recipe",
    mode: "profile_recipe",
    ok: blockers.length === 0,
    current_bundle: readinessResult.body?.current_bundle || menuResult.body?.current_bundle || runbookResult.body?.current_bundle || null,
    profile_filter: profileFilter,
    profile: menuResult.body?.selected_profile || runbookResult.body?.profile || null,
    readiness: readinessResult.body
      ? {
          status: readinessResult.body.ecosystem_readiness?.status,
          summary: readinessResult.body.summary,
          checks: readinessResult.body.checks
        }
      : null,
    selected_onboarding_plan: menuResult.body?.selected_onboarding_plan || null,
    recipe_steps: recipeSteps,
    copy_paste_commands: recipeSteps.flatMap((step) => step.commands),
    blockers,
    warnings: unique([...(menuResult.body?.warnings || []), ...(runbookResult.body?.warnings || []), ...(readinessResult.body?.warnings || [])]),
    source_status: {
      menu: {
        ok: menuResult.ok,
        exit_code: menuResult.exit_code,
        stderr: menuResult.stderr,
        parse_error: menuResult.parse_error
      },
      runbook: {
        ok: runbookResult.ok,
        exit_code: runbookResult.exit_code,
        stderr: runbookResult.stderr,
        parse_error: runbookResult.parse_error
      },
      readiness: {
        ok: readinessResult.ok,
        exit_code: readinessResult.exit_code,
        stderr: readinessResult.stderr,
        parse_error: readinessResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      `corepack pnpm run deployability:recipe -- --profile ${commandAlias(profileFilter)}`,
      `corepack pnpm --silent run deployability:recipe -- --profile ${commandAlias(profileFilter)} --json`,
      `corepack pnpm run deployability:menu -- --profile ${commandAlias(profileFilter)}`,
      `corepack pnpm run deployability:runbook -- --profile ${commandAlias(profileFilter)}`,
      `corepack pnpm run deployability:handoff -- --profile ${commandAlias(profileFilter)}`
    ],
    notes: [
      "use this as a linear first-run recipe after choosing a deployability profile",
      "recipe steps are convenience projections over menu, runbook, onboarding, and readiness metadata; they do not execute commands"
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
  console.log("Deployability recipe");
  console.log("====================");
  console.log("Read-only linear first-run recipe for one deployability profile.\n");
  console.log(`profile=${data.profile?.key || data.profile_filter?.requested || "unknown"}`);
  console.log(`readiness=${data.readiness?.status || "unknown"}`);
  console.log("");

  for (const step of data.recipe_steps) {
    console.log(`## ${step.key}: ${step.label}`);
    console.log(step.purpose);
    for (const command of step.commands) console.log(`- ${command}`);
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
const data = recipeData(args);
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
