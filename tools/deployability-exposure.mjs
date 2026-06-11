#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseStrictArgs } from "./lib/strict-args.mjs";

const ROOT = process.cwd();

const SAFETY_DEFAULTS = [
  "deployability exposure review is non-destructive and does not start services",
  "deployability exposure review does not bind ports, probe network endpoints, or print secret values",
  "deployability exposure review calls docker compose config through selfhost:security-review",
  "JSON output separates script blockers from exposure blockers so dashboards can render blocked public exposure"
];

const MACHINE_PAYLOADS = [
  "corepack pnpm --silent run deployability:exposure -- --json",
  "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
  "corepack pnpm --silent run deployability:gates -- --json"
];

const PRIMARY_NEXT_COMMANDS = [
  "corepack pnpm run deployability:exposure",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run operator:onboarding:check",
  "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
  "corepack pnpm run deployability:handoff -- --profile public-stack"
];

const REMEDIATION_MACHINE_PAYLOADS = [
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --json",
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm --json",
  "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
  "corepack pnpm --silent run operator:onboarding:check -- --json",
  "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json",
  "corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json",
  "corepack pnpm --silent run deployability:evidence -- --profile public-stack --json"
];

const PUBLIC_ORIGIN_PLAN_COMMAND =
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin>";
const PUBLIC_ORIGIN_PLAN_JSON_COMMAND =
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --json";
const PUBLIC_ORIGIN_APPLY_COMMAND =
  "corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm";
const PUBLIC_ORIGIN_APPLY_JSON_COMMAND =
  "corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm --json";
const PUBLIC_ORIGIN_COMMANDS = [
  PUBLIC_ORIGIN_PLAN_COMMAND,
  PUBLIC_ORIGIN_PLAN_JSON_COMMAND,
  PUBLIC_ORIGIN_APPLY_COMMAND,
  PUBLIC_ORIGIN_APPLY_JSON_COMMAND
];

function parseArgs(argv) {
  return parseStrictArgs(argv, [{ flag: "--json", name: "json", type: "boolean" }], { json: false });
}

