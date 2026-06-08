#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { buildEcosystemReadiness } from "./lib/deployability-ecosystem-readiness.mjs";
import { PIPELINES, buildPipelineSummaries } from "./lib/deployability-pipeline-summaries.mjs";
import { buildProfileSummaries } from "./lib/deployability-profile-summaries.mjs";

const ROOT = process.cwd();
const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = path.dirname(TOOL_ROOT);
const SUBMODULES = [
  { path: "repos/protocol", bundleField: "protocol_sha", label: "protocol" },
  { path: "repos/client", bundleField: "client_sha", label: "client" },
  { path: "repos/platform", bundleField: "platform_sha", label: "platform" },
  { path: "repos/brand-site", bundleField: "brand_site_sha", label: "brand-site" }
];

const COMMAND_MAP = [
  {
    command: "corepack pnpm run deployability:overview",
    json_command: "corepack pnpm --silent run deployability:overview -- --json",
    purpose: "read the deployment, management, understanding, and safety map"
  },
  {
    command: "corepack pnpm run compat:status",
    json_command: "corepack pnpm --silent run compat:status -- --json",
    purpose: "compare the latest bundle ledger to current submodule SHAs"
  },
  {
    command: "corepack pnpm run deployability:quickstart",
    json_command: "corepack pnpm --silent run deployability:quickstart -- --json",
    purpose: "read the fresh-checkout first-use guide across daily development, self-host, public-stack, and release review"
  },
  {
    command: "corepack pnpm run deployability:safety",
    json_command: "corepack pnpm --silent run deployability:safety -- --json",
    purpose: "review read/write/startup/network/logging posture for deployability commands"
  },
  {
    command: "corepack pnpm run deployability:doctor",
    json_command: "corepack pnpm --silent run deployability:doctor -- --json",
    purpose: "run one read-only readiness snapshot for compatibility, command scripts, docs, brand-site, and safety-contract alignment"
  },
  {
    command: "corepack pnpm run deployability:dashboard",
    json_command: "corepack pnpm --silent run deployability:dashboard -- --json",
    purpose: "emit the single read-only JSON payload for top-level deployability dashboards and CI"
  },
  {
    command: "corepack pnpm run deployability:action-plan",
    json_command: "corepack pnpm --silent run deployability:action-plan -- --json",
    purpose: "choose the next operator action by profile, dashboard safety, and public exposure posture"
  },
  {
    command: "corepack pnpm run deployability:commands",
    json_command: "corepack pnpm --silent run deployability:commands -- --json",
    purpose: "browse the read-only command catalog by category, posture, track, or pipeline"
  },
  {
    command: "corepack pnpm run dev:doctor",
    json_command: "corepack pnpm --silent run dev:doctor -- --json",
    purpose: "diagnose the local caller-skill and MCP development loop"
  },
  {
    command: "corepack pnpm run selfhost:profiles",
    json_command: "corepack pnpm --silent run selfhost:profiles -- --json",
    purpose: "inspect built-in self-host profiles"
  },
  {
    command: "corepack pnpm run selfhost:readiness -- --all",
    json_command: "corepack pnpm --silent run selfhost:readiness -- --all --json",
    purpose: "read profile readiness before initialization or startup"
  }
];

const SAFETY_NOTES = [
  "handoff is read-only and does not read .env files",
  "handoff does not call Docker, bind ports, or probe network endpoints",
  "Markdown and JSON output include command metadata, pipeline summaries, bundle metadata, compatibility status, and safety notes only",
  "business protocol, client runtime, and platform runtime truth remain in the three formal repositories"
];

const NEXT_COMMANDS = [
  "corepack pnpm run check:submodules",
  "corepack pnpm run check:boundaries",
  "corepack pnpm run check:bundles",
  "corepack pnpm run test:contracts",
  "corepack pnpm run test:integration"
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    json: args.includes("--json"),
    output: null,
    profile: null
  };
  const outputIndex = args.indexOf("--output");
  if (outputIndex !== -1) {
    parsed.output = args[outputIndex + 1] || null;
  }
  const profileIndex = args.indexOf("--profile");
  if (profileIndex !== -1) {
    parsed.profile = args[profileIndex + 1] || "";
  }
  const profileEquals = args.find((item) => item.startsWith("--profile="));
  if (profileEquals) {
    parsed.profile = profileEquals.slice("--profile=".length);
  }
  return parsed;
}

