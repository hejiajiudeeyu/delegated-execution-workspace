import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const platformRoot = path.join(ROOT, "repos/platform");
const localDockerPackagesDir = path.join(platformRoot, ".docker-local-packages");
const localProtocolContractsDir = path.join(ROOT, "repos/protocol/packages/contracts");

const PRICE_CENTS = Number(process.env.PAID_CALL_E2E_PRICE_CENTS || 500);
const RECHARGE_CENTS = Number(process.env.PAID_CALL_E2E_RECHARGE_CENTS || 1200);
const EXPECTED_FINAL_BALANCE_CENTS = RECHARGE_CENTS - PRICE_CENTS;
const ADMIN_KEY = process.env.PLATFORM_ADMIN_API_KEY || `sk_admin_paid_${crypto.randomBytes(12).toString("hex")}`;
const PLATFORM_BASE_URL = process.env.PAID_CALL_E2E_PLATFORM_BASE_URL || "http://127.0.0.1:8080";

const assertions = [];

function assertThat(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  assertions.push({ name, status, detail });
  const prefix = condition ? "[ok]" : "[fail]";
  const suffix = detail ? `: ${detail}` : "";
  console.log(`  ${prefix} ${name}${suffix}`);
  return condition;
}

function printSummary() {
  const passed = assertions.filter((item) => item.status === "PASS").length;
  const failed = assertions.filter((item) => item.status === "FAIL").length;
  console.log(`\nAssertions: ${passed} passed / ${failed} failed / ${assertions.length} total`);
  if (failed) {
    for (const item of assertions.filter((entry) => entry.status === "FAIL")) {
      console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
    }
  }
  return failed === 0;
}

