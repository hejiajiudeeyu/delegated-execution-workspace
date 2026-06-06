import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/published-image-smoke.mjs");

function writeFakePlatform(root, { gatewayImage = "${IMAGE_REGISTRY:-ghcr.io/hejiajiudeeyu}/rsp-gateway:${IMAGE_TAG:-latest}" } = {}) {
  const platformRoot = path.join(root, "repos/platform");
  fs.mkdirSync(path.join(platformRoot, "deploy/public-stack"), { recursive: true });
  fs.writeFileSync(
    path.join(platformRoot, "package.json"),
    JSON.stringify(
      {
        name: "fake-platform",
        private: true,
        scripts: {
          "test:public-stack-smoke": "node tests/smoke/public-stack-smoke.mjs"
        }
      },
      null,
      2
    ),
    "utf8"
  );
  fs.writeFileSync(
    path.join(platformRoot, "deploy/public-stack/docker-compose.yml"),
    [
      "services:",
      "  relay:",
      "    image: ${IMAGE_REGISTRY:-ghcr.io/hejiajiudeeyu}/rsp-relay:${IMAGE_TAG:-latest}",
      "  platform-api:",
      "    image: ${IMAGE_REGISTRY:-ghcr.io/hejiajiudeeyu}/rsp-platform:${IMAGE_TAG:-latest}",
      "  platform-console-gateway:",
      `    image: ${gatewayImage}`,
      ""
    ].join("\n"),
    "utf8"
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

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-published-image-smoke-test-"));

try {
  writeFakePlatform(tmpRoot);

  const plan = run(tmpRoot, ["plan"]);
  assert.equal(plan.status, 0, plan.stderr || plan.stdout);
  assert.match(plan.stdout, /\[published-image:plan\] profile=public-stack/);
  assert.match(plan.stdout, /ghcr\.io\/hejiajiudeeyu\/rsp-platform:latest/);
  assert.match(plan.stdout, /ghcr\.io\/hejiajiudeeyu\/rsp-relay:latest/);
  assert.match(plan.stdout, /ghcr\.io\/hejiajiudeeyu\/rsp-gateway:latest/);
  assert.match(plan.stdout, /COMPOSE_NO_BUILD=true/);
  assert.match(plan.stdout, /corepack pnpm --dir repos\/platform run test:public-stack-smoke/);
  assert.ok(!plan.stdout.includes("sk_admin_must_not_leak"));

  const dryRun = run(tmpRoot, [
    "smoke",
    "--",
    "--dry-run",
    "--image-registry",
    "registry.example/delexec",
    "--image-tag",
    "2026.06.06"
  ]);
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  assert.match(dryRun.stdout, /\[published-image:smoke\] profile=public-stack/);
  assert.match(dryRun.stdout, /registry\.example\/delexec\/rsp-platform:2026\.06\.06/);
  assert.match(dryRun.stdout, /COMPOSE_NO_BUILD=true/);
  assert.match(dryRun.stdout, /STRICT_COMPOSE_SMOKE=true/);
  assert.match(dryRun.stdout, /corepack pnpm --dir repos\/platform run test:public-stack-smoke/);
  assert.ok(!dryRun.stdout.includes("sk_admin_must_not_leak"));

  const brokenRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delexec-published-image-smoke-broken-"));
  try {
    writeFakePlatform(brokenRoot, { gatewayImage: "registry.example/rsp-gateway:fixed" });
    const broken = run(brokenRoot, ["plan"]);
    assert.equal(broken.status, 1, broken.stderr || broken.stdout);
    assert.match(broken.stderr, /platform-console-gateway image must use IMAGE_REGISTRY and IMAGE_TAG/);
  } finally {
    fs.rmSync(brokenRoot, { recursive: true, force: true });
  }

  console.log("[published-image-smoke.test] ok");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
