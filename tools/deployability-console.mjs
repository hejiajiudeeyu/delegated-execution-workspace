#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability console index is read-only and does not read .env files directly",
  "deployability console index only calls compatibility, operator-onboarding, and client-owned console-surface evidence commands",
  "deployability console index does not call Docker, bind ports, probe network endpoints, or start console services",
  "JSON output contains console surface, route, owner, evidence, and guardrail metadata without printing secret values"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:console -- --json",
  "corepack pnpm --silent --dir repos/client run check:ops-console-runtime-surface -- --json",
  "corepack pnpm --silent --dir repos/client run check:ops-console-settings-surface -- --json",
  "corepack pnpm --silent --dir repos/client run check:ops-console-logs-surface -- --json",
  "corepack pnpm --silent run operator:onboarding:plan -- --json",
  "corepack pnpm --silent run operator:onboarding:check -- --json"
];

const MANAGEMENT_COMMANDS = [
  "corepack pnpm run deployability:console",
  "corepack pnpm --dir repos/client run check:ops-console-runtime-surface",
  "corepack pnpm --dir repos/client run check:ops-console-settings-surface",
  "corepack pnpm --dir repos/client run check:ops-console-logs-surface",
  "corepack pnpm run operator:onboarding:plan",
  "corepack pnpm run operator:onboarding:check",
  "corepack pnpm run deployability:menu -- --profile public-stack",
  "corepack pnpm run selfhost:smoke -- --profile public-stack",
  "corepack pnpm run dev:console",
  "corepack pnpm run dev:platform-console"
];

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
}

function runJsonScript(relativeScript, extraArgs = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), ...extraArgs, "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  let body = null;
  try {
    body = result.stdout.trim() ? JSON.parse(result.stdout) : null;
  } catch (error) {
    body = null;
  }
  return {
    ok: result.status === 0 && body != null && body.ok !== false,
    exit_code: result.status,
    stderr: result.stderr.trim().split("\n").filter(Boolean),
    body,
    parse_error: body == null ? "source did not emit valid JSON" : null
  };
}

function runPackageJsonCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  let body = null;
  try {
    body = result.stdout.trim() ? JSON.parse(result.stdout) : null;
  } catch (error) {
    body = null;
  }
  return {
    ok: result.status === 0 && body != null && body.ok !== false,
    exit_code: result.status,
    stderr: result.stderr.trim().split("\n").filter(Boolean),
    body,
    parse_error: body == null ? "source did not emit valid JSON" : null
  };
}

