#!/usr/bin/env node

const MATRIX = [
  {
    command: "corepack pnpm run deployability:overview",
    json_command: "corepack pnpm --silent run deployability:overview -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "first command map for deployment paths"
  },
  {
    command: "corepack pnpm run deployability:quickstart",
    json_command: "corepack pnpm --silent run deployability:quickstart -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "fresh-checkout first-use guide"
  },
  {
    command: "corepack pnpm run deployability:safety",
    json_command: "corepack pnpm --silent run deployability:safety -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "read-only safety posture matrix for deployability commands"
  },
  {
    command: "corepack pnpm run deployability:doctor",
    json_command: "corepack pnpm --silent run deployability:doctor -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "read-only readiness snapshot for compatibility, scripts, docs, brand-site, and safety contract alignment"
  },
  {
    command: "corepack pnpm run deployability:dashboard",
    json_command: "corepack pnpm --silent run deployability:dashboard -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "single read-only JSON payload for top-level deployability dashboards and CI"
  },
  {
    command: "corepack pnpm run deployability:commands",
    json_command: "corepack pnpm --silent run deployability:commands -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "read-only searchable command catalog with safety posture and first-use context"
  },
  {
    command: "corepack pnpm run compat:status",
    json_command: "corepack pnpm --silent run compat:status -- --json",
    category: "top_level",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "compatibility ledger and worktree warning snapshot"
  },
  {
    command: "corepack pnpm run deployability:handoff",
    json_command: "corepack pnpm --silent run deployability:handoff -- --json",
    category: "top_level",
    posture: "writes_report",
    reads_env: false,
    writes_files: true,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "writes a non-secret Markdown report under exports/deployability unless --output is provided"
  },
  {
    command: "corepack pnpm run dev:local:plan",
    json_command: "corepack pnpm --silent run dev:local:plan -- --json",
    category: "local_agent_loop",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "describes local loop startup without starting services"
  },
  {
    command: "corepack pnpm run dev:local:up",
    json_command: "corepack pnpm --silent run dev:local:up -- --json",
    category: "local_agent_loop",
    posture: "starts_local_services",
    reads_env: true,
    writes_files: true,
    starts_services: true,
    stops_services: false,
    calls_docker: true,
    probes_network: true,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "starts platform profile plus managed relay/supervisor; JSON omits child command stdout"
  },
  {
    command: "corepack pnpm run dev:local:logs",
    json_command: "corepack pnpm --silent run dev:local:logs -- --json",
    category: "local_agent_loop",
    posture: "private_logs",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "text mode may print local runtime logs; JSON reports log metadata only"
  },
  {
    command: "corepack pnpm run selfhost:profiles",
    json_command: "corepack pnpm --silent run selfhost:profiles -- --json",
    category: "selfhost",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "profile selector data without reading secrets"
  },
  {
    command: "corepack pnpm run selfhost:init",
    json_command: "corepack pnpm --silent run selfhost:init -- --json",
    category: "selfhost",
    posture: "writes_env",
    reads_env: true,
    writes_files: true,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "creates or hardens .env without printing generated secret values"
  },
  {
    command: "corepack pnpm run selfhost:preflight",
    json_command: "corepack pnpm --silent run selfhost:preflight -- --json",
    category: "selfhost",
    posture: "preflight_gate",
    reads_env: true,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: true,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "checks secret hygiene, compose config, and route contracts before startup"
  },
  {
    command: "corepack pnpm run selfhost:readiness",
    json_command: "corepack pnpm --silent run selfhost:readiness -- --json",
    category: "selfhost",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "read-only selected-profile readiness summary before startup"
  },
  {
    command: "corepack pnpm run selfhost:ports",
    json_command: "corepack pnpm --silent run selfhost:ports -- --json",
    category: "selfhost",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "declared host-port inventory without binding sockets"
  },
  {
    command: "corepack pnpm run selfhost:up",
    json_command: "corepack pnpm --silent run selfhost:up -- --json",
    category: "selfhost",
    posture: "starts_services",
    reads_env: true,
    writes_files: true,
    starts_services: true,
    stops_services: false,
    calls_docker: true,
    probes_network: false,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "runs init/preflight/compose up; JSON omits command stdout"
  },
  {
    command: "corepack pnpm run selfhost:smoke",
    json_command: "corepack pnpm --silent run selfhost:smoke -- --json",
    category: "selfhost",
    posture: "runtime_acceptance",
    reads_env: true,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: true,
    probes_network: true,
    private_terminal_text: false,
    public_exposure_gate: true,
    ci_safe: true,
    dashboard_safe: true,
    notes: "post-start acceptance checks for secret hygiene, compose config, routes, and health endpoints"
  },
  {
    command: "corepack pnpm run selfhost:status",
    json_command: "corepack pnpm --silent run selfhost:status -- --json",
    category: "selfhost",
    posture: "runtime_snapshot",
    reads_env: true,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: true,
    probes_network: true,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "reads runtime state and health endpoints after startup"
  },
  {
    command: "corepack pnpm run selfhost:logs",
    json_command: "corepack pnpm --silent run selfhost:logs -- --json",
    category: "selfhost",
    posture: "private_logs",
    reads_env: true,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: true,
    probes_network: false,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "text mode may print application logs; JSON reports command metadata only"
  },
  {
    command: "corepack pnpm run selfhost:down",
    json_command: "corepack pnpm --silent run selfhost:down -- --json",
    category: "selfhost",
    posture: "stops_services",
    reads_env: true,
    writes_files: true,
    starts_services: false,
    stops_services: true,
    calls_docker: true,
    probes_network: false,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "stops selected compose profile; JSON omits compose stdout"
  },
  {
    command: "corepack pnpm run selfhost:security-review",
    json_command: "corepack pnpm --silent run selfhost:security-review -- --json",
    category: "public_stack",
    posture: "public_exposure_gate",
    reads_env: true,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: true,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: true,
    ci_safe: true,
    dashboard_safe: true,
    notes: "non-destructive review before public exposure"
  },
  {
    command: "corepack pnpm run selfhost:audit-export",
    json_command: "corepack pnpm --silent run selfhost:audit-export -- --json",
    category: "selfhost",
    posture: "exports_evidence",
    reads_env: true,
    writes_files: true,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: true,
    private_terminal_text: true,
    public_exposure_gate: false,
    ci_safe: false,
    dashboard_safe: true,
    notes: "calls the platform admin audit endpoint and writes a local artifact without printing admin keys"
  },
  {
    command: "corepack pnpm run operator:onboarding:plan",
    json_command: "corepack pnpm --silent run operator:onboarding:plan -- --json",
    category: "operator_onboarding",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "public-stack first-use plan without reading secrets"
  },
  {
    command: "corepack pnpm run operator:onboarding:check",
    json_command: "corepack pnpm --silent run operator:onboarding:check -- --json",
    category: "operator_onboarding",
    posture: "contract_check",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "checks public-stack, docs, runbook, and brand-site onboarding alignment"
  },
  {
    command: "corepack pnpm run test:operator-onboarding",
    json_command: null,
    category: "operator_onboarding",
    posture: "contract_test",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: false,
    notes: "unit-style onboarding contract test for CI, not a dashboard data source"
  },
  {
    command: "corepack pnpm run published-image:plan",
    json_command: "corepack pnpm --silent run published-image:plan -- --json",
    category: "release_review",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "release-image review plan without starting Docker"
  },
  {
    command: "corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>",
    json_command: "corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json",
    category: "release_review",
    posture: "read_only",
    reads_env: false,
    writes_files: false,
    starts_services: false,
    stops_services: false,
    calls_docker: false,
    probes_network: false,
    private_terminal_text: false,
    public_exposure_gate: false,
    ci_safe: true,
    dashboard_safe: true,
    notes: "dry-run reports delegated smoke metadata without starting Docker"
  }
];

