#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability evidence bundle does not read .env files directly",
  "deployability evidence bundle does not call Docker, bind ports, or probe network endpoints",
  "evidence files contain management metadata, handoff Markdown, and JSON payloads without printing secret values",
  "the bundle is a fourth-repo orchestration artifact and not a new runtime truth source"
];

function parseArgs(argv) {
  const args = {
    json: false,
    profile: null,
    outputDir: null
  };
  const values = argv.slice(2);
  const readOptionValue = (index, option) => {
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`missing value for ${option}`);
    }
    return next;
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--") {
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--profile") {
      args.profile = readOptionValue(index, "--profile");
      index += 1;
      continue;
    }
    if (value.startsWith("--profile=")) {
      args.profile = value.slice("--profile=".length);
      if (!args.profile) throw new Error("missing value for --profile");
      continue;
    }
    if (value === "--output-dir") {
      args.outputDir = readOptionValue(index, "--output-dir");
      index += 1;
      continue;
    }
    if (value.startsWith("--output-dir=")) {
      args.outputDir = value.slice("--output-dir=".length);
      if (!args.outputDir) throw new Error("missing value for --output-dir");
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`unknown option ${value}`);
    }
    throw new Error(`unexpected argument ${value}`);
  }
  return args;
}

function defaultOutputDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(ROOT, "exports", "deployability", "evidence", stamp);
}

function resolveOutputDir(outputDir) {
  if (!outputDir) return defaultOutputDir();
  return path.isAbsolute(outputDir) ? outputDir : path.join(ROOT, outputDir);
}

function runJsonScript(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "tools", script), "--json", ...extraArgs], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 30 * 1024 * 1024
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

function writeJson(filePath, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

function artifact(key, label, filePath, format) {
  return {
    key,
    label,
    path: filePath,
    format
  };
}

function evidenceData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  const outputDir = resolveOutputDir(args.outputDir);
  const profileArgs = args.profile == null ? [] : ["--profile", args.profile];
  const unknownProfileBlockers =
    args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : [];
  if (unknownProfileBlockers.length) {
    return {
      command: "deployability:evidence",
      mode: "evidence_bundle",
      ok: false,
      current_bundle: null,
      profile_filter: profileFilter,
      output_dir: outputDir,
      manifest_path: path.join(outputDir, "manifest.json"),
      artifacts: [],
      blockers: unknownProfileBlockers,
      warnings: [],
      source_status: {},
      safety_defaults: SAFETY_DEFAULTS,
      next_commands: []
    };
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const handoffMarkdownPath = path.join(outputDir, "handoff.md");
  const sources = {
    dashboard: runJsonScript("deployability-dashboard.mjs", profileArgs),
    menu: runJsonScript("deployability-menu.mjs", profileArgs),
    recipe: runJsonScript("deployability-recipe.mjs", profileArgs),
    handoff_json: runJsonScript("deployability-handoff.mjs", [...profileArgs, "--output", handoffMarkdownPath]),
    commands: runJsonScript("deployability-commands.mjs", profileArgs)
  };
  const blockers = Object.entries(sources)
    .map(([key, result]) => sourceBlocker(key, result))
    .filter(Boolean);
  const sourceStatus = Object.fromEntries(
    Object.entries(sources).map(([key, result]) => [
      key,
      {
        ok: result.ok,
        exit_code: result.exit_code,
        stderr: result.stderr,
        parse_error: result.parse_error
      }
    ])
  );
  const currentBundle =
    sources.dashboard.body?.current_bundle ||
    sources.menu.body?.current_bundle ||
    sources.handoff_json.body?.current_bundle ||
    null;

  const paths = {
    manifest: path.join(outputDir, "manifest.json"),
    dashboard: path.join(outputDir, "dashboard.json"),
    menu: path.join(outputDir, "menu.json"),
    recipe: path.join(outputDir, "recipe.json"),
    handoff_json: path.join(outputDir, "handoff.json"),
    handoff_markdown: handoffMarkdownPath,
    commands: path.join(outputDir, "commands.json")
  };
  const artifacts = [
    artifact("manifest", "evidence manifest", paths.manifest, "json"),
    artifact("dashboard", "focused dashboard payload", paths.dashboard, "json"),
    artifact("menu", "focused operator menu payload", paths.menu, "json"),
    artifact("recipe", "focused first-run recipe payload", paths.recipe, "json"),
    artifact("handoff_json", "focused handoff payload", paths.handoff_json, "json"),
    artifact("handoff_markdown", "focused handoff Markdown report", paths.handoff_markdown, "markdown"),
    artifact("commands", "focused command catalog payload", paths.commands, "json")
  ];

  if (blockers.length === 0) {
    writeJson(paths.dashboard, sources.dashboard.body);
    writeJson(paths.menu, sources.menu.body);
    writeJson(paths.recipe, sources.recipe.body);
    writeJson(paths.handoff_json, sources.handoff_json.body);
    writeJson(paths.commands, sources.commands.body);
  }

  const data = {
    command: "deployability:evidence",
    mode: "evidence_bundle",
    ok: blockers.length === 0,
    current_bundle: currentBundle,
    profile_filter: sources.dashboard.body?.profile_filter || sources.commands.body?.filters_applied?.profile || profileFilter,
    output_dir: outputDir,
    manifest_path: paths.manifest,
    artifacts,
    blockers,
    warnings: [
      ...(sources.dashboard.body?.warnings || []),
      ...(sources.menu.body?.warnings || []),
      ...(sources.recipe.body?.warnings || []),
      ...(sources.handoff_json.body?.compatibility?.warnings || [])
    ].filter(Boolean),
    source_status: sourceStatus,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      `corepack pnpm run deployability:evidence -- --profile public-stack --output-dir ${outputDir}`,
      `corepack pnpm --silent run deployability:evidence -- --profile public-stack --output-dir ${outputDir} --json`,
      "corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>",
      "corepack pnpm run deployability:handoff -- --profile public-stack",
      "corepack pnpm run test:deployability"
    ],
    notes: [
      "use this bundle when an operator or management UI needs one directory of non-secret deployability evidence",
      "the bundle reuses dashboard, menu, recipe, handoff, and command catalog metadata instead of creating a new business truth source"
    ]
  };

  if (data.ok) {
    writeJson(paths.manifest, {
      generated_at: new Date().toISOString(),
      command: data.command,
      mode: data.mode,
      ok: data.ok,
      current_bundle: data.current_bundle,
      profile_filter: data.profile_filter,
      output_dir: data.output_dir,
      artifacts: data.artifacts,
      safety_defaults: data.safety_defaults,
      notes: data.notes
    });
  }

  return data;
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
  console.log("Deployability evidence");
  console.log("======================");
  console.log(`profile=${JSON.stringify(data.profile_filter)}`);
  console.log(`output_dir=${data.output_dir}`);
  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }
  console.log("\nArtifacts:");
  for (const item of data.artifacts) console.log(`- ${item.key}: ${item.path}`);
  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = evidenceData(args);
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
