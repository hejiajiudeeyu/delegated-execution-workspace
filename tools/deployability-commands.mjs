#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { profileDirectory, resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SOURCES = [
  ["overview", "tools/deployability-overview.mjs"],
  ["quickstart", "tools/deployability-quickstart.mjs"],
  ["safety", "tools/deployability-safety.mjs"]
];

const SAFETY_DEFAULTS = [
  "commands catalog is read-only and does not read .env files directly",
  "commands catalog only calls read-only deployability metadata commands",
  "commands catalog does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains command metadata and filters without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:quickstart",
  "corepack pnpm run deployability:safety",
  "corepack pnpm run deployability:explain",
  "corepack pnpm run deployability:readiness",
  "corepack pnpm run deployability:production",
  "corepack pnpm run deployability:status",
  "corepack pnpm run deployability:gates",
  "corepack pnpm run deployability:exposure",
  "corepack pnpm run deployability:release -- --image-tag <candidate-tag>",
  "corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>",
  "corepack pnpm run deployability:evidence -- --profile public-stack",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:handoff"
];

function parseArgs(argv) {
  return parseStrictArgs(
    argv,
    [
      { flag: "--json", name: "json", type: "boolean" },
      { flag: "--category", name: "category", type: "string" },
      { flag: "--posture", name: "posture", type: "string" },
      { flag: "--track", name: "track", type: "string" },
      { flag: "--pipeline", name: "pipeline", type: "string" },
      { flag: "--profile", name: "profile", type: "string" }
    ],
    { json: false, category: null, posture: null, track: null, pipeline: null, profile: null }
  );
}

function runJsonScript(relativeScript) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env
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

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function ensureCommand(commands, command) {
  if (!commands.has(command)) {
    commands.set(command, {
      command,
      json_command: null,
      category: "unmapped",
      posture: "unmapped",
      reads_env: null,
      writes_files: null,
      starts_services: null,
      stops_services: null,
      calls_docker: null,
      probes_network: null,
      private_terminal_text: null,
      public_exposure_gate: null,
      ci_safe: null,
      dashboard_safe: null,
      track_keys: [],
      pipeline_keys: [],
      labels: [],
      notes: []
    });
  }
  return commands.get(command);
}

function mergeSafety(commands, safety) {
  for (const item of safety?.matrix || []) {
    const entry = ensureCommand(commands, item.command);
    Object.assign(entry, {
      json_command: item.json_command || entry.json_command,
      category: item.category,
      posture: item.posture,
      reads_env: item.reads_env,
      writes_files: item.writes_files,
      starts_services: item.starts_services,
      stops_services: item.stops_services,
      calls_docker: item.calls_docker,
      probes_network: item.probes_network,
      private_terminal_text: item.private_terminal_text,
      public_exposure_gate: item.public_exposure_gate,
      ci_safe: item.ci_safe,
      dashboard_safe: item.dashboard_safe
    });
    entry.notes.push(item.notes);
  }
}

function mergeQuickstart(commands, quickstart) {
  for (const track of quickstart?.tracks || []) {
    for (const step of track.steps || []) {
      const entry = ensureCommand(commands, step.command);
      entry.json_command = entry.json_command || step.json_command || null;
      entry.track_keys.push(track.key);
      entry.labels.push(`${track.label}: ${step.label}`);
    }
  }
}

function mergeOverview(commands, overview) {
  for (const pipeline of overview?.pipelines || []) {
    for (const [index, command] of (pipeline.commands || []).entries()) {
      const entry = ensureCommand(commands, command);
      entry.json_command = entry.json_command || pipeline.json_commands?.[index] || null;
      entry.pipeline_keys.push(pipeline.key);
      entry.labels.push(`${pipeline.label}: ${pipeline.purpose}`);
    }
  }
}

function baseCommandFor(command) {
  const argsMarker = " -- ";
  if (!command.includes(argsMarker)) return null;
  return command.slice(0, command.indexOf(argsMarker));
}

function mergeInheritedSafety(commands) {
  const safetyFields = [
    "category",
    "posture",
    "reads_env",
    "writes_files",
    "starts_services",
    "stops_services",
    "calls_docker",
    "probes_network",
    "private_terminal_text",
    "public_exposure_gate",
    "ci_safe",
    "dashboard_safe"
  ];

  for (const entry of commands.values()) {
    if (entry.posture !== "unmapped") continue;
    const baseCommand = baseCommandFor(entry.command);
    if (!baseCommand) continue;
    const baseEntry = commands.get(baseCommand);
    if (!baseEntry || baseEntry.posture === "unmapped") continue;
    for (const field of safetyFields) {
      entry[field] = baseEntry[field];
    }
    entry.notes.push(`inherits safety posture from ${baseCommand}`);
    for (const note of baseEntry.notes || []) {
      entry.notes.push(note);
    }
  }
}

