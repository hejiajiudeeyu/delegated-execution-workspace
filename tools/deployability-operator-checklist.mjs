#!/usr/bin/env node

import path from "node:path";
import { parseStrictArgs } from "./lib/strict-args.mjs";
import { resolveProfileFilter } from "./lib/deployability-profiles-registry.mjs";
import { runJsonSource } from "./lib/json-source-runner.mjs";

const ROOT = process.cwd();
const DEFAULT_PROFILE = "public-stack";
const DEFAULT_IMAGE_TAG = "latest";

const SAFETY_DEFAULTS = [
  "deployability operator checklist is non-destructive and does not start services",
  "deployability operator checklist does not bind ports, probe endpoints, publish images, or print secret values",
  "deployability operator checklist calls Docker only through existing public exposure and release review metadata",
  "JSON output separates script blockers from operator blockers so dashboards can render blocked readiness"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run deployability:recipe -- --profile public-stack",
  "corepack pnpm run operator:onboarding:check",
  "corepack pnpm run deployability:release -- --image-tag <candidate-tag>",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run selfhost:backup-plan -- --profile public-stack",
  "corepack pnpm run deployability:handoff -- --profile public-stack"
];

const CHECKLIST_GROUPS = [
  {
    key: "understand",
    label: "Understand",
    purpose: "Confirm the selected operator profile, first screen, and linear recipe before touching runtime state."
  },
  {
    key: "configure",
    label: "Configure",
    purpose: "Confirm onboarding contracts and configuration documentation are aligned."
  },
  {
    key: "expose",
    label: "Expose",
    purpose: "Review public-stack exposure blockers before opening edge routes."
  },
  {
    key: "release",
    label: "Release",
    purpose: "Review candidate image tag evidence before a real release-owned smoke."
  },
  {
    key: "recover",
    label: "Recover",
    purpose: "Confirm recovery planning exists before operating a public profile."
  },
  {
    key: "handoff",
    label: "Handoff",
    purpose: "Prepare non-secret operator handoff evidence for the selected profile."
  }
];

function parseArgs(argv) {
  const args = parseStrictArgs(
    argv,
    [
      { flag: "--json", name: "json", type: "boolean" },
      { flag: "--profile", name: "profile", type: "string" },
      { flag: "--image-tag", name: "imageTag", type: "string" }
    ],
    { json: false, profile: DEFAULT_PROFILE, imageTag: process.env.IMAGE_TAG || DEFAULT_IMAGE_TAG }
  );
  if (!args.profile) throw new Error("--profile must not be empty");
  if (!args.imageTag) throw new Error("--image-tag must not be empty");
  return args;
}

function runJson(relativeScript, args = []) {
  return runJsonSource({
    root: ROOT,
    relativeScript,
    args: [...args, "--json"],
    maxBuffer: 20 * 1024 * 1024
  });
}

