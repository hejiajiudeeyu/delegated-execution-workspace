import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-runbook.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_runbook_must_not_leak"
    }
  });
}

const index = run(["--json"]);
assert.equal(index.status, 0, index.stderr || index.stdout);
const indexBody = JSON.parse(index.stdout);
assert.equal(indexBody.command, "deployability:runbook");
assert.equal(indexBody.mode, "profile_runbook_index");
assert.equal(indexBody.ok, true);
assert.equal(indexBody.current_bundle.change_id, "CHG-2026-120");
assert.ok(indexBody.profiles.some((item) => item.key === "public_stack"));
assert.ok(indexBody.next_commands.includes("corepack pnpm run deployability:runbook -- --profile public-stack"));
assert.ok(!index.stdout.includes("sk_runbook_must_not_leak"));

const json = run(["--json", "--profile", "public-stack"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:runbook");
assert.equal(body.mode, "profile_runbook");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-120");
assert.deepEqual(body.profile_filter, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.equal(body.profile.key, "public_stack");
assert.equal(body.profile.attention.level, "safety_gate");

const phasesByKey = new Map(body.phases.map((item) => [item.key, item]));
assert.ok(phasesByKey.get("inspect").commands.some((item) => item.command === "corepack pnpm run selfhost:ports -- --profile public-stack"));
assert.ok(
  phasesByKey.get("gate").commands.some(
    (item) => item.command === "corepack pnpm run selfhost:security-review -- --profile public-stack"
  )
);
assert.ok(
  phasesByKey.get("start").commands.some((item) => item.command === "corepack pnpm run selfhost:up -- --profile public-stack")
);
assert.ok(
  phasesByKey.get("verify").commands.some((item) => item.command === "corepack pnpm run selfhost:smoke -- --profile public-stack")
);
assert.equal(
  phasesByKey.get("gate").commands.find((item) => item.command.includes("security-review")).public_exposure_gate,
  true
);
assert.ok(body.phase_order.indexOf("gate") < body.phase_order.indexOf("start"));
assert.ok(body.safety_defaults.some((item) => /read-only/i.test(item)));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:profiles -- --profile public-stack"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:commands -- --profile public-stack"));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_runbook_must_not_leak"));

const dailyDev = run(["--json", "--profile", "daily-dev"]);
assert.equal(dailyDev.status, 0, dailyDev.stderr || dailyDev.stdout);
const dailyDevBody = JSON.parse(dailyDev.stdout);
const dailyPhases = new Map(dailyDevBody.phases.map((item) => [item.key, item]));
assert.equal(dailyDevBody.profile.key, "daily_dev");
assert.ok(dailyPhases.get("inspect").commands.some((item) => item.command === "corepack pnpm run dev:local:plan"));
assert.ok(dailyPhases.get("start").commands.some((item) => item.command === "corepack pnpm run dev:local:up"));
assert.ok(dailyPhases.get("verify").commands.some((item) => item.command === "corepack pnpm run mcp:golden-four"));
assert.ok(dailyPhases.get("operate").commands.some((item) => item.command === "corepack pnpm run dev:local:logs"));
assert.ok(dailyPhases.get("operate").commands.some((item) => item.command === "corepack pnpm run dev:local:down"));

const unknown = run(["--json", "--profile", "not-a-profile"]);
assert.equal(unknown.status, 1, unknown.stderr || unknown.stdout);
const unknownBody = JSON.parse(unknown.stdout);
assert.equal(unknownBody.ok, false);
assert.deepEqual(unknownBody.phases, []);
assert.ok(unknownBody.blockers.includes("unknown profile: not-a-profile"));
assert.ok(!unknown.stdout.includes("sk_runbook_must_not_leak"));

const text = run(["--profile", "public-stack"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability runbook/);
assert.match(text.stdout, /public_stack/);
assert.match(text.stdout, /gate/i);
assert.match(text.stdout, /selfhost:security-review -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_runbook_must_not_leak"));

console.log("[deployability-runbook.test] ok");
