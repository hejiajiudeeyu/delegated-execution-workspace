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
assert.ok(!body.filters.categories.includes("unmapped"));
assert.ok(body.filters.postures.includes("read_only"));
assert.ok(!body.filters.postures.includes("unmapped"));
assert.ok(body.filters.tracks.includes("daily_dev"));
assert.ok(body.filters.tracks.includes("all_in_one_demo"));
assert.ok(body.filters.pipelines.includes("all_in_one_demo"));
assert.ok(body.filters.pipelines.includes("selfhost_platform"));
assert.ok(body.filters.pipelines.includes("recovery_evidence"));
assert.ok(Array.isArray(body.filters.profiles));
assert.equal(body.filters.profiles.length, 7);
const profilesByKey = new Map(body.filters.profiles.map((item) => [item.key, item]));
assert.deepEqual(profilesByKey.get("public_stack"), {
  key: "public_stack",
  aliases: ["public-stack", "public_stack"],
  pipeline_key: "public_stack",
  purpose: "Review public exposure gates before opening edge routes."
});
assert.ok(profilesByKey.get("recovery_evidence").aliases.includes("recovery"));
assert.equal(profilesByKey.get("all_in_one_demo").pipeline_key, "all_in_one_demo");

const byCommand = new Map(body.commands.map((item) => [item.command, item]));
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard").posture, "read_only");
assert.ok(byCommand.get("corepack pnpm run deployability:dashboard").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard -- --profile public-stack").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard -- --profile public-stack").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:dashboard -- --profile public-stack").dashboard_safe, true);
assert.ok(byCommand.get("corepack pnpm run deployability:dashboard -- --profile public-stack").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan").dashboard_safe, true);
assert.ok(byCommand.get("corepack pnpm run deployability:action-plan").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:profiles").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:profiles").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:profiles").dashboard_safe, true);
assert.ok(byCommand.get("corepack pnpm run deployability:profiles").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:runbook").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:runbook").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:runbook").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run deployability:runbook -- --profile daily-dev").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:runbook -- --profile daily-dev").posture, "read_only");
assert.ok(byCommand.get("corepack pnpm run deployability:runbook -- --profile daily-dev").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:menu").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:menu").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:menu").dashboard_safe, true);
assert.ok(byCommand.get("corepack pnpm run deployability:menu").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").dashboard_safe, true);
assert.ok(byCommand.get("corepack pnpm run deployability:action-plan -- --list-profiles").track_keys.includes("daily_dev"));
assert.equal(byCommand.get("corepack pnpm run deployability:safety").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run deployability:safety").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run test:deployability").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run test:deployability").posture, "contract_test");
assert.equal(byCommand.get("corepack pnpm run test:deployability").ci_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").category, "top_level");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").posture, "contract_test");
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").ci_safe, true);
assert.equal(byCommand.get("corepack pnpm run test:deployability-operations").dashboard_safe, false);
assert.equal(byCommand.get("corepack pnpm run dev:local:status").posture, "runtime_snapshot");
assert.equal(byCommand.get("corepack pnpm run dev:local:status").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run dev:doctor").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run dev:doctor").posture, "runtime_diagnostic");
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run test:agent-e2e").posture, "runtime_acceptance");
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").category, "local_agent_loop");
assert.equal(byCommand.get("corepack pnpm run mcp:golden-four").posture, "runtime_acceptance");
assert.equal(byCommand.get("corepack pnpm run selfhost:doctor").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:doctor").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").posture, "writes_report");
assert.equal(byCommand.get("corepack pnpm run selfhost:ops-report").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:backup-validate").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:restore-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").posture, "read_only");
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate-plan").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").posture, "writes_env");
assert.equal(byCommand.get("corepack pnpm run selfhost:rotate").dashboard_safe, true);
assert.equal(byCommand.get("corepack pnpm run selfhost:up").posture, "starts_services");
assert.equal(byCommand.get("corepack pnpm run selfhost:up").calls_docker, true);
assert.ok(body.next_commands.includes("corepack pnpm run deployability:dashboard"));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(!body.commands.some((item) => item.category === "unmapped" || item.posture === "unmapped"));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_commands_must_not_leak"));