const SAFETY_DEFAULTS = [
  "safety matrix is read-only and does not read .env files",
  "safety matrix does not call Docker, bind ports, or probe network endpoints",
  "JSON output contains descriptive command posture metadata only",
  "profile-specific doctor, preflight, status, smoke, and audit commands remain authoritative for runtime safety"
];

const NEXT_COMMANDS = [
  "corepack pnpm run deployability:quickstart",
  "corepack pnpm run deployability:overview",
  "corepack pnpm run deployability:dashboard",
  "corepack pnpm run deployability:commands",
  "corepack pnpm run selfhost:security-review -- --profile public-stack",
  "corepack pnpm run deployability:handoff"
];

function parseArgs(argv) {
  return {
    json: argv.slice(2).includes("--json")
  };
}

function safetyData() {
  return {
    command: "deployability:safety",
    ok: true,
    matrix: MATRIX,
    safety_defaults: SAFETY_DEFAULTS,
    next_commands: NEXT_COMMANDS,
    notes: [
      "matrix is descriptive; it does not execute or validate the listed commands",
      "use JSON forms for dashboards and CI when available, and keep private terminal text out of public artifacts"
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

function flagList(item) {
  const flags = [];
  if (item.reads_env) flags.push("reads-env");
  if (item.writes_files) flags.push("writes-files");
  if (item.starts_services) flags.push("starts-services");
  if (item.stops_services) flags.push("stops-services");
  if (item.calls_docker) flags.push("calls-docker");
  if (item.probes_network) flags.push("probes-network");
  if (item.private_terminal_text) flags.push("private-terminal-text");
  if (item.public_exposure_gate) flags.push("public-exposure-gate");
  if (item.ci_safe) flags.push("ci-safe");
  if (item.dashboard_safe) flags.push("dashboard-safe");
  return flags.length ? flags.join(", ") : "read-only";
}

function printText(data) {
  console.log("Deployability safety matrix");
  console.log("===========================");
  console.log("Read-only posture map for deployment and management commands.\n");

  for (const item of data.matrix) {
    console.log(`## ${item.command}`);
    console.log(`posture=${item.posture} category=${item.category}`);
    console.log(`flags=${flagList(item)}`);
    console.log(`JSON=${item.json_command}`);
    console.log(`note=${item.notes}`);
    console.log("");
  }

  console.log("Safety defaults:");
  for (const note of data.safety_defaults) {
    console.log(`- ${note}`);
  }

  console.log("\nNext commands:");
  for (const command of data.next_commands) {
    console.log(`- ${command}`);
  }
}

const args = parseArgs(process.argv);
const data = safetyData();
if (args.json) {
  printJson(data);
} else {
  printText(data);
}
