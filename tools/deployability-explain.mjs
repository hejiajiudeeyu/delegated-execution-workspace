#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability explainer is read-only and does not read .env files directly",
  "deployability explainer only calls read-only status, gates, commands, and compatibility metadata",
  "deployability explainer does not call Docker, bind ports, or probe network endpoints",
  "JSON output explains ownership, profiles, gates, and validation without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:explain -- --json",
  "corepack pnpm --silent run deployability:status -- --json",
  "corepack pnpm --silent run deployability:gates -- --json",
  "corepack pnpm --silent run deployability:commands -- --json",
  "corepack pnpm --silent run compat:status -- --json"
];

const READING_ORDER = [
  "corepack pnpm run deployability:explain",
  "corepack pnpm run deployability:status",
  "corepack pnpm run deployability:gates",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run deployability:recipe -- --profile public-stack",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
];

const REPO_ROLES = [
  {
    key: "fourth_repo",
    path: ".",
    role: "orchestration and compatibility workspace",
    owns: ["orchestration scripts", "change bundles", "compatibility ledger", "cross-repo validation", "operator documentation"],
    does_not_own: ["protocol schema", "client runtime", "platform runtime", "formal package or image release"]
  },
  {
    key: "protocol",
    path: "repos/protocol",
    role: "formal protocol truth source",
    truth_source_for: ["protocol contracts", "protocol templates", "wire/schema truth"],
    deployability_boundary: "fourth-repo commands may validate this SHA but must not define protocol truth"
  },
  {
    key: "client",
    path: "repos/client",
    role: "formal client truth source",
    truth_source_for: ["client runtime", "caller/responder flows", "transport adapters", "operator console"],
    deployability_boundary: "fourth-repo commands may route and validate but must not replace client runtime behavior"
  },
  {
    key: "platform",
    path: "repos/platform",
    role: "formal platform truth source",
    truth_source_for: ["platform runtime", "relay", "gateway", "self-host deploy", "persistence"],
    deployability_boundary: "fourth-repo commands may orchestrate and validate but must not replace platform runtime behavior"
  }
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

function explainerSections(commands) {
  return [
    {
      key: "daily_deployability",
      label: "Daily deployability",
      meaning: "Daily deployable means the local/operator workflow is visible, checkable, and gated; it does not mean public production readiness.",
      commands: [
        "corepack pnpm run deployability:status",
        "corepack pnpm run deployability:readiness",
        "corepack pnpm run deployability:roadmap"
      ].filter((command) => hasCommand(commands, command)),
      warnings: ["daily_deployable_with_safety_gates is intentionally narrower than production-ready"]
    },
    {
      key: "profile_selection",
      label: "Profile selection",
      meaning: "Profiles are operator intents that map to deployment pipelines and command sets.",
      commands: [
        "corepack pnpm run deployability:profiles",
        "corepack pnpm run deployability:menu",
        "corepack pnpm run deployability:commands"
      ].filter((command) => hasCommand(commands, command)),
      warnings: ["unknown profiles return blockers instead of falling back to every command"]
    },
    {
      key: "public_exposure_gates",
      label: "Public exposure gates",
      meaning: "Public-stack can be ready-now only behind explicit security review, onboarding, and smoke gates.",
      commands: [
        "corepack pnpm run deployability:gates",
        "corepack pnpm run selfhost:security-review -- --profile public-stack",
        "corepack pnpm run operator:onboarding:check"
      ].filter((command) => hasCommand(commands, command)),
      warnings: ["localhost public origin and placeholder secrets remain blockers for public exposure"]
    },
    {
      key: "production_hardening",
      label: "Production hardening",
      meaning: "Production hardening tracks release, billing, email, marketplace, and formal owning-repo gates.",
      commands: ["corepack pnpm run deployability:gates", "corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"].filter(
        (command) => hasCommand(commands, command)
      ),
      warnings: ["daily deployability is not production readiness", "formal npm/image release gates stay in owning repositories"]
    },
    {
      key: "cross_repo_validation",
      label: "Cross-repo validation",
      meaning: "The fourth repo certifies a compatible SHA combination; it does not create business truth.",
      commands: [
        "corepack pnpm run check:submodules",
        "corepack pnpm run check:boundaries",
        "corepack pnpm run check:bundles",
        "corepack pnpm run test:contracts",
        "corepack pnpm run test:integration"
      ],
      warnings: ["do not claim cross-repo completion until every fourth-repo validation command passes"]
    }
  ];
}

function explainData() {
  const statusResult = runJsonScript("tools/deployability-status.mjs");
  const gatesResult = runJsonScript("tools/deployability-gates.mjs");
  const commandsResult = runJsonScript("tools/deployability-commands.mjs");
  const compatResult = runJsonScript("tools/compat-status.mjs");
  const sourceBlockers = [
    sourceBlocker("status", statusResult),
    sourceBlocker("gates", gatesResult),
    sourceBlocker("commands", commandsResult),
    sourceBlocker("compat", compatResult)
  ].filter(Boolean);
  const commands = commandsResult.body?.commands || [];
  const explainers = explainerSections(commands);
  const blockers = unique([
    ...sourceBlockers,
    ...(statusResult.body?.blockers || []),
    ...(gatesResult.body?.blockers || []),
    ...(commandsResult.body?.blockers || []),
    ...(compatResult.body?.blockers || [])
  ]);
  const warnings = unique([
    ...(statusResult.body?.warnings || []),
    ...(gatesResult.body?.warnings || []),
    ...(commandsResult.body?.warnings || []),
    ...(compatResult.body?.warnings || [])
  ]);

  return {
    command: "deployability:explain",
    mode: "operator_explainer",
    ok: blockers.length === 0,
    current_bundle: statusResult.body?.current_bundle || compatResult.body?.current_bundle || null,
    summary: {
      status: statusResult.body?.summary?.status || (blockers.length ? "blocked" : "unknown"),
      explainer_count: explainers.length,
      repo_role_count: REPO_ROLES.length,
      blocked_count: blockers.length,
      warning_count: warnings.length
    },
    repo_roles: REPO_ROLES,
    explainers,
    reading_order: READING_ORDER,
    blockers,
    warnings,
    machine_payloads: MACHINE_PAYLOADS,
    source_status: {
      status: {
        ok: statusResult.ok,
        exit_code: statusResult.exit_code,
        stderr: statusResult.stderr,
        parse_error: statusResult.parse_error
      },
      gates: {
        ok: gatesResult.ok,
        exit_code: gatesResult.exit_code,
        stderr: gatesResult.stderr,
        parse_error: gatesResult.parse_error
      },
      commands: {
        ok: commandsResult.ok,
        exit_code: commandsResult.exit_code,
        stderr: commandsResult.stderr,
        parse_error: commandsResult.parse_error
      },
      compat: {
        ok: compatResult.ok,
        exit_code: compatResult.exit_code,
        stderr: compatResult.stderr,
        parse_error: compatResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this before choosing a profile when the operator needs the architecture and ownership map",
      "explainer sections are convenience projections over existing read-only metadata; they do not execute runtime commands"
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
  console.log("Deployability explainer");
  console.log("=======================");
  console.log("Read-only architecture, ownership, profile, gate, and validation explainer.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}\n`);

  console.log("Repository roles:");
  for (const role of data.repo_roles) {
    console.log(`${role.key}: ${role.role}`);
    if (role.owns) console.log(`  owns: ${role.owns.join(", ")}`);
    if (role.does_not_own) console.log(`  does not own: ${role.does_not_own.join(", ")}`);
    if (role.truth_source_for) console.log(`  truth source for: ${role.truth_source_for.join(", ")}`);
  }

  console.log("\nExplainers:");
  for (const item of data.explainers) {
    console.log(`${item.key}: ${item.label}`);
    console.log(`  ${item.meaning}`);
    for (const command of item.commands) console.log(`  - ${command}`);
    for (const warning of item.warnings) console.log(`  warning: ${warning}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  console.log("\nReading order:");
  for (const command of data.reading_order) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = explainData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