function runGit(args, cwd = ROOT) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
}

function runJsonScript(relativeScript, extraArgs = []) {
  const result = spawnSync(process.execPath, [path.join(TOOL_ROOT, relativeScript), "--json", ...extraArgs], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
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
    parse_error: body == null ? "script did not emit valid JSON" : null
  };
}

function latestBundleFile() {
  const changesDir = path.join(ROOT, "changes");
  if (!fs.existsSync(changesDir)) {
    throw new Error("changes/ missing");
  }
  const files = fs
    .readdirSync(changesDir)
    .filter((file) => /^CHG-\d{4}-\d+\.ya?ml$/.test(file))
    .sort();
  if (files.length === 0) {
    throw new Error("no CHG bundle files found");
  }
  return path.join(changesDir, files[files.length - 1]);
}

function rawField(text, field) {
  const match = text.match(new RegExp(`^${field}:\\s*['"]?([^\\s'"]+)['"]?\\s*$`, "m"));
  return match ? match[1] : null;
}

function shaText(value) {
  return value == null ? null : String(value);
}

function readLatestBundle() {
  const file = latestBundleFile();
  const raw = fs.readFileSync(file, "utf8");
  const body = YAML.parse(raw);
  return {
    file: path.relative(ROOT, file),
    ...body,
    protocol_sha: rawField(raw, "protocol_sha") || body.protocol_sha,
    client_sha: rawField(raw, "client_sha") || body.client_sha,
    platform_sha: rawField(raw, "platform_sha") || body.platform_sha,
    brand_site_sha: rawField(raw, "brand_site_sha") || body.brand_site_sha
  };
}

function submoduleStatusLines() {
  const result = runGit(["submodule", "status", "--recursive"]);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git submodule status failed");
  }
  return result.stdout.trim().split("\n").filter(Boolean);
}

function parseSubmoduleLines(lines) {
  const byPath = new Map();
  for (const line of lines) {
    const match = line.match(/^([\s+\-U]?)([0-9a-f]{40})\s+(\S+)(?:\s+\(([^)]+)\))?/);
    if (!match) continue;
    const [, marker, sha, relPath, ref = ""] = match;
    byPath.set(relPath, {
      path: relPath,
      sha,
      marker: marker || " ",
      ref
    });
  }
  return byPath;
}

function dirtyStatus(relPath) {
  const fullPath = path.join(ROOT, relPath);
  const result = runGit(["-C", fullPath, "status", "--short"]);
  if (result.status !== 0) {
    return {
      dirty: true,
      entries: [],
      status_error: result.stderr.trim() || `exit=${result.status}`
    };
  }
  const entries = result.stdout.trim().split("\n").filter(Boolean);
  return {
    dirty: entries.length > 0,
    entries
  };
}

function compatibilityData(bundle) {
  const parsed = parseSubmoduleLines(submoduleStatusLines());
  const submodules = SUBMODULES.map((item) => {
    const current = parsed.get(item.path);
    const dirty = dirtyStatus(item.path);
    const bundleSha = shaText(bundle[item.bundleField]);
    const sha = current?.sha || null;
    return {
      path: item.path,
      label: item.label,
      sha,
      bundle_sha: bundleSha,
      matches_bundle: Boolean(sha && bundleSha && sha === bundleSha),
      marker: current?.marker || null,
      ref: current?.ref || "",
      dirty: dirty.dirty,
      dirty_entries: dirty.entries || [],
      status_error: dirty.status_error || null
    };
  });
  const ledgerMismatches = submodules.filter((item) => !item.matches_bundle).map((item) => item.path);
  const dirtySubmodules = submodules.filter((item) => item.dirty).map((item) => item.path);
  const gitlinkIssues = submodules.filter((item) => item.marker && ["+", "-", "U"].includes(item.marker)).map((item) => item.path);
  return {
    ledger_matches_current: ledgerMismatches.length === 0,
    working_tree_clean: dirtySubmodules.length === 0,
    dirty_submodules: dirtySubmodules,
    submodule_gitlink_issues: gitlinkIssues,
    submodules,
    blockers: [
      ...ledgerMismatches.map((item) => `${item}: current SHA does not match latest bundle`),
      ...gitlinkIssues.map((item) => `${item}: submodule gitlink marker is not clean`)
    ],
    warnings: dirtySubmodules.map((item) => `${item}: uncommitted worktree changes`)
  };
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(ROOT, "exports", "deployability", `${stamp}-handoff.md`);
}

