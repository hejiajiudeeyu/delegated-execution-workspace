#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability status is read-only and does not read .env files directly",
  "deployability status only calls read-only readiness and roadmap metadata",
  "deployability status does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains operator status cards without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:status -- --json",
  "corepack pnpm --silent run deployability:readiness -- --json",
  "corepack pnpm --silent run deployability:roadmap -- --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:console",
  "corepack pnpm run deployability:hardening-plan",
  "corepack pnpm run deployability:recipe -- --profile public-stack",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run deployability:handoff -- --profile public-stack",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
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

function milestone(roadmap, key) {
  return roadmap?.milestones?.find((item) => item.key === key) || null;
}

function cardStatus(milestoneStatus) {
  if (milestoneStatus === "satisfied") return "ok";
  return milestoneStatus || "unknown";
}

function statusCards({ readiness, roadmap }) {
  const daily = milestone(roadmap, "daily_deployable_scorecard");
  const profileManagement = milestone(roadmap, "profile_management_surface");
  const consoleManagement = milestone(roadmap, "console_management_surface");
  const hardeningPlan = milestone(roadmap, "production_hardening_plan");
  const publicStack = milestone(roadmap, "public_stack_safety_gate");
  const production = milestone(roadmap, "formal_production_hardening");
  return [
    {
      key: "daily_deployable",
      label: "Daily deployable",
      status: readiness?.ecosystem_readiness?.status === "daily_deployable_with_safety_gates" ? "ok" : "blocked",
      detail: "profile choice, generated secrets, startup path, doctors, runtime inspection, boundaries, and brand-site story are visible",
      next_commands: daily?.evidence_commands || ["corepack pnpm run deployability:readiness"]
    },
    {
      key: "profile_management",
      label: "Profile management",
      status: cardStatus(profileManagement?.status),
      detail: "operators and management UIs can choose, sort, inspect, and continue from named deployment profiles",
      next_commands: profileManagement?.evidence_commands || ["corepack pnpm run deployability:profiles"]
    },
    {
      key: "console_management",
      label: "Management Console",
      status: cardStatus(consoleManagement?.status),
      detail: "runtime, settings, logs, billing readiness, public-stack console, and gateway session surfaces are visible before starting console services",
      next_commands: consoleManagement?.evidence_commands || ["corepack pnpm run deployability:console"]
    },
    {
      key: "hardening_plan",
      label: "Production hardening plan",
      status: cardStatus(hardeningPlan?.status),
      detail: "owners, stages, blockers, guardrails, and evidence commands are visible without claiming production readiness",
      next_commands: hardeningPlan?.evidence_commands || ["corepack pnpm run deployability:hardening-plan"]
    },
    {
      key: "public_stack_gate",
      label: "Public-stack safety gate",
      status: publicStack?.status || "unknown",
      detail: "public exposure remains behind explicit security review, onboarding contract, and smoke gates",
      next_commands: publicStack?.evidence_commands || ["corepack pnpm run selfhost:security-review -- --profile public-stack"]
    },
    {
      key: "production_hardening",
      label: "Formal production hardening",
      status: production?.status || "unknown",
      detail: "formal production readiness remains separate from daily deployability until billing, email, marketplace, and release gates pass",
      next_commands: production?.evidence_commands || ["corepack pnpm run published-image:plan"]
    }
  ];
}

function summarize({ readiness, roadmap, cards, blockers, warnings }) {
  const publicGate = cards.find((item) => item.key === "public_stack_gate");
  const consoleManagement = cards.find((item) => item.key === "console_management");
  const hardeningPlan = cards.find((item) => item.key === "hardening_plan");
  const production = cards.find((item) => item.key === "production_hardening");
  return {
    status: roadmap?.summary?.status || (blockers.length ? "blocked" : "unknown"),
    readiness_status: readiness?.ecosystem_readiness?.status || "unknown",
    console_management_status: consoleManagement?.status || "unknown",
    hardening_plan_status: hardeningPlan?.status || "unknown",
    public_exposure_status: publicGate?.status || "unknown",
    production_hardening_status: production?.status || "unknown",
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function statusData() {
  const readinessResult = runJsonScript("tools/deployability-readiness.mjs");
  const roadmapResult = runJsonScript("tools/deployability-roadmap.mjs");
  const sourceBlockers = [
    sourceBlocker("readiness", readinessResult),
    sourceBlocker("roadmap", roadmapResult)
  ].filter(Boolean);
  const readiness = readinessResult.body || null;
  const roadmap = roadmapResult.body || null;
  const blockers = unique([...sourceBlockers, ...(readiness?.blockers || []), ...(roadmap?.blockers || [])]);
  const warnings = unique([...(readiness?.warnings || []), ...(roadmap?.warnings || [])]);
  const cards = statusCards({ readiness, roadmap });

  return {
    command: "deployability:status",
    mode: "operator_status",
    ok: blockers.length === 0,
    current_bundle: roadmap?.current_bundle || readiness?.current_bundle || null,
    summary: summarize({ readiness, roadmap, cards, blockers, warnings }),
    status_cards: cards,
    blockers,
    warnings,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: MACHINE_PAYLOADS,
    source_status: {
      readiness: {
        ok: readinessResult.ok,
        exit_code: readinessResult.exit_code,
        stderr: readinessResult.stderr,
        parse_error: readinessResult.parse_error
      },
      roadmap: {
        ok: roadmapResult.ok,
        exit_code: roadmapResult.exit_code,
        stderr: roadmapResult.stderr,
        parse_error: roadmapResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this as the compact operator status before choosing a profile-specific command",
      "status cards are convenience projections over readiness and roadmap metadata; they do not execute commands"
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
  console.log("Deployability status");
  console.log("====================");
  console.log("Compact read-only operator status for deployment, management, understanding, and safety controls.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`readiness=${data.summary.readiness_status}`);
  console.log(`public_exposure=${data.summary.public_exposure_status}`);
  console.log(`production_hardening=${data.summary.production_hardening_status}\n`);

  for (const card of data.status_cards) {
    console.log(`${card.key}: ${card.status}`);
    console.log(`  ${card.detail}`);
    for (const command of card.next_commands) console.log(`  - ${command}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nPrimary next commands:");
  for (const command of data.primary_next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = statusData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
