#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import {
  buildAttentionInputs,
  buildProfileAttention,
  commandNames,
  commandsForPipeline,
  recommendedProfileKeys,
  unique
} from "./lib/deployability-profile-attention.mjs";

const ROOT = process.cwd();

const PROFILE_PIPELINES = [
  {
    key: "daily_dev",
    aliases: ["daily-dev", "daily_dev", "local-agent-loop", "local_agent_loop"],
    label: "Daily Development",
    pipeline_key: "local_agent_loop",
    purpose: "Start with the local caller-skill and MCP development loop."
  },
  {
    key: "all_in_one_demo",
    aliases: ["all-in-one", "all-in-one-demo", "all_in_one_demo"],
    label: "All-in-One Demo",
    pipeline_key: "all_in_one_demo",
    purpose: "Evaluate the full product shape on one machine before splitting components."
  },
  {
    key: "selfhost_platform",
    aliases: ["selfhost", "selfhost-platform", "selfhost_platform", "platform"],
    label: "Selfhost Platform",
    pipeline_key: "selfhost_platform",
    purpose: "Prepare and manage the private platform profile."
  },
  {
    key: "public_stack",
    aliases: ["public-stack", "public_stack"],
    label: "Public Stack",
    pipeline_key: "public_stack",
    purpose: "Review public exposure gates before opening edge routes."
  },
  {
    key: "recovery_evidence",
    aliases: ["recovery", "recovery-evidence", "recovery_evidence"],
    label: "Recovery & Evidence",
    pipeline_key: "recovery_evidence",
    purpose: "Prepare handoff, audit, backup, restore rehearsal, and rotation evidence."
  },
  {
    key: "operator_onboarding",
    aliases: ["operator-onboarding", "operator_onboarding", "onboarding"],
    label: "Operator Onboarding",
    pipeline_key: "operator_onboarding",
    purpose: "Follow the public-stack first-use operator path."
  },
  {
    key: "published_image",
    aliases: ["published-image", "published_image", "release-review", "release_review"],
    label: "Published Image",
    pipeline_key: "published_image",
    purpose: "Review published-image smoke metadata before running Docker."
  }
];

const SAFETY_DEFAULTS = [
  "deployability action plan is read-only and does not read .env files directly",
  "deployability action plan only calls read-only deployability metadata commands",
  "deployability action plan does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains profile action metadata without printing secret values"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run deployability:handoff",
  "corepack pnpm run test:deployability",
  "corepack pnpm run test:deployability-operations"
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const profileIndex = args.indexOf("--profile");
  return {
    json: args.includes("--json"),
    listProfiles: args.includes("--list-profiles") || args.includes("--profiles"),
    profile: profileIndex === -1 ? null : args[profileIndex + 1] || ""
  };
}

