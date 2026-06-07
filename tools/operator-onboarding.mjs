#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  publicReadme: "repos/platform/deploy/public-stack/README.md",
  caddyfile: "repos/platform/deploy/public-stack/Caddyfile",
  compose: "repos/platform/deploy/public-stack/docker-compose.yml",
  platformGuide: "repos/platform/docs/current/guides/public-stack-operator-guide.md",
  platformGuideZh: "repos/platform/docs/current/guides/public-stack-operator-guide.zh-CN.md",
  runbook: "docs/runbooks/platform-first-operator-onboarding.md",
  runbookZh: "docs/runbooks/platform-first-operator-onboarding.zh-CN.md",
  brandZh: "repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx",
  brandEn: "repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx"
};

function usage() {
  console.log(`Usage: node tools/operator-onboarding.mjs <command> [--json]

Commands:
  plan   Print the operator-first onboarding sequence and validation commands
  check  Validate public-stack, runbook, and brand-site onboarding contracts`);
}

function parseArgs(argv) {
  return {
    command: argv[2] || "help",
    json: argv.slice(3).includes("--json")
  };
}

function read(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${relPath} missing`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function includesAll(body, needles) {
  return needles.every((needle) => body.includes(needle));
}

function hasAny(body, needles) {
  return needles.some((needle) => body.includes(needle));
}

function stalePlatformLimitation(body) {
  return /frontend is not bundled into public-stack yet/i.test(body) || /前端尚未打包进 `?public-stack`?/i.test(body);
}

function staleBrandCopy(body) {
  return (
    /platform-first onboarding (?:is )?still planned/i.test(body) ||
    /platform-first onboarding 仍是 planned/i.test(body) ||
    /更完整的 platform-first onboarding 仍是 planned/i.test(body)
  );
}

function checkItem(label, ok, detail = "") {
  console.log(`[${ok ? "ok" : "fail"}] ${label}${detail ? `: ${detail}` : ""}`);
  return ok;
}

function checkData() {
  const checks = [];
  const record = (key, label, passed, detail = "", files = []) => {
    checks.push({
      key,
      label,
      ok: Boolean(passed),
      detail,
      files
    });
  };
  const caddyfile = read(FILES.caddyfile);
  const compose = read(FILES.compose);
  const publicReadme = read(FILES.publicReadme);
  const platformGuide = read(FILES.platformGuide);
  const platformGuideZh = read(FILES.platformGuideZh);
  const runbook = read(FILES.runbook);
  const runbookZh = read(FILES.runbookZh);
  const brandZh = read(FILES.brandZh);
  const brandEn = read(FILES.brandEn);

  record(
    "public_stack_console_contract",
    "public-stack console contract",
    includesAll(caddyfile, ["redir / /console/", "handle_path /gateway/*", "handle_path /console/*"]) &&
      includesAll(compose, ["platform-console-gateway", "PLATFORM_CONSOLE_BOOTSTRAP_SECRET"]) &&
      includesAll(publicReadme, ["platform-console", "platform-console-gateway", "/console/", "/gateway/session/setup"]),
    "compose, Caddyfile, and README expose /console and gateway setup",
    [FILES.caddyfile, FILES.compose, FILES.publicReadme]
  );

  const guideHasOperatorFlow =
    includesAll(platformGuide, [
      "platform-console",
      "/console/",
      "/gateway/*",
      "/gateway/session/setup",
      "/gateway/credentials/platform-admin",
      "/gateway/proxy/v2/admin/hotlines"
    ]) &&
    includesAll(platformGuideZh, [
      "platform-console",
      "/console/",
      "/gateway/*",
      "/gateway/session/setup",
      "/gateway/credentials/platform-admin",
      "/gateway/proxy/v2/admin/hotlines"
    ]);
  record(
    "platform_operator_guide_flow",
    "platform operator guide flow",
    guideHasOperatorFlow,
    "console route and gateway credential flow documented",
    [FILES.platformGuide, FILES.platformGuideZh]
  );

  const guideStale = stalePlatformLimitation(platformGuide) || stalePlatformLimitation(platformGuideZh);
  record(
    "platform_operator_guide_stale_limitation",
    "platform operator guide stale limitation",
    !guideStale,
    "must not say public-stack lacks bundled console",
    [FILES.platformGuide, FILES.platformGuideZh]
  );

  record(
    "source_operator_branch_runbook",
    "source operator branch runbook",
    includesAll(runbook, [
      "Branch A",
      "Branch B",
      "awaiting_admin_approval",
      "node tools/approve-example.mjs",
      "corepack pnpm run selfhost:readiness -- --profile public-stack",
      "corepack pnpm run selfhost:ports -- --profile public-stack",
      "corepack pnpm run selfhost:ops-report -- --profile public-stack",
      "Success Criteria"
    ]) &&
      includesAll(runbookZh, [
        "分支 A",
        "分支 B",
        "awaiting_admin_approval",
        "node tools/approve-example.mjs",
        "corepack pnpm run selfhost:readiness -- --profile public-stack",
        "corepack pnpm run selfhost:ports -- --profile public-stack",
        "corepack pnpm run selfhost:ops-report -- --profile public-stack",
        "成功标准"
      ]),
    "automatic and manual approval branches plus public-stack handoff commands remain documented",
    [FILES.runbook, FILES.runbookZh]
  );

  const brandHasOperatorNarrative =
    includesAll(brandZh, ["Operator Onboarding", "operator:onboarding:check", "published-image:smoke", "/console/"]) &&
    includesAll(brandEn, ["Operator Onboarding", "operator:onboarding:check", "published-image:smoke", "/console/"]);
  record(
    "brand_site_operator_narrative",
    "brand-site operator narrative",
    brandHasOperatorNarrative,
    "public docs expose the verifiable operator path",
    [FILES.brandZh, FILES.brandEn]
  );

  const brandStale = staleBrandCopy(brandZh) || staleBrandCopy(brandEn);
  record(
    "brand_site_planned_onboarding_copy",
    "brand-site planned onboarding copy",
    !brandStale,
    "must not label current operator onboarding as planned",
    [FILES.brandZh, FILES.brandEn]
  );

  const blockers = checks.filter((item) => !item.ok).map((item) => `${item.label}: ${item.detail}`);
  return {
    command: "operator:onboarding:check",
    profile: "public-stack",
    ok: blockers.length === 0,
    checks,
    blockers,
    next_commands: [
      "corepack pnpm run operator:onboarding:plan",
      "corepack pnpm --silent run operator:onboarding:plan -- --json",
      "corepack pnpm run test:operator-onboarding"
    ],
    notes: [
      "validates public-stack, platform guide, runbook, and brand-site onboarding contracts",
      "does not read .env files or print secret values",
      "platform, client, and protocol repos remain the runtime truth sources"
    ]
  };
}

function validateContracts() {
  const data = checkData();
  let ok = true;
  for (const item of data.checks) {
    ok = checkItem(item.label, item.ok, item.detail) && ok;
  }
  return ok;
}

function printCheckJson() {
  const data = checkData();
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
  return data.ok;
}

function onboardingPlan() {
  return {
    command: "operator:onboarding:plan",
    profile: "public-stack",
    phases: [
      {
        id: "preflight",
        title: "Preflight the public operator stack",
        commands: [
          "corepack pnpm run selfhost:init -- --profile public-stack",
          "corepack pnpm run selfhost:readiness -- --profile public-stack",
          "corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json",
          "corepack pnpm run selfhost:ports -- --profile public-stack",
          "corepack pnpm run selfhost:preflight -- --profile public-stack",
          "corepack pnpm run selfhost:urls -- --profile public-stack"
        ]
      },
      {
        id: "operator_surface",
        title: "Start and inspect the operator surface",
        commands: [
          "corepack pnpm run selfhost:up -- --profile public-stack",
          "open ${PUBLIC_SITE_ADDRESS%/}/console/",
          "use /gateway/session/setup then /gateway/credentials/platform-admin"
        ]
      },
      {
        id: "smoke_and_evidence",
        title: "Smoke the public routes and published images",
        commands: [
          "corepack pnpm run selfhost:smoke -- --profile public-stack",
          "corepack pnpm run selfhost:ops-report -- --profile public-stack",
          "corepack pnpm run published-image:plan",
          "corepack pnpm run published-image:smoke -- --image-tag <tag>"
        ]
      },
      {
        id: "contract_validation",
        title: "Validate docs and onboarding contract",
        commands: [
          "corepack pnpm run operator:onboarding:check",
          "corepack pnpm --silent run operator:onboarding:check -- --json",
          "corepack pnpm run test:operator-onboarding"
        ]
      },
      {
        id: "source_fallback",
        title: "Source fallback for local integration",
        commands: [
          "Branch A: bootstrap with operator credentials -> SUCCEEDED",
          "Branch B: bootstrap pauses at awaiting_admin_approval -> approve -> SUCCEEDED"
        ]
      }
    ],
    safety: [
      "public-stack must not be marked ready while public origin or secrets are unsafe",
      "gateway setup stores admin credentials without printing secret values",
      "fourth repo checks the onboarding contract; platform owns runtime and deploy truth"
    ],
    next: "corepack pnpm run operator:onboarding:check"
  };
}

function printPlanJson() {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...onboardingPlan()
      },
      null,
      2
    )
  );
}

function printPlan() {
  const plan = onboardingPlan();
  console.log("[operator:onboarding:plan] public-stack first-use path");
  plan.phases.forEach((phase, index) => {
    console.log(`\n${index + 1}. ${phase.title}`);
    for (const command of phase.commands) {
      console.log(`   ${command}`);
    }
  });
  console.log("\nSafety:");
  for (const note of plan.safety) {
    console.log(`- ${note}`);
  }
}

function main() {
  const { command, json } = parseArgs(process.argv);
  if (command === "help" || command === "--help" || command === "-h") {
    usage();
    return 0;
  }
  if (command === "plan") {
    if (json) {
      printPlanJson();
    } else {
      printPlan();
    }
    return 0;
  }
  if (command === "check") {
    if (json) {
      return printCheckJson() ? 0 : 1;
    }
    console.log("[operator:onboarding:check]");
    return validateContracts() ? 0 : 1;
  }
  throw new Error(`unknown command ${command}`);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[operator-onboarding] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
