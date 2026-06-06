import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/operator-onboarding.mjs");

function writeFile(root, relativePath, text) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
}

function writeFixture(root, overrides = {}) {
  writeFile(
    root,
    "repos/platform/deploy/public-stack/README.md",
    overrides.publicReadme ||
      [
        "# Public Stack Deployment",
        "platform-console static UI served by platform-console-gateway",
        "GET ${PUBLIC_SITE_ADDRESS%/}/console/",
        "first-time /gateway/session/setup calls are blocked unless the caller is local or presents PLATFORM_CONSOLE_BOOTSTRAP_SECRET",
        ""
      ].join("\n")
  );
  writeFile(
    root,
    "repos/platform/deploy/public-stack/Caddyfile",
    [
      "{$PUBLIC_SITE_ADDRESS:http://localhost} {",
      "  redir / /console/ 302",
      "  handle_path /gateway/* { reverse_proxy platform-console-gateway:8085 }",
      "  handle_path /console/* { reverse_proxy platform-console-gateway:8085 }",
      "}",
      ""
    ].join("\n")
  );
  writeFile(
    root,
    "repos/platform/deploy/public-stack/docker-compose.yml",
    [
      "services:",
      "  platform-console-gateway:",
      "    image: ${IMAGE_REGISTRY:-ghcr.io/hejiajiudeeyu}/rsp-gateway:${IMAGE_TAG:-latest}",
      "    environment:",
      "      PLATFORM_CONSOLE_BOOTSTRAP_SECRET: ${PLATFORM_CONSOLE_BOOTSTRAP_SECRET:?PLATFORM_CONSOLE_BOOTSTRAP_SECRET must be set}",
      ""
    ].join("\n")
  );
  writeFile(
    root,
    "repos/platform/docs/current/guides/public-stack-operator-guide.md",
    overrides.platformGuide ||
      [
        "# Public Stack Operator Guide",
        "platform-console static UI is bundled into public-stack through platform-console-gateway.",
        "Open `${PUBLIC_SITE_ADDRESS%/}/console/` for the operator UI.",
        "The stack exposes `/gateway/*` for gateway API calls.",
        "TOKEN=$(curl -fsS -X POST \"$BASE/gateway/session/setup\" -H 'x-platform-console-bootstrap: $PLATFORM_CONSOLE_BOOTSTRAP_SECRET')",
        "curl -fsS -X PUT \"$BASE/gateway/credentials/platform-admin\"",
        "curl -fsS \"$BASE/gateway/proxy/v2/admin/hotlines\"",
        ""
      ].join("\n")
  );
  writeFile(
    root,
    "repos/platform/docs/current/guides/public-stack-operator-guide.zh-CN.md",
    overrides.platformGuideZh ||
      [
        "# 公共栈运维指南",
        "platform-console 静态 UI 已由 platform-console-gateway 打包进 public-stack。",
        "打开 `${PUBLIC_SITE_ADDRESS%/}/console/` 进入运维界面。",
        "当前栈通过 `/gateway/*` 暴露 gateway API。",
        "/gateway/session/setup",
        "/gateway/credentials/platform-admin",
        "/gateway/proxy/v2/admin/hotlines",
        ""
      ].join("\n")
  );
  writeFile(
    root,
    "docs/runbooks/platform-first-operator-onboarding.md",
    overrides.runbook ||
      [
        "Branch A",
        "Branch B",
        "awaiting_admin_approval",
        "node tools/approve-example.mjs",
        "corepack pnpm run selfhost:readiness -- --profile public-stack",
        "corepack pnpm run selfhost:ports -- --profile public-stack",
        "corepack pnpm run selfhost:ops-report -- --profile public-stack",
        "Success Criteria",
        ""
      ].join("\n")
  );
  writeFile(
    root,
    "docs/runbooks/platform-first-operator-onboarding.zh-CN.md",
    overrides.runbookZh ||
      [
        "分支 A",
        "分支 B",
        "awaiting_admin_approval",
        "node tools/approve-example.mjs",
        "corepack pnpm run selfhost:readiness -- --profile public-stack",
        "corepack pnpm run selfhost:ports -- --profile public-stack",
        "corepack pnpm run selfhost:ops-report -- --profile public-stack",
        "成功标准",
        ""
      ].join("\n")
  );
  writeFile(
    root,
    "repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx",
    overrides.brandZh ||
      "Operator Onboarding · ready now\noperator:onboarding:check\npublished-image:smoke\n/console/\n"
  );
  writeFile(
    root,
    "repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx",
    overrides.brandEn ||
      "Operator Onboarding · ready now\noperator:onboarding:check\npublished-image:smoke\n/console/\n"
  );
}

function run(cwd, args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_admin_must_not_leak",
      ...env
    }
  });
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-operator-onboarding-test-"));

