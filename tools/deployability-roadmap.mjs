#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const PRD_SOURCES = [
  "docs/product/deployability-ecosystem-prd.md",
  "docs/product/deployability-pipelines-prd.md",
  "docs/product/deployability-ecosystem-prd.zh-CN.md",
  "docs/product/deployability-pipelines-prd.zh-CN.md"
];

const SAFETY_DEFAULTS = [
  "deployability roadmap is read-only and does not read .env files directly",
  "deployability roadmap only calls read-only command catalog, readiness, and recipe metadata",
  "deployability roadmap does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains PRD milestone evidence and remaining work without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:readiness",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run deployability:recipe -- --profile public-stack",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run deployability:handoff -- --profile public-stack",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
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

function hasCommand(commands, command) {
  return commands.some((item) => item.command === command || item.json_command === command);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function readinessCheck(readiness, key) {
  return readiness?.checks?.find((item) => item.key === key);
}

function buildMilestones({ commands, readiness, recipe }) {
  const readinessOk = readiness?.ecosystem_readiness?.status === "daily_deployable_with_safety_gates";
  const profileManagementOk =
    hasCommand(commands, "corepack pnpm run deployability:profiles") &&
    hasCommand(commands, "corepack pnpm run deployability:action-plan") &&
    hasCommand(commands, "corepack pnpm run deployability:menu") &&
    hasCommand(commands, "corepack pnpm run deployability:commands");
  const recipeOk =
    recipe?.mode === "profile_recipe" &&
    recipe?.profile_filter?.resolved === "public_stack" &&
    recipe?.recipe_steps?.some((item) => item.key === "gate") &&
    recipe?.copy_paste_commands?.includes("corepack pnpm run selfhost:security-review -- --profile public-stack");

  return [
    {
      key: "ecosystem_prd_alignment",
      label: "Ecosystem PRD is decomposed into command, pipeline, and brand-site surfaces",
      status: "satisfied",
      evidence_commands: [
        "corepack pnpm run deployability:overview",
        "corepack pnpm run deployability:quickstart",
        "corepack pnpm run deployability:safety"
      ],
      evidence_docs: PRD_SOURCES,
      remaining_work: []
    },
    {
      key: "daily_deployable_scorecard",
      label: "Fresh operators can see daily-deployable readiness as a standalone scorecard",
      status: readinessOk ? "satisfied" : "blocked",
      evidence_commands: [
        "corepack pnpm run deployability:readiness",
        "corepack pnpm --silent run deployability:readiness -- --json"
      ],
      evidence_checks: [
        readinessCheck(readiness, "profile_choice"),
        readinessCheck(readiness, "secret_generation"),
        readinessCheck(readiness, "startup_path"),
        readinessCheck(readiness, "doctor_path"),
        readinessCheck(readiness, "runtime_inspection"),
        readinessCheck(readiness, "boundary_understanding"),
        readinessCheck(readiness, "brand_site_story")
      ].filter(Boolean),
      remaining_work: readinessOk ? [] : ["restore every readiness check to ok before calling the ecosystem daily-deployable"]
    },
    {
      key: "profile_management_surface",
      label: "Operators and management UIs can choose, sort, and inspect deployment profiles",
      status: profileManagementOk ? "satisfied" : "blocked",
      evidence_commands: [
        "corepack pnpm run deployability:profiles",
        "corepack pnpm run deployability:action-plan",
        "corepack pnpm run deployability:menu",
        "corepack pnpm run deployability:commands"
      ],
      remaining_work: profileManagementOk ? [] : ["restore profile catalog, action-plan, menu, and command catalog discovery"]
    },
    {
      key: "linear_first_run_recipe",
      label: "Public-stack first run has one linear inspect, gate, start, verify, operate, evidence recipe",
      status: recipeOk ? "satisfied" : "blocked",
      evidence_commands: [
        "corepack pnpm run deployability:recipe -- --profile public-stack",
        "corepack pnpm --silent run deployability:recipe -- --profile public-stack --json"
      ],
      remaining_work: recipeOk ? [] : ["restore public-stack recipe steps and copy-paste command order"]
    },
    {
      key: "public_stack_safety_gate",
      label: "Public exposure is ready-now only behind explicit safety gates",
      status: "gated",
      evidence_commands: [
        "corepack pnpm run selfhost:security-review -- --profile public-stack",
        "corepack pnpm run operator:onboarding:check",
        "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"
      ],
      remaining_work: [
        "run public-stack security review before opening edge routes",
        "keep localhost public origin and placeholder secrets as blockers"
      ]
    },
    {
      key: "formal_production_hardening",
      label: "Formal production readiness remains outside the daily-deployable scorecard",
      status: "planned",
      evidence_commands: [
        "corepack pnpm run published-image:plan",
        "corepack pnpm run test:deployability-operations"
      ],
      remaining_work: [
        "finish billing production gates before presenting billing as a default-ready surface",
        "finish email transport and marketplace production gates before claiming public production readiness",
        "keep formal npm/image release gates in the owning repositories"
      ]
    }
  ];
}

function summarize(milestones) {
  const countByStatus = (status) => milestones.filter((item) => item.status === status).length;
  return {
    total_milestones: milestones.length,
    satisfied_milestones: countByStatus("satisfied"),
    gated_milestones: countByStatus("gated"),
    planned_milestones: countByStatus("planned"),
    blocked_milestones: countByStatus("blocked"),
    status:
      countByStatus("blocked") === 0 && countByStatus("planned") > 0
        ? "daily_deployable_with_planned_hardening"
        : countByStatus("blocked") === 0
          ? "daily_deployable_roadmap_satisfied"
          : "blocked"
  };
}

function roadmapData() {
  const commandsResult = runJsonScript("tools/deployability-commands.mjs");
  const readinessResult = runJsonScript("tools/deployability-readiness.mjs");
  const recipeResult = runJsonScript("tools/deployability-recipe.mjs", ["--profile", "public-stack"]);
  const sourceBlockers = [
    sourceBlocker("commands", commandsResult),
    sourceBlocker("readiness", readinessResult),
    sourceBlocker("recipe", recipeResult)
  ].filter(Boolean);
  const milestones = buildMilestones({
    commands: commandsResult.body?.commands || [],
    readiness: readinessResult.body || null,
    recipe: recipeResult.body || null
  });
  const milestoneBlockers = milestones
    .filter((item) => item.status === "blocked")
    .map((item) => `${item.key}: ${item.label}`);
  const blockers = [...sourceBlockers, ...milestoneBlockers];

  return {
    command: "deployability:roadmap",
    mode: "prd_roadmap",
    ok: blockers.length === 0,
    current_bundle: readinessResult.body?.current_bundle || commandsResult.body?.current_bundle || recipeResult.body?.current_bundle || null,
    summary: summarize(milestones),
    milestones,
    prd_sources: PRD_SOURCES,
    blockers,
    warnings: unique([...(readinessResult.body?.warnings || []), ...(recipeResult.body?.warnings || [])]),
    source_status: {
      commands: {
        ok: commandsResult.ok,
        exit_code: commandsResult.exit_code,
        stderr: commandsResult.stderr,
        parse_error: commandsResult.parse_error
      },
      readiness: {
        ok: readinessResult.ok,
        exit_code: readinessResult.exit_code,
        stderr: readinessResult.stderr,
        parse_error: readinessResult.parse_error
      },
      recipe: {
        ok: recipeResult.ok,
        exit_code: recipeResult.exit_code,
        stderr: recipeResult.stderr,
        parse_error: recipeResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the PRD-aligned management roadmap after the command map and readiness scorecard",
      "planned hardening items are intentionally not treated as daily-deployable blockers"
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
  console.log("Deployability roadmap");
  console.log("=====================");
  console.log("Read-only PRD milestone view for deployment, management, understanding, and safety controls.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(
    `milestones=${data.summary.satisfied_milestones} satisfied, ${data.summary.gated_milestones} gated, ${data.summary.planned_milestones} planned, ${data.summary.blocked_milestones} blocked\n`
  );

  for (const milestone of data.milestones) {
    console.log(`${milestone.key}: ${milestone.status}`);
    console.log(`  ${milestone.label}`);
    for (const command of milestone.evidence_commands || []) {
      console.log(`  - ${command}`);
    }
    for (const item of milestone.remaining_work || []) {
      console.log(`  remaining: ${item}`);
    }
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = roadmapData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
