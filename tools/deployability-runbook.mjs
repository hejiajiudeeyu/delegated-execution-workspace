#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { profileDirectory, resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const PHASES = [
  {
    key: "inspect",
    label: "Inspect",
    purpose: "Read static metadata, declared ports, readiness, or diagnostics before touching runtime state.",
    postures: ["read_only", "runtime_snapshot", "runtime_diagnostic"]
  },
  {
    key: "gate",
    label: "Gate",
    purpose: "Stop for explicit safety review before public exposure or high-risk startup.",
    postures: ["public_exposure_gate"]
  },
  {
    key: "start",
    label: "Start",
    purpose: "Start local or self-hosted services after inspection and gates are satisfied.",
    postures: ["starts_services", "starts_local_services"]
  },
  {
    key: "verify",
    label: "Verify",
    purpose: "Run smoke, delegated acceptance, or runtime acceptance checks after startup.",
    postures: ["runtime_acceptance", "delegated_smoke"]
  },
  {
    key: "operate",
    label: "Operate",
    purpose: "Observe private runtime output or stop services during normal operation.",
    postures: ["private_logs", "stops_services"]
  },
  {
    key: "evidence",
    label: "Evidence",
    purpose: "Write non-secret reports, export evidence, or prepare recovery/change artifacts.",
    postures: ["writes_report", "exports_evidence", "writes_env", "backup_plan", "restore_plan", "rotation_plan"]
  }
];

const PHASE_BY_POSTURE = new Map(PHASES.flatMap((phase) => phase.postures.map((posture) => [posture, phase.key])));

const SAFETY_DEFAULTS = [
  "deployability runbook is read-only and does not read .env files directly",
  "deployability runbook only calls read-only deployability profile and command metadata",
  "deployability runbook does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains staged command metadata without printing secret values"
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

function commandProjection(command) {
  return {
    command: command.command,
    json_command: command.json_command,
    posture: command.posture,
    category: command.category,
    dashboard_safe: command.dashboard_safe,
    ci_safe: command.ci_safe,
    public_exposure_gate: command.public_exposure_gate,
    notes: command.notes || []
  };
}

function buildPhases(commands) {
  const phaseCommands = new Map(PHASES.map((phase) => [phase.key, []]));
  for (const command of commands || []) {
    const phaseKey = PHASE_BY_POSTURE.get(command.posture);
    if (!phaseKey) continue;
    phaseCommands.get(phaseKey).push(commandProjection(command));
  }
  return PHASES.map((phase) => ({
    key: phase.key,
    label: phase.label,
    purpose: phase.purpose,
    postures: phase.postures,
    commands: phaseCommands.get(phase.key)
  })).filter((phase) => phase.commands.length > 0);
}

function indexData() {
  const profilesResult = runJsonScript("tools/deployability-profiles.mjs");
  const blockers = [sourceBlocker("profiles", profilesResult)].filter(Boolean);
  const profiles = profilesResult.body?.profiles || [];
  return {
    command: "deployability:runbook",
    mode: "profile_runbook_index",
    ok: blockers.length === 0,
    current_bundle: profilesResult.body?.current_bundle || null,
    profiles,
    blockers,
    warnings: profilesResult.body?.warnings || [],
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      "corepack pnpm run deployability:runbook -- --profile public-stack",
      "corepack pnpm --silent run deployability:runbook -- --profile public-stack --json",
      "corepack pnpm run deployability:profiles",
      "corepack pnpm run deployability:commands"
    ],
    notes: [
      "use this index to choose a profile, then emit the staged profile runbook",
      "runbooks are projections over the profile catalog and command catalog; they are not service runners"
    ]
  };
}

function profileData(profile) {
  const profileFilter = resolveProfileFilter(profile);
  const profileArgs = ["--profile", profile];
  const profilesResult = runJsonScript("tools/deployability-profiles.mjs", profileArgs);
  const commandsResult = runJsonScript("tools/deployability-commands.mjs", profileArgs);
  const sourceBlockers = [sourceBlocker("profiles", profilesResult), sourceBlocker("commands", commandsResult)].filter(Boolean);
  const blockers = [
    ...(profileFilter.resolved == null ? [`unknown profile: ${profile}`] : []),
    ...sourceBlockers.filter((blocker) => !blocker.includes(`unknown profile: ${profile}`))
  ];
  const profileCard = profilesResult.body?.profiles?.[0] || profileDirectory({ includeLabel: true }).find((item) => item.key === profileFilter.resolved) || null;
  const phases = blockers.length ? [] : buildPhases(commandsResult.body?.commands || []);

  return {
    command: "deployability:runbook",
    mode: "profile_runbook",
    ok: blockers.length === 0,
    current_bundle: profilesResult.body?.current_bundle || null,
    profile_filter: profileFilter,
    profile: profileCard,
    phase_order: PHASES.map((phase) => phase.key),
    phases,
    blockers,
    warnings: [...(profilesResult.body?.warnings || []), ...(commandsResult.body?.warnings || [])],
    source_status: {
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
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      `corepack pnpm run deployability:profiles -- --profile ${profile}`,
      `corepack pnpm run deployability:commands -- --profile ${profile}`,
      `corepack pnpm --silent run deployability:commands -- --profile ${profile} --json`,
      `corepack pnpm run deployability:dashboard -- --profile ${profile}`,
      `corepack pnpm run deployability:handoff -- --profile ${profile}`
    ],
    notes: [
      "gate phases must be reviewed before start phases",
      "run profile commands manually; this command intentionally does not execute them"
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
  console.log("Deployability runbook");
  console.log("=====================");
  console.log("Read-only staged runbook projection for one deployability profile.\n");

  if (data.mode === "profile_runbook_index") {
    for (const profile of data.profiles) {
      console.log(`- ${profile.key}: ${profile.label}`);
      console.log(`  aliases: ${(profile.aliases || []).join(", ")}`);
      console.log(`  attention: ${profile.attention?.level || "unknown"}`);
    }
  } else {
    console.log(`profile=${data.profile?.key || data.profile_filter?.requested || "unknown"}`);
    console.log("");
    for (const phase of data.phases) {
      console.log(`## ${phase.key}: ${phase.label}`);
      console.log(phase.purpose);
      for (const command of phase.commands) {
        console.log(`- ${command.command}`);
        if (command.json_command) console.log(`  JSON: ${command.json_command}`);
      }
      console.log("");
    }
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = args.profile == null ? indexData() : profileData(args.profile);
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