function runNodeScript(relativeScript, args = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relativeScript), ...args], {
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
    ok: body != null,
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

function publicGate(gates) {
  return gates?.gates?.find((item) => item.key === "public_stack_exposure") || null;
}

function summarize({ exposureBlockers, securityReview, warnings }) {
  const routes = securityReview?.public_route_contract?.routes || [];
  const secretHygiene = securityReview?.secret_hygiene || [];
  return {
    status: exposureBlockers.length ? "public_exposure_blocked" : "public_exposure_review_ready",
    public_exposure_ready: exposureBlockers.length === 0,
    exposure_blocker_count: exposureBlockers.length,
    gate_count: 1,
    route_count: routes.length,
    route_ready_count: routes.filter((item) => item.ok).length,
    secret_hygiene_check_count: secretHygiene.length,
    secret_hygiene_ready_count: secretHygiene.filter((item) => item.ok).length,
    warning_count: warnings.length
  };
}

function buildOperatorNextAction({ exposureBlockers }) {
  const publicOriginBlocker = exposureBlockers.find((item) => item.startsWith("PUBLIC_SITE_ADDRESS:")) || null;
  if (publicOriginBlocker) {
    return {
      key: "configure_public_stack_public_origin",
      status: "blocked_by_public_origin",
      profile: "public-stack",
      target_file: "repos/platform/deploy/public-stack/.env",
      env_key: "PUBLIC_SITE_ADDRESS",
      current_value_class: publicOriginBlocker.includes("localhost") ? "localhost" : "invalid_or_missing",
      required_value: "real public https origin, for example https://callanything.example",
      manual_step:
        "Set PUBLIC_SITE_ADDRESS in repos/platform/deploy/public-stack/.env to the real public HTTPS origin before exposing public-stack.",
      plan_command: PUBLIC_ORIGIN_PLAN_COMMAND,
      plan_json_command: PUBLIC_ORIGIN_PLAN_JSON_COMMAND,
      apply_command: PUBLIC_ORIGIN_APPLY_COMMAND,
      apply_json_command: PUBLIC_ORIGIN_APPLY_JSON_COMMAND,
      verify_command: "corepack pnpm run selfhost:security-review -- --profile public-stack",
      verify_json_command: "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
      follow_up_commands: [
        "corepack pnpm run deployability:exposure",
        "corepack pnpm run operator:onboarding:check",
        "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
        "corepack pnpm run deployability:handoff -- --profile public-stack"
      ],
      guardrails: [
        "do not open edge routes while PUBLIC_SITE_ADDRESS is localhost",
        "use HTTPS for public exposure unless this is a private lab profile",
        "rerun the public-stack security review before any startup or exposure claim"
      ]
    };
  }
  if (exposureBlockers.length) {
    return {
      key: "resolve_public_stack_exposure_blockers",
      status: "blocked",
      profile: "public-stack",
      verify_command: "corepack pnpm run selfhost:security-review -- --profile public-stack",
      verify_json_command: "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json",
      follow_up_commands: [
        "corepack pnpm run deployability:exposure",
        "corepack pnpm run operator:onboarding:check",
        "corepack pnpm run deployability:handoff -- --profile public-stack"
      ],
      guardrails: ["resolve every exposure blocker before opening edge routes"]
    };
  }
  return {
    key: "continue_public_stack_pre_exposure_checks",
    status: "review_ready",
    profile: "public-stack",
    verify_command: "corepack pnpm run operator:onboarding:check",
    verify_json_command: "corepack pnpm --silent run operator:onboarding:check -- --json",
    follow_up_commands: [
      "corepack pnpm run operator:onboarding:check",
      "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
      "corepack pnpm run deployability:handoff -- --profile public-stack"
    ],
    guardrails: ["keep security review, onboarding check, and published-image dry-run visible before public exposure"]
  };
}

function buildPreExposureRemediationPlan({ exposureBlockers, securityReview, operatorNextAction }) {
  const routeContract = securityReview?.public_route_contract || null;
  const routes = routeContract?.routes || [];
  const routeReadyCount = routes.filter((item) => item.ok).length;
  const publicOriginBlocked = exposureBlockers.some((item) => item.startsWith("PUBLIC_SITE_ADDRESS:"));
  const routeContractReady = Boolean(routeContract?.ok);
  const securityReviewReady = exposureBlockers.length === 0 && securityReview?.ok === true;
  const status = publicOriginBlocked
    ? "blocked_by_public_origin"
    : exposureBlockers.length
      ? "blocked_by_exposure_findings"
      : "ready_for_pre_exposure_checks";

  return {
    key: "public_stack_pre_exposure_remediation",
    status,
    profile: "public-stack",
    public_exposure_ready: securityReviewReady,
    steps: [
      {
        key: "configure_public_origin",
        label: "Configure public origin",
        status: publicOriginBlocked ? "blocked" : "ready",
        owner_repo: "repos/platform",
        target_file: operatorNextAction?.target_file || "repos/platform/deploy/public-stack/.env",
        env_key: "PUBLIC_SITE_ADDRESS",
        current_value_class: operatorNextAction?.current_value_class || (publicOriginBlocked ? "invalid_or_missing" : "set"),
        manual_step:
          operatorNextAction?.manual_step ||
          "Set PUBLIC_SITE_ADDRESS to the real public HTTPS origin before exposing public-stack.",
        commands: operatorNextAction?.key === "configure_public_stack_public_origin" ? PUBLIC_ORIGIN_COMMANDS : []
      },
      {
        key: "rerun_security_review",
        label: "Rerun public-stack security review",
        status: publicOriginBlocked || exposureBlockers.length ? "next_after_blocker" : "ready",
        owner_repo: null,
        commands: [
          "corepack pnpm run selfhost:security-review -- --profile public-stack",
          "corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json"
        ],
        done_when: "secret hygiene, compose config, and public route contract are all green"
      },
      {
        key: "confirm_route_contract",
        label: "Confirm public route contract",
        status: routeContractReady ? "ready" : "blocked",
        owner_repo: "repos/platform",
        route_count: routes.length,
        route_ready_count: routeReadyCount,
        origin: routeContract?.origin || null,
        routes,
        commands: ["corepack pnpm run deployability:exposure"],
        done_when: "/healthz, /platform/healthz, /relay/healthz, /gateway/healthz, and /console/ routes are present"
      },
      {
        key: "run_operator_onboarding_check",
        label: "Run operator onboarding check",
        status: securityReviewReady ? "ready" : "pending_after_security_review",
        owner_repo: "repos/platform",
        commands: [
          "corepack pnpm run operator:onboarding:check",
          "corepack pnpm --silent run operator:onboarding:check -- --json"
        ],
        done_when: "console and gateway onboarding contract checks pass"
      },
      {
        key: "run_published_image_dry_run",
        label: "Run published-image dry-run smoke",
        status: securityReviewReady ? "ready_after_onboarding" : "pending_after_onboarding",
        owner_repo: null,
        commands: [
          "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
          "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json"
        ],
        done_when: "release candidate image wiring is reviewed without publishing or starting services"
      },
      {
        key: "export_public_stack_evidence",
        label: "Export public-stack evidence",
        status: securityReviewReady ? "ready_after_gate_evidence" : "pending_after_gate_evidence",
        owner_repo: null,
        commands: [
          "corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>",
          "corepack pnpm run deployability:evidence -- --profile public-stack"
        ],
        done_when: "handoff/evidence bundle is safe to share without secrets"
      }
    ],
    guardrails: [
      "do not start or expose public-stack while PUBLIC_SITE_ADDRESS is localhost or any exposure blocker remains",
      "rerun the public-stack security review after changing public-stack .env",
      "keep onboarding check, published-image dry-run, and evidence export visible before any public exposure claim",
      "do not print secret values in remediation JSON"
    ],
    machine_payloads: REMEDIATION_MACHINE_PAYLOADS
  };
}

function exposureData() {
  const gatesResult = runNodeScript("tools/deployability-gates.mjs", ["--json"]);
  const securityResult = runNodeScript("tools/selfhost-kit.mjs", ["security-review", "--profile", "public-stack", "--json"]);
  const gates = gatesResult.body || null;
  const securityReview = securityResult.body || null;
  const blockers = unique([sourceBlocker("gates", gatesResult), sourceBlocker("security-review", securityResult)].filter(Boolean));
  const exposureBlockers = unique(securityReview?.blockers || []);
  const warnings = unique([...(gates?.warnings || []), ...(securityReview?.warnings || [])]);
  const gate = publicGate(gates);
  const operatorNextAction = buildOperatorNextAction({ exposureBlockers });
  const preExposureRemediationPlan = buildPreExposureRemediationPlan({
    exposureBlockers,
    securityReview,
    operatorNextAction
  });

  return {
    command: "deployability:exposure",
    mode: "public_exposure_review",
    ok: blockers.length === 0,
    current_bundle: gates?.current_bundle || null,
    profile: {
      key: "public_stack",
      name: "public-stack"
    },
    summary: summarize({ exposureBlockers, securityReview, warnings }),
    exposure_blockers: exposureBlockers,
    operator_next_action: operatorNextAction,
    pre_exposure_remediation_plan: preExposureRemediationPlan,
    gate,
    security_review: securityReview
      ? {
          command: securityReview.command,
          profile: securityReview.profile,
          ok: securityReview.ok,
          secret_hygiene: securityReview.secret_hygiene || [],
          compose_config: securityReview.compose_config || null,
          public_route_contract: securityReview.public_route_contract || null,
          operational_prerequisites: securityReview.operational_prerequisites || [],
          notes: securityReview.notes || []
        }
      : null,
    blockers,
    warnings,
    primary_next_commands: PRIMARY_NEXT_COMMANDS,
    machine_payloads: MACHINE_PAYLOADS,
    source_status: {
      gates: {
        ok: gatesResult.ok && gates?.ok !== false,
        exit_code: gatesResult.exit_code,
        stderr: gatesResult.stderr,
        parse_error: gatesResult.parse_error
      },
      security_review: {
        ok: securityResult.ok,
        exit_code: securityResult.exit_code,
        stderr: securityResult.stderr,
        parse_error: securityResult.parse_error
      }
    },
    safety_defaults: SAFETY_DEFAULTS,
    notes: [
      "use this when a management surface needs to explain why public-stack should or should not be exposed",
      "exposure blockers are expected gate findings and do not prevent this review payload from being emitted"
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
  console.log("Deployability public exposure");
  console.log("=============================");
  console.log("Non-destructive public-stack exposure review for operators and management surfaces.\n");
  console.log(`bundle=${data.current_bundle?.change_id || "unknown"}`);
  console.log(`status=${data.summary.status}`);
  console.log(`public_exposure_ready=${data.summary.public_exposure_ready}`);
  console.log(`origin=${data.security_review?.public_route_contract?.origin || "unknown"}\n`);

  if (data.exposure_blockers.length) {
    console.log("Exposure blockers:");
    for (const blocker of data.exposure_blockers) console.log(`- ${blocker}`);
    console.log("");
  }

  if (data.operator_next_action) {
    console.log(`Next action: ${data.operator_next_action.key} (${data.operator_next_action.status})`);
    if (data.operator_next_action.manual_step) console.log(`- ${data.operator_next_action.manual_step}`);
    if (data.operator_next_action.verify_command) console.log(`- verify: ${data.operator_next_action.verify_command}`);
    for (const guardrail of data.operator_next_action.guardrails || []) console.log(`- guardrail: ${guardrail}`);
    console.log("");
  }

  if (data.pre_exposure_remediation_plan) {
    console.log(`Pre-exposure remediation plan: ${data.pre_exposure_remediation_plan.status}`);
    for (const step of data.pre_exposure_remediation_plan.steps || []) {
      console.log(`- ${step.key}: ${step.status}`);
      for (const command of step.commands || []) console.log(`  command: ${command}`);
    }
    console.log("");
  }

  if (data.gate) {
    console.log(`Gate: ${data.gate.key} (${data.gate.status})`);
    for (const guardrail of data.gate.guardrails || []) console.log(`- guardrail: ${guardrail}`);
    console.log("");
  }

  console.log("Routes:");
  for (const route of data.security_review?.public_route_contract?.routes || []) {
    console.log(`- ${route.path} ${route.ok ? "ok" : "blocked"} ${route.url}`);
  }

  if (data.blockers.length) {
    console.log("\nScript blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }

  if (data.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of data.warnings) console.log(`- ${warning}`);
  }

  console.log("\nPrimary next commands:");
  for (const command of data.primary_next_commands) console.log(`- ${command}`);
}

const args = parseArgs(process.argv);
const data = exposureData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
process.exitCode = data.ok ? 0 : 1;