function resolveOutput(output) {
  if (!output) return defaultOutputPath();
  return path.isAbsolute(output) ? output : path.join(ROOT, output);
}

function reportData(output, args = parseArgs(process.argv)) {
  const bundle = readLatestBundle();
  const compatibility = compatibilityData(bundle);
  const commandCatalogArgs = args.profile != null ? ["--profile", args.profile] : [];
  const commandCatalog = runJsonScript("deployability-commands.mjs", commandCatalogArgs);
  const readinessCommandCatalog = args.profile == null ? commandCatalog : runJsonScript("deployability-commands.mjs");
  const commandCatalogBlockers = commandCatalog.ok
    ? []
    : [
        `deployability:commands: ${
          commandCatalog.parse_error || commandCatalog.stderr.join("; ") || `exit=${commandCatalog.exit_code}`
        }`
      ];
  const profileFilter = commandCatalog.body?.filters_applied?.profile || {
    requested: args.profile,
    resolved: null,
    pipeline: null
  };
  const pipelineSummaries = buildPipelineSummaries({
    pipelines: PIPELINES,
    catalogCommands: commandCatalog.body?.commands || []
  }).filter((item) => profileFilter.pipeline == null || item.key === profileFilter.pipeline);

  return {
    command: "deployability:handoff",
    ok: compatibility.blockers.length === 0 && commandCatalogBlockers.length === 0,
    output,
    current_bundle: {
      file: bundle.file,
      change_id: bundle.change_id,
      goal: bundle.goal,
      protocol_sha: shaText(bundle.protocol_sha),
      client_sha: shaText(bundle.client_sha),
      platform_sha: shaText(bundle.platform_sha),
      brand_site_sha: shaText(bundle.brand_site_sha),
      contracts_check: bundle.contracts_check,
      integration_check: bundle.integration_check
    },
    compatibility,
    command_catalog_status: {
      ok: commandCatalog.ok,
      exit_code: commandCatalog.exit_code,
      stderr: commandCatalog.stderr,
      parse_error: commandCatalog.parse_error,
      profile: profileFilter
    },
    command_map: COMMAND_MAP,
    profile_filter: profileFilter,
    profile_selector: commandCatalog.body?.filters?.profiles || [],
    profile_summaries: buildProfileSummaries({
      profiles: commandCatalog.body?.filters?.profiles || [],
      pipelineSummaries
    }),
    ecosystem_readiness: buildEcosystemReadiness({
      catalogCommands: readinessCommandCatalog.body?.commands || [],
      brandSiteOk: true
    }),
    pipeline_summaries: pipelineSummaries,
    blockers: commandCatalogBlockers,
    safety_notes: SAFETY_NOTES,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this report as the daily handoff artifact before deployment or development review",
      "run profile-specific selfhost reports when the target is an actual running deployment"
    ]
  };
}