function run(cwd, command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8"
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed${output ? `\n${output}` : ""}`);
  }
  return result.stdout.trim();
}

function cleanupLocalDockerPackages() {
  if (!fs.existsSync(localDockerPackagesDir)) {
    return;
  }
  for (const entry of fs.readdirSync(localDockerPackagesDir)) {
    if (entry.endsWith(".tgz")) {
      fs.rmSync(path.join(localDockerPackagesDir, entry), { force: true });
    }
  }
}

function stageLocalDockerPackages() {
  cleanupLocalDockerPackages();
  fs.mkdirSync(localDockerPackagesDir, { recursive: true });

  const manifestPath = path.join(localProtocolContractsDir, "package.json");
  if (!fs.existsSync(manifestPath)) {
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.name !== "@delexec/contracts") {
    throw new Error(`local_contracts_package_name_mismatch:${manifest.name || "missing"}`);
  }
  const output = run(ROOT, "npm", ["pack", localProtocolContractsDir, "--pack-destination", localDockerPackagesDir]);
  const tarballName = output.trim().split("\n").filter(Boolean).at(-1);
  if (!tarballName) {
    throw new Error("local_contracts_pack_missing_tarball");
  }
  console.log(`[paid-call-e2e] staged local package @delexec/contracts ${tarballName}`);
}

function composeArgs(projectName, envFile, overrideFile) {
  return [
    "compose",
    "-p",
    projectName,
    "-f",
    "deploy/platform/docker-compose.yml",
    "-f",
    overrideFile,
    "--env-file",
    envFile
  ];
}

function writePlatformEnv(tempDir) {
  const envFile = path.join(tempDir, "platform.env");
  const overrideFile = path.join(tempDir, "billing-enforced.override.yml");
  fs.writeFileSync(
    envFile,
    [
      "IMAGE_REGISTRY=ghcr.io/hejiajiudeeyu",
      "IMAGE_TAG=latest",
      "PORT=8080",
      "POSTGRES_PORT=15432",
      "POSTGRES_DB=croc",
      "POSTGRES_USER=croc",
      "POSTGRES_PASSWORD=croc",
      "DATABASE_URL=postgresql://croc:croc@postgres:5432/croc",
      `TOKEN_SECRET=${crypto.randomBytes(32).toString("hex")}`,
      "TOKEN_TTL_SECONDS=300",
      `PLATFORM_ADMIN_API_KEY=${ADMIN_KEY}`,
      "TRANSPORT_BASE_URL=",
      "REVIEW_TRANSPORT_BASE_URL=",
      "ENABLE_BOOTSTRAP_RESPONDERS=false",
      "BOOTSTRAP_RESPONDER_ID=",
      "BOOTSTRAP_HOTLINE_ID=",
      "BOOTSTRAP_TASK_DELIVERY_ADDRESS=",
      "BOOTSTRAP_RESPONDER_API_KEY=",
      "BOOTSTRAP_RESPONDER_PUBLIC_KEY_PEM=",
      "BOOTSTRAP_RESPONDER_PRIVATE_KEY_PEM="
    ].join("\n") + "\n",
    "utf8"
  );
  fs.writeFileSync(
    overrideFile,
    ["services:", "  platform-api:", "    environment:", "      BILLING_ENFORCEMENT: enforced"].join("\n") + "\n",
    "utf8"
  );
  return { envFile, overrideFile };
}

async function waitFor(url, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function startPlatformIfNeeded() {
  if (process.env.PAID_CALL_E2E_PLATFORM_BASE_URL) {
    return { cleanup: async () => {} };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paid-call-e2e-"));
  const projectName = `paid-call-e2e-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const { envFile, overrideFile } = writePlatformEnv(tempDir);
  const args = composeArgs(projectName, envFile, overrideFile);

  try {
    stageLocalDockerPackages();
    try {
      run(platformRoot, "docker", [...args, "down", "-v", "--remove-orphans"]);
    } catch {
      // best effort pre-clean
    }
    run(platformRoot, "docker", [...args, "up", "-d", "--build"]);
    await waitFor(`${PLATFORM_BASE_URL}/healthz`);
    return {
      cleanup: async () => {
        try {
          run(platformRoot, "docker", [...args, "down", "-v", "--remove-orphans"]);
        } finally {
          cleanupLocalDockerPackages();
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    };
  } catch (error) {
    try {
      run(platformRoot, "docker", [...args, "down", "-v", "--remove-orphans"]);
    } catch {}
    cleanupLocalDockerPackages();
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function jsonRequest(pathname, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(new URL(pathname, PLATFORM_BASE_URL), {
    method,
    headers: body === undefined ? headers : { ...headers, "content-type": "application/json; charset=utf-8" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }
  return { status: response.status, body: parsed };
}

function auth(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

function requireStatus(name, response, expectedStatus) {
  return assertThat(name, response.status === expectedStatus, `status=${response.status} expected=${expectedStatus}`);
}

function pricingHint() {
  return {
    pricing_model: "fixed_price",
    currency: "PTS",
    fixed_price_cents: PRICE_CENTS,
    base_price_cents: null,
    variable_unit: null,
    variable_unit_description: null,
    variable_unit_price_cents: null,
    max_total_cents: PRICE_CENTS,
    free_tier: null,
    billing_disclosure_url: "https://callanything.xyz/marketplace/responders/paid-e2e",
    trust_tier: "untrusted"
  };
}

function billingConsent() {
  return {
    acknowledged: true,
    pricing_model: "fixed_price",
    currency: "PTS",
    max_charge_cents: PRICE_CENTS,
    consent_at: new Date().toISOString(),
    trust_tier_seen: "untrusted"
  };
}

function publicKeyPem() {
  return crypto.generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
}

async function runScenario() {
  await waitFor(`${PLATFORM_BASE_URL}/healthz`);

  const owner = await jsonRequest("/v1/users/register", {
    method: "POST",
    body: { contact_email: `paid-owner-${Date.now()}@test.local` }
  });
  requireStatus("owner_registered", owner, 201);

  const submitted = await jsonRequest("/v2/hotlines", {
    method: "POST",
    headers: auth(owner.body.api_key),
    body: {
      responder_id: "responder_paid_e2e",
      hotline_id: "paid.echo.e2e.v1",
      display_name: "Paid Echo E2E",
      responder_public_key_pem: publicKeyPem(),
      task_types: ["paid_echo"],
      capabilities: ["paid.echo"],
      tags: ["billing", "e2e"],
      input_schema: {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string" } },
        additionalProperties: false
      },
      output_schema: {
        type: "object",
        required: ["echo"],
        properties: { echo: { type: "string" } },
        additionalProperties: false
      },
      pricing_hint: pricingHint()
    }
  });
  requireStatus("paid_hotline_submitted", submitted, 201);
  const responderApiKey = submitted.body?.api_key || submitted.body?.responder_api_key;

  requireStatus(
    "hotline_approved",
    await jsonRequest("/v2/admin/hotlines/paid.echo.e2e.v1/approve", {
      method: "POST",
      headers: auth(ADMIN_KEY),
      body: { reason: "paid-call e2e" }
    }),
    200
  );
  requireStatus(
    "responder_approved",
    await jsonRequest("/v2/admin/responders/responder_paid_e2e/approve", {
      method: "POST",
      headers: auth(ADMIN_KEY),
      body: { reason: "paid-call e2e" }
    }),
    200
  );

  const detail = await jsonRequest("/v1/catalog/hotlines/paid.echo.e2e.v1");
  requireStatus("paid_hotline_public_detail", detail, 200);
  assertThat("pricing_hint_visible", detail.body?.pricing_hint?.fixed_price_cents === PRICE_CENTS);

  const caller = await jsonRequest("/v1/users/register", {
    method: "POST",
    body: { contact_email: `paid-caller-${Date.now()}@test.local` }
  });
  requireStatus("caller_registered", caller, 201);

  requireStatus(
    "billing_tenant_created",
    await jsonRequest("/v1/admin/billing/tenants", {
      method: "POST",
      headers: auth(ADMIN_KEY),
      body: { tenant_id: caller.body.user_id }
    }),
    201
  );

  const insufficient = await jsonRequest("/v1/tokens/task", {
    method: "POST",
    headers: auth(caller.body.api_key),
    body: {
      request_id: "req_paid_call_insufficient",
      responder_id: "responder_paid_e2e",
      hotline_id: "paid.echo.e2e.v1",
      billing: billingConsent()
    }
  });
  assertThat(
    "insufficient_balance_rejected",
    insufficient.status === 402 && insufficient.body?.error?.code === "ERR_PREPAID_BALANCE_INSUFFICIENT",
    `status=${insufficient.status} code=${insufficient.body?.error?.code || "n/a"}`
  );

  requireStatus(
    "manual_recharge_recorded",
    await jsonRequest(`/v1/admin/billing/tenants/${encodeURIComponent(caller.body.user_id)}/recharges`, {
      method: "POST",
      headers: auth(ADMIN_KEY),
      body: {
        recharge_id: `rch_paid_call_${Date.now()}`,
        amount_cents: RECHARGE_CENTS,
        currency: "PTS",
        provider: "manual",
        external_reference: "paid-call-e2e"
      }
    }),
    201
  );

  requireStatus(
    "paid_token_issued_after_recharge",
    await jsonRequest("/v1/tokens/task", {
      method: "POST",
      headers: auth(caller.body.api_key),
      body: {
        request_id: "req_paid_call_success",
        responder_id: "responder_paid_e2e",
        hotline_id: "paid.echo.e2e.v1",
        billing: billingConsent()
      }
    }),
    201
  );

  requireStatus(
    "paid_call_completed",
    await jsonRequest("/v1/requests/req_paid_call_success/events", {
      method: "POST",
      headers: auth(responderApiKey),
      body: {
        responder_id: "responder_paid_e2e",
        hotline_id: "paid.echo.e2e.v1",
        event_type: "COMPLETED",
        status: "ok",
        usage: {
          pricing_model: "fixed_price",
          total_cents: PRICE_CENTS
        }
      }
    }),
    202
  );

  const postSuccessBalance = await jsonRequest("/v1/tenants/me/balance", {
    headers: auth(caller.body.api_key)
  });
  requireStatus("post_success_balance_loaded", postSuccessBalance, 200);
  assertThat(
    `post_success_balance_${EXPECTED_FINAL_BALANCE_CENTS}_cents`,
    postSuccessBalance.body?.balance?.credit_balance_cents === EXPECTED_FINAL_BALANCE_CENTS,
    `balance=${postSuccessBalance.body?.balance?.credit_balance_cents}`
  );

  requireStatus(
    "failed_call_token_issued",
    await jsonRequest("/v1/tokens/task", {
      method: "POST",
      headers: auth(caller.body.api_key),
      body: {
        request_id: "req_paid_call_failed",
        responder_id: "responder_paid_e2e",
        hotline_id: "paid.echo.e2e.v1",
        billing: billingConsent()
      }
    }),
    201
  );
  requireStatus(
    "failed_call_reported",
    await jsonRequest("/v1/requests/req_paid_call_failed/events", {
      method: "POST",
      headers: auth(responderApiKey),
      body: {
        responder_id: "responder_paid_e2e",
        hotline_id: "paid.echo.e2e.v1",
        event_type: "FAILED",
        status: "error",
        error_code: "EXEC_TEST_FAILURE"
      }
    }),
    202
  );

  const afterFailedBalance = await jsonRequest("/v1/tenants/me/balance", {
    headers: auth(caller.body.api_key)
  });
  requireStatus("failed_call_balance_loaded", afterFailedBalance, 200);
  assertThat(
    `failed_call_refunded_to_${EXPECTED_FINAL_BALANCE_CENTS}_cents`,
    afterFailedBalance.body?.balance?.credit_balance_cents === EXPECTED_FINAL_BALANCE_CENTS,
    `balance=${afterFailedBalance.body?.balance?.credit_balance_cents}`
  );

  const ledger = await jsonRequest("/v1/tenants/me/ledger?limit=20", {
    headers: auth(caller.body.api_key)
  });
  requireStatus("caller_ledger_loaded", ledger, 200);
  const kinds = new Set((ledger.body?.items || []).map((item) => item.kind));
  assertThat(
    "ledger_contains_recharge_hold_debit_refund",
    ["recharge", "hold", "debit", "refund"].every((kind) => kinds.has(kind)),
    `kinds=${Array.from(kinds).sort().join(",")}`
  );
}

console.log("=".repeat(72));
console.log("Paid call e2e");
console.log("=".repeat(72));
console.log(`platform=${PLATFORM_BASE_URL}`);
console.log(`price_cents=${PRICE_CENTS}`);
console.log(`recharge_cents=${RECHARGE_CENTS}`);

const platform = await startPlatformIfNeeded();
try {
  await runScenario();
} finally {
  await platform.cleanup();
}

if (!printSummary()) {
  process.exitCode = 1;
}
