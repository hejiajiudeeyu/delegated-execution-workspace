function commandCatalog(commands) {
  return commands || [];
}

function hasCommand(commands, command) {
  return commandCatalog(commands).some((item) => item.command === command || item.json_command === command);
}

function readinessCheck(key, label, evidence, ok, nextCommands = []) {
  return {
    key,
    label,
    ok,
    evidence,
    next_commands: nextCommands
  };
}

export function buildEcosystemReadiness({ catalogCommands, brandSiteOk = true } = {}) {
  const checks = [
    readinessCheck(
      "profile_choice",
      "operator can choose a named deployment profile",
      [
        "corepack pnpm run deployability:overview",
        "corepack pnpm run selfhost:profiles",
        "corepack pnpm run selfhost:quickstart"
      ],
      hasCommand(catalogCommands, "corepack pnpm run deployability:overview") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:profiles") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:quickstart"),
      ["corepack pnpm run selfhost:profiles", "corepack pnpm run selfhost:quickstart"]
    ),
    readinessCheck(
      "secret_generation",
      "operator can generate or harden local secrets without printing values",
      ["corepack pnpm run selfhost:init", "corepack pnpm --silent run selfhost:init -- --json"],
      hasCommand(catalogCommands, "corepack pnpm run selfhost:init") &&
        hasCommand(catalogCommands, "corepack pnpm --silent run selfhost:init -- --json"),
      ["corepack pnpm run selfhost:init"]
    ),
    readinessCheck(
      "startup_path",
      "operator can start the selected profile through documented lifecycle commands",
      [
        "corepack pnpm run dev:local:up",
        "corepack pnpm run selfhost:up",
        "corepack pnpm run selfhost:up -- --profile public-stack"
      ],
      hasCommand(catalogCommands, "corepack pnpm run dev:local:up") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:up") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:up -- --profile public-stack"),
      ["corepack pnpm run dev:local:up", "corepack pnpm run selfhost:up"]
    ),
    readinessCheck(
      "doctor_path",
      "operator can run doctor/readiness commands before claiming readiness",
      ["corepack pnpm run deployability:doctor", "corepack pnpm run dev:doctor", "corepack pnpm run selfhost:doctor"],
      hasCommand(catalogCommands, "corepack pnpm run deployability:doctor") &&
        hasCommand(catalogCommands, "corepack pnpm run dev:doctor") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:doctor"),
      ["corepack pnpm run deployability:doctor", "corepack pnpm run selfhost:readiness"]
    ),
    readinessCheck(
      "runtime_inspection",
      "operator can inspect logs and runtime state from one command surface",
      [
        "corepack pnpm run dev:local:status",
        "corepack pnpm run dev:local:logs",
        "corepack pnpm run selfhost:status",
        "corepack pnpm run selfhost:logs"
      ],
      hasCommand(catalogCommands, "corepack pnpm run dev:local:status") &&
        hasCommand(catalogCommands, "corepack pnpm run dev:local:logs") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:status") &&
        hasCommand(catalogCommands, "corepack pnpm run selfhost:logs"),
      ["corepack pnpm run dev:local:status", "corepack pnpm run selfhost:status"]
    ),
    readinessCheck(
      "boundary_understanding",
      "operator can understand local/public, metadata, secret, and safety boundaries",
      [
        "corepack pnpm run deployability:safety",
        "corepack pnpm run deployability:commands",
        "corepack pnpm run deployability:handoff",
        "corepack pnpm run compat:status"
      ],
      hasCommand(catalogCommands, "corepack pnpm run deployability:safety") &&
        hasCommand(catalogCommands, "corepack pnpm run deployability:commands") &&
        hasCommand(catalogCommands, "corepack pnpm run compat:status"),
      ["corepack pnpm run deployability:safety", "corepack pnpm run deployability:handoff"]
    ),
    readinessCheck(
      "brand_site_story",
      "operator can find the same deployment story on the public brand site",
      [
        "repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx",
        "repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx",
        "npm run smoke:deployability-content"
      ],
      Boolean(brandSiteOk),
      ["corepack pnpm run deployability:doctor"]
    )
  ];
  return {
    goal: "daily-deployable",
    status: checks.every((item) => item.ok) ? "daily_deployable_with_safety_gates" : "blocked",
    checks,
    safety_notes: [
      "public-stack remains ready-now with safety gates, not automatically public-exposure ready",
      "billing, email transport, and marketplace production readiness stay outside this scorecard until their own gates pass"
    ]
  };
}
