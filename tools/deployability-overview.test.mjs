import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-overview.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_overview_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:overview");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.ok(Array.isArray(body.pipelines));
assert.deepEqual(
  body.pipelines.map((item) => item.key),
  [
    "local_agent_loop",
    "all_in_one_demo",
    "selfhost_platform",
    "public_stack",
    "recovery_evidence",
    "operator_onboarding",
    "published_image"
  ]
);
assert.ok(body.pipelines.find((item) => item.key === "local_agent_loop").commands.includes("corepack pnpm run dev:doctor"));
assert.ok(
  body.pipelines
    .find((item) => item.key === "selfhost_platform")
    .json_commands.includes("corepack pnpm --silent run selfhost:profiles -- --json")
);
assert.ok(
  body.pipelines
    .find((item) => item.key === "all_in_one_demo")
    .commands.includes("corepack pnpm run selfhost:quickstart -- --profile all-in-one")
);
assert.ok(
  body.pipelines
    .find((item) => item.key === "all_in_one_demo")
    .json_commands.includes("corepack pnpm --silent run selfhost:quickstart -- --profile all-in-one --json")
);
assert.ok(
  body.pipelines
    .find((item) => item.key === "operator_onboarding")
    .json_commands.includes("corepack pnpm --silent run operator:onboarding:check -- --json")
);
assert.ok(
  body.pipelines
    .find((item) => item.key === "recovery_evidence")
    .commands.includes("corepack pnpm run selfhost:backup-plan")
);
assert.ok(
  body.pipelines
    .find((item) => item.key === "recovery_evidence")
    .json_commands.includes("corepack pnpm --silent run selfhost:rotate-plan -- --json")
);
assert.ok(body.next_commands.includes("corepack pnpm run selfhost:profiles"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:quickstart"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:safety"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:explain"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:readiness"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:roadmap"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:status"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:gates"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:doctor"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:action-plan"));
assert.ok(body.next_commands.includes("corepack pnpm run operator:onboarding:plan"));
assert.ok(body.next_commands.includes("corepack pnpm run test:deployability"));
assert.ok(body.next_commands.includes("corepack pnpm run test:deployability-operations"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("sk_overview_must_not_leak"));
assert.ok(!json.stdout.includes("[ok]"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability overview/);
assert.match(text.stdout, /Local Agent Loop/);
assert.match(text.stdout, /All-in-One Demo/);
assert.match(text.stdout, /Recovery & Evidence/);
assert.match(text.stdout, /selfhost:backup-plan/);
assert.match(text.stdout, /selfhost:quickstart -- --profile all-in-one/);
assert.match(text.stdout, /corepack pnpm run selfhost:profiles/);
assert.match(text.stdout, /corepack pnpm run deployability:readiness/);
assert.match(text.stdout, /corepack pnpm run deployability:explain/);
assert.match(text.stdout, /corepack pnpm run deployability:roadmap/);
assert.match(text.stdout, /corepack pnpm run deployability:status/);
assert.match(text.stdout, /corepack pnpm run deployability:gates/);
assert.match(text.stdout, /corepack pnpm run deployability:recipe -- --profile public-stack/);
assert.match(text.stdout, /corepack pnpm run deployability:action-plan/);
assert.match(text.stdout, /corepack pnpm run test:deployability/);
assert.match(text.stdout, /corepack pnpm run test:deployability-operations/);
assert.ok(!text.stdout.includes("sk_overview_must_not_leak"));

console.log("[deployability-overview.test] ok");
