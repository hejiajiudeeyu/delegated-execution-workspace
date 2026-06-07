#!/usr/bin/env node

const PIPELINES = [
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

const SAFETY_DEFAULTS = [
  "overview is read-only and does not read .env files",
  "overview does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains commands, labels, statuses, and safety notes only",
  "business protocol, client runtime, and platform runtime truth remain in the three formal repositories"
];

const NEXT_COMMANDS = [
  "corepack pnpm run compat:status",
  "corepack pnpm run selfhost:profiles",
  "corepack pnpm run selfhost:readiness -- --all",
  "corepack pnpm run dev:doctor",
  "corepack pnpm run operator:onboarding:plan",
  "corepack pnpm run published-image:plan"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function overviewData() {
  return {
    command: "deployability:overview",
    ok: true,
    pipelines: PIPELINES,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this command as the first map, then run the pipeline-specific doctor/readiness/smoke commands",
      "this fourth-repo overview is orchestration metadata, not a new runtime truth source"
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
  console.log("Deployability overview");
  console.log("======================");
  console.log("Read-only map for deployment, management, understanding, and safety controls.\n");

  for (const pipeline of data.pipelines) {
    console.log(`## ${pipeline.label} (${pipeline.status})`);
    console.log(pipeline.purpose);
    console.log("Commands:");
    for (const command of pipeline.commands) {
      console.log(`- ${command}`);
    }
    console.log("JSON:");
    for (const command of pipeline.json_commands) {
      console.log(`- ${command}`);
    }
    console.log("Safety:");
    for (const note of pipeline.safety_notes) {
      console.log(`- ${note}`);
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
const data = overviewData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