function markdownReport(data) {
  const lines = [
    "# Deployability Handoff",
    "",
    "Read-only handoff artifact for deployment, management, understanding, and safety review.",
    "",
    "## Current Bundle",
    "",
    `- Change: ${data.current_bundle.change_id}`,
    `- File: ${data.current_bundle.file}`,
    `- Goal: ${data.current_bundle.goal}`,
    `- Contracts check: ${data.current_bundle.contracts_check}`,
    `- Integration check: ${data.current_bundle.integration_check}`,
    `- Protocol SHA: ${data.current_bundle.protocol_sha}`,
    `- Client SHA: ${data.current_bundle.client_sha}`,
    `- Platform SHA: ${data.current_bundle.platform_sha}`,
    `- Brand-site SHA: ${data.current_bundle.brand_site_sha}`,
    "",
    "## Compatibility",
    "",
    `- Ledger matches current: ${data.compatibility.ledger_matches_current ? "yes" : "no"}`,
    `- Working tree clean: ${data.compatibility.working_tree_clean ? "yes" : "no"}`,
    "",
    "### Submodules",
    ""
  ];

  for (const item of data.compatibility.submodules) {
    const dirty = item.dirty ? "dirty" : "clean";
    const ledger = item.matches_bundle ? "matches bundle" : "bundle mismatch";
    lines.push(`- ${item.path}: ${dirty}; ${ledger}; sha=${item.sha || "missing"}`);
  }

  if (data.compatibility.blockers.length) {
    lines.push("", "### Blockers", "");
    for (const blocker of data.compatibility.blockers) lines.push(`- ${blocker}`);
  }

  if (data.compatibility.warnings.length) {
    lines.push("", "### Warnings", "");
    for (const warning of data.compatibility.warnings) lines.push(`- ${warning}`);
  }

  if (data.blockers.length) {
    lines.push("", "## Handoff Blockers", "");
    for (const blocker of data.blockers) lines.push(`- ${blocker}`);
  }

  lines.push("", "## Command Map", "");
  for (const item of data.command_map) {
    lines.push(`- ${item.command}`);
    lines.push(`  - JSON: ${item.json_command}`);
    lines.push(`  - Purpose: ${item.purpose}`);
  }

  if (data.profile_filter.requested != null) {
    lines.push("", "## Profile Filter", "");
    lines.push(`- Requested: ${data.profile_filter.requested}`);
    lines.push(`- Resolved: ${data.profile_filter.resolved || "unknown"}`);
    lines.push(`- Pipeline: ${data.profile_filter.pipeline || "unknown"}`);
  }

  if (data.profile_selector.length) {
    lines.push("", "## Profile Selector", "");
    for (const profile of data.profile_selector) {
      lines.push(`- ${profile.key} -> ${profile.pipeline_key}`);
      lines.push(`  - Aliases: ${profile.aliases.join(", ")}`);
      lines.push(`  - Purpose: ${profile.purpose}`);
    }
  }

  lines.push("", "## Ecosystem Readiness", "");
  lines.push(`- Goal: ${data.ecosystem_readiness.goal}`);
  lines.push(`- Status: ${data.ecosystem_readiness.status}`);
  for (const item of data.ecosystem_readiness.checks) {
    lines.push(`- ${item.key}: ${item.ok ? "ok" : "blocked"}`);
    lines.push(`  - Evidence: ${item.evidence.join(" | ")}`);
    lines.push(`  - Next: ${item.next_commands.join(" | ")}`);
  }
  lines.push("", "### Ecosystem Safety Notes", "");
  for (const note of data.ecosystem_readiness.safety_notes) lines.push(`- ${note}`);

  lines.push("", "## Pipeline Summaries", "");
  for (const item of data.pipeline_summaries) {
    lines.push(
      `- ${item.key}: ${item.status}; commands=${item.command_count}; json=${item.json_command_count}; dashboard-safe=${item.dashboard_safe_command_count}; ci-safe=${item.ci_safe_command_count}; exposure-gates=${item.public_exposure_gate_count}`
    );
    lines.push(`  - Next: ${item.next_commands.join(" | ")}`);
    lines.push(`  - Safety: ${item.safety_notes.join(" | ")}`);
  }

  lines.push("", "## Safety Notes", "");
  for (const note of data.safety_notes) lines.push(`- ${note}`);

  lines.push("", "## Next Commands", "");
  for (const command of data.next_commands) lines.push(`- ${command}`);

  return `${lines.join("\n")}\n`;
}

function writeReport(data) {
  fs.mkdirSync(path.dirname(data.output), { recursive: true });
  fs.writeFileSync(data.output, markdownReport(data), "utf8");
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
  console.log("Deployability handoff");
  console.log("=====================");
  console.log(`bundle=${data.current_bundle.change_id} file=${data.current_bundle.file}`);
  console.log(`ledger=${data.compatibility.ledger_matches_current ? "matches-current" : "mismatch"}`);
  console.log(`worktree=${data.compatibility.working_tree_clean ? "clean" : "dirty"}`);
  console.log(`output=${data.output}`);
  if (data.profile_filter.requested != null) {
    console.log(`profile=${data.profile_filter.requested} resolved=${data.profile_filter.resolved || "unknown"}`);
  }
  console.log("\nCommand map:");
  for (const item of data.command_map) {
    console.log(`- ${item.command}`);
  }
  if (data.compatibility.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.compatibility.blockers) console.log(`- ${blocker}`);
  }
  if (data.compatibility.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.compatibility.warnings) console.log(`- ${warning}`);
  }
  if (data.blockers.length) {
    console.log("\nHandoff blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }
}

try {
  const args = parseArgs(process.argv);
  const output = resolveOutput(args.output);
  const data = reportData(output, args);
  writeReport(data);
  if (args.json) {
    printJson(data);
  } else {
    printText(data);
  }
  process.exit(data.ok ? 0 : 1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