function normalizeProfile(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function resolveProfileFilter(requested) {
  if (requested == null) {
    return {
      requested: null,
      resolved: null
    };
  }
  const normalized = normalizeProfile(requested);
  const match = PROFILE_PIPELINES.find(
    (item) => normalizeProfile(item.key) === normalized || (item.aliases || []).some((alias) => normalizeProfile(alias) === normalized)
  );
  return {
    requested,
    resolved: match?.key || null
  };
}

function runJsonScript(relativeScript) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployability-action-plan-"));
  const stdoutPath = path.join(tmpDir, "stdout.json");
  const stdoutFd = fs.openSync(stdoutPath, "w");
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", stdoutFd, "pipe"],
    env: process.env
  });
  fs.closeSync(stdoutFd);
  const stdout = fs.readFileSync(stdoutPath, "utf8");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  let body = null;
  try {
    body = stdout.trim() ? JSON.parse(stdout) : null;
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

function profileDirectory() {
  return PROFILE_PIPELINES.map((profile) => ({
    key: profile.key,
    aliases: profile.aliases,
    label: profile.label,
    pipeline_key: profile.pipeline_key,
    purpose: profile.purpose
  }));
}

function profileListData() {
  return {
    command: "deployability:action-plan",
    mode: "profile_list",
    ok: true,
    current_bundle: null,
    ecosystem_readiness: null,
    profile_filter: {
      requested: null,
      resolved: null
    },
    source_status: {},
    profiles: profileDirectory(),
    blockers: [],
    warnings: [],
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: [
      ...PROFILE_PIPELINES.map((profile) => `corepack pnpm run deployability:action-plan -- --profile ${profile.aliases[0]}`),
      "corepack pnpm --silent run deployability:action-plan -- --list-profiles --json"
    ],
    notes: [
      "profile list mode is read-only and does not call dashboard, command catalog, Docker, or network endpoints",
      "use --profile <key-or-alias> to focus the full operator action plan on one target"
    ]
  };
}

function buildProfiles({ dashboard, commandCatalog, profileFilter }) {
  const profiles = profileFilter.resolved
    ? PROFILE_PIPELINES.filter((profile) => profile.key === profileFilter.resolved)
    : PROFILE_PIPELINES;

  return profiles.map((profile) => {
    const summary = dashboard.pipeline_summaries.find((item) => item.key === profile.pipeline_key) || null;
    const commands = commandsForPipeline(commandCatalog.commands || [], profile.pipeline_key);
    const dashboardSafe = commands.filter((item) => item.dashboard_safe === true);
    const publicExposure = commands.filter((item) => item.public_exposure_gate === true);
    const serviceTouching = commands.filter(
      (item) => item.starts_services === true || item.stops_services === true || item.calls_docker === true
    );
    const status = summary?.status || "unknown";
    const attentionInputs = buildAttentionInputs({ profile, summary, catalogCommands: commandCatalog.commands || [] });
    const recommendedCommands = attentionInputs.recommendedCommands;
    const nextJsonCommands = attentionInputs.nextJsonCommands;
    const dashboardSafeCommands = commandNames(dashboardSafe);
    const publicExposureGateCommands = commandNames(publicExposure);
    const serviceTouchingCommands = commandNames(serviceTouching);
    const attention = buildProfileAttention({
      profile,
      status,
      recommendedCommands,
      nextJsonCommands,
      publicExposureGateCommands,
      serviceTouchingCommands,
      dashboardSafeCommands,
      profileOrder: PROFILE_PIPELINES.map((item) => item.key)
    });

    return {
      key: profile.key,
      label: profile.label,
      pipeline_key: profile.pipeline_key,
      purpose: profile.purpose,
      status,
      attention,
      summary: summary
        ? {
            command_count: summary.command_count,
            json_command_count: summary.json_command_count,
            catalog_command_count: summary.catalog_command_count,
            dashboard_safe_command_count: summary.dashboard_safe_command_count,
            ci_safe_command_count: summary.ci_safe_command_count,
            public_exposure_gate_count: summary.public_exposure_gate_count
          }
        : null,
      recommended_commands: recommendedCommands,
      next_json_commands: nextJsonCommands,
      dashboard_safe_commands: dashboardSafeCommands,
      public_exposure_gate_commands: publicExposureGateCommands,
      service_touching_commands: serviceTouchingCommands,
      safety_notes: unique([...(summary?.safety_notes || []), ...commands.flatMap((item) => item.notes || [])])
    };
  });
}

function actionPlanData(args) {
  if (args.listProfiles) return profileListData();

  const profileFilter = resolveProfileFilter(args.profile);
  const dashboardResult = runJsonScript("tools/deployability-dashboard.mjs");
  const commandCatalogResult = runJsonScript("tools/deployability-commands.mjs");
  const sourceResults = {
    dashboard: dashboardResult,
    commands: commandCatalogResult
  };
  const blockers = [
    ...(args.profile != null && profileFilter.resolved == null ? [`unknown profile: ${args.profile}`] : []),
    ...Object.entries(sourceResults)
    .filter(([, result]) => !result.ok)
    .map(([key, result]) => `${key}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`)
  ];

  const dashboard = dashboardResult.body || {};
  const commandCatalog = commandCatalogResult.body || { commands: [] };
  const profiles = profileFilter.resolved == null && args.profile != null ? [] : buildProfiles({ dashboard, commandCatalog, profileFilter });

  return {
    command: "deployability:action-plan",
    ok: blockers.length === 0,
    current_bundle: dashboard.current_bundle || null,
    ecosystem_readiness: dashboard.ecosystem_readiness || null,
    profile_filter: profileFilter,
    source_status: Object.fromEntries(
      Object.entries(sourceResults).map(([key, result]) => [
        key,
        {
          ok: result.ok,
          exit_code: result.exit_code,
          stderr: result.stderr,
          parse_error: result.parse_error
        }
      ])
    ),
    profiles,
    recommended_profile_keys: recommendedProfileKeys(profiles),
    blockers,
    warnings: unique(dashboard.warnings || []),
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "use this as the operator-facing action plan for choosing the next deployability command",
      "profile-specific doctor, readiness, preflight, status, smoke, audit, backup, and rotation commands remain authoritative"
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
  if (data.mode === "profile_list") {
    console.log("Available deployability profiles");
    console.log("===============================");
    console.log("Read-only profile directory for deployability action plans.\n");
    for (const profile of data.profiles) {
      console.log(`- ${profile.key}: ${profile.label}`);
      console.log(`  aliases: ${profile.aliases.join(", ")}`);
      console.log(`  pipeline: ${profile.pipeline_key}`);
      console.log(`  purpose: ${profile.purpose}`);
    }
    console.log("\nNext commands:");
    for (const command of data.next_commands) console.log(`- ${command}`);
    return;
  }

  console.log("Deployability action plan");
  console.log("=========================");
  console.log("Read-only operator action plan for choosing the next deployability command.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`ecosystem=${data.ecosystem_readiness?.status || "unknown"}`);
  console.log(`state=${data.ok ? "ready" : "blocked"}`);

  console.log("\nProfiles:");
  for (const profile of data.profiles) {
    const summary = profile.summary || {};
    console.log(`- ${profile.key}: ${profile.status}`);
    console.log(`  purpose: ${profile.purpose}`);
    console.log(`  attention=${profile.attention.level}; rank=${profile.attention.rank}`);
    console.log(
      `  commands=${summary.command_count || 0}; json=${summary.json_command_count || 0}; dashboard-safe=${summary.dashboard_safe_command_count || 0}; public-exposure-gates=${summary.public_exposure_gate_count || 0}`
    );
    for (const command of profile.recommended_commands.slice(0, 3)) {
      console.log(`  next: ${command}`);
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

  console.log("\nSafety defaults:");
  for (const note of data.safety_defaults) console.log(`- ${note}`);

  console.log("\nNext commands:");
  for (const command of data.next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = actionPlanData(args);
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
