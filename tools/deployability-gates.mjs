#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability gates is read-only and does not read .env files directly",
  "deployability gates only calls read-only roadmap and command catalog metadata",
  "deployability gates does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains public exposure and production hardening gates without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:gates -- --json",
  "corepack pnpm --silent run deployability:roadmap -- --json",
  "corepack pnpm --silent run deployability:commands -- --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:gates",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run operator:onboarding:check",
  "corepack pnpm run published-image:plan",
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

function commandMetadata(commands, command) {
  const item = commands?.find((entry) => entry.command === command || entry.json_command === command);
  if (!item) return null;
  return {
    command: item.command,
    posture: item.posture,
    category: item.category,
    dashboard_safe: item.dashboard_safe,
    ci_safe: item.ci_safe,
    calls_docker: item.calls_docker,
    probes_network: item.probes_network,
    starts_services: item.starts_services,
    public_exposure_gate: item.public_exposure_gate
  };
}

function buildGates({ roadmap, commands }) {
  const publicStack = milestone(roadmap, "public_stack_safety_gate");
  const production = milestone(roadmap, "formal_production_hardening");
  const publicCommands =
    publicStack?.evidence_commands || [
      "corepack pnpm run selfhost:security-review -- --profile public-stack",
      "corepack pnpm run operator:onboarding:check",
      "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"
    ];
  const productionCommands =
    production?.evidence_commands || ["corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"];

  return [
    {
      key: "public_stack_exposure",
      label: "Public-stack exposure gate",
      status: publicStack?.status || "gated",
      profile_key: "public_stack",
      risk: "public_exposure",
      required_before: "opening edge routes, publishing console access, or treating public-stack as internet-ready",
      commands: publicCommands,
      command_metadata: publicCommands.map((command) => commandMetadata(commands, command)).filter(Boolean),
      guardrails: [
        "localhost public origin remains a blocker for public exposure",
        "placeholder secrets remain blockers for public exposure",
        "security review, onboarding check, and published-image dry-run must be visible before real exposure"
      ],
      remaining_work: publicStack?.remaining_work || []
    },
    {
      key: "formal_production_hardening",
      label: "Formal production hardening gate",
      status: production?.status || "planned",
      profile_key: null,
      risk: "production_readiness",
      required_before: "claiming public production readiness, default billing readiness, email readiness, or marketplace readiness",
      commands: productionCommands,
      command_metadata: productionCommands.map((command) => commandMetadata(commands, command)).filter(Boolean),
      guardrails: [
        "daily deployability is not formal production readiness",
        "formal npm and image release gates stay in the owning repositories",
        "billing, email transport, and marketplace surfaces need their own production gates"
      ],
      remaining_work:
        production?.remaining_work || [
          "finish billing production gates before presenting billing as a default-ready surface",
          "finish email transport and marketplace production gates before claiming public production readiness",
          "keep formal npm/image release gates in the owning repositories"
        ]
    }
  ];
}

function summarize({ gates, blockers, warnings }) {
  const countByStatus = (status) => gates.filter((item) => item.status === status).length;
  return {
    status: blockers.length
      ? "blocked"
      : countByStatus("gated") > 0 && countByStatus("planned") > 0
        ? "public_exposure_gated_production_planned"
        : "gates_visible",
    gate_count: gates.length,
    gated_count: countByStatus("gated"),
    planned_count: countByStatus("planned"),
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function gatesData() {
  const roadmapResult = runJsonScript("tools/deployability-roadmap.mjs");
  const commandsResult = runJsonScript("tools/deployability-commands.mjs");
  const sourceBlockers = [
    sourceBlocker("roadmap", roadmapResult),
    sourceBlocker("commands", commandsResult)
  ].filter(Boolean);
  const roadmap = roadmapResult.body || null;
  const commands = commandsResult.body?.commands || [];
  const gates = buildGates({ roadmap, commands });
  const blockers = unique([
    ...sourceBlockers,
    ...(roadmap?.blockers || []),
    ...(commandsResult.body?.blockers || [])
  ]);
  const warnings = unique([...(roadmap?.warnings || []), ...(commandsResult.body?.warnings || [])]);

  return {
    command: "deployability:gates",
    mode: "gate_checklist",
    ok: blockers.length === 0,
    current_bundle: roadmap?.current_bundle || null,
    summary: summarize({ gates, blockers, warnings }),
    gates,
    blockers,
    warnings,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: MACHINE_PAYLOADS,
    source_status: {
      roadmap: {
        ok: roadmapResult.ok,
        exit_code: roadmapResult.exit_code,
        stderr: roadmapResult.stderr,
        parse_error: roadmapResult.parse_error
      },
      commands: {
        ok: commandsResult.ok,
        exit_code: commandsResult.exit_code,
        stderr: commandsResult.stderr,
        parse_error: commandsResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this before opening public routes or presenting production readiness",
      "gate checklist entries are convenience projections over roadmap and command catalog metadata; they do not execute commands"
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
  console.log("Deployability gates");
  console.log("===================");
  console.log("Read-only public exposure and production hardening gate checklist.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`gates=${data.summary.gated_count} gated, ${data.summary.planned_count} planned, ${data.summary.blocked_count} blocked\n`);

  for (const gate of data.gates) {
    console.log(`${gate.key}: ${gate.status}`);
    console.log(`  ${gate.label}`);
    console.log(`  required before: ${gate.required_before}`);
    for (const command of gate.commands) console.log(`  - ${command}`);
    for (const guardrail of gate.guardrails) console.log(`  guardrail: ${guardrail}`);
    for (const item of gate.remaining_work || []) console.log(`  remaining: ${item}`);
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
const data = gatesData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
