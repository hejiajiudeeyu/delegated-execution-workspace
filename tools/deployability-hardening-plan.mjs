#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability hardening plan is read-only and does not read .env files directly",
  "deployability hardening plan only calls read-only roadmap metadata",
  "deployability hardening plan does not call Docker, bind ports, or probe network endpoints",
  "JSON output describes owner repos, stages, blockers, guardrails, and evidence commands without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:hardening-plan -- --json",
  "corepack pnpm --silent run deployability:roadmap -- --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:hardening-plan",
  "corepack pnpm run deployability:production",
  "corepack pnpm run deployability:gates",
  "corepack pnpm run deployability:exposure",
  "corepack pnpm run published-image:plan",
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

function stage(key, label, commands, done_when) {
  return { key, label, commands, done_when };
}

function buildStages(track) {
  if (track.key === "public_exposure") {
    return [
      stage(
        "review",
        "Review exposure blockers",
        ["corepack pnpm run deployability:exposure", "corepack pnpm run selfhost:security-review -- --profile public-stack"],
        "public exposure blockers are visible"
      ),
      stage("prove", "Prove public-stack safety gates", track.evidence_commands, "security review, onboarding, and smoke evidence are available"),
      stage("operate", "Export operator evidence", ["corepack pnpm run deployability:evidence -- --profile public-stack"], "handoff/evidence payload is safe to share")
    ];
  }

  if (track.key === "formal_release") {
    return [
      stage("define_gate", "Define owning-repo release gates", ["corepack pnpm run deployability:gates"], "formal npm/image release gate ownership is explicit"),
      stage("prove_gate", "Prove package and image release candidates", track.evidence_commands, "published image plan and operation regression evidence are available"),
      stage("wire_operator_surface", "Wire release evidence into management surfaces", ["corepack pnpm run deployability:status"], "operators can see the release gate without treating it as daily readiness")
    ];
  }

  return [
    stage("define_gate", `Define ${track.label.toLowerCase()} gate`, ["corepack pnpm run deployability:gates"], "owning repo and acceptance evidence are explicit"),
    stage("prove_gate", `Prove ${track.label.toLowerCase()} evidence`, track.evidence_commands, "gate evidence is available from owning-repo checks"),
    stage(
      "wire_operator_surface",
      `Wire ${track.label.toLowerCase()} into operator surfaces`,
      ["corepack pnpm run deployability:status", "corepack pnpm run deployability:roadmap"],
      "management surfaces can show the gate without claiming production readiness"
    )
  ];
}

function baseTracks(roadmap) {
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

function buildPlan({ roadmap }) {
  return baseTracks(roadmap).map((track) => {
    const blockedBy =
      track.key === "public_exposure"
        ? track.remaining_work
        : track.key === "billing_production"
          ? track.remaining_work
          : track.key === "email_transport"
            ? track.remaining_work
            : track.key === "marketplace_readiness"
              ? track.remaining_work
              : track.remaining_work;
    return {
      key: track.key,
      label: track.label,
      status: track.status,
      owner_scope: track.owner_scope,
      owner_repo: track.owner_repo,
      blocked_by: unique(blockedBy),
      guardrails: track.guardrails,
      stages: buildStages(track),
      next_commands:
        track.key === "public_exposure"
          ? ["corepack pnpm run deployability:exposure", ...track.evidence_commands]
          : ["corepack pnpm run deployability:gates", ...track.evidence_commands]
    };
  });
}

function summarize({ plan, blockers, warnings }) {
  const countByStatus = (status) => plan.filter((item) => item.status === status).length;
  return {
    status: blockers.length ? "blocked" : "hardening_plan_visible",
    production_ready: false,
    track_count: plan.length,
    stage_count: plan.reduce((total, item) => total + item.stages.length, 0),
    planned_track_count: countByStatus("planned"),
    gated_track_count: countByStatus("gated"),
    blocker_count: blockers.length,
    warning_count: warnings.length
  };
}

function hardeningPlanData() {
  const roadmapResult = runJsonScript("tools/deployability-roadmap.mjs");
  const roadmap = roadmapResult.body || null;
  const sourceBlockers = [sourceBlocker("roadmap", roadmapResult)].filter(Boolean);
  const blockers = unique([...sourceBlockers, ...(roadmap?.blockers || [])]);
  const warnings = unique([...(roadmap?.warnings || [])]);
  const hardeningPlan = buildPlan({ roadmap });

  return {
    command: "deployability:hardening-plan",
    mode: "production_hardening_plan",
    ok: blockers.length === 0,
    current_bundle: roadmap?.current_bundle || null,
    summary: summarize({ plan: hardeningPlan, blockers, warnings }),
    readiness_boundary: {
      daily_deployable: roadmap?.summary?.status === "daily_deployable_with_planned_hardening",
      public_exposure_ready: false,
      production_ready: false,
      reason: "hardening plan is actionable management metadata, not evidence that public production readiness has passed"
    },
    hardening_plan: hardeningPlan,
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
      "use this when a management surface needs an actionable production-hardening plan without claiming production readiness",
      "direct input is roadmap metadata; production, gates, and status commands are stage guidance only and are not executed"
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
  console.log("Deployability hardening plan");
  console.log("============================");
  console.log("Read-only production hardening plan for owners, stages, blockers, evidence, and guardrails.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`production_ready=${data.summary.production_ready}\n`);

  for (const track of data.hardening_plan) {
    console.log(`${track.key}: ${track.status}`);
    console.log(`  ${track.label}`);
    console.log(`  owner_scope: ${track.owner_scope}`);
    if (track.owner_repo) console.log(`  owner_repo: ${track.owner_repo}`);
    for (const blocker of track.blocked_by) console.log(`  blocked_by: ${blocker}`);
    for (const guardrail of track.guardrails) console.log(`  guardrail: ${guardrail}`);
    for (const stageItem of track.stages) {
      console.log(`  stage ${stageItem.key}: ${stageItem.label}`);
      for (const command of stageItem.commands) console.log(`    - ${command}`);
      console.log(`    done_when: ${stageItem.done_when}`);
    }
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
const data = hardeningPlanData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
