#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildEcosystemReadiness } from "./lib/deployability-ecosystem-readiness.mjs";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability readiness is read-only and does not read .env files directly",
  "deployability readiness only calls read-only command catalog and doctor metadata",
  "deployability readiness does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains daily-deployable scorecard evidence without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run deployability:doctor",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run selfhost:readiness -- --all",
  "corepack pnpm run check:submodules",
  "corepack pnpm run check:bundles"
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

function doctorCheckOk(doctor, key) {
  return doctor?.checks?.some((item) => item.key === key && item.ok === true) || false;
}

function summarize(checks, status) {
  const passedChecks = checks.filter((item) => item.ok).length;
  return {
    total_checks: checks.length,
    passed_checks: passedChecks,
    blocked_checks: checks.length - passedChecks,
    status,
    safety_gate_required: status === "daily_deployable_with_safety_gates"
  };
}

function readinessData() {
  const commandsResult = runJsonScript("tools/deployability-commands.mjs");
  const doctorResult = runJsonScript("tools/deployability-doctor.mjs");
  const blockers = [sourceBlocker("commands", commandsResult), sourceBlocker("doctor", doctorResult)].filter(Boolean);
  const doctor = doctorResult.body || {};
  const readiness = buildEcosystemReadiness({
    catalogCommands: commandsResult.body?.commands || [],
    brandSiteOk: doctorCheckOk(doctor, "brand_site_alignment") && doctorCheckOk(doctor, "brand_site_content_smoke")
  });
  const checkBlockers = readiness.checks
    .filter((item) => !item.ok)
    .map((item) => `${item.key}: ${item.label}`);
  const allBlockers = [...blockers, ...checkBlockers];

  return {
    command: "deployability:readiness",
    ok: allBlockers.length === 0,
    current_bundle: commandsResult.body?.current_bundle || doctor.checks?.[0]?.data?.current_bundle || null,
    ecosystem_readiness: readiness,
    checks: readiness.checks,
    summary: summarize(readiness.checks, readiness.status),
    blockers: allBlockers,
    warnings: doctor.warnings || [],
    source_status: {
      commands: {
        ok: commandsResult.ok,
        exit_code: commandsResult.exit_code,
        stderr: commandsResult.stderr,
        parse_error: commandsResult.parse_error
      },
      doctor: {
        ok: doctorResult.ok,
        exit_code: doctorResult.exit_code,
        stderr: doctorResult.stderr,
        parse_error: doctorResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    safety_notes: readiness.safety_notes,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this when a human, CI job, or management UI needs the daily-deployable scorecard without the full dashboard payload",
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
  console.log("Deployability readiness");
  console.log("=======================");
  console.log("Read-only daily-deployable scorecard for humans, CI, and management UIs.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.ecosystem_readiness.status}`);
  console.log(`checks=${data.summary.passed_checks}/${data.summary.total_checks}`);
  console.log("");

  for (const check of data.checks) {
    console.log(`${check.key}: ${check.ok ? "ok" : "blocked"}`);
    console.log(`  ${check.label}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nSafety notes:");
  for (const note of data.safety_notes) console.log(`- ${note}`);

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = readinessData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