try {
  writeFixture(tmpRoot);

  const plan = run(tmpRoot, ["plan"]);
  assert.equal(plan.status, 0, plan.stderr || plan.stdout);
  assert.match(plan.stdout, /\[operator:onboarding:plan\]/);
  assert.match(plan.stdout, /public-stack first-use path/);
  assert.match(plan.stdout, /\/console\//);
  assert.match(plan.stdout, /corepack pnpm run selfhost:readiness -- --profile public-stack/);
  assert.match(plan.stdout, /corepack pnpm run selfhost:ports -- --profile public-stack/);
  assert.match(plan.stdout, /corepack pnpm run selfhost:ops-report -- --profile public-stack/);
  assert.match(plan.stdout, /corepack pnpm run selfhost:preflight -- --profile public-stack/);
  assert.match(plan.stdout, /corepack pnpm run published-image:smoke/);
  assert.match(plan.stdout, /corepack pnpm run operator:onboarding:check/);
  assert.ok(!plan.stdout.includes("sk_admin_must_not_leak"));

  const planJson = run(tmpRoot, ["plan", "--json"]);
  assert.equal(planJson.status, 0, planJson.stderr || planJson.stdout);
  const planBody = JSON.parse(planJson.stdout);
  assert.equal(planBody.command, "operator:onboarding:plan");
  assert.equal(planBody.profile, "public-stack");
  assert.ok(planBody.generated_at);
  assert.ok(Array.isArray(planBody.phases));
  assert.ok(Array.isArray(planBody.safety));
  assert.ok(planBody.phases.find((phase) => phase.id === "preflight"));
  assert.ok(planBody.phases.find((phase) => phase.id === "operator_surface"));
  assert.ok(planBody.phases.find((phase) => phase.id === "smoke_and_evidence"));
  assert.ok(planBody.phases.find((phase) => phase.id === "contract_validation"));
  assert.match(JSON.stringify(planBody), /corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json/);
  assert.match(JSON.stringify(planBody), /corepack pnpm run operator:onboarding:check/);
  assert.equal(planBody.next, "corepack pnpm run operator:onboarding:check");
  assert.ok(!planJson.stdout.includes("sk_admin_must_not_leak"));

  const check = run(tmpRoot, ["check"]);
  assert.equal(check.status, 0, check.stderr || check.stdout);
  assert.match(check.stdout, /public-stack console contract/);
  assert.match(check.stdout, /source operator branch runbook/);
  assert.match(check.stdout, /brand-site operator narrative/);
  assert.ok(!check.stdout.includes("sk_admin_must_not_leak"));

  const missingOpsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-operator-onboarding-missing-ops-"));
  try {
    writeFixture(missingOpsRoot, {
      runbook: "Branch A\nBranch B\nawaiting_admin_approval\nnode tools/approve-example.mjs\nSuccess Criteria\n",
      runbookZh: "分支 A\n分支 B\nawaiting_admin_approval\nnode tools/approve-example.mjs\n成功标准\n"
    });
    const missingOps = run(missingOpsRoot, ["check"]);
    assert.equal(missingOps.status, 1, missingOps.stderr || missingOps.stdout);
    assert.match(missingOps.stdout + missingOps.stderr, /source operator branch runbook/);
  } finally {
    fs.rmSync(missingOpsRoot, { recursive: true, force: true });
  }

  const missingReadinessRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-operator-onboarding-missing-readiness-"));
  try {
    writeFixture(missingReadinessRoot, {
      runbook: [
        "Branch A",
        "Branch B",
        "awaiting_admin_approval",
        "node tools/approve-example.mjs",
        "corepack pnpm run selfhost:ports -- --profile public-stack",
        "corepack pnpm run selfhost:ops-report -- --profile public-stack",
        "Success Criteria",
        ""
      ].join("\n"),
      runbookZh: [
        "分支 A",
        "分支 B",
        "awaiting_admin_approval",
        "node tools/approve-example.mjs",
        "corepack pnpm run selfhost:ports -- --profile public-stack",
        "corepack pnpm run selfhost:ops-report -- --profile public-stack",
        "成功标准",
        ""
      ].join("\n")
    });
    const missingReadiness = run(missingReadinessRoot, ["check"]);
    assert.equal(missingReadiness.status, 1, missingReadiness.stderr || missingReadiness.stdout);
    assert.match(missingReadiness.stdout + missingReadiness.stderr, /source operator branch runbook/);
  } finally {
    fs.rmSync(missingReadinessRoot, { recursive: true, force: true });
  }

  const staleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-operator-onboarding-stale-"));
  try {
    writeFixture(staleRoot, {
      platformGuide: "Current limitation:\nplatform-console frontend is not bundled into public-stack yet\n",
      brandEn: "Management Console platform-first onboarding is still planned\n"
    });
    const stale = run(staleRoot, ["check"]);
    assert.equal(stale.status, 1, stale.stderr || stale.stdout);
    assert.match(stale.stdout + stale.stderr, /platform operator guide stale limitation/);
    assert.match(stale.stdout + stale.stderr, /brand-site planned onboarding copy/);
  } finally {
    fs.rmSync(staleRoot, { recursive: true, force: true });
  }

  console.log("[operator-onboarding.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
