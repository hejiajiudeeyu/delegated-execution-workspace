import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-operator-checklist.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_operator_checklist_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json", "--profile", "public-stack", "--image-tag", "candidate-2026-06-09"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:operator-checklist");
assert.equal(body.mode, "public_stack_operator_checklist");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-132");
assert.deepEqual(body.profile, {
  key: "public_stack",
  name: "public-stack"
});
assert.equal(body.image_tag, "candidate-2026-06-09");
assert.deepEqual(body.summary, {
  status: "operator_checklist_blocked",
  operator_ready: false,
  public_exposure_ready: false,
  release_candidate_ready: false,
  onboarding_contract_ready: true,
  recovery_plan_ready: true,
  checklist_group_count: 6,
  blocked_item_count: body.checklist_items.filter((item) => item.status === "blocked").length,
  script_blocker_count: 0,
  warning_count: body.warnings.length
});
assert.deepEqual(
  body.checklist_groups.map((item) => item.key),
  ["understand", "configure", "expose", "release", "recover", "handoff"]
);

const itemsByKey = new Map(body.checklist_items.map((item) => [item.key, item]));
assert.equal(itemsByKey.get("profile_menu").status, "ready");
assert.equal(itemsByKey.get("linear_recipe").status, "ready");
assert.equal(itemsByKey.get("operator_onboarding_contract").status, "ready");
assert.equal(itemsByKey.get("public_exposure_gate").status, "blocked");
assert.ok(itemsByKey.get("public_exposure_gate").blockers.some((item) => /PUBLIC_SITE_ADDRESS/.test(item)));
assert.equal(itemsByKey.get("release_candidate_gate").status, "blocked");
assert.ok(itemsByKey.get("release_candidate_gate").blockers.some((item) => /formal release ownership/i.test(item)));
assert.equal(itemsByKey.get("backup_plan").status, "ready");
assert.equal(itemsByKey.get("handoff_report").status, "ready");
assert.ok(itemsByKey.get("profile_menu").commands.includes("corepack pnpm run deployability:menu -- --profile public-stack"));
assert.ok(itemsByKey.get("linear_recipe").commands.includes("corepack pnpm run deployability:recipe -- --profile public-stack"));
assert.ok(itemsByKey.get("release_candidate_gate").commands.includes("corepack pnpm run deployability:release -- --image-tag <candidate-tag>"));
assert.ok(itemsByKey.get("backup_plan").commands.includes("corepack pnpm run selfhost:backup-plan -- --profile public-stack"));
assert.ok(itemsByKey.get("handoff_report").commands.includes("corepack pnpm run deployability:handoff -- --profile public-stack"));

assert.deepEqual(body.blockers, []);
assert.ok(body.operator_blockers.some((item) => /public_exposure_gate/.test(item)));
assert.ok(body.operator_blockers.some((item) => /release_candidate_gate/.test(item)));
assert.ok(body.warnings.includes("repos/client: uncommitted worktree changes"));
assert.equal(body.menu.command, "deployability:menu");
assert.equal(body.recipe.command, "deployability:recipe");
assert.equal(body.onboarding_check.command, "operator:onboarding:check");
assert.equal(body.release_review.command, "deployability:release");
assert.equal(body.recovery_plan.command, "selfhost:backup-plan");
assert.ok(body.source_status.menu.ok);
assert.ok(body.source_status.recipe.ok);
assert.ok(body.source_status.operator_onboarding_check.ok);
assert.ok(body.source_status.release.ok);
assert.ok(body.source_status.backup_plan.ok);
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run deployability:release -- --image-tag <candidate-tag>"));
assert.ok(body.primary_next_commands.includes("corepack pnpm run selfhost:security-review -- --profile public-stack"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json"));
assert.ok(body.safety_defaults.some((item) => /does not start services/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_operator_checklist_must_not_leak"));

const pnpmSeparatedJson = run(["--", "--profile", "public-stack", "--image-tag", "candidate-2026-06-09", "--json"]);
assert.equal(pnpmSeparatedJson.status, 0, pnpmSeparatedJson.stderr || pnpmSeparatedJson.stdout);
const pnpmSeparatedBody = JSON.parse(pnpmSeparatedJson.stdout);
assert.equal(pnpmSeparatedBody.command, "deployability:operator-checklist");
assert.equal(pnpmSeparatedBody.profile.name, "public-stack");
assert.equal(pnpmSeparatedBody.image_tag, "candidate-2026-06-09");

const typo = run(["--json", "--profil", "public-stack", "--image-tag", "candidate-2026-06-09"]);
assert.equal(typo.status, 1, typo.stderr || typo.stdout);
assert.match(typo.stderr, /unknown option --profil/);
assert.ok(!typo.stdout.includes("sk_operator_checklist_must_not_leak"));

const missingProfile = run(["--json", "--profile", "--image-tag", "candidate-2026-06-09"]);
assert.equal(missingProfile.status, 1, missingProfile.stderr || missingProfile.stdout);
assert.match(missingProfile.stderr, /missing value for --profile/);
assert.ok(!missingProfile.stdout.includes("sk_operator_checklist_must_not_leak"));

const text = run(["--profile", "public-stack", "--image-tag", "candidate-2026-06-09"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability operator checklist/);
assert.match(text.stdout, /operator_checklist_blocked/);
assert.match(text.stdout, /public_exposure_gate/);
assert.match(text.stdout, /release_candidate_gate/);
assert.match(text.stdout, /candidate-2026-06-09/);
assert.match(text.stdout, /selfhost:backup-plan -- --profile public-stack/);
assert.ok(!text.stdout.includes("sk_operator_checklist_must_not_leak"));

console.log("[deployability-operator-checklist.test] ok");
