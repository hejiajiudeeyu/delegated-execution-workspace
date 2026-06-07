#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const ROOT = process.cwd();
const SUBMODULES = [
  { path: "repos/protocol", bundleField: "protocol_sha", label: "protocol" },
  { path: "repos/client", bundleField: "client_sha", label: "client" },
  { path: "repos/platform", bundleField: "platform_sha", label: "platform" },
  { path: "repos/brand-site", bundleField: "brand_site_sha", label: "brand-site" }
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function runGit(args, cwd = ROOT) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
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

function shaText(value) {
  return value == null ? null : String(value);
}

function rawField(text, field) {
  const match = text.match(new RegExp(`^${field}:\\s*['"]?([^\\s'"]+)['"]?\\s*$`, "m"));
  return match ? match[1] : null;
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

function statusData() {
  const bundle = readLatestBundle();
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
  const blockers = [
    ...ledgerMismatches.map((item) => `${item}: current SHA does not match latest bundle`),
    ...gitlinkIssues.map((item) => `${item}: submodule gitlink marker is not clean`)
  ];

  return {
    command: "compat:status",
    ok: blockers.length === 0,
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
    ledger_matches_current: ledgerMismatches.length === 0,
    working_tree_clean: dirtySubmodules.length === 0,
    dirty_submodules: dirtySubmodules,
    submodule_gitlink_issues: gitlinkIssues,
    submodules,
    blockers,
    warnings: dirtySubmodules.map((item) => `${item}: uncommitted worktree changes`),
    next_commands: [
      "corepack pnpm run check:submodules",
      "corepack pnpm run check:bundles",
      "corepack pnpm run test:contracts",
      "corepack pnpm run test:integration"
    ],
    notes: [
      "reports compatibility-ledger state and local worktree dirtiness separately",
      "dirty submodules are warnings here; ledger mismatches and gitlink markers are blockers",
      "does not read .env files, call Docker, bind ports, probe networks, or print secret values"
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
  console.log("Compatibility status");
  console.log("====================");
  console.log(`bundle=${data.current_bundle.change_id} file=${data.current_bundle.file}`);
  console.log(`ledger=${data.ledger_matches_current ? "matches-current" : "mismatch"}`);
  console.log(`worktree=${data.working_tree_clean ? "clean" : "dirty"}`);
  console.log("");

  for (const item of data.submodules) {
    const ledger = item.matches_bundle ? "matches bundle" : "bundle mismatch";
    const dirty = item.dirty ? "dirty" : "clean";
    console.log(`${item.path}: ${dirty}; ${ledger}; sha=${item.sha || "missing"}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) {
    console.log(`- ${command}`);
  }
}

const args = parseArgs(process.argv);
const data = statusData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exit(data.ok ? 0 : 1);
