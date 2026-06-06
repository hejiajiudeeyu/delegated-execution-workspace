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
  console.log(`Usage: node tools/operator-onboarding.mjs <command>

Commands:
  plan   Print the operator-first onboarding sequence and validation commands
  check  Validate public-stack, runbook, and brand-site onboarding contracts`);
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

function validateContracts() {
  let ok = true;
  const record = (label, passed, detail = "") => {
    ok = checkItem(label, passed, detail) && ok;
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
    "public-stack console contract",
    includesAll(caddyfile, ["redir / /console/", "handle_path /gateway/*", "handle_path /console/*"]) &&
      includesAll(compose, ["platform-console-gateway", "PLATFORM_CONSOLE_BOOTSTRAP_SECRET"]) &&
      includesAll(publicReadme, ["platform-console", "platform-console-gateway", "/console/", "/gateway/session/setup"]),
    "compose, Caddyfile, and README expose /console and gateway setup"
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
  record("platform operator guide flow", guideHasOperatorFlow, "console route and gateway credential flow documented");

  const guideStale = stalePlatformLimitation(platformGuide) || stalePlatformLimitation(platformGuideZh);
  record("platform operator guide stale limitation", !guideStale, "must not say public-stack lacks bundled console");

  record(
    "source operator branch runbook",
    includesAll(runbook, ["Branch A", "Branch B", "awaiting_admin_approval", "node tools/approve-example.mjs", "Success Criteria"]) &&
      includesAll(runbookZh, ["分支 A", "分支 B", "awaiting_admin_approval", "node tools/approve-example.mjs", "成功标准"]),
    "automatic and manual approval branches remain documented"
  );

  const brandHasOperatorNarrative =
    includesAll(brandZh, ["Operator Onboarding", "operator:onboarding:check", "published-image:smoke", "/console/"]) &&
    includesAll(brandEn, ["Operator Onboarding", "operator:onboarding:check", "published-image:smoke", "/console/"]);
  record("brand-site operator narrative", brandHasOperatorNarrative, "public docs expose the verifiable operator path");

  const brandStale = staleBrandCopy(brandZh) || staleBrandCopy(brandEn);
  record("brand-site planned onboarding copy", !brandStale, "must not label current operator onboarding as planned");

  return ok;
}

function printPlan() {
  console.log("[operator:onboarding:plan] public-stack first-use path");
  console.log("\n1. Preflight the public operator stack");
  console.log("   corepack pnpm run selfhost:init -- --profile public-stack");
  console.log("   corepack pnpm run selfhost:preflight -- --profile public-stack");
  console.log("   corepack pnpm run selfhost:urls -- --profile public-stack");
  console.log("\n2. Start and inspect the operator surface");
  console.log("   corepack pnpm run selfhost:up -- --profile public-stack");
  console.log("   open ${PUBLIC_SITE_ADDRESS%/}/console/");
  console.log("   use /gateway/session/setup then /gateway/credentials/platform-admin");
  console.log("\n3. Smoke the public routes and published images");
  console.log("   corepack pnpm run selfhost:smoke -- --profile public-stack");
  console.log("   corepack pnpm run published-image:plan");
  console.log("   corepack pnpm run published-image:smoke -- --image-tag <tag>");
  console.log("\n4. Validate docs and onboarding contract");
  console.log("   corepack pnpm run operator:onboarding:check");
  console.log("   corepack pnpm run test:operator-onboarding");
  console.log("\n5. Source fallback for local integration");
  console.log("   Branch A: bootstrap with operator credentials -> SUCCEEDED");
  console.log("   Branch B: bootstrap pauses at awaiting_admin_approval -> approve -> SUCCEEDED");
  console.log("\nSafety:");
  console.log("- public-stack must not be marked ready while public origin or secrets are unsafe");
  console.log("- gateway setup stores admin credentials without printing secret values");
  console.log("- fourth repo checks the onboarding contract; platform owns runtime and deploy truth");
}

function main() {
  const command = process.argv[2] || "help";
  if (command === "help" || command === "--help" || command === "-h") {
    usage();
    return 0;
  }
  if (command === "plan") {
    printPlan();
    return 0;
  }
  if (command === "check") {
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
