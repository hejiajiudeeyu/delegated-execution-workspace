import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-release.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_release_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json", "--image-tag", "candidate-2026-06-09"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:release");
assert.equal(body.mode, "release_candidate_review");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-130");
assert.equal(body.profile.name, "public-stack");
assert.equal(body.image_tag, "candidate-2026-06-09");
assert.deepEqual(body.summary, {
  status: "release_candidate_blocked",
  release_candidate_ready: false,
  production_ready: false,
  public_exposure_ready: false,
  published_image_plan_ready: true,
  dry_run_ready: true,
  release_blocker_count: body.release_blockers.length,
  script_blocker_count: 0,
  warning_count: body.warnings.length
});
assert.ok(body.release_blockers.some((item) => /public exposure/i.test(item)));
assert.ok(body.release_blockers.some((item) => /production hardening/i.test(item)));
assert.ok(body.release_blockers.some((item) => /formal release ownership/i.test(item)));
assert.deepEqual(body.blockers, []);
assert.ok(body.warnings.includes("repos/client: uncommitted worktree changes"));

assert.equal(body.production_review.command, "deployability:production");
assert.equal(body.production_review.summary.production_ready, false);
assert.equal(body.exposure_review.command, "deployability:exposure");
assert.equal(body.exposure_review.summary.public_exposure_ready, false);
assert.ok(body.exposure_review.exposure_blockers.some((item) => /PUBLIC_SITE_ADDRESS/.test(item)));
assert.equal(body.published_image_plan.command, "published-image:plan");
assert.equal(body.published_image_plan.ok, true);
assert.equal(body.published_image_plan.images.length, 3);
assert.ok(body.published_image_plan.images.every((item) => item.ref.endsWith(":candidate-2026-06-09")));
assert.equal(body.published_image_dry_run.command, "published-image:smoke");
assert.equal(body.published_image_dry_run.ok, true);
assert.equal(body.published_image_dry_run.dry_run, true);
assert.equal(body.published_image_dry_run.result.dry_run, true);

assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:release -- --image-tag <candidate-tag>"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:exposure"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:release -- --image-tag <candidate-tag> --json"));
assert.ok(body.safety_defaults.some((item) => /does not publish/i.test(item)));
assert.ok(body.safety_defaults.some((item) => /does not start services/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_release_must_not_leak"));

const pnpmSeparatedJson = run(["--", "--image-tag", "candidate-2026-06-09", "--json"]);
assert.equal(pnpmSeparatedJson.status, 0, pnpmSeparatedJson.stderr || pnpmSeparatedJson.stdout);
const pnpmSeparatedBody = JSON.parse(pnpmSeparatedJson.stdout);
assert.equal(pnpmSeparatedBody.command, "deployability:release");
assert.equal(pnpmSeparatedBody.image_tag, "candidate-2026-06-09");

const text = run(["--image-tag", "candidate-2026-06-09"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability release candidate/);
assert.match(text.stdout, /release_candidate_blocked/);
assert.match(text.stdout, /candidate-2026-06-09/);
assert.match(text.stdout, /public exposure/);
assert.match(text.stdout, /production hardening/);
assert.match(text.stdout, /published-image:plan/);
assert.match(text.stdout, /published-image:smoke -- --dry-run --image-tag <candidate-tag>/);
assert.ok(!text.stdout.includes("sk_release_must_not_leak"));

console.log("[deployability-release.test] ok");