function normalizeCommands(commands) {
  return [...commands.values()]
    .map((entry) => ({
      ...entry,
      track_keys: unique(entry.track_keys),
      pipeline_keys: unique(entry.pipeline_keys),
      labels: unique(entry.labels),
      notes: unique(entry.notes)
    }))
    .sort((left, right) => {
      const category = left.category.localeCompare(right.category);
      if (category !== 0) return category;
      return left.command.localeCompare(right.command);
    });
}

function applyFilters(commands, args) {
  return commands.filter((entry) => {
    if (args.category && entry.category !== args.category) return false;
    if (args.posture && entry.posture !== args.posture) return false;
    if (args.track && !entry.track_keys.includes(args.track)) return false;
    if (args.pipeline && !entry.pipeline_keys.includes(args.pipeline)) return false;
    return true;
  });
}

function commandData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const effectivePipeline = args.pipeline || profileFilter.pipeline;
  const sourceResults = Object.fromEntries(SOURCES.map(([key, script]) => [key, runJsonScript(script)]));
  const blockers = [
    ...(args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...(args.pipeline && profileFilter.pipeline && args.pipeline !== profileFilter.pipeline
      ? [`profile ${args.profile} maps to ${profileFilter.pipeline}, not requested pipeline ${args.pipeline}`]
      : []),
    ...Object.entries(sourceResults)
    .filter(([, result]) => !result.ok)
    .map(([key, result]) => `${key}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`)
  ];

  const commands = new Map();
  mergeSafety(commands, sourceResults.safety.body);
  mergeQuickstart(commands, sourceResults.quickstart.body);
  mergeOverview(commands, sourceResults.overview.body);
  mergeInheritedSafety(commands);

  const allCommands = normalizeCommands(commands);
  const filteredCommands =
    args.profile != null && profileFilter.resolved == null
      ? []
      : applyFilters(allCommands, {
          ...args,
          pipeline: effectivePipeline
        });
  const sourceStatus = Object.fromEntries(
    Object.entries(sourceResults).map(([key, result]) => [
      key,
      {
        ok: result.ok,
        exit_code: result.exit_code,
        stderr: result.stderr,
        parse_error: result.parse_error
      }
    ])
  );

  return {
    command: "deployability:commands",
    ok: blockers.length === 0,
    filters_applied: {
      category: args.category,
      posture: args.posture,
      track: args.track,
      pipeline: effectivePipeline,
      profile: profileFilter
    },
    filters: {
      categories: unique(allCommands.map((entry) => entry.category)),
      postures: unique(allCommands.map((entry) => entry.posture)),
      tracks: unique(allCommands.flatMap((entry) => entry.track_keys)),
      pipelines: unique(allCommands.flatMap((entry) => entry.pipeline_keys)),
      profiles: profileDirectory()
    },
    source_status: sourceStatus,
    command_count: filteredCommands.length,
    total_command_count: allCommands.length,
    commands: filteredCommands,
    blockers,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the searchable command catalog for humans, dashboards, and CI",
      "runtime readiness still belongs to profile-specific doctor, preflight, status, smoke, and audit commands"
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
  console.log("Deployability commands");
  console.log("======================");
  console.log("Read-only command catalog with safety posture and first-use context.\n");
  if (Object.values(data.filters_applied).some(Boolean)) {
    console.log(`filters=${JSON.stringify(data.filters_applied)}`);
    console.log("");
  }
  for (const item of data.commands) {
    console.log(`## ${item.category} / ${item.posture}`);
    console.log(item.command);
    if (item.json_command) console.log(`JSON: ${item.json_command}`);
    if (item.track_keys.length) console.log(`tracks: ${item.track_keys.join(", ")}`);
    if (item.pipeline_keys.length) console.log(`pipelines: ${item.pipeline_keys.join(", ")}`);
    if (item.notes.length) console.log(`notes: ${item.notes.join("; ")}`);
    console.log("");
  }
  if (data.blockers.length) {
    console.log("Blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }
}

try {
  const args = parseArgs(process.argv);
  const data = commandData(args);
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
