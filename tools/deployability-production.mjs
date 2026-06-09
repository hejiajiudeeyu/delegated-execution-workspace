#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability production hardening review is read-only and does not read .env files directly",
  "deployability production hardening review only calls read-only roadmap, gates, and status metadata",
  "deployability production hardening review does not call Docker, bind ports, or probe network endpoints",
  "JSON output separates daily deployability from public exposure and formal production readiness without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:production -- --json",
  "corepack pnpm --silent run deployability:roadmap -- --json",
  "corepack pnpm --silent run deployability:gates -- --json",
  "corepack pnpm --silent run deployability:status -- --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:production",
  "corepack pnpm run deployability:gates",
  "corepack pnpm run published-image:plan",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
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

function milestone(roadmap, key) {
  return roadmap?.milestones?.find((item) => item.key === key) || null;
}

function gate(gates, key) {
  return gates?.gates?.find((item) => item.key === key) || null;
}

function buildHardeningTracks({ roadmap, gates }) {
  const publicStack = milestone(roadmap, "public_stack_safety_gate");
  const production = milestone(roadmap, "formal_production_hardening");
  const publicExposure = gate(gates, "public_stack_exposure");
  const formalProduction = gate(gates, "formal_production_hardening");
  const productionRemaining = production?.remaining_work || formalProduction?.remaining_work || [];

  return [
    {
      key: "public_exposure",
      label: "Public exposure",
      status: publicStack?.status || publicExposure?.status || "gated",
      owner_scope: "fourth_repo_plus_formal_repos",
      owner_repo: null,
      evidence_commands:
        publicStack?.evidence_commands ||
        publicExposure?.commands || [
          "corepack pnpm run selfhost:security-review -- --profile public-stack",
          "corepack pnpm run operator:onboarding:check",
          "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"
        ],
      guardrails: publicExposure?.guardrails || [
        "localhost public origin remains a blocker for public exposure",
        "placeholder secrets remain blockers for public exposure"
      ],
      remaining_work: publicStack?.remaining_work || publicExposure?.remaining_work || []
    },
    {
      key: "billing_production",
      label: "Billing production readiness",
      status: "planned",
      owner_scope: "formal_repo",
      owner_repo: "repos/platform",
      evidence_commands: ["corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"],
      guardrails: [
        "billing can be visible to operators without being presented as default production-ready",
        "billing production gates belong in the platform owning repository"
      ],
      remaining_work: productionRemaining.filter((item) => /billing/i.test(item))
    },
    {
      key: "email_transport",
      label: "Email transport production readiness",
      status: "planned",
      owner_scope: "formal_repo",
      owner_repo: "repos/client",
      evidence_commands: ["corepack pnpm run test:deployability-operations"],
      guardrails: [
        "email transport readiness must remain separate from daily local deployability",
        "email transport gates belong in the owning client repository"
      ],
      remaining_work: productionRemaining.filter((item) => /email/i.test(item))
    },
    {
      key: "marketplace_readiness",
      label: "Marketplace production readiness",
      status: "planned",
      owner_scope: "formal_repos",
      owner_repo: null,
      evidence_commands: ["corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"],
      guardrails: [
        "marketplace readiness is not implied by local daily deployability",
        "marketplace gates must be proven in the owning formal repositories"
      ],
      remaining_work: productionRemaining.filter((item) => /marketplace/i.test(item))
    },
    {
      key: "formal_release",
      label: "Formal package and image release",
      status: "planned",
      owner_scope: "formal_repos",
      owner_repo: null,
      evidence_commands: formalProduction?.commands || ["corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"],
      guardrails: [
        "formal npm and image release gates stay in the owning repositories",
        "the fourth repo certifies compatible source combinations, not formal package or image releases"
      ],
      remaining_work: productionRemaining.filter((item) => /npm|image|release|owning repositories/i.test(item))
    }
  ].map((track) => ({
    ...track,
    remaining_work: track.remaining_work.length ? track.remaining_work : ["keep this gate planned until owning-repo evidence is available"]
  }));
}

function summarize({ tracks, blockers, warnings, status }) {
  const countByStatus = (value) => tracks.filter((item) => item.status === value).length;
  return {
    status: blockers.length ? "blocked" : "daily_deployable_production_planned",
    production_ready: false,
    daily_deployable: status?.summary?.readiness_status === "daily_deployable_with_safety_gates",
    hardening_track_count: tracks.length,
    planned_count: countByStatus("planned"),
    gated_count: countByStatus("gated"),
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function productionData() {
  const roadmapResult = runJsonScript("tools/deployability-roadmap.mjs");
  const gatesResult = runJsonScript("tools/deployability-gates.mjs");
  const statusResult = runJsonScript("tools/deployability-status.mjs");
  const sourceBlockers = [
    sourceBlocker("roadmap", roadmapResult),
    sourceBlocker("gates", gatesResult),
    sourceBlocker("status", statusResult)
  ].filter(Boolean);
  const roadmap = roadmapResult.body || null;
  const gates = gatesResult.body || null;
  const status = statusResult.body || null;
  const blockers = unique([
    ...sourceBlockers,
    ...(roadmap?.blockers || []),
    ...(gates?.blockers || []),
    ...(status?.blockers || [])
  ]);
  const warnings = unique([...(roadmap?.warnings || []), ...(gates?.warnings || []), ...(status?.warnings || [])]);
  const hardeningTracks = buildHardeningTracks({ roadmap, gates });
  const summary = summarize({ tracks: hardeningTracks, blockers, warnings, status });

  return {
    command: "deployability:production",
    mode: "production_hardening_review",
    ok: blockers.length === 0,
    current_bundle: roadmap?.current_bundle || gates?.current_bundle || status?.current_bundle || null,
    summary,
    readiness_boundary: {
      daily_deployable: summary.daily_deployable,
      public_exposure_ready: false,
      production_ready: false,
      reason: "daily deployability is available, while public exposure and formal production hardening remain gated or planned"
    },
    hardening_tracks: hardeningTracks,
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
      gates: {
        ok: gatesResult.ok,
        exit_code: gatesResult.exit_code,
        stderr: gatesResult.stderr,
        parse_error: gatesResult.parse_error
      },
      status: {
        ok: statusResult.ok,
        exit_code: statusResult.exit_code,
        stderr: statusResult.stderr,
        parse_error: statusResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this when a management surface needs to explain why daily deployability is not production readiness",
      "hardening tracks are convenience projections over existing roadmap, gates, and status metadata; they do not execute commands"
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
  console.log("Deployability production hardening");
  console.log("==================================");
  console.log("Read-only boundary between daily deployability, public exposure, and formal production readiness.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`daily_deployable=${data.summary.daily_deployable}`);
  console.log(`production_ready=${data.summary.production_ready}\n`);

  for (const track of data.hardening_tracks) {
    console.log(`${track.key}: ${track.status}`);
    console.log(`  ${track.label}`);
    console.log(`  owner_scope: ${track.owner_scope}`);
    if (track.owner_repo) console.log(`  owner_repo: ${track.owner_repo}`);
    for (const command of track.evidence_commands) console.log(`  - ${command}`);
    for (const guardrail of track.guardrails) console.log(`  guardrail: ${guardrail}`);
    for (const item of track.remaining_work) console.log(`  remaining: ${item}`);
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
const data = productionData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
