#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability production hardening review is read-only and does not read .env files directly",
  "deployability production hardening review only calls read-only roadmap metadata",
  "deployability production hardening review does not call Docker, bind ports, or probe network endpoints",
  "JSON output separates daily deployability from public exposure and formal production readiness without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:production -- --json",
  "corepack pnpm --silent run deployability:roadmap -- --json"
];

const PRODUCTION_REMEDIATION_MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:production -- --json",
  "corepack pnpm --silent run deployability:hardening-plan -- --json",
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

function fallback(items, pattern, fallbackItem) {
  const matched = items.filter((item) => pattern.test(item));
  return matched.length ? matched : [fallbackItem];
}

function buildHardeningTracks({ roadmap }) {
  const publicStack = milestone(roadmap, "public_stack_safety_gate");
  const production = milestone(roadmap, "formal_production_hardening");
  const productionRemaining = production?.remaining_work || [];

  return [
    {
      key: "public_exposure",
      label: "Public exposure",
      status: publicStack?.status || "gated",
      owner_scope: "fourth_repo_plus_formal_repos",
      owner_repo: null,
      evidence_commands:
        publicStack?.evidence_commands || [
          "corepack pnpm run selfhost:security-review -- --profile public-stack",
          "corepack pnpm run operator:onboarding:check",
          "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"
        ],
      guardrails: [
        "localhost public origin remains a blocker for public exposure",
        "placeholder secrets remain blockers for public exposure",
        "security review, onboarding check, and published-image dry-run must be visible before real exposure"
      ],
      remaining_work: publicStack?.remaining_work || []
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
      remaining_work: fallback(productionRemaining, /billing/i, "finish billing production gates before presenting billing as a default-ready surface")
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
      remaining_work: fallback(productionRemaining, /email/i, "finish email transport gates before claiming public production readiness")
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
      remaining_work: fallback(productionRemaining, /marketplace/i, "finish marketplace gates before claiming public production readiness")
    },
    {
      key: "formal_release",
      label: "Formal package and image release",
      status: "planned",
      owner_scope: "formal_repos",
      owner_repo: null,
      evidence_commands: production?.evidence_commands || ["corepack pnpm run published-image:plan", "corepack pnpm run test:deployability-operations"],
      guardrails: [
        "formal npm and image release gates stay in the owning repositories",
        "the fourth repo certifies compatible source combinations, not formal package or image releases"
      ],
      remaining_work: fallback(productionRemaining, /npm|image|release|owning repositories/i, "keep formal npm/image release gates in the owning repositories")
    }
  ];
}