function sourceBlocker(label, result) {
  if (result.ok) return null;
  return `${label}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function machinePayloads({ profile, imageTag }) {
  return [
    `corepack pnpm --silent run deployability:operator-checklist -- --profile ${profile} --image-tag ${imageTag} --json`,
    `corepack pnpm --silent run deployability:menu -- --profile ${profile} --json`,
    `corepack pnpm --silent run deployability:recipe -- --profile ${profile} --json`,
    "corepack pnpm --silent run operator:onboarding:check -- --json",
    `corepack pnpm --silent run deployability:release -- --image-tag ${imageTag} --json`,
    `corepack pnpm --silent run selfhost:backup-plan -- --profile ${profile} --json`
  ];
}

function profileKey(profile) {
  return profile === "public-stack" || profile === "public_stack" ? "public_stack" : profile.replace(/-/g, "_");
}

function unsupportedProfileData(args, profileFilter) {
  const resolved = profileFilter.resolved || profileKey(args.profile);
  const blocker =
    profileFilter.resolved == null
      ? `unknown profile: ${args.profile}`
      : `deployability:operator-checklist only supports public-stack; use deployability:evidence, deployability:dashboard, or deployability:handoff for ${args.profile}`;
  return {
    command: "deployability:operator-checklist",
    mode: "public_stack_operator_checklist",
    ok: false,
    current_bundle: null,
    profile_filter: profileFilter,
    profile: {
      key: resolved,
      name: args.profile
    },
    image_tag: args.imageTag,
    summary: {
      status: "unsupported_profile",
      operator_ready: false,
      public_exposure_ready: false,
      release_candidate_ready: false,
      onboarding_contract_ready: false,
      recovery_plan_ready: false,
      checklist_group_count: CHECKLIST_GROUPS.length,
      blocked_item_count: 0,
      script_blocker_count: 0,
      warning_count: 0
    },
    checklist_groups: CHECKLIST_GROUPS,
    checklist_items: [],
    operator_blockers: [blocker],
    blockers: [blocker],
    warnings: [],
    menu: null,
    recipe: null,
    onboarding_check: null,
    release_review: null,
    recovery_plan: null,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: [],
    source_status: {},
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "deployability:operator-checklist is intentionally scoped to the public-stack exposure and release checklist",
      "use profile-aware evidence, dashboard, handoff, menu, or recipe commands for non-public-stack profiles"
    ]
  };
}

function item({ key, group, label, status, commands, blockers = [], evidence = [] }) {
  return {
    key,
    group,
    label,
    status,
    commands,
    blockers,
    evidence
  };
}

function buildChecklistItems({ profile, imageTag, menu, recipe, onboarding, release, backupPlan }) {
  const publicExposureReady = release?.summary?.public_exposure_ready === true;
  const releaseCandidateReady = release?.summary?.release_candidate_ready === true;
  const onboardingReady = onboarding?.ok === true;
  const recoveryReady = backupPlan?.ok === true;
  const alias = profile === "public_stack" ? "public-stack" : profile;

  return [
    item({
      key: "profile_menu",
      group: "understand",
      label: "Profile menu",
      status: menu?.ok === false ? "blocked" : "ready",
      commands: [`corepack pnpm run deployability:menu -- --profile ${alias}`],
      blockers: menu?.blockers || [],
      evidence: [menu?.command, menu?.mode].filter(Boolean)
    }),
    item({
      key: "linear_recipe",
      group: "understand",
      label: "Linear first-run recipe",
      status: recipe?.ok === false ? "blocked" : "ready",
      commands: [`corepack pnpm run deployability:recipe -- --profile ${alias}`],
      blockers: recipe?.blockers || [],
      evidence: [recipe?.command, `${recipe?.recipe_steps?.length || 0} recipe steps`].filter(Boolean)
    }),
    item({
      key: "operator_onboarding_contract",
      group: "configure",
      label: "Operator onboarding contract",
      status: onboardingReady ? "ready" : "blocked",
      commands: ["corepack pnpm run operator:onboarding:check"],
      blockers: onboarding?.blockers || [],
      evidence: [onboarding?.command, `${onboarding?.checks?.length || 0} checks`].filter(Boolean)
    }),
    item({
      key: "public_exposure_gate",
      group: "expose",
      label: "Public exposure gate",
      status: publicExposureReady ? "ready" : "blocked",
      commands: [
        "corepack pnpm run deployability:exposure",
        "corepack pnpm run selfhost:security-review -- --profile public-stack"
      ],
      blockers: release?.exposure_review?.exposure_blockers || [],
      evidence: [release?.exposure_review?.command, release?.exposure_review?.summary?.status].filter(Boolean)
    }),
    item({
      key: "release_candidate_gate",
      group: "release",
      label: "Release candidate gate",
      status: releaseCandidateReady ? "ready" : "blocked",
      commands: [
        "corepack pnpm run deployability:release -- --image-tag <candidate-tag>",
        `corepack pnpm run deployability:release -- --image-tag ${imageTag}`
      ],
      blockers: release?.release_blockers || [],
      evidence: [release?.command, release?.summary?.status].filter(Boolean)
    }),
    item({
      key: "backup_plan",
      group: "recover",
      label: "Backup plan",
      status: recoveryReady ? "ready" : "blocked",
      commands: [`corepack pnpm run selfhost:backup-plan -- --profile ${alias}`],
      blockers: backupPlan?.blockers || [],
      evidence: [backupPlan?.command, backupPlan?.profile].filter(Boolean)
    }),
    item({
      key: "handoff_report",
      group: "handoff",
      label: "Operator handoff report",
      status: "ready",
      commands: [`corepack pnpm run deployability:handoff -- --profile ${alias}`],
      blockers: [],
      evidence: ["writes a non-secret handoff report when executed"]
    })
  ];
}

function summarize({ checklistItems, blockers, warnings, release, onboarding, backupPlan }) {
  const blockedItems = checklistItems.filter((entry) => entry.status === "blocked");
  return {
    status: blockedItems.length ? "operator_checklist_blocked" : "operator_checklist_ready",
    operator_ready: blockedItems.length === 0,
    public_exposure_ready: release?.summary?.public_exposure_ready === true,
    release_candidate_ready: release?.summary?.release_candidate_ready === true,
    onboarding_contract_ready: onboarding?.ok === true,
    recovery_plan_ready: backupPlan?.ok === true,
    checklist_group_count: CHECKLIST_GROUPS.length,
    blocked_item_count: blockedItems.length,
    script_blocker_count: blockers.length,
    warning_count: warnings.length
  };
}

function operatorChecklistData(args) {
  const profileFilter = resolveProfileFilter(args.profile);
  if (profileFilter.resolved !== "public_stack") {
    return unsupportedProfileData(args, profileFilter);
  }
  const profile = profileKey(args.profile);
  const profileArgs = ["--profile", args.profile];
  const menuResult = runJson("tools/deployability-menu.mjs", profileArgs);
  const recipeResult = runJson("tools/deployability-recipe.mjs", profileArgs);
  const onboardingResult = runJson("tools/operator-onboarding.mjs", ["check"]);
  const releaseResult = runJson("tools/deployability-release.mjs", ["--image-tag", args.imageTag]);
  const backupPlanResult = runJson("tools/selfhost-kit.mjs", ["backup-plan", "--profile", args.profile]);

  const blockers = unique([
    sourceBlocker("menu", menuResult),
    sourceBlocker("recipe", recipeResult),
    sourceBlocker("operator:onboarding:check", onboardingResult),
    sourceBlocker("release", releaseResult),
    sourceBlocker("backup-plan", backupPlanResult)
  ]);
  const menu = menuResult.body || null;
  const recipe = recipeResult.body || null;
  const onboarding = onboardingResult.body || null;
  const release = releaseResult.body || null;
  const backupPlan = backupPlanResult.body || null;
  const checklistItems = blockers.length
    ? []
    : buildChecklistItems({
        profile,
        imageTag: args.imageTag,
        menu,
        recipe,
        onboarding,
        release,
        backupPlan
      });
  const warnings = unique([
    ...(menu?.warnings || []),
    ...(recipe?.warnings || []),
    ...(onboarding?.warnings || []),
    ...(release?.warnings || []),
    ...(backupPlan?.warnings || [])
  ]);
  const operatorBlockers = checklistItems
    .filter((entry) => entry.status === "blocked")
    .map((entry) => `${entry.key}: ${entry.blockers.join("; ") || "not ready"}`);

  return {
    command: "deployability:operator-checklist",
    mode: "public_stack_operator_checklist",
    ok: blockers.length === 0,
    current_bundle: menu?.current_bundle || recipe?.current_bundle || release?.current_bundle || null,
    profile: {
      key: profile,
      name: args.profile
    },
    image_tag: args.imageTag,
    summary: summarize({
      checklistItems,
      blockers,
      warnings,
      release,
      onboarding,
      backupPlan
    }),
    checklist_groups: CHECKLIST_GROUPS,
    checklist_items: checklistItems,
    operator_blockers: operatorBlockers,
    blockers,
    warnings,
    menu,
    recipe,
    onboarding_check: onboarding,
    release_review: release,
    recovery_plan: backupPlan,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: machinePayloads({ profile: args.profile, imageTag: args.imageTag }),
    source_status: {
      menu: {
        ok: menuResult.ok,
        exit_code: menuResult.exit_code,
        stderr: menuResult.stderr,
        parse_error: menuResult.parse_error
      },
      recipe: {
        ok: recipeResult.ok,
        exit_code: recipeResult.exit_code,
        stderr: recipeResult.stderr,
        parse_error: recipeResult.parse_error
      },
      operator_onboarding_check: {
        ok: onboardingResult.ok,
        exit_code: onboardingResult.exit_code,
        stderr: onboardingResult.stderr,
        parse_error: onboardingResult.parse_error
      },
      release: {
        ok: releaseResult.ok,
        exit_code: releaseResult.exit_code,
        stderr: releaseResult.stderr,
        parse_error: releaseResult.parse_error
      },
      backup_plan: {
        ok: backupPlanResult.ok,
        exit_code: backupPlanResult.exit_code,
        stderr: backupPlanResult.stderr,
        parse_error: backupPlanResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this as the public-stack management checklist before exposure, release smoke, or handoff",
      "checklist items are projections over existing deployability, onboarding, release, and selfhost metadata; they do not execute lifecycle commands"
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
  console.log("Deployability operator checklist");
  console.log("================================");
  console.log("Non-destructive public-stack operator readiness checklist.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`profile=${data.profile.name}`);
  console.log(`image_tag=${data.image_tag}`);
  console.log(`status=${data.summary.status}`);
  console.log(`operator_ready=${data.summary.operator_ready}\n`);

  for (const group of data.checklist_groups) {
    console.log(`## ${group.key}: ${group.label}`);
    for (const entry of data.checklist_items.filter((item) => item.group === group.key)) {
      console.log(`- ${entry.key}: ${entry.status}`);
      for (const blocker of entry.blockers) console.log(`  blocker: ${blocker}`);
      for (const command of entry.commands) console.log(`  command: ${command}`);
    }
    console.log("");
  }

  if (data.operator_blockers.length) {
    console.log("Operator blockers:");
    for (const blocker of data.operator_blockers) console.log(`- ${blocker}`);
    console.log("");
  }

  if (data.blockers.length) {
    console.log("Script blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
    console.log("");
  }

  console.log("Primary next commands:");
  for (const command of data.primary_next_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = operatorChecklistData(args);
  if (args.json) {
    printJson(data);
  } else {
    printText(data);
  }
  process.exitCode = data.ok ? 0 : 1;
} catch (error) {
  console.error(`[deployability-operator-checklist] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
