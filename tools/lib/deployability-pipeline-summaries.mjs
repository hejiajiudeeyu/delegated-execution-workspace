export const PIPELINES = [
  {
    key: "local_agent_loop",
    label: "Local Agent Loop",
    status: "ready_now",
    purpose: "Fastest local caller-skill and MCP development loop.",
    commands: [
      "corepack pnpm run dev:local:plan",
      "corepack pnpm run dev:local:up",
      "corepack pnpm run dev:doctor",
      "corepack pnpm run test:agent-e2e",
      "corepack pnpm run mcp:golden-four"
    ],
    json_commands: [
      "corepack pnpm --silent run dev:local:plan -- --json",
      "corepack pnpm --silent run dev:local:up -- --json",
      "corepack pnpm --silent run dev:local:status -- --json",
      "corepack pnpm --silent run dev:local:logs -- --json",
      "corepack pnpm --silent run dev:local:down -- --json",
      "corepack pnpm --silent run dev:doctor -- --json"
    ],
    safety_notes: [
      "local lifecycle JSON omits child command stdout",
      "local log JSON reports metadata only, not raw relay or supervisor logs"
    ]
  },
  {
    key: "all_in_one_demo",
    label: "All-in-One Demo",
    status: "ready_now",
    purpose: "Single-machine caller, responder, relay, and platform stack for first-run product evaluation.",
    commands: [
      "corepack pnpm run selfhost:quickstart -- --profile all-in-one",
      "corepack pnpm run selfhost:readiness -- --profile all-in-one",
      "corepack pnpm run selfhost:init -- --profile all-in-one",
      "corepack pnpm run selfhost:preflight -- --profile all-in-one",
      "corepack pnpm run selfhost:up -- --profile all-in-one",
      "corepack pnpm run selfhost:status -- --profile all-in-one",
      "corepack pnpm run selfhost:smoke -- --profile all-in-one"
    ],
    json_commands: [
      "corepack pnpm --silent run selfhost:quickstart -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:readiness -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:init -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:preflight -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:up -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:status -- --profile all-in-one --json",
      "corepack pnpm --silent run selfhost:smoke -- --profile all-in-one --json"
    ],
    safety_notes: [
      "all-in-one stays a local evaluation profile, not a public exposure profile",
      "startup and smoke JSON inherit selfhost safety posture and omit secret values"
    ]
  },
  {
    key: "selfhost_platform",
    label: "Selfhost Platform",
    status: "ready_now",
    purpose: "Profile discovery, generated env, preflight, lifecycle, status, logs, backup, restore, and rotation.",
    commands: [
      "corepack pnpm run selfhost:profiles",
      "corepack pnpm run selfhost:quickstart",
      "corepack pnpm run selfhost:readiness",
      "corepack pnpm run selfhost:init",
      "corepack pnpm run selfhost:preflight",
      "corepack pnpm run selfhost:up",
      "corepack pnpm run selfhost:smoke",
      "corepack pnpm run selfhost:ops-report"
    ],
    json_commands: [
      "corepack pnpm --silent run selfhost:profiles -- --json",
      "corepack pnpm --silent run selfhost:quickstart -- --json",
      "corepack pnpm --silent run selfhost:readiness -- --json",
      "corepack pnpm --silent run selfhost:init -- --json",
      "corepack pnpm --silent run selfhost:preflight -- --json",
      "corepack pnpm --silent run selfhost:up -- --json",
      "corepack pnpm --silent run selfhost:status -- --json",
      "corepack pnpm --silent run selfhost:logs -- --json",
      "corepack pnpm --silent run selfhost:down -- --json",
      "corepack pnpm --silent run selfhost:smoke -- --json",
      "corepack pnpm --silent run selfhost:ops-report -- --json"
    ],
    safety_notes: [
      "init and rotation JSON never print generated secret values",
      "compose lifecycle JSON omits compose stdout where environment values may appear"
    ]
  },
  {
    key: "public_stack",
    label: "Public Stack",
    status: "ready_now_with_safety_gates",
    purpose: "Operator path for public gateway, relay, platform API, console, and edge route contract.",
    commands: [
      "corepack pnpm run selfhost:readiness -- --profile public-stack",
      "corepack pnpm run selfhost:ports -- --profile public-stack",
      "corepack pnpm run selfhost:security-review -- --profile public-stack",
      "corepack pnpm run selfhost:up -- --profile public-stack",
      "corepack pnpm run selfhost:smoke -- --profile public-stack"
    ],
    json_commands: [
      "corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json",
      "corepack pnpm --silent run selfhost:ports -- --profile public-stack --json",
      "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
      "corepack pnpm --silent run selfhost:up -- --profile public-stack --json",
      "corepack pnpm --silent run selfhost:smoke -- --profile public-stack --json"
    ],
    safety_notes: [
      "unsafe public origins and placeholder secrets remain blockers",
      "public exposure readiness is checked before services are treated as ready"
    ]
  },
  {
    key: "recovery_evidence",
    label: "Recovery & Evidence",
    status: "ready_now",
    purpose: "Operator handoff, audit evidence, backup validation, restore rehearsal, and secret rotation planning.",
    commands: [
      "corepack pnpm run selfhost:ops-report",
      "corepack pnpm run selfhost:audit-export",
      "corepack pnpm run selfhost:backup-plan",
      "corepack pnpm run selfhost:backup-validate",
      "corepack pnpm run selfhost:restore-plan",
      "corepack pnpm run selfhost:rotate-plan",
      "corepack pnpm run selfhost:rotate"
    ],
    json_commands: [
      "corepack pnpm --silent run selfhost:ops-report -- --json",
      "corepack pnpm --silent run selfhost:audit-export -- --json",
      "corepack pnpm --silent run selfhost:backup-plan -- --json",
      "corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <backup-dir> --json",
      "corepack pnpm --silent run selfhost:restore-plan -- --backup-dir <backup-dir> --json",
      "corepack pnpm --silent run selfhost:rotate-plan -- --json",
      "corepack pnpm --silent run selfhost:rotate -- --json"
    ],
    safety_notes: [
      "ops, audit, backup, restore, and rotation metadata avoid printing secret values",
      "restore-plan and backup-validate keep recovery rehearsal read-only before any destructive restore"
    ]
  },
  {
    key: "operator_onboarding",
    label: "Operator Onboarding",
    status: "ready_now",
    purpose: "Contract check that keeps public-stack, platform docs, runbooks, and brand-site onboarding copy aligned.",
    commands: [
      "corepack pnpm run operator:onboarding:plan",
      "corepack pnpm run operator:onboarding:check",
      "corepack pnpm run test:operator-onboarding"
    ],
    json_commands: [
      "corepack pnpm --silent run operator:onboarding:plan -- --json",
      "corepack pnpm --silent run operator:onboarding:check -- --json"
    ],
    safety_notes: [
      "onboarding checks do not read .env files",
      "contract drift is reported as blockers instead of silently passing"
    ]
  },
  {
    key: "published_image",
    label: "Published Image",
    status: "ready_now",
    purpose: "Release-image review and delegated public-stack smoke for candidate image tags.",
    commands: [
      "corepack pnpm run published-image:plan",
      "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
      "corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>"
    ],
    json_commands: [
      "corepack pnpm --silent run published-image:plan -- --json",
      "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json"
    ],
    safety_notes: [
      "dry-run JSON reports delegated command metadata without starting Docker",
      "published image smoke delegates to platform-owned public-stack smoke"
    ]
  }
];

export function buildPipelineSummaries({ pipelines = PIPELINES, catalogCommands = [] } = {}) {
  return pipelines.map((pipeline) => {
    const pipelineCatalogCommands = catalogCommands.filter((entry) => entry.pipeline_keys?.includes(pipeline.key));
    return {
      key: pipeline.key,
      label: pipeline.label,
      status: pipeline.status,
      purpose: pipeline.purpose,
      command_count: pipeline.commands?.length || 0,
      json_command_count: pipeline.json_commands?.length || 0,
      catalog_command_count: pipelineCatalogCommands.length,
      dashboard_safe_command_count: pipelineCatalogCommands.filter((entry) => entry.dashboard_safe === true).length,
      ci_safe_command_count: pipelineCatalogCommands.filter((entry) => entry.ci_safe === true).length,
      public_exposure_gate_count: pipelineCatalogCommands.filter((entry) => entry.public_exposure_gate === true).length,
      next_commands: pipeline.commands || [],
      next_json_commands: pipeline.json_commands || [],
      safety_notes: pipeline.safety_notes || []
    };
  });
}