function buildProductionReadinessRemediationPlan({ hardeningTracks, summary }) {
  const tracksByKey = new Map(hardeningTracks.map((item) => [item.key, item]));
  const publicExposure = tracksByKey.get("public_exposure");
  const billing = tracksByKey.get("billing_production");
  const email = tracksByKey.get("email_transport");
  const marketplace = tracksByKey.get("marketplace_readiness");
  const formalRelease = tracksByKey.get("formal_release");

  const gateStep = (track, key, label, commands, doneWhen) => ({
    key,
    label,
    status: track?.status || "planned",
    owner_scope: track?.owner_scope || null,
    owner_repo: track?.owner_repo || null,
    blocked_by: track?.remaining_work || [],
    guardrails: track?.guardrails || [],
    commands,
    done_when: doneWhen
  });

  return {
    key: "formal_production_readiness_remediation",
    status: summary.production_ready ? "ready" : "planned",
    daily_deployable: summary.daily_deployable,
    public_exposure_ready: false,
    production_ready: summary.production_ready,
    steps: [
      gateStep(
        publicExposure,
        "prove_public_exposure_gate",
        "Prove public exposure gate",
        [
          "corepack pnpm run deployability:exposure",
          ...(publicExposure?.evidence_commands || [
            "corepack pnpm run selfhost:security-review -- --profile public-stack",
            "corepack pnpm run operator:onboarding:check",
            "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"
          ])
        ],
        "public-stack security review, onboarding contract check, and published-image dry-run are all visible"
      ),
      gateStep(
        billing,
        "define_billing_production_gate",
        "Define billing production gate",
        ["corepack pnpm run deployability:gates", ...(billing?.evidence_commands || [])],
        "billing production acceptance evidence is owned by repos/platform and visible without making billing default-ready"
      ),
      gateStep(
        email,
        "define_email_transport_gate",
        "Define email transport production gate",
        ["corepack pnpm run deployability:gates", ...(email?.evidence_commands || [])],
        "email transport production acceptance evidence is owned by repos/client and remains separate from local deployability"
      ),
      gateStep(
        marketplace,
        "define_marketplace_readiness_gate",
        "Define marketplace readiness gate",
        ["corepack pnpm run deployability:gates", ...(marketplace?.evidence_commands || [])],
        "marketplace readiness is proven in formal owning repositories before being shown as production-ready"
      ),
      gateStep(
        formalRelease,
        "define_formal_release_gate",
        "Define formal release gate",
        ["corepack pnpm run deployability:gates", ...(formalRelease?.evidence_commands || [])],
        "npm package and image release gates remain in the owning repositories"
      ),
      {
        key: "export_management_evidence",
        label: "Export management evidence",
        status: "ready",
        owner_scope: "fourth_repo",
        owner_repo: null,
        blocked_by: [],
        guardrails: [
          "management evidence is read-only",
          "do not print secret values",
          "do not treat daily deployability as formal production readiness"
        ],
        commands: [
          "corepack pnpm run deployability:production",
          "corepack pnpm run deployability:hardening-plan",
          "corepack pnpm run deployability:status",
          "corepack pnpm run deployability:roadmap"
        ],
        done_when: "operator and dashboard surfaces can display production gaps, owners, guardrails, and next commands without claiming production readiness"
      }
    ],
    guardrails: [
      "do not treat daily deployability as formal production readiness",
      "formal production gates belong in the owning repositories",
      "the fourth repo may expose management metadata but must not define business runtime truth",
      "keep public exposure, billing, email transport, marketplace, and release gates independently visible"
    ],
    machine_payloads: PRODUCTION_REMEDIATION_MACHINE_PAYLOADS
  };
}

function summarize({ tracks, blockers, warnings, roadmap }) {
  const countByStatus = (value) => tracks.filter((item) => item.status === value).length;
  return {
    status: blockers.length ? "blocked" : "daily_deployable_production_planned",
    production_ready: false,
    daily_deployable: roadmap?.summary?.status === "daily_deployable_with_planned_hardening",
    hardening_track_count: tracks.length,
    planned_count: countByStatus("planned"),
    gated_count: countByStatus("gated"),
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function productionData() {
  const roadmapResult = runJsonScript("tools/deployability-roadmap.mjs");
  const sourceBlockers = [sourceBlocker("roadmap", roadmapResult)].filter(Boolean);
  const roadmap = roadmapResult.body || null;
  const blockers = unique([...sourceBlockers, ...(roadmap?.blockers || [])]);
  const warnings = unique([...(roadmap?.warnings || [])]);
  const hardeningTracks = buildHardeningTracks({ roadmap });
  const summary = summarize({ tracks: hardeningTracks, blockers, warnings, roadmap });
  const productionReadinessRemediationPlan = buildProductionReadinessRemediationPlan({
    hardeningTracks,
    summary
  });

  return {
    command: "deployability:production",
    mode: "production_hardening_review",
    ok: blockers.length === 0,
    current_bundle: roadmap?.current_bundle || null,
    summary,
    readiness_boundary: {
      daily_deployable: summary.daily_deployable,
      public_exposure_ready: false,
      production_ready: false,
      reason: "daily deployability is available, while public exposure and formal production hardening remain gated or planned"
    },
    hardening_tracks: hardeningTracks,
    production_readiness_remediation_plan: productionReadinessRemediationPlan,
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
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this when a management surface needs to explain why daily deployability is not production readiness",
      "hardening tracks are convenience projections over existing roadmap metadata; they do not execute commands"
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

  console.log("\nProduction readiness remediation plan:");
  console.log(`status=${data.production_readiness_remediation_plan.status}`);
  for (const step of data.production_readiness_remediation_plan.steps) {
    console.log(`- ${step.key}: ${step.status}`);
    if (step.owner_repo) console.log(`  owner_repo: ${step.owner_repo}`);
    for (const command of step.commands) console.log(`  command: ${command}`);
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