function sourceBlocker(label, result) {
  if (result.ok) return null;
  return `${label}: ${result.parse_error || result.stderr.join("; ") || `exit=${result.exit_code}`}`;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function consoleSurfaceNextActions({ clientRuntimeSurface, clientSettingsSurface, clientLogsSurface }) {
  const runtimeEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-runtime-surface";
  const settingsEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-settings-surface";
  const logsEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-logs-surface";
  const runtimeEvidenceAvailable = clientRuntimeSurface?.ok === true;
  const settingsEvidenceAvailable = clientSettingsSurface?.ok === true;
  const logsEvidenceAvailable = clientLogsSurface?.ok === true;
  return {
    runtime_status: {
      key: "connect_console_runtime_status_sources",
      status: runtimeEvidenceAvailable ? "client_owned_evidence_available" : "planned_runtime_parity",
      owner_repo: "repos/client",
      primary_command: "corepack pnpm run dev:console",
      primary_json_command: null,
      evidence_commands: ["corepack pnpm run dev:doctor", "corepack pnpm run dev:local:status", runtimeEvidenceCommand],
      guardrails: [
        "runtime parity must be implemented in the owning client/platform runtime surfaces",
        "deployability:console stays a read-only planning and management index"
      ]
    },
    settings_approval_policy: {
      key: "verify_console_settings_against_client_approval_policy",
      status: settingsEvidenceAvailable ? "client_owned_evidence_available" : "planned_runtime_parity",
      owner_repo: "repos/client",
      primary_command: "corepack pnpm run dev:console",
      primary_json_command: null,
      evidence_commands: ["corepack pnpm run deployability:explain", settingsEvidenceCommand],
      guardrails: [
        "approval policy copy must match client-owned behavior",
        "do not imply policy changes until the owning client runtime enforces them"
      ]
    },
    logs_guidance: {
      key: "connect_console_logs_to_safe_log_metadata",
      status: logsEvidenceAvailable ? "client_owned_evidence_available" : "planned_runtime_parity",
      owner_repo: "repos/client",
      primary_command: "corepack pnpm run dev:local:logs",
      primary_json_command: "corepack pnpm --silent run dev:local:logs -- --json",
      evidence_commands: ["corepack pnpm run dev:local:logs", "corepack pnpm run selfhost:logs", logsEvidenceCommand],
      guardrails: [
        "machine-readable log metadata must not include raw log lines",
        "console log panels should point to safe commands instead of storing terminal output"
      ]
    },
    billing_readiness: {
      key: "keep_billing_production_gate_platform_owned",
      status: "ready_now_admin_only_not_production",
      owner_repo: "repos/platform",
      primary_command: "corepack pnpm run deployability:production",
      primary_json_command: "corepack pnpm --silent run deployability:production -- --json",
      evidence_commands: ["corepack pnpm run deployability:hardening-plan", "corepack pnpm run dev:platform-console"],
      guardrails: [
        "admin-only billing readiness is not end-user billing production readiness",
        "billing production gates must land in repos/platform before production-ready claims"
      ]
    },
    public_stack_console: {
      key: "run_public_stack_gate_before_console_exposure",
      status: "gate_required",
      owner_repo: "repos/platform",
      primary_command: "corepack pnpm run selfhost:security-review -- --profile public-stack",
      primary_json_command: "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
      detail_command: "corepack pnpm run deployability:exposure",
      detail_json_command: "corepack pnpm --silent run deployability:exposure -- --json",
      evidence_commands: [
        "corepack pnpm run operator:onboarding:check",
        "corepack pnpm run selfhost:smoke -- --profile public-stack"
      ],
      guardrails: [
        "public-stack console access remains behind public exposure gates",
        "localhost public origin and placeholder secrets remain blockers"
      ]
    },
    gateway_session: {
      key: "continue_gateway_session_onboarding_checks",
      status: "ready_now",
      owner_repo: "repos/platform",
      primary_command: "corepack pnpm run operator:onboarding:check",
      primary_json_command: "corepack pnpm --silent run operator:onboarding:check -- --json",
      evidence_commands: ["corepack pnpm run operator:onboarding:plan", "corepack pnpm run operator:onboarding:check"],
      guardrails: [
        "gateway credentials must not be printed in deployability JSON",
        "gateway proxy behavior remains platform-owned runtime truth"
      ]
    }
  };
}

function consoleSurfaces({ onboardingPlan, clientRuntimeSurface, clientSettingsSurface, clientLogsSurface }) {
  const onboardingCommands = onboardingPlan?.phases?.flatMap((phase) => phase.commands || []) || [];
  const nextActions = consoleSurfaceNextActions({ clientRuntimeSurface, clientSettingsSurface, clientLogsSurface });
  const runtimeEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-runtime-surface";
  const settingsEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-settings-surface";
  const logsEvidenceCommand = "corepack pnpm --dir repos/client run check:ops-console-logs-surface";
  const runtimeEvidenceAvailable = clientRuntimeSurface?.ok === true;
  const settingsEvidenceAvailable = clientSettingsSurface?.ok === true;
  const logsEvidenceAvailable = clientLogsSurface?.ok === true;
  return [
    {
      key: "runtime_status",
      label: "Runtime status",
      status: runtimeEvidenceAvailable ? "client_owned_evidence_available" : "planned",
      owner_repo: "repos/client",
      purpose: "Surface platform, relay, caller, responder, skill adapter, and MCP adapter state in console runtime pages.",
      routes: ["/console/runtime"],
      evidence_commands: [
        "corepack pnpm run dev:console",
        "corepack pnpm run dev:doctor",
        "corepack pnpm run dev:local:status",
        runtimeEvidenceCommand
      ],
      guardrails: [
        "runtime truth stays in the client and platform repositories",
        "deployability console index does not start the console or inspect live processes"
      ],
      next_action: nextActions.runtime_status,
      remaining_work: runtimeEvidenceAvailable
        ? ["keep live runtime health evaluation in repos/client and repos/platform; this evidence only proves the console surface wiring"]
        : ["connect runtime cards to owning-repo health sources before treating this as live runtime parity"]
    },
    {
      key: "settings_approval_policy",
      label: "Settings and approval policy",
      status: settingsEvidenceAvailable ? "client_owned_evidence_available" : "planned",
      owner_repo: "repos/client",
      purpose: "Explain local/public mode and approval policy choices from a console settings surface.",
      routes: ["/console/preferences", "/console/access-lists"],
      evidence_commands: [
        "corepack pnpm run dev:console",
        "corepack pnpm run deployability:explain",
        settingsEvidenceCommand
      ],
      guardrails: [
        "approval policy remains client-owned behavior",
        "console copy must not imply policy changes that the owning client runtime does not enforce"
      ],
      next_action: nextActions.settings_approval_policy,
      remaining_work: settingsEvidenceAvailable
        ? ["keep approval policy behavior and persistence in repos/client; this evidence only proves the console settings wiring"]
        : ["verify settings surfaces against client-owned approval behavior before calling them operationally ready"]
    },
    {
      key: "logs_guidance",
      label: "Logs guidance",
      status: logsEvidenceAvailable ? "client_owned_evidence_available" : "planned",
      owner_repo: "repos/client",
      purpose: "Guide users through log inspection without dumping secrets into dashboard JSON.",
      routes: ["/console/runtime", "/console/help"],
      evidence_commands: ["corepack pnpm run dev:local:logs", "corepack pnpm run selfhost:logs", logsEvidenceCommand],
      guardrails: [
        "machine-readable log metadata must not include raw log lines",
        "console guidance should point to safe log commands instead of storing terminal output"
      ],
      next_action: nextActions.logs_guidance,
      remaining_work: logsEvidenceAvailable
        ? ["keep live log retrieval and redaction behavior in repos/client; this evidence only proves console logs guidance wiring"]
        : ["connect logs guidance to safe log metadata before exposing a live logs panel"]
    },
    {
      key: "billing_readiness",
      label: "Billing readiness",
      status: "ready_now_admin_only_not_production",
      owner_repo: "repos/platform",
      purpose: "Expose admin-only tenant setup, balance inspection, manual recharge capture, and ledger review as readiness evidence.",
      routes: ["/console/billing", "/gateway/proxy/v2/admin"],
      evidence_commands: ["corepack pnpm run deployability:production", "corepack pnpm run dev:platform-console"],
      guardrails: [
        "billing readiness is explicit instead of implied",
        "admin-only billing evidence is not end-user billing readiness",
        "billing production gates belong in repos/platform"
      ],
      next_action: nextActions.billing_readiness,
      remaining_work: ["keep billing outside production-ready verdicts until platform-owned gates pass"]
    },
    {
      key: "public_stack_console",
      label: "Public-stack console entry",
      status: "ready_now_with_public_stack_gate",
      owner_repo: "repos/platform",
      purpose: "Explain and validate the public-stack /console/ entry point as the operator's first-use surface.",
      routes: ["/console/"],
      evidence_commands: [
        "corepack pnpm run operator:onboarding:plan",
        "corepack pnpm run operator:onboarding:check",
        "corepack pnpm run selfhost:smoke -- --profile public-stack"
      ],
      guardrails: [
        "public-stack console exposure remains behind public exposure gates",
        "localhost public origin and placeholder secrets remain blockers"
      ],
      next_action: nextActions.public_stack_console,
      remaining_work: ["run public-stack gates before opening console access beyond local evaluation"],
      onboarding_commands: onboardingCommands.filter((command) => /console|gateway/.test(command))
    },
    {
      key: "gateway_session",
      label: "Gateway session flow",
      status: "ready_now",
      owner_repo: "repos/platform",
      purpose: "Make gateway session setup and platform-admin credential persistence visible to operators.",
      routes: ["/gateway/session/setup", "/gateway/credentials/platform-admin"],
      evidence_commands: ["corepack pnpm run operator:onboarding:plan", "corepack pnpm run operator:onboarding:check"],
      guardrails: [
        "gateway credentials must not be printed in deployability JSON",
        "gateway proxy behavior remains platform-owned runtime truth"
      ],
      next_action: nextActions.gateway_session,
      remaining_work: []
    }
  ];
}

function summarize({ surfaces, blockers, warnings }) {
  return {
    status: blockers.length ? "blocked" : "console_management_visible_with_client_surface_evidence",
    console_ready: false,
    surface_count: surfaces.length,
    ready_now_count: surfaces.filter((item) => item.status.startsWith("ready_now")).length,
    planned_count: surfaces.filter((item) => item.status === "planned").length,
    next_action_count: surfaces.filter((item) => item.next_action).length,
    blocked_count: blockers.length,
    warning_count: warnings.length
  };
}

function consoleData() {
  const compatibilityResult = runJsonScript("tools/compat-status.mjs");
  const onboardingPlanResult = runJsonScript("tools/operator-onboarding.mjs", ["plan"]);
  const onboardingCheckResult = runJsonScript("tools/operator-onboarding.mjs", ["check"]);
  const clientRuntimeSurfaceResult = runPackageJsonCommand("corepack", [
    "pnpm",
    "--silent",
    "--dir",
    "repos/client",
    "run",
    "check:ops-console-runtime-surface",
    "--",
    "--json"
  ]);
  const clientSettingsSurfaceResult = runPackageJsonCommand("corepack", [
    "pnpm",
    "--silent",
    "--dir",
    "repos/client",
    "run",
    "check:ops-console-settings-surface",
    "--",
    "--json"
  ]);
  const clientLogsSurfaceResult = runPackageJsonCommand("corepack", [
    "pnpm",
    "--silent",
    "--dir",
    "repos/client",
    "run",
    "check:ops-console-logs-surface",
    "--",
    "--json"
  ]);
  const sourceBlockers = [
    sourceBlocker("compatibility", compatibilityResult),
    sourceBlocker("operator_onboarding_plan", onboardingPlanResult),
    sourceBlocker("operator_onboarding_check", onboardingCheckResult),
    sourceBlocker("client_ops_console_runtime_surface", clientRuntimeSurfaceResult),
    sourceBlocker("client_ops_console_settings_surface", clientSettingsSurfaceResult),
    sourceBlocker("client_ops_console_logs_surface", clientLogsSurfaceResult)
  ].filter(Boolean);
  const warnings = unique([
    ...(compatibilityResult.body?.warnings || []),
    ...(onboardingPlanResult.body?.warnings || []),
    ...(onboardingCheckResult.body?.warnings || [])
  ]);
  const blockers = unique([
    ...sourceBlockers,
    ...(compatibilityResult.body?.blockers || []),
    ...(onboardingPlanResult.body?.blockers || []),
    ...(onboardingCheckResult.body?.blockers || [])
  ]);
  const surfaces = consoleSurfaces({
    onboardingPlan: onboardingPlanResult.body,
    clientRuntimeSurface: clientRuntimeSurfaceResult.body,
    clientSettingsSurface: clientSettingsSurfaceResult.body,
    clientLogsSurface: clientLogsSurfaceResult.body
  });

  return {
    command: "deployability:console",
    mode: "console_management_index",
    ok: blockers.length === 0,
    current_bundle: compatibilityResult.body?.current_bundle || null,
    summary: summarize({ surfaces, blockers, warnings }),
    console_surfaces: surfaces,
    surface_next_actions: surfaces.map((surface) => surface.next_action).filter(Boolean),
    management_commands: MANAGEMENT_COMMANDS,
    machine_payloads: MACHINE_PAYLOADS,
    blockers,
    warnings,
    source_status: {
      compatibility: {
        ok: compatibilityResult.ok,
        exit_code: compatibilityResult.exit_code,
        stderr: compatibilityResult.stderr,
        parse_error: compatibilityResult.parse_error
      },
      operator_onboarding_plan: {
        ok: onboardingPlanResult.ok,
        exit_code: onboardingPlanResult.exit_code,
        stderr: onboardingPlanResult.stderr,
        parse_error: onboardingPlanResult.parse_error
      },
      operator_onboarding_check: {
        ok: onboardingCheckResult.ok,
        exit_code: onboardingCheckResult.exit_code,
        stderr: onboardingCheckResult.stderr,
        parse_error: onboardingCheckResult.parse_error
      },
      client_ops_console_runtime_surface: {
        ok: clientRuntimeSurfaceResult.ok,
        exit_code: clientRuntimeSurfaceResult.exit_code,
        stderr: clientRuntimeSurfaceResult.stderr,
        parse_error: clientRuntimeSurfaceResult.parse_error,
        surface: clientRuntimeSurfaceResult.body?.surface || null,
        route: clientRuntimeSurfaceResult.body?.route || null,
        required_api_calls: clientRuntimeSurfaceResult.body?.required_api_calls || [],
        required_runtime_services: clientRuntimeSurfaceResult.body?.required_runtime_services || [],
        safety_notes: clientRuntimeSurfaceResult.body?.safety_notes || []
      },
      client_ops_console_settings_surface: {
        ok: clientSettingsSurfaceResult.ok,
        exit_code: clientSettingsSurfaceResult.exit_code,
        stderr: clientSettingsSurfaceResult.stderr,
        parse_error: clientSettingsSurfaceResult.parse_error,
        surface: clientSettingsSurfaceResult.body?.surface || null,
        required_routes: clientSettingsSurfaceResult.body?.required_routes || [],
        required_api_calls: clientSettingsSurfaceResult.body?.required_api_calls || [],
        required_policy_modes: clientSettingsSurfaceResult.body?.required_policy_modes || [],
        required_policy_lists: clientSettingsSurfaceResult.body?.required_policy_lists || [],
        safety_notes: clientSettingsSurfaceResult.body?.safety_notes || []
      },
      client_ops_console_logs_surface: {
        ok: clientLogsSurfaceResult.ok,
        exit_code: clientLogsSurfaceResult.exit_code,
        stderr: clientLogsSurfaceResult.stderr,
        parse_error: clientLogsSurfaceResult.parse_error,
        surface: clientLogsSurfaceResult.body?.surface || null,
        required_routes: clientLogsSurfaceResult.body?.required_routes || [],
        required_api_calls: clientLogsSurfaceResult.body?.required_api_calls || [],
        required_log_services: clientLogsSurfaceResult.body?.required_log_services || [],
        required_log_controls: clientLogsSurfaceResult.body?.required_log_controls || [],
        safety_notes: clientLogsSurfaceResult.body?.safety_notes || []
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this to render the console management story before starting any console service",
      "console surfaces are projections over compatibility, operator-onboarding, and client-owned surface evidence metadata; live runtime behavior remains in owning repositories",
      "deployability:menu remains a management discovery command, not a direct console machine payload"
    ]
  };
}

function printJson(data) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        ...data
      },
      null,
      2
    )
  );
}

function printText(data) {
  console.log("Deployability console");
  console.log("=====================");
  console.log("Read-only console management index for runtime, settings, logs, billing, public-stack console, and gateway session surfaces.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`console_ready=${data.summary.console_ready}\n`);

  for (const surface of data.console_surfaces) {
    console.log(`${surface.key}: ${surface.status}`);
    console.log(`  ${surface.label}`);
    console.log(`  owner_repo: ${surface.owner_repo}`);
    for (const route of surface.routes) console.log(`  route: ${route}`);
    for (const command of surface.evidence_commands) console.log(`  - ${command}`);
    for (const guardrail of surface.guardrails) console.log(`  guardrail: ${guardrail}`);
    if (surface.next_action) console.log(`  next_action: ${surface.next_action.key}`);
    for (const item of surface.remaining_work || []) console.log(`  remaining: ${item}`);
  }

  if (data.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nManagement commands:");
  for (const command of data.management_commands) console.log(`- ${command}`);
}

try {
  const args = parseArgs(process.argv);
  const data = consoleData();
  if (args.json) {
    printJson(data);
  } else {
    printText(data);
  }
  process.exitCode = data.ok ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
