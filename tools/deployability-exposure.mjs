#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

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

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
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

function exposureData() {
  const gatesResult = runNodeScript("tools/deployability-gates.mjs", ["--json"]);
  const securityResult = runNodeScript("tools/selfhost-kit.mjs", ["security-review", "--profile", "public-stack", "--json"]);
  const gates = gatesResult.body || null;
  const securityReview = securityResult.body || null;
  const blockers = unique([sourceBlocker("gates", gatesResult), sourceBlocker("security-review", securityResult)].filter(Boolean));
  const exposureBlockers = unique(securityReview?.blockers || []);
  const warnings = unique([...(gates?.warnings || []), ...(securityReview?.warnings || [])]);
  const gate = publicGate(gates);

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
