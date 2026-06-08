#!/usr/bin/env node

const TRACKS = [
  {
    key: "daily_dev",
    label: "Daily development",
    purpose: "Start from a fresh checkout and decide whether the local agent/caller-skill loop is ready.",
    steps: [
      {
        label: "Read the command map",
        command: "corepack pnpm run deployability:overview",
        json_command: "corepack pnpm --silent run deployability:overview -- --json"
      },
      {
        label: "Check the compatibility ledger",
        command: "corepack pnpm run compat:status",
        json_command: "corepack pnpm --silent run compat:status -- --json"
      },
      {
        label: "Review command safety posture",
        command: "corepack pnpm run deployability:safety",
        json_command: "corepack pnpm --silent run deployability:safety -- --json"
      },
      {
        label: "Run the read-only deployability doctor",
        command: "corepack pnpm run deployability:doctor",
        json_command: "corepack pnpm --silent run deployability:doctor -- --json"
      },
      {
        label: "Emit the dashboard payload",
        command: "corepack pnpm run deployability:dashboard",
        json_command: "corepack pnpm --silent run deployability:dashboard -- --json"
      },
      {
        label: "Emit a focused public-stack dashboard payload",
        command: "corepack pnpm run deployability:dashboard -- --profile public-stack",
        json_command: "corepack pnpm --silent run deployability:dashboard -- --profile public-stack --json"
      },
      {
        label: "List supported action-plan profiles",
        command: "corepack pnpm run deployability:action-plan -- --list-profiles",
        json_command: "corepack pnpm --silent run deployability:action-plan -- --list-profiles --json"
      },
      {
        label: "Choose the next operator action",
        command: "corepack pnpm run deployability:action-plan",
        json_command: "corepack pnpm --silent run deployability:action-plan -- --json"
      },
      {
        label: "Browse the command catalog",
        command: "corepack pnpm run deployability:commands",
        json_command: "corepack pnpm --silent run deployability:commands -- --json"
      },
      {
        label: "Create a non-secret daily handoff",
        command: "corepack pnpm run deployability:handoff",
        json_command: "corepack pnpm --silent run deployability:handoff -- --json"
      },
      {
        label: "Create a focused public-stack handoff",
        command: "corepack pnpm run deployability:handoff -- --profile public-stack",
        json_command: "corepack pnpm --silent run deployability:handoff -- --profile public-stack --json"
      },
      {
        label: "Inspect the local stack plan",
        command: "corepack pnpm run dev:local:plan",
        json_command: "corepack pnpm --silent run dev:local:plan -- --json"
      },
      {
        label: "Run the daily local doctor",
        command: "corepack pnpm run dev:doctor",
        json_command: "corepack pnpm --silent run dev:doctor -- --json"
      }
    ]
  },
  {
    key: "all_in_one_demo",
    label: "All-in-One Demo",
    purpose: "Run the single-machine caller, responder, relay, and platform stack for first-run product evaluation.",
    steps: [
      {
        label: "Read the all-in-one copy-paste sequence",
        command: "corepack pnpm run selfhost:quickstart -- --profile all-in-one",
        json_command: "corepack pnpm --silent run selfhost:quickstart -- --profile all-in-one --json"
      },
      {
        label: "Inspect all-in-one readiness",
        command: "corepack pnpm run selfhost:readiness -- --profile all-in-one",
        json_command: "corepack pnpm --silent run selfhost:readiness -- --profile all-in-one --json"
      },
      {
        label: "Generate or harden all-in-one env",
        command: "corepack pnpm run selfhost:init -- --profile all-in-one",
        json_command: "corepack pnpm --silent run selfhost:init -- --profile all-in-one --json"
      },
      {
        label: "Run all-in-one preflight before startup",
        command: "corepack pnpm run selfhost:preflight -- --profile all-in-one",
        json_command: "corepack pnpm --silent run selfhost:preflight -- --profile all-in-one --json"
      },
      {
        label: "Start all-in-one only after preflight",
        command: "corepack pnpm run selfhost:up -- --profile all-in-one",
        json_command: "corepack pnpm --silent run selfhost:up -- --profile all-in-one --json"
      }
    ]
  },
  {
    key: "selfhost_platform",
    label: "Selfhost Platform",
    purpose: "Prepare the private platform profile before starting Docker or exposing routes.",
    steps: [
      {
        label: "List built-in profiles",
        command: "corepack pnpm run selfhost:profiles",
        json_command: "corepack pnpm --silent run selfhost:profiles -- --json"
      },
      {
        label: "Read the copy-paste sequence",
        command: "corepack pnpm run selfhost:quickstart",
        json_command: "corepack pnpm --silent run selfhost:quickstart -- --json"
      },
      {
        label: "Inspect readiness",
        command: "corepack pnpm run selfhost:readiness",
        json_command: "corepack pnpm --silent run selfhost:readiness -- --json"
      },
      {
        label: "Generate or harden local env",
        command: "corepack pnpm run selfhost:init",
        json_command: "corepack pnpm --silent run selfhost:init -- --json"
      },
      {
        label: "Run preflight before startup",
        command: "corepack pnpm run selfhost:preflight",
        json_command: "corepack pnpm --silent run selfhost:preflight -- --json"
      }
    ]
  },
  {
    key: "public_stack",
    label: "Public Stack",
    purpose: "Review public route and secret safety before treating the stack as exposure-ready.",
    steps: [
      {
        label: "Read public-stack quickstart",
        command: "corepack pnpm run selfhost:quickstart -- --profile public-stack",
        json_command: "corepack pnpm --silent run selfhost:quickstart -- --profile public-stack --json"
      },
      {
        label: "Check declared public ports",
        command: "corepack pnpm run selfhost:ports -- --profile public-stack",
        json_command: "corepack pnpm --silent run selfhost:ports -- --profile public-stack --json"
      },
      {
        label: "Run public exposure review",
        command: "corepack pnpm run selfhost:security-review -- --profile public-stack",
        json_command: "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"
      },
      {
        label: "Validate operator onboarding contract",
        command: "corepack pnpm run operator:onboarding:check",
        json_command: "corepack pnpm --silent run operator:onboarding:check -- --json"
      }
    ]
  },
  {
    key: "release_review",
    label: "Release review",
    purpose: "Inspect published-image smoke intent before asking platform-owned release checks to run.",
    steps: [
      {
        label: "Inspect image plan",
        command: "corepack pnpm run published-image:plan",
        json_command: "corepack pnpm --silent run published-image:plan -- --json"
      },
      {
        label: "Dry-run published image smoke",
        command: "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
        json_command: "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json"
      }
    ]
  }
];

const SAFETY_DEFAULTS = [
  "quickstart is read-only and does not read .env files",
  "quickstart does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains tracks, commands, safety notes, and next commands only",
  "profile-specific commands remain responsible for startup, mutation, and runtime checks"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:overview",
  "corepack pnpm run deployability:safety",
  "corepack pnpm run deployability:doctor",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:action-plan -- --list-profiles",
  "corepack pnpm run deployability:action-plan",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run compat:status",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run check:submodules",
  "corepack pnpm run test:integration"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function quickstartData() {
  return {
    command: "deployability:quickstart",
    ok: true,
    default_track: "daily_dev",
    tracks: TRACKS,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the first copy-paste guide after a fresh checkout",
      "run deployability:overview for the full map and deployability:handoff before handing state to another operator"
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
  console.log("Deployability quickstart");
  console.log("========================");
  console.log("Read-only first-use guide for daily development, self-host, public-stack, and release review.\n");

  for (const track of data.tracks) {
    console.log(`## ${track.label}`);
    console.log(track.purpose);
    for (const [index, step] of track.steps.entries()) {
      console.log(`${index + 1}. ${step.label}`);
      console.log(`   ${step.command}`);
      console.log(`   JSON: ${step.json_command}`);
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
const data = quickstartData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
