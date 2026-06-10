import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SCRIPT = path.join(REPO_ROOT, "tools/deployability-console.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLATFORM_ADMIN_API_KEY: "sk_console_index_must_not_leak"
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

const json = run(["--json"]);
assert.equal(json.status, 0, json.stderr || json.stdout);
const body = JSON.parse(json.stdout);
assert.equal(body.command, "deployability:console");
assert.equal(body.mode, "console_management_index");
assert.equal(body.ok, true);
assert.equal(body.current_bundle.change_id, "CHG-2026-133");
assert.equal(body.summary.status, "console_management_visible_with_client_surface_evidence");
assert.equal(body.summary.console_ready, false);
assert.equal(body.summary.surface_count, 6);
assert.equal(body.summary.planned_count, 0);
assert.equal(body.summary.ready_now_count, 3);
assert.equal(body.summary.next_action_count, 6);
assert.deepEqual(
  body.console_surfaces.map((item) => item.key),
  [
    "runtime_status",
    "settings_approval_policy",
    "logs_guidance",
    "billing_readiness",
    "public_stack_console",
    "gateway_session"
  ]
);
const surfaces = new Map(body.console_surfaces.map((item) => [item.key, item]));
assert.equal(surfaces.get("runtime_status").owner_repo, "repos/client");
assert.equal(surfaces.get("runtime_status").status, "client_owned_evidence_available");
assert.ok(surfaces.get("runtime_status").evidence_commands.includes("corepack pnpm run dev:console"));
assert.ok(
  surfaces
    .get("runtime_status")
    .evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-runtime-surface")
);
assert.equal(surfaces.get("runtime_status").next_action.key, "connect_console_runtime_status_sources");
assert.equal(surfaces.get("runtime_status").next_action.owner_repo, "repos/client");
assert.equal(surfaces.get("runtime_status").next_action.status, "client_owned_evidence_available");
assert.equal(surfaces.get("runtime_status").next_action.primary_command, "corepack pnpm run dev:console");
assert.ok(surfaces.get("runtime_status").next_action.evidence_commands.includes("corepack pnpm run dev:doctor"));
assert.ok(
  surfaces
    .get("runtime_status")
    .next_action.evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-runtime-surface")
);
assert.equal(surfaces.get("settings_approval_policy").owner_repo, "repos/client");
assert.equal(surfaces.get("settings_approval_policy").status, "client_owned_evidence_available");
assert.ok(
  surfaces
    .get("settings_approval_policy")
    .evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-settings-surface")
);
assert.equal(surfaces.get("settings_approval_policy").next_action.key, "verify_console_settings_against_client_approval_policy");
assert.equal(surfaces.get("settings_approval_policy").next_action.status, "client_owned_evidence_available");
assert.ok(
  surfaces
    .get("settings_approval_policy")
    .next_action.evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-settings-surface")
);
assert.equal(surfaces.get("logs_guidance").owner_repo, "repos/client");
assert.equal(surfaces.get("logs_guidance").status, "client_owned_evidence_available");
assert.ok(
  surfaces
    .get("logs_guidance")
    .evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-logs-surface")
);
assert.equal(surfaces.get("logs_guidance").next_action.key, "connect_console_logs_to_safe_log_metadata");
assert.equal(surfaces.get("logs_guidance").next_action.status, "client_owned_evidence_available");
assert.ok(
  surfaces
    .get("logs_guidance")
    .next_action.evidence_commands.includes("corepack pnpm --dir repos/client run check:ops-console-logs-surface")
);
assert.equal(surfaces.get("billing_readiness").owner_repo, "repos/platform");
assert.equal(surfaces.get("billing_readiness").status, "ready_now_admin_only_not_production");
assert.equal(surfaces.get("billing_readiness").next_action.key, "keep_billing_production_gate_platform_owned");
assert.equal(surfaces.get("billing_readiness").next_action.status, "ready_now_admin_only_not_production");
assert.ok(surfaces.get("billing_readiness").guardrails.some((item) => /not end-user billing/i.test(item)));
assert.equal(surfaces.get("public_stack_console").status, "ready_now_with_public_stack_gate");
assert.equal(surfaces.get("public_stack_console").next_action.key, "run_public_stack_gate_before_console_exposure");
assert.equal(surfaces.get("public_stack_console").next_action.detail_command, "corepack pnpm run deployability:exposure");
assert.equal(
  surfaces.get("public_stack_console").next_action.detail_json_command,
  "corepack pnpm --silent run deployability:exposure -- --json"
);
assert.ok(surfaces.get("public_stack_console").routes.includes("/console/"));
assert.ok(surfaces.get("public_stack_console").evidence_commands.includes("corepack pnpm run operator:onboarding:check"));
assert.ok(surfaces.get("gateway_session").routes.includes("/gateway/session/setup"));
assert.ok(surfaces.get("gateway_session").routes.includes("/gateway/credentials/platform-admin"));
assert.equal(surfaces.get("gateway_session").next_action.key, "continue_gateway_session_onboarding_checks");
assert.equal(surfaces.get("gateway_session").next_action.status, "ready_now");
assert.deepEqual(
  body.surface_next_actions.map((item) => item.key),
  [
    "connect_console_runtime_status_sources",
    "verify_console_settings_against_client_approval_policy",
    "connect_console_logs_to_safe_log_metadata",
    "keep_billing_production_gate_platform_owned",
    "run_public_stack_gate_before_console_exposure",
    "continue_gateway_session_onboarding_checks"
  ]
);
assert.ok(body.surface_next_actions.every((item) => item.owner_repo === "repos/client" || item.owner_repo === "repos/platform"));
assert.ok(body.surface_next_actions.every((item) => Array.isArray(item.guardrails) && item.guardrails.length > 0));
assert.ok(body.management_commands.includes("corepack pnpm run deployability:console"));
assert.ok(body.management_commands.includes("corepack pnpm run operator:onboarding:plan"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run deployability:console -- --json"));
assert.ok(
  body.machine_payloads.includes(
    "corepack pnpm --silent --dir repos/client run check:ops-console-runtime-surface -- --json"
  )
);
assert.ok(
  body.machine_payloads.includes(
    "corepack pnpm --silent --dir repos/client run check:ops-console-settings-surface -- --json"
  )
);
assert.ok(
  body.machine_payloads.includes(
    "corepack pnpm --silent --dir repos/client run check:ops-console-logs-surface -- --json"
  )
);
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run operator:onboarding:plan -- --json"));
assert.ok(body.machine_payloads.includes("corepack pnpm --silent run operator:onboarding:check -- --json"));
assert.ok(!body.machine_payloads.includes("corepack pnpm --silent run deployability:menu -- --profile public-stack --json"));
assert.ok(body.source_status.compatibility.ok);
assert.ok(body.source_status.operator_onboarding_plan.ok);
assert.ok(body.source_status.operator_onboarding_check.ok);
assert.ok(body.source_status.client_ops_console_runtime_surface.ok);
assert.equal(body.source_status.client_ops_console_runtime_surface.surface, "runtime_status");
assert.ok(body.source_status.client_ops_console_runtime_surface.required_api_calls.includes("/status"));
assert.ok(body.source_status.client_ops_console_runtime_surface.required_api_calls.includes("/runtime/logs"));
assert.ok(body.source_status.client_ops_console_runtime_surface.required_api_calls.includes("/runtime/alerts"));
assert.ok(body.source_status.client_ops_console_runtime_surface.safety_notes.some((item) => /secret/i.test(item)));
assert.ok(body.source_status.client_ops_console_settings_surface.ok);
assert.equal(body.source_status.client_ops_console_settings_surface.surface, "settings_approval_policy");
assert.ok(body.source_status.client_ops_console_settings_surface.required_api_calls.includes("/caller/global-policy"));
assert.ok(body.source_status.client_ops_console_settings_surface.required_routes.includes("/caller/preferences"));
assert.ok(body.source_status.client_ops_console_settings_surface.required_routes.includes("/caller/lists"));
assert.ok(body.source_status.client_ops_console_settings_surface.safety_notes.some((item) => /allow_all/i.test(item)));
assert.ok(body.source_status.client_ops_console_logs_surface.ok);
assert.equal(body.source_status.client_ops_console_logs_surface.surface, "logs_guidance");
assert.ok(body.source_status.client_ops_console_logs_surface.required_api_calls.includes("/runtime/logs"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_api_calls.includes("/runtime/alerts"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_routes.includes("/general/runtime"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_routes.includes("/help"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_log_services.includes("caller"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_log_services.includes("responder"));
assert.ok(body.source_status.client_ops_console_logs_surface.required_log_services.includes("relay"));
assert.ok(body.source_status.client_ops_console_logs_surface.safety_notes.some((item) => /secret|raw log/i.test(item)));
assert.ok(body.safety_defaults.some((item) => /does not read \.env/i.test(item)));
assert.ok(body.safety_defaults.some((item) => /client-owned console-surface evidence/i.test(item)));
assert.ok(!json.stdout.includes("[ok]"));
assert.ok(!json.stdout.includes("sk_console_index_must_not_leak"));

const text = run([]);
assert.equal(text.status, 0, text.stderr || text.stdout);
assert.match(text.stdout, /Deployability console/);
assert.match(text.stdout, /console_management_visible_with_client_surface_evidence/);
assert.match(text.stdout, /runtime_status: client_owned_evidence_available/);
assert.match(text.stdout, /next_action: connect_console_runtime_status_sources/);
assert.match(text.stdout, /settings_approval_policy: client_owned_evidence_available/);
assert.match(text.stdout, /next_action: verify_console_settings_against_client_approval_policy/);
assert.match(text.stdout, /logs_guidance: client_owned_evidence_available/);
assert.match(text.stdout, /next_action: connect_console_logs_to_safe_log_metadata/);
assert.match(text.stdout, /public_stack_console: ready_now_with_public_stack_gate/);
assert.match(text.stdout, /next_action: run_public_stack_gate_before_console_exposure/);
assert.match(text.stdout, /\/console\//);
assert.match(text.stdout, /corepack pnpm run operator:onboarding:check/);
assert.ok(!text.stdout.includes("sk_console_index_must_not_leak"));

const typo = run(["--jsno"]);
assert.equal(typo.status, 1);
assert.match(typo.stderr, /unknown option --jsno/);

console.log("[deployability-console.test] ok");
