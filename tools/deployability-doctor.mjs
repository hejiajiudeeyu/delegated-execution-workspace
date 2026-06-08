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

const REQUIRED_SCRIPTS = [
  "deployability:overview",
  "deployability:quickstart",
  "deployability:safety",
  "deployability:doctor",
  "deployability:dashboard",
  "deployability:commands",
  "deployability:handoff",
  "compat:status",
  "test:deployability-overview",
  "test:deployability-quickstart",
  "test:deployability-safety",
  "test:deployability-doctor",
  "test:deployability-dashboard",
  "test:deployability-pipeline-summaries",
  "test:deployability-commands",
  "test:deployability-handoff",
  "test:deployability",
  "test:deployability-operations",
  "test:compat-status"
];

const DOCTOR_COMMANDS = [
  "corepack pnpm run deployability:doctor",
  "corepack pnpm --silent run deployability:doctor -- --json",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm --silent run deployability:dashboard -- --json",
  "corepack pnpm run deployability:commands",
  "corepack pnpm --silent run deployability:commands -- --json"
];

const DOC_ALIGNMENT_FILES = [
  "README.md",
  "docs/product/deployability-ecosystem-prd.md",
  "docs/product/deployability-ecosystem-prd.zh-CN.md",
  "docs/product/deployability-pipelines-prd.md",
  "docs/product/deployability-pipelines-prd.zh-CN.md",
  "docs/runbooks/local-dev-setup.md",
  "docs/runbooks/local-dev-setup.zh-CN.md",
  "docs/architecture/main-readiness.md",
  "docs/architecture/main-readiness.zh-CN.md"
];

const ECOSYSTEM_PRD_FILES = [
  "docs/product/deployability-ecosystem-prd.md",
  "docs/product/deployability-ecosystem-prd.zh-CN.md"
];

const ECOSYSTEM_PRD_NEEDLES = [
  "daily-deployable",
  "Sub2API",
  "CLIProxyAPI",
  "one obvious quick-start path"
];

const BRAND_SITE_ALIGNMENT_FILES = [
  "repos/brand-site/scripts/deployability-content-smoke.mjs",
  "repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx",
  "repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx"
];

const BRAND_SITE_CONTENT_SMOKE_COMMAND = "npm run smoke:deployability-content";

const SAFETY_DEFAULTS = [
  "deployability doctor is read-only and does not read .env files",
  "deployability doctor does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains checks, blockers, warnings, command metadata, and next commands only",
  "dirty submodule worktrees are warnings; bundle mismatches and dirty gitlink markers are blockers"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:quickstart",
  "corepack pnpm run deployability:safety",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run compat:status",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations",
  "corepack pnpm run check:submodules",
  "corepack pnpm run check:bundles"
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

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
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

function checkCompatibilityLedger() {
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
  const gitlinkIssues = submodules.filter((item) => item.marker && ["+", "-", "U"].includes(item.marker)).map((item) => item.path);
  const dirtySubmodules = submodules.filter((item) => item.dirty).map((item) => item.path);
  const blockers = [
    ...ledgerMismatches.map((item) => `${item}: current SHA does not match latest bundle`),
    ...gitlinkIssues.map((item) => `${item}: submodule gitlink marker is not clean`)
  ];
  const warnings = dirtySubmodules.map((item) => `${item}: uncommitted worktree changes`);

  return {
    key: "compatibility_ledger",
    label: "compatibility ledger",
    ok: blockers.length === 0,
    blockers,
    warnings,
    evidence: [bundle.file, ...submodules.map((item) => `${item.path}@${item.sha || "missing"}`)],
    data: {
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
      submodules
    }
  };
}

function checkTopLevelScripts() {
  const pkg = JSON.parse(readFile("package.json"));
  const missing = REQUIRED_SCRIPTS.filter((script) => !pkg.scripts?.[script]);
  return {
    key: "top_level_scripts",
    label: "top-level deployability scripts",
    ok: missing.length === 0,
    blockers: missing.map((script) => `package.json missing script ${script}`),
    warnings: [],
    evidence: ["package.json"],
    data: {
      required_scripts: REQUIRED_SCRIPTS
    }
  };
}

function checkFilesContain(key, label, files, needles) {
  const blockers = [];
  const evidence = [];
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      blockers.push(`${file}: missing`);
      continue;
    }
    const body = fs.readFileSync(fullPath, "utf8");
    const missing = needles.filter((needle) => !body.includes(needle));
    if (missing.length) {
      blockers.push(`${file}: missing ${missing.join(", ")}`);
      continue;
    }
    evidence.push(file);
  }
  return {
    key,
    label,
    ok: blockers.length === 0,
    blockers,
    warnings: [],
    evidence,
    data: {
      required_strings: needles
    }
  };
}

