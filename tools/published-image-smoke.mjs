#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const ROOT = process.cwd();
const DEFAULT_REGISTRY = "ghcr.io/hejiajiudeeyu";
const DEFAULT_TAG = "latest";
const PROFILE = "public-stack";
const PLATFORM_DIR = "repos/platform";
const COMPOSE_PATH = "repos/platform/deploy/public-stack/docker-compose.yml";
const PLATFORM_SMOKE_SCRIPT = "test:public-stack-smoke";

const RELEASE_IMAGES = [
  {
    service: "platform-api",
    image: "rsp-platform",
    role: "control-plane API image"
  },
  {
    service: "relay",
    image: "rsp-relay",
    role: "transport relay image"
  },
  {
    service: "platform-console-gateway",
    image: "rsp-gateway",
    role: "operator console gateway and static UI image"
  }
];

function usage() {
  console.log(`Usage: node tools/published-image-smoke.mjs <command> [--profile public-stack] [--image-registry registry] [--image-tag tag] [--dry-run] [--allow-skip] [--json]

Commands:
  plan   Print the published-image smoke contract and delegated platform command
  smoke  Run the platform public-stack smoke against published images

Default image registry: ${DEFAULT_REGISTRY}
Default image tag: ${DEFAULT_TAG}`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] || "help",
    profile: PROFILE,
    imageRegistry: process.env.IMAGE_REGISTRY || DEFAULT_REGISTRY,
    imageTag: process.env.IMAGE_TAG || DEFAULT_TAG,
    dryRun: false,
    allowSkip: false,
    json: false
  };

  for (let index = 3; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--") {
      continue;
    }
    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (value === "--allow-skip") {
      args.allowSkip = true;
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--profile") {
      args.profile = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--profile=")) {
      args.profile = value.slice("--profile=".length);
      continue;
    }
    if (value === "--image-registry") {
      args.imageRegistry = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--image-registry=")) {
      args.imageRegistry = value.slice("--image-registry=".length);
      continue;
    }
    if (value === "--image-tag") {
      args.imageTag = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--image-tag=")) {
      args.imageTag = value.slice("--image-tag=".length);
      continue;
    }
    throw new Error(`unknown option ${value}`);
  }

  if (args.profile !== PROFILE) {
    throw new Error(`unknown profile ${args.profile}; only ${PROFILE} is supported for published-image smoke`);
  }
  if (!args.imageRegistry) {
    throw new Error("--image-registry must not be empty");
  }
  if (!args.imageTag) {
    throw new Error("--image-tag must not be empty");
  }
  return args;
}

function expectedTemplate(imageName) {
  return `\${IMAGE_REGISTRY:-${DEFAULT_REGISTRY}}/${imageName}:\${IMAGE_TAG:-${DEFAULT_TAG}}`;
}

function resolvedRef(args, imageName) {
  return `${args.imageRegistry}/${imageName}:${args.imageTag}`;
}

function readCompose() {
  const composePath = path.join(ROOT, COMPOSE_PATH);
  if (!fs.existsSync(composePath)) {
    throw new Error(`${COMPOSE_PATH} missing`);
  }
  return YAML.parse(fs.readFileSync(composePath, "utf8"));
}

function validateComposeImages() {
  const compose = readCompose();
  const services = compose?.services || {};
  for (const releaseImage of RELEASE_IMAGES) {
    const actual = services[releaseImage.service]?.image;
    const expected = expectedTemplate(releaseImage.image);
    if (actual !== expected) {
      throw new Error(`${releaseImage.service} image must use IMAGE_REGISTRY and IMAGE_TAG (${expected})`);
    }
  }
}

function validatePlatformSmokeScript() {
  const packagePath = path.join(ROOT, PLATFORM_DIR, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new Error(`${PLATFORM_DIR}/package.json missing`);
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (!packageJson.scripts?.[PLATFORM_SMOKE_SCRIPT]) {
    throw new Error(`${PLATFORM_DIR}/package.json missing ${PLATFORM_SMOKE_SCRIPT}`);
  }
}

function smokeEnv(args) {
  return {
    COMPOSE_NO_BUILD: "true",
    IMAGE_REGISTRY: args.imageRegistry,
    IMAGE_TAG: args.imageTag,
    STRICT_COMPOSE_SMOKE: args.allowSkip ? "false" : "true"
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

function delegatedCommand() {
  return ["corepack", "pnpm", "--dir", PLATFORM_DIR, "run", PLATFORM_SMOKE_SCRIPT];
}

function printableCommand(args) {
  const env = smokeEnv(args);
  const prefix = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  return [...prefix, ...delegatedCommand()].join(" ");
}

function printImageSummary(args) {
  console.log("Images:");
  for (const releaseImage of RELEASE_IMAGES) {
    console.log(`- ${releaseImage.image}: ${resolvedRef(args, releaseImage.image)} (${releaseImage.role})`);
  }
}

function planData(args) {
  validateComposeImages();
  validatePlatformSmokeScript();
  return {
    command: "published-image:plan",
    ok: true,
    profile: args.profile,
    compose: COMPOSE_PATH,
    platform_smoke: `${PLATFORM_DIR}#${PLATFORM_SMOKE_SCRIPT}`,
    images: RELEASE_IMAGES.map((releaseImage) => ({
      service: releaseImage.service,
      image: releaseImage.image,
      role: releaseImage.role,
      template: expectedTemplate(releaseImage.image),
      ref: resolvedRef(args, releaseImage.image)
    })),
    env: smokeEnv(args),
    delegated_command: printableCommand(args),
    notes: [
      "validates public-stack image templates before running smoke",
      "uses COMPOSE_NO_BUILD=true so platform smoke pulls published images",
      "uses strict Docker smoke by default; pass --allow-skip only for local plan-style probes",
      "does not print secret env values"
    ]
  };
}

function printPlan(args) {
  const data = planData(args);
  console.log(`[published-image:plan] profile=${args.profile}`);
  console.log(`compose=${data.compose}`);
  console.log(`platform_smoke=${data.platform_smoke}`);
  printImageSummary(args);
  console.log("\nDelegated command:");
  console.log(data.delegated_command);
  console.log("\nSafety:");
  console.log("- validates public-stack image templates before running smoke");
  console.log("- uses COMPOSE_NO_BUILD=true so platform smoke pulls published images");
  console.log("- uses strict Docker smoke by default; pass --allow-skip only for local plan-style probes");
  console.log("- prints only registry/tag and command shape, not secret env values");
}

function runSmoke(args) {
  validateComposeImages();
  validatePlatformSmokeScript();
  console.log(`[published-image:smoke] profile=${args.profile}`);
  printImageSummary(args);
  const line = printableCommand(args);
  if (args.dryRun) {
    console.log(`[dry-run] ${line}`);
    return 0;
  }
  console.log(`[published-image:smoke] ${line}`);
  const [command, ...commandArgs] = delegatedCommand();
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ...smokeEnv(args)
    }
  });
  return result.status || (result.signal ? 1 : 0);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    usage();
    return 0;
  }
  if (args.command === "plan") {
    if (args.json) {
      printJson(planData(args));
      return 0;
    }
    printPlan(args);
    return 0;
  }
  if (args.command === "smoke") {
    return runSmoke(args);
  }
  throw new Error(`unknown command ${args.command}`);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[published-image-smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
