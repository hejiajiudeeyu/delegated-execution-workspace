#!/usr/bin/env node

import { PIPELINES } from "./lib/deployability-pipeline-summaries.mjs";

const SAFETY_DEFAULTS = [
  "overview is read-only and does not read .env files",
  "overview does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains commands, labels, statuses, and safety notes only",
  "business protocol, client runtime, and platform runtime truth remain in the three formal repositories"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:quickstart",
  "corepack pnpm run deployability:safety",
  "corepack pnpm run deployability:readiness",
  "corepack pnpm run deployability:doctor",
  "corepack pnpm run deployability:menu",
  "corepack pnpm run deployability:profiles",
  "corepack pnpm run deployability:action-plan",
  "corepack pnpm run deployability:runbook",
  "corepack pnpm run compat:status",
  "corepack pnpm run selfhost:profiles",
  "corepack pnpm run selfhost:readiness -- --all",
  "corepack pnpm run dev:doctor",
  "corepack pnpm run operator:onboarding:plan",
  "corepack pnpm run published-image:plan",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
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
