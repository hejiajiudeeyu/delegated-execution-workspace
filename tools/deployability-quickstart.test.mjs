import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-quickstart.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_quickstart_must_not_leak"
    }
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:quickstart");
assert.equal(body.ok, true);
assert.ok(body.generated_at);
assert.equal(body.default_track, "daily_dev");
assert.deepEqual(
  body.tracks.map((item) => item.key),
  ["daily_dev", "selfhost_platform", "public_stack", "release_review"]
);
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:overview"));
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:safety"));
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:doctor"));
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:dashboard"));
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:commands"));
assert.ok(body.tracks.find((item) => item.key === "daily_dev").steps.some((step) => step.command === "corepack pnpm run deployability:handoff"));
assert.ok(body.tracks.find((item) => item.key === "selfhost_platform").steps.some((step) => step.command === "corepack pnpm run selfhost:quickstart"));
assert.ok(body.tracks.find((item) => item.key === "public_stack").steps.some((step) => step.command === "corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.tracks.find((item) => item.key === "release_review").steps.some((step) => step.command === "corepack pnpm run published-image:plan"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:handoff"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:safety"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:doctor"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.next_commands.includes("corepack pnpm run deployability:commands"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!json.stdout.includes("sk_quickstart_must_not_leak"));
assert.ok(!json.stdout.includes("[ok]"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability quickstart/);
assert.match(text.stdout, /Daily development/);
assert.match(text.stdout, /Selfhost Platform/);
assert.match(text.stdout, /Public Stack/);
assert.match(text.stdout, /corepack pnpm run deployability:safety/);
assert.match(text.stdout, /corepack pnpm run deployability:doctor/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.match(text.stdout, /corepack pnpm run deployability:commands/);
assert.match(text.stdout, /corepack pnpm run deployability:handoff/);
assert.ok(!text.stdout.includes("sk_quickstart_must_not_leak"));

console.log("[deployability-quickstart.test] ok");
