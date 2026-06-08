#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DEFAULT_IMAGE_TAG = "latest";

const SAFETY_DEFAULTS = [
  "deployability release review is non-destructive and does not publish images or packages",
  "deployability release review runs published-image smoke only in dry-run mode",
  "deployability release review does not start services, bind ports, probe network endpoints, or print secret values",
  "JSON output separates script blockers from release blockers so dashboards can render blocked candidates"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:release -- --image-tag <candidate-tag> --json",
  "corepack pnpm --silent run deployability:production -- --json",
  "corepack pnpm --silent run deployability:exposure -- --json",
  "corepack pnpm --silent run published-image:plan -- --image-tag <candidate-tag> --json",
  "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:release -- --image-tag <candidate-tag>",
  "corepack pnpm run deployability:production",
  "corepack pnpm run deployability:exposure",
  "corepack pnpm run published-image:plan",
  "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
  "corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  const args = {
    json: false,
    imageTag: process.env.IMAGE_TAG || DEFAULT_IMAGE_TAG
  };
  const values = argv.slice(2);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--image-tag") {
      args.imageTag = values[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--image-tag=")) {
      args.imageTag = value.slice("--image-tag=".length);
      continue;
    }
    throw new Error(`unknown option ${value}`);
  }
  if (!args.imageTag) {
    throw new Error("--image-tag must not be empty");
  }
  return args;
}

function runJson(relativeScript, args = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), ...args, "--json"], {
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
    ok: body != null,
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

function releaseBlockers({ production, exposure, plan, dryRun }) {
  return unique([
    production?.summary?.production_ready === false
      ? "production hardening is not complete; keep formal release ownership in the owning repositories"
      : null,
    exposure?.summary?.public_exposure_ready === false
      ? `public exposure is blocked: ${(exposure.exposure_blockers || []).join("; ") || "review deployability:exposure"}`
      : null,
    plan?.ok === false ? "published image plan did not pass" : null,
    dryRun?.ok === false ? "published image dry-run smoke did not pass" : null,
    "formal release ownership remains in repos/protocol, repos/client, and repos/platform"
  ]);
}

function summarize({ blockers, releaseBlockers, warnings, production, exposure, plan, dryRun }) {
  return {
    status: releaseBlockers.length ? "release_candidate_blocked" : "release_candidate_ready",
    release_candidate_ready: releaseBlockers.length === 0,
    production_ready: production?.summary?.production_ready === true,
    public_exposure_ready: exposure?.summary?.public_exposure_ready === true,
    published_image_plan_ready: plan?.ok === true,
    dry_run_ready: dryRun?.ok === true && dryRun?.dry_run === true,
    release_blocker_count: releaseBlockers.length,
    script_blocker_count: blockers.length,
    warning_count: warnings.length
  };
}

function releaseData(args) {
  const productionResult = runJson("tools/deployability-production.mjs");
  const exposureResult = runJson("tools/deployability-exposure.mjs");
  const planResult = runJson("tools/published-image-smoke.mjs", ["plan", "--image-tag", args.imageTag]);
  const dryRunResult = runJson("tools/published-image-smoke.mjs", [
    "smoke",
    "--dry-run",
    "--image-tag",
    args.imageTag
  ]);

  const blockers = unique([
    sourceBlocker("production", productionResult),
    sourceBlocker("exposure", exposureResult),
    sourceBlocker("published-image:plan", planResult),
    sourceBlocker("published-image:smoke dry-run", dryRunResult)
  ]);
  const production = productionResult.body || null;
  const exposure = exposureResult.body || null;
  const plan = planResult.body || null;
  const dryRun = dryRunResult.body || null;
  const candidateBlockers = blockers.length
    ? []
    : releaseBlockers({
        production,
        exposure,
        plan,
        dryRun
      });
  const warnings = unique([
    ...(production?.warnings || []),
    ...(exposure?.warnings || []),
    ...(plan?.warnings || []),
    ...(dryRun?.warnings || [])
  ]);

  return {
    command: "deployability:release",
    mode: "release_candidate_review",
    ok: blockers.length === 0,
    current_bundle: production?.current_bundle || exposure?.current_bundle || null,
    profile: {
      key: "public_stack",
      name: "public-stack"
    },
    image_tag: args.imageTag,
    summary: summarize({
      blockers,
      releaseBlockers: candidateBlockers,
      warnings,
      production,
      exposure,
      plan,
      dryRun
    }),
    release_blockers: candidateBlockers,
    blockers,
    warnings,
    production_review: production
      ? {
          command: production.command,
          mode: production.mode,
          ok: production.ok,
          summary: production.summary,
          readiness_boundary: production.readiness_boundary,
          hardening_tracks: production.hardening_tracks
        }
      : null,
    exposure_review: exposure
      ? {
          command: exposure.command,
          mode: exposure.mode,
          ok: exposure.ok,
          summary: exposure.summary,
          exposure_blockers: exposure.exposure_blockers,
          gate: exposure.gate
        }
      : null,
    published_image_plan: plan,
    published_image_dry_run: dryRun,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: MACHINE_PAYLOADS,
    source_status: {
      production: {
        ok: productionResult.ok,
        exit_code: productionResult.exit_code,
        stderr: productionResult.stderr,
        parse_error: productionResult.parse_error
      },
      exposure: {
        ok: exposureResult.ok,
        exit_code: exposureResult.exit_code,
        stderr: exposureResult.stderr,
        parse_error: exposureResult.parse_error
      },
      published_image_plan: {
        ok: planResult.ok,
        exit_code: planResult.exit_code,
        stderr: planResult.stderr,
        parse_error: planResult.parse_error
      },
      published_image_dry_run: {
        ok: dryRunResult.ok,
        exit_code: dryRunResult.exit_code,
        stderr: dryRunResult.stderr,
        parse_error: dryRunResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this before treating a candidate image tag as deployable release evidence",
      "this command is a fourth-repo orchestration view; formal package and image release gates stay in the owning repositories"
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
  console.log("Deployability release candidate");
  console.log("===============================");
  console.log("Read-only release candidate review for published-image evidence and safety gates.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`image_tag=${data.image_tag}`);
  console.log(`status=${data.summary.status}`);
  console.log(`release_candidate_ready=${data.summary.release_candidate_ready}`);
  console.log(`production_ready=${data.summary.production_ready}`);
  console.log(`public_exposure_ready=${data.summary.public_exposure_ready}`);
  console.log(`published_image_plan_ready=${data.summary.published_image_plan_ready}`);
  console.log(`dry_run_ready=${data.summary.dry_run_ready}\n`);

  if (data.release_blockers.length) {
    console.log("Release blockers:");
    for (const blocker of data.release_blockers) console.log(`- ${blocker}`);
    console.log("");
  }

  console.log("Evidence:");
  console.log(`- ${data.production_review?.command || "deployability:production"}: ${data.production_review?.summary?.status || "unavailable"}`);
  console.log(`- ${data.exposure_review?.command || "deployability:exposure"}: ${data.exposure_review?.summary?.status || "unavailable"}`);
  console.log(`- published-image:plan: ${data.published_image_plan?.ok ? "ready" : "blocked"}`);
  console.log(`- published-image:smoke dry-run: ${data.published_image_dry_run?.ok ? "ready" : "blocked"}`);

  if (data.blockers.length) {
    console.log("\nScript blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nPrimary next commands:");
  for (const command of data.primary_next_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = releaseData(args);
  if (args.json) {
    printJson(data);
  } else {
    printText(data);
  }
  process.exitCode = data.ok ? 0 : 1;
} catch (error) {
  console.error(`[deployability-release] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