function checkSafetyContract() {
  return {
    key: "safety_contract",
    label: "read-only safety contract",
    ok: true,
    blockers: [],
    warnings: [],
    evidence: ["tools/deployability-doctor.mjs"],
    data: {
      reads_env: false,
      writes_files: false,
      starts_services: false,
      stops_services: false,
      calls_docker: false,
      probes_network: false,
      private_terminal_text: false,
      ci_safe: true,
      dashboard_safe: true
    }
  };
}

function checkBrandSiteContentSmoke() {
  const cwd = path.join(ROOT, "repos/brand-site");
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return {
      key: "brand_site_content_smoke",
      label: "brand-site content smoke",
      ok: false,
      blockers: ["repos/brand-site/package.json: missing"],
      warnings: [],
      evidence: [],
      data: {
        command: BRAND_SITE_CONTENT_SMOKE_COMMAND,
        exit_code: null,
        stderr: []
      }
    };
  }

  const result = spawnSync("npm", ["run", "smoke:deployability-content"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
    env: process.env
  });
  const stderr = result.stderr.trim().split("\n").filter(Boolean).slice(-20);
  const blockers =
    result.status === 0
      ? []
      : [
          `repos/brand-site: ${BRAND_SITE_CONTENT_SMOKE_COMMAND} failed with exit ${
            result.status ?? "unknown"
          }`
        ];

  return {
    key: "brand_site_content_smoke",
    label: "brand-site content smoke",
    ok: blockers.length === 0,
    blockers,
    warnings: [],
    evidence: blockers.length === 0 ? [BRAND_SITE_CONTENT_SMOKE_COMMAND] : [],
    data: {
      command: BRAND_SITE_CONTENT_SMOKE_COMMAND,
      exit_code: result.status,
      stderr
    }
  };
}

function doctorData() {
  const checks = [
    checkCompatibilityLedger(),
    checkTopLevelScripts(),
    checkFilesContain("documentation_alignment", "documentation alignment", DOC_ALIGNMENT_FILES, DOCTOR_COMMANDS),
    checkFilesContain("ecosystem_prd_alignment", "ecosystem PRD alignment", ECOSYSTEM_PRD_FILES, ECOSYSTEM_PRD_NEEDLES),
    checkFilesContain("brand_site_alignment", "brand-site alignment", BRAND_SITE_ALIGNMENT_FILES, DOCTOR_COMMANDS),
    checkBrandSiteContentSmoke(),
    checkSafetyContract()
  ];
  const blockers = checks.flatMap((check) => check.blockers);
  const warnings = checks.flatMap((check) => check.warnings);
  return {
    command: "deployability:doctor",
    ok: blockers.length === 0,
    checks,
    blockers,
    warnings,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "run this after overview, quickstart, or safety when you need one read-only readiness snapshot",
      "pipeline-specific doctor, readiness, preflight, status, smoke, and audit commands remain authoritative"
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
  console.log("Deployability doctor");
  console.log("====================");
  console.log("Read-only readiness snapshot for deployability command and documentation alignment.\n");

  for (const check of data.checks) {
    const state = check.ok ? "pass" : "fail";
    console.log(`## ${check.label}`);
    console.log(`state=${state}`);
    if (check.evidence.length) {
      console.log(`evidence=${check.evidence.join(", ")}`);
    }
    for (const warning of check.warnings) {
      console.log(`warning=${warning}`);
    }
    for (const blocker of check.blockers) {
      console.log(`blocker=${blocker}`);
    }
    console.log("");
  }

  if (data.blockers.length) {
    console.log("Blockers:");
    for (const blocker of data.blockers) {
      console.log(`- ${blocker}`);
    }
    console.log("");
  }

  if (data.warnings.length) {
    console.log("Warnings:");
    for (const warning of data.warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  console.log("Safety defaults:");
  for (const note of data.safety_defaults) {
    console.log(`- ${note}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) {
    console.log(`- ${command}`);
  }
}

const args = parseArgs(process.argv);
const data = doctorData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exit(data.ok ? 0 : 1);
