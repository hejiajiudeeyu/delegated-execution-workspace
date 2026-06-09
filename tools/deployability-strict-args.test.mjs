import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);

const COMMANDS = [
  {
    script: "tools/deployability-overview.mjs",
    command: "deployability:overview"
  },
  {
    script: "tools/deployability-quickstart.mjs",
    command: "deployability:quickstart"
  },
  {
    script: "tools/deployability-safety.mjs",
    command: "deployability:safety"
  },
  {
    script: "tools/deployability-explain.mjs",
    command: "deployability:explain"
  },
  {
    script: "tools/deployability-production.mjs",
    command: "deployability:production"
  },
  {
    script: "tools/deployability-readiness.mjs",
    command: "deployability:readiness"
  },
  {
    script: "tools/deployability-roadmap.mjs",
    command: "deployability:roadmap"
  },
  {
    script: "tools/deployability-status.mjs",
    command: "deployability:status"
  },
  {
    script: "tools/deployability-gates.mjs",
    command: "deployability:gates"
  },
  {
    script: "tools/deployability-exposure.mjs",
    command: "deployability:exposure"
  },
  {
    script: "tools/deployability-release.mjs",
    command: "deployability:release",
    jsonArgs: ["--image-tag", "candidate-strict-args"]
  },
  {
    script: "tools/deployability-doctor.mjs",
    command: "deployability:doctor"
  },
  {
    script: "tools/compat-status.mjs",
    command: "compat:status"
  }
];

const LIGHT_JSON_COMMANDS = [
  {
    script: "tools/deployability-overview.mjs",
    command: "deployability:overview"
  },
  {
    script: "tools/deployability-quickstart.mjs",
    command: "deployability:quickstart"
  },
  {
    script: "tools/deployability-safety.mjs",
    command: "deployability:safety"
  },
  {
    script: "tools/compat-status.mjs",
    command: "compat:status"
  }
];

function run(script, args) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, script), ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_strict_args_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

for (const item of LIGHT_JSON_COMMANDS) {
  const json = run(item.script, ["--", ...(item.jsonArgs || []), "--json"]);
  assert.equal(json.status, 0, `${item.command} should accept pnpm separator: ${json.stderr || json.stdout}`);
  const body = JSON.parse(json.stdout);
  assert.equal(body.command, item.command);
  assert.ok(!json.stdout.includes("sk_strict_args_must_not_leak"));
}

for (const item of COMMANDS) {
  const typo = run(item.script, ["--jsno"]);
  assert.notEqual(typo.status, 0, `${item.command} should reject unknown options`);
  assert.match(typo.stderr, /unknown option --jsno/);
  assert.ok(!typo.stdout.includes("sk_strict_args_must_not_leak"));
  assert.ok(!typo.stderr.includes("sk_strict_args_must_not_leak"));
}

console.log("[deployability-strict-args.test] ok");
