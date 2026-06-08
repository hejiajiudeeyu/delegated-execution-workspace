import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-commands.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_commands_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:commands");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.ok(Array.isArray(body.commands));
assert.ok(body.commands.length >= 12);
assert.ok(body.filters.categories.includes("top_level"));
assert.ok(body.filters.categories.includes("selfhost"));
assert.ok(body.filters.postures.includes("read_only"));
assert.ok(body.filters.tracks.includes("daily_dev"));
assert.ok(body.filters.pipelines.includes("selfhost_platform"));

const byCommand = new Map(body.commands.map((item) => [item.command, item]));
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").posture, "read_only");
assert.ok(byCommand.get("corepack pnpm run deployability:dashboard").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:safety").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:safety").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").posture, "contract_test");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").ci_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").posture, "starts_services");
assert.equal(byCommand.get("corepack pnpm run selfhost:up").calls_docker, true);
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_commands_must_not_leak"));

const topLevel = run(["--json", "--category", "top_level"]);
assert.equal(topLevel.status, 0, topLevel.stderr || topLevel.stdout);
const topLevelBody = JSON.parse(topLevel.stdout);
assert.ok(topLevelBody.commands.length > 0);
assert.ok(topLevelBody.commands.every((item) => item.category === "top_level"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:dashboard"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run test:deployability-operations"));
assert.ok(!topLevelBody.commands.some((item) => item.command === "corepack pnpm run selfhost:up"));

const readOnly = run(["--json", "--posture", "read_only"]);
assert.equal(readOnly.status, 0, readOnly.stderr || readOnly.stdout);
const readOnlyBody = JSON.parse(readOnly.stdout);
assert.ok(readOnlyBody.commands.every((item) => item.posture === "read_only"));
assert.ok(readOnlyBody.commands.some((item) => item.command === "corepack pnpm run deployability:quickstart"));
assert.ok(!readOnlyBody.commands.some((item) => item.command === "corepack pnpm run selfhost:up"));

const dailyDev = run(["--json", "--track", "daily_dev"]);
assert.equal(dailyDev.status, 0, dailyDev.stderr || dailyDev.stdout);
const dailyDevBody = JSON.parse(dailyDev.stdout);
assert.ok(dailyDevBody.commands.every((item) => item.track_keys.includes("daily_dev")));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:doctor"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:dashboard"));

const publicStack = run(["--json", "--pipeline", "public_stack"]);
assert.equal(publicStack.status, 0, publicStack.stderr || publicStack.stdout);
const publicStackBody = JSON.parse(publicStack.stdout);
const publicStackCommands = new Map(publicStackBody.commands.map((item) => [item.command, item]));
assert.equal(
  publicStackCommands.get("corepack pnpm run selfhost:security-review -- --profile public-stack").posture,
  "public_exposure_gate"
);
assert.equal(
  publicStackCommands.get("corepack pnpm run selfhost:security-review -- --profile public-stack").dashboard_safe,
  true
);
assert.equal(
  publicStackCommands.get("corepack pnpm run selfhost:up -- --profile public-stack").posture,
  "starts_services"
);
assert.ok(!publicStackBody.commands.some((item) => item.posture === "unmapped"));

const text = run(["--category", "top_level"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability commands/);
assert.match(text.stdout, /top_level/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.match(text.stdout, /corepack pnpm run test:deployability-operations/);
assert.ok(!text.stdout.includes("sk_commands_must_not_leak"));

console.log("[deployability-commands.test] ok");