const topLevel = run(["--json", "--category", "top_level"]);
assert.equal(topLevel.status, 0, topLevel.stderr || topLevel.stdout);
const topLevelBody = JSON.parse(topLevel.stdout);
assert.ok(topLevelBody.commands.length > 0);
assert.ok(topLevelBody.commands.every((item) => item.category === "top_level"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:dashboard"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:dashboard -- --profile public-stack"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:action-plan"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:profiles"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:runbook"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:runbook -- --profile daily-dev"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:menu"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run deployability:action-plan -- --list-profiles"));
assert.ok(topLevelBody.commands.some((item) => item.command === "corepack pnpm run test:deployability"));
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
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:dashboard -- --profile public-stack"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:action-plan"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:profiles"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:runbook -- --profile daily-dev"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:menu"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:action-plan -- --list-profiles"));
assert.ok(dailyDevBody.commands.some((item) => item.command === "corepack pnpm run deployability:handoff -- --profile public-stack"));

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

const publicStackProfile = run(["--json", "--profile", "public-stack"]);
assert.equal(publicStackProfile.status, 0, publicStackProfile.stderr || publicStackProfile.stdout);
const publicStackProfileBody = JSON.parse(publicStackProfile.stdout);
assert.deepEqual(publicStackProfileBody.filters_applied.profile, {
  requested: "public-stack",
  resolved: "public_stack",
  pipeline: "public_stack"
});
assert.deepEqual(publicStackProfileBody.filters.profiles, body.filters.profiles);
assert.ok(publicStackProfileBody.commands.length > 0);
assert.ok(publicStackProfileBody.commands.every((item) => item.pipeline_keys.includes("public_stack")));
assert.ok(
  publicStackProfileBody.commands.some(
    (item) => item.command === "corepack pnpm run selfhost:security-review -- --profile public-stack"
  )
);
assert.ok(!publicStackProfileBody.commands.some((item) => item.pipeline_keys.includes("all_in_one_demo")));

const recoveryProfileAlias = run(["--json", "--profile", "recovery"]);
assert.equal(recoveryProfileAlias.status, 0, recoveryProfileAlias.stderr || recoveryProfileAlias.stdout);
const recoveryProfileAliasBody = JSON.parse(recoveryProfileAlias.stdout);
assert.equal(recoveryProfileAliasBody.filters_applied.profile.resolved, "recovery_evidence");
assert.equal(recoveryProfileAliasBody.filters_applied.pipeline, "recovery_evidence");
assert.ok(recoveryProfileAliasBody.commands.every((item) => item.pipeline_keys.includes("recovery_evidence")));
assert.ok(
  recoveryProfileAliasBody.commands.some((item) => item.command === "corepack pnpm run selfhost:backup-plan")
);

const unknownProfile = run(["--json", "--profile", "not-a-profile"]);
assert.equal(unknownProfile.status, 1, unknownProfile.stderr || unknownProfile.stdout);
const unknownProfileBody = JSON.parse(unknownProfile.stdout);
assert.deepEqual(unknownProfileBody.filters_applied.profile, {
  requested: "not-a-profile",
  resolved: null,
  pipeline: null
});
assert.deepEqual(unknownProfileBody.filters.profiles, body.filters.profiles);
assert.deepEqual(unknownProfileBody.commands, []);
assert.ok(unknownProfileBody.blockers.includes("unknown profile: not-a-profile"));
assert.ok(!unknownProfile.stdout.includes("sk_commands_must_not_leak"));

const allInOnePipeline = run(["--json", "--pipeline", "all_in_one_demo"]);
assert.equal(allInOnePipeline.status, 0, allInOnePipeline.stderr || allInOnePipeline.stdout);
const allInOnePipelineBody = JSON.parse(allInOnePipeline.stdout);
const allInOnePipelineCommands = new Map(allInOnePipelineBody.commands.map((item) => [item.command, item]));
assert.equal(
  allInOnePipelineCommands.get("corepack pnpm run selfhost:quickstart -- --profile all-in-one").posture,
  "read_only"
);
assert.equal(
  allInOnePipelineCommands.get("corepack pnpm run selfhost:up -- --profile all-in-one").posture,
  "starts_services"
);
assert.ok(!allInOnePipelineBody.commands.some((item) => item.posture === "unmapped"));

const recoveryEvidencePipeline = run(["--json", "--pipeline", "recovery_evidence"]);
assert.equal(recoveryEvidencePipeline.status, 0, recoveryEvidencePipeline.stderr || recoveryEvidencePipeline.stdout);
const recoveryEvidencePipelineBody = JSON.parse(recoveryEvidencePipeline.stdout);
const recoveryEvidenceCommands = new Map(recoveryEvidencePipelineBody.commands.map((item) => [item.command, item]));
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:ops-report").posture, "writes_report");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:audit-export").posture, "exports_evidence");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:backup-plan").posture, "read_only");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:backup-validate").posture, "read_only");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:restore-plan").posture, "read_only");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:rotate-plan").posture, "read_only");
assert.equal(recoveryEvidenceCommands.get("corepack pnpm run selfhost:rotate").posture, "writes_env");
assert.ok(recoveryEvidencePipelineBody.commands.every((item) => item.pipeline_keys.includes("recovery_evidence")));
assert.ok(!recoveryEvidencePipelineBody.commands.some((item) => item.posture === "unmapped"));

const publishedImagePipeline = run(["--json", "--pipeline", "published_image"]);
assert.equal(publishedImagePipeline.status, 0, publishedImagePipeline.stderr || publishedImagePipeline.stdout);
const publishedImagePipelineBody = JSON.parse(publishedImagePipeline.stdout);
const publishedImageCommands = new Map(publishedImagePipelineBody.commands.map((item) => [item.command, item]));
assert.equal(
  publishedImageCommands.get("corepack pnpm run published-image:smoke -- --image-tag <candidate-tag>").posture,
  "delegated_smoke"
);
assert.ok(!publishedImagePipelineBody.commands.some((item) => item.posture === "unmapped"));

const allInOneTrack = run(["--json", "--track", "all_in_one_demo"]);
assert.equal(allInOneTrack.status, 0, allInOneTrack.stderr || allInOneTrack.stdout);
const allInOneTrackBody = JSON.parse(allInOneTrack.stdout);
assert.ok(allInOneTrackBody.commands.every((item) => item.track_keys.includes("all_in_one_demo")));
assert.ok(
  allInOneTrackBody.commands.some(
    (item) => item.command === "corepack pnpm run selfhost:quickstart -- --profile all-in-one"
  )
);

const text = run(["--category", "top_level"]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability commands/);
assert.match(text.stdout, /top_level/);
assert.match(text.stdout, /corepack pnpm run deployability:dashboard/);
assert.match(text.stdout, /corepack pnpm run deployability:runbook/);
assert.match(text.stdout, /corepack pnpm run deployability:menu/);
assert.match(text.stdout, /corepack pnpm run test:deployability/);
assert.match(text.stdout, /corepack pnpm run test:deployability-operations/);
assert.ok(!text.stdout.includes("sk_commands_must_not_leak"));

const textProfile = run(["--profile", "public-stack"]);
assert.equal(textProfile.status, 0, textProfile.stderr || textProfile.stdout);
assert.match(textProfile.stdout, /"profile":\{"requested":"public-stack","resolved":"public_stack","pipeline":"public_stack"\}/);
assert.match(textProfile.stdout, /corepack pnpm run selfhost:security-review -- --profile public-stack/);
assert.ok(!textProfile.stdout.includes("corepack pnpm run selfhost:quickstart -- --profile all-in-one"));

console.log("[deployability-commands.test] ok");
