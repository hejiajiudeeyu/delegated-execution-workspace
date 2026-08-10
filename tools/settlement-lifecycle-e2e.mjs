// The M3 exit-criterion proof: accept, revision, auto-accept, dispute, settle
// and refund, each driven end to end against a real platform process with a
// real Postgres and billing enforcement on — plus the property the exit
// criterion names separately and which no single scenario demonstrates:
//
//   ZERO DUPLICATE MONEY EVENTS.
//
// That one is not asserted by reading a final balance. A balance that looks
// right can be reached by a debit and a refund that should never have happened,
// and the paths most likely to move money twice are precisely the ones nobody
// exercises: a replayed COMPLETED, a reconciliation arriving after a terminal
// state, an explicit acceptance racing the sweep that would have auto-accepted
// it. So every scenario ends by counting ledger rows per request_id, and the
// last phase actively REPLAYS those paths and asserts the counts do not move.
//
// Scope, stated honestly. This harness drives platform-api over HTTP from a
// separate process, which is what makes it end-to-end for the question it asks:
// money is decided entirely by platform-api, and every decision here arrives as
// an authenticated HTTP request from outside it. It does NOT run a relay or a
// real worker — tools/agent-callability-e2e.mjs covers that path, and adding it
// here would not make a settlement verdict more true, only slower.
//
// Usage: node tools/settlement-lifecycle-e2e.mjs
// Requires: Docker running. Exits non-zero on any failure.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const HOTLINE_ID = "test.settlement.parse.v1";
const RESPONDER_ID = "responder_settlement_e2e";
const PRICE_CENTS = 120;
const MAX_CHARGE_CENTS = 200;
const RECHARGE_CENTS = 2000;
const ADMIN_KEY = `sk_admin_settle_${crypto.randomBytes(8).toString("hex")}`;
const PG_CONTAINER = "settlement-lifecycle-e2e-pg";
const PG_PORT = Number(process.env.SETTLEMENT_E2E_PG_PORT || 55434);
const PLATFORM_PORT = 18085;
const PLATFORM_URL = `http://127.0.0.1:${PLATFORM_PORT}`;
// Short enough to wait out. Test-only, and it moves the TIMER alone: the
// protocol's 24h floor still governs what a contract may publish.
const ACCEPTANCE_WINDOW_OVERRIDE_S = 2;

const assertions = [];
const children = [];
const tempDirs = [];
let signingKey = null;
let callerAuth = null;
let responderAuth = null;
let adminAuth = null;
let callerId = null;

function assertThat(name, condition, detail = "") {
  assertions.push({ name, status: condition ? "PASS" : "FAIL", detail });
  console.log(`  [${condition ? "ok" : "fail"}] ${name}${detail ? `: ${detail}` : ""}`);
  return condition;
}

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `settle-e2e-${label}-`));
  tempDirs.push(dir);
  return dir;
}

async function jsonRequest(pathname, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${PLATFORM_URL}${pathname}`, {
    method,
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json; charset=utf-8" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function startChild(label, entry, env) {
  const child = spawn(process.execPath, [entry], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const logs = [];
  const capture = (chunk) => {
    logs.push(chunk.toString("utf8"));
    if (logs.length > 200) logs.shift();
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  children.push({ label, child, logs });
  return child;
}

async function waitFor(fn, { label, timeoutMs = 30000, intervalMs = 250 } = {}) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`timeout waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

function cleanup() {
  for (const { child } of children) {
    try {
      child.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
  spawnSync("docker", ["rm", "-f", PG_CONTAINER], { stdio: "ignore" });
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

// ---------------------------------------------------------------- the ledger
//
// The exit criterion says zero duplicate money events, so the harness has to be
// able to count them rather than infer them from a balance.

async function ledgerRows(requestId) {
  const response = await jsonRequest("/v1/tenants/me/ledger", { headers: callerAuth });
  const items = response.body?.ledger?.items || response.body?.items || [];
  return items.filter((item) => item.request_id === requestId);
}

async function ledgerCounts(requestId) {
  const rows = await ledgerRows(requestId);
  return rows.reduce((counts, row) => {
    counts[row.kind] = (counts[row.kind] || 0) + 1;
    return counts;
  }, {});
}

async function balance() {
  const response = await jsonRequest("/v1/tenants/me/balance", { headers: callerAuth });
  return response.body?.balance?.credit_balance_cents;
}

// ------------------------------------------------------------- call plumbing

function publishableContract() {
  return {
    input_schema: {
      type: "object",
      required: ["text"],
      additionalProperties: false,
      properties: { text: { type: "string" } }
    },
    output_schema: {
      type: "object",
      required: ["summary"],
      additionalProperties: false,
      properties: { summary: { type: "string" } }
    },
    input_examples: [{ title: "Basic", input: { text: "something to summarize" } }],
    output_examples: [{ title: "Basic", output: { summary: "a summary" } }],
    not_recommended_for: ["settlement lifecycle fixture: not for production traffic"],
    limitations: ["deterministic test output"],
    pricing_hint: {
      pricing_model: "fixed_price",
      currency: "PTS",
      fixed_price_cents: PRICE_CENTS,
      max_total_cents: PRICE_CENTS
    }
  };
}

function billingConsent() {
  return {
    acknowledged: true,
    pricing_model: "fixed_price",
    currency: "PTS",
    max_charge_cents: MAX_CHARGE_CENTS,
    consent_at: new Date().toISOString(),
    trust_tier_seen: "untrusted"
  };
}

function signedResult(requestId, hotlineVersion, output = { summary: "the extracted terms" }) {
  const payload = {
    message_type: "remote_hotline_result",
    request_id: requestId,
    result_version: "0.1.0",
    responder_id: RESPONDER_ID,
    hotline_id: HOTLINE_ID,
    hotline_version: hotlineVersion,
    status: "ok",
    output
  };
  const signature = crypto.sign(
    null,
    Buffer.from(JSON.stringify(canonicalize(payload)), "utf8"),
    signingKey
  );
  return { ...payload, signature_algorithm: "Ed25519", signature_base64: signature.toString("base64") };
}

// Kept in step with the protocol's canonical field list by importing it rather
// than restating it: a harness that signs over its own idea of the canonical
// form proves only that it agrees with itself.
let canonicalize = null;

async function issueCall(requestId) {
  const issued = await jsonRequest("/v1/tokens/task", {
    method: "POST",
    headers: callerAuth,
    body: {
      request_id: requestId,
      responder_id: RESPONDER_ID,
      hotline_id: HOTLINE_ID,
      billing: billingConsent()
    }
  });
  if (issued.status !== 201) {
    throw new Error(`token issue failed: ${JSON.stringify(issued.body)}`);
  }
  // FR-021: the budget is reserved when the responder takes the task on, not
  // when the caller asks. Every money scenario below is about a call a device
  // actually accepted.
  const acked = await jsonRequest(`/v1/requests/${requestId}/ack`, {
    method: "POST",
    headers: responderAuth,
    body: { responder_id: RESPONDER_ID, hotline_id: HOTLINE_ID }
  });
  if (acked.status !== 202) {
    throw new Error(`ack failed: ${JSON.stringify(acked.body)}`);
  }
  await jsonRequest(`/v1/requests/${requestId}/delivery-meta`, {
    method: "POST",
    headers: callerAuth,
    body: {
      responder_id: RESPONDER_ID,
      hotline_id: HOTLINE_ID,
      task_token: issued.body.task_token,
      result_delivery: { kind: "local", address: "local://settlement-e2e-caller" }
    }
  });
  const detail = await jsonRequest(`/v1/admin/requests/${requestId}`, { headers: adminAuth });
  return detail.body?.bound_version?.ref || detail.body?.hotline_version || null;
}

async function deliver(requestId, hotlineVersion, { output, attemptId } = {}) {
  const response = await jsonRequest(`/v1/requests/${requestId}/events`, {
    method: "POST",
    headers: responderAuth,
    body: {
      responder_id: RESPONDER_ID,
      hotline_id: HOTLINE_ID,
      event_type: "COMPLETED",
      status: "ok",
      ...(attemptId ? { attempt_id: attemptId } : {}),
      usage: { pricing_model: "fixed_price", total_cents: PRICE_CENTS },
      result_package: signedResult(requestId, hotlineVersion, output)
    }
  });
  return response;
}

async function axesFor(requestId) {
  const detail = await jsonRequest(`/v1/admin/requests/${requestId}`, { headers: adminAuth });
  return detail.body?.state || {};
}

async function main() {
  console.log("\n[phase] postgres");
  spawnSync("docker", ["rm", "-f", PG_CONTAINER], { stdio: "ignore" });
  const pg = spawnSync(
    "docker",
    [
      "run", "-d", "--name", PG_CONTAINER,
      "-e", "POSTGRES_USER=croc", "-e", "POSTGRES_PASSWORD=croc", "-e", "POSTGRES_DB=croc",
      "-p", `${PG_PORT}:5432`, "postgres:16-alpine"
    ],
    { encoding: "utf8" }
  );
  if (pg.status !== 0) {
    throw new Error(`docker run postgres failed: ${pg.stderr}`);
  }
  // `-h 127.0.0.1` forces TCP. Without it pg_isready answers on the unix socket
  // while the image is still initialising — it runs a temporary socket-only
  // server for initdb and then restarts — and the platform's first connection
  // is dropped mid-migration as ECONNRESET.
  await waitFor(
    () =>
      spawnSync("docker", ["exec", PG_CONTAINER, "pg_isready", "-U", "croc", "-h", "127.0.0.1"], {
        stdio: "ignore"
      }).status === 0,
    { label: "postgres ready" }
  );
  assertThat("postgres_ready", true);

  console.log("\n[phase] platform");
  startChild("platform", path.join(ROOT, "repos/platform/apps/platform-api/src/server.js"), {
    PORT: String(PLATFORM_PORT),
    TOKEN_SECRET: "settlement-e2e-token-secret",
    PLATFORM_ADMIN_API_KEY: ADMIN_KEY,
    DELEXEC_HOME: tempDir("platform-home"),
    DATABASE_URL: `postgresql://croc:croc@127.0.0.1:${PG_PORT}/croc`,
    BILLING_ENFORCEMENT: "enforced",
    ACCEPTANCE_WINDOW_OVERRIDE_S: String(ACCEPTANCE_WINDOW_OVERRIDE_S)
  });
  await waitFor(async () => (await jsonRequest("/healthz")).status === 200, { label: "platform up" });
  assertThat("platform_up_with_billing_enforced", true);

  // Imported from the protocol source in this workspace rather than by package
  // name: the fourth repo has no dependency on contracts of its own, and a
  // harness that signs over its own idea of the canonical form would prove
  // only that it agrees with itself.
  ({ canonicalizeResultPackageForSignature: canonicalize } = await import(
    path.join(ROOT, "repos/protocol/packages/contracts/src/index.js")
  ));

  console.log("\n[phase] provisioning (operator)");
  adminAuth = { Authorization: `Bearer ${ADMIN_KEY}` };

  const caller = await jsonRequest("/v1/users/register", {
    method: "POST",
    body: { contact_email: "settlement-e2e@selfhost.internal" }
  });
  callerAuth = { Authorization: `Bearer ${caller.body.api_key}` };
  callerId = caller.body.user_id;

  const keyPair = crypto.generateKeyPairSync("ed25519");
  signingKey = keyPair.privateKey;

  // /v2/responders/register rather than /v2/hotlines, because it is the route
  // that hands back the responder's own credential — and this harness has to
  // act as the responder, not merely describe one.
  const registered = await jsonRequest("/v2/responders/register", {
    method: "POST",
    headers: callerAuth,
    body: {
      responder_id: RESPONDER_ID,
      hotline_id: HOTLINE_ID,
      display_name: "Settlement lifecycle fixture",
      responder_public_key_pem: keyPair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      task_delivery_address: "local://settlement-e2e",
      task_types: ["parse"],
      ...publishableContract()
    }
  });
  if (registered.status !== 201) {
    throw new Error(`responder registration failed: ${JSON.stringify(registered.body)}`);
  }
  responderAuth = { Authorization: `Bearer ${registered.body?.api_key || registered.body?.responder_api_key}` };
  await jsonRequest(`/v2/admin/responders/${RESPONDER_ID}/approve`, {
    method: "POST",
    headers: adminAuth,
    body: { reason: "settlement lifecycle e2e" }
  });
  await jsonRequest(`/v2/admin/hotlines/${HOTLINE_ID}/approve`, {
    method: "POST",
    headers: adminAuth,
    body: { reason: "settlement lifecycle e2e" }
  });

  await jsonRequest("/v1/admin/billing/tenants", {
    method: "POST",
    headers: adminAuth,
    body: { tenant_id: callerId, display_name: "settlement e2e caller" }
  });
  await jsonRequest(`/v1/admin/billing/tenants/${callerId}/recharges`, {
    method: "POST",
    headers: adminAuth,
    body: { recharge_id: "rch_settlement_e2e_1", amount_cents: RECHARGE_CENTS }
  });
  assertThat("provisioned", (await balance()) === RECHARGE_CENTS, `balance ${await balance()}`);

  // ------------------------------------------------------------- scenario 1
  console.log("\n[phase] 1. deliver -> accept -> settle");
  {
    const id = "req_settle_accept";
    const version = await issueCall(id);
    await deliver(id, version);

    assertThat(
      "delivery_does_not_settle",
      (await axesFor(id)).settlement.value === "held" && (await balance()) === RECHARGE_CENTS - MAX_CHARGE_CENTS,
      `still holding the authorized ${MAX_CHARGE_CENTS}`
    );

    const accepted = await jsonRequest(`/v1/requests/${id}/accept`, {
      method: "POST",
      headers: callerAuth,
      body: {}
    });
    assertThat("caller_accept_settles", accepted.status === 200 && (await axesFor(id)).settlement.value === "settled");
    assertThat(
      "settled_exactly_the_price",
      (await balance()) === RECHARGE_CENTS - PRICE_CENTS,
      `${RECHARGE_CENTS} - ${PRICE_CENTS} = ${await balance()}`
    );
    const counts = await ledgerCounts(id);
    assertThat("one_debit_for_the_call", counts.debit === 1, JSON.stringify(counts));
  }

  // ------------------------------------------------------------- scenario 2
  console.log("\n[phase] 2. deliver -> revision -> redeliver -> accept (A-06: no extra charge)");
  {
    const id = "req_settle_revision";
    const version = await issueCall(id);
    await deliver(id, version);
    const balanceAtDelivery = await balance();

    const revised = await jsonRequest(`/v1/requests/${id}/revision`, {
      method: "POST",
      headers: callerAuth,
      body: { reason: "the summary missed the second half" }
    });
    assertThat("revision_accepted", revised.status === 200 && revised.body.acceptance.status === "revision_requested");
    assertThat(
      "revision_moves_no_money",
      (await balance()) === balanceAtDelivery,
      "A-06 falls out of not creating a second hold"
    );

    const redelivered = await deliver(id, version, {
      output: { summary: "the revised terms" },
      attemptId: "attempt_revision_1"
    });
    assertThat(
      "redelivery_is_not_swallowed_as_a_duplicate",
      redelivered.status === 202 && !redelivered.body.deduped,
      "attempt-scoped dedupe"
    );
    assertThat("revision_reopens_the_window", (await axesFor(id)).acceptance.value === "pending");

    await jsonRequest(`/v1/requests/${id}/accept`, { method: "POST", headers: callerAuth, body: {} });
    const counts = await ledgerCounts(id);
    assertThat(
      "revision_charged_once_in_total",
      counts.debit === 1 && counts.hold === 1,
      JSON.stringify(counts)
    );
  }

  // ------------------------------------------------------------- scenario 3
  console.log("\n[phase] 3. deliver -> window expires -> auto-accept");
  {
    const id = "req_settle_auto";
    const version = await issueCall(id);
    await deliver(id, version);
    assertThat("auto_case_starts_held", (await axesFor(id)).settlement.value === "held");

    await new Promise((resolve) => setTimeout(resolve, (ACCEPTANCE_WINDOW_OVERRIDE_S + 1) * 1000));
    // Lazily evaluated on a read, the shape this service already uses for time.
    await jsonRequest(`/v1/requests/${id}/events`, { headers: callerAuth });

    const axes = await axesFor(id);
    assertThat(
      "expired_window_auto_accepts_and_settles",
      axes.acceptance.value === "auto_accepted" && axes.settlement.value === "settled",
      `${axes.acceptance.value} / ${axes.settlement.value}`
    );
    const counts = await ledgerCounts(id);
    assertThat("auto_accept_charged_once", counts.debit === 1, JSON.stringify(counts));
  }

  // ------------------------------------------------------------- scenario 4
  console.log("\n[phase] 4. deliver -> dispute -> settlement frozen");
  {
    const id = "req_settle_dispute";
    const version = await issueCall(id);
    await deliver(id, version);

    const disputed = await jsonRequest(`/v1/requests/${id}/dispute`, {
      method: "POST",
      headers: callerAuth,
      body: { reason: "this is not the document I sent" }
    });
    assertThat("dispute_blocks_settlement", disputed.status === 200 && disputed.body.settlement.value === "blocked");

    // The auto-accept that would otherwise have settled this call must not step
    // over an open dispute.
    await new Promise((resolve) => setTimeout(resolve, (ACCEPTANCE_WINDOW_OVERRIDE_S + 1) * 1000));
    await jsonRequest(`/v1/requests/${id}/events`, { headers: callerAuth });
    const axes = await axesFor(id);
    assertThat(
      "expiry_does_not_step_over_a_dispute",
      axes.acceptance.value === "disputed" && axes.settlement.value === "blocked",
      `${axes.acceptance.value} / ${axes.settlement.value}`
    );

    const attention = await jsonRequest("/v1/admin/attention", { headers: adminAuth });
    assertThat(
      "dispute_reaches_the_operator",
      (attention.body.items || []).some((item) => item.kind === "dispute_open"),
      "the only party who can resolve it"
    );
    const counts = await ledgerCounts(id);
    assertThat("dispute_moves_no_money", !counts.debit && counts.hold === 1, JSON.stringify(counts));
  }

  // ------------------------------------------------------------- scenario 5
  console.log("\n[phase] 5. failure -> refund, with nobody accepting anything");
  {
    const id = "req_settle_failed";
    await issueCall(id);
    const balanceHeld = await balance();

    await jsonRequest(`/v1/requests/${id}/events`, {
      method: "POST",
      headers: responderAuth,
      body: {
        responder_id: RESPONDER_ID,
        hotline_id: HOTLINE_ID,
        event_type: "FAILED",
        status: "error",
        error_code: "EXEC_RUNTIME"
      }
    });

    assertThat(
      "failure_refunds_without_waiting_for_acceptance",
      (await axesFor(id)).settlement.value === "refunded" && (await balance()) === balanceHeld + MAX_CHARGE_CENTS,
      "nobody should have to accept a failure to get their money back"
    );
    const counts = await ledgerCounts(id);
    assertThat("refund_is_exactly_one_row", counts.refund === 1 && !counts.debit, JSON.stringify(counts));
  }

  // ------------------------------------------------------------- scenario 6
  //
  // The exit criterion's own clause, and the one a balance cannot demonstrate.
  console.log("\n[phase] 6. zero duplicate money events, under replay");
  {
    const id = "req_settle_replay";
    const version = await issueCall(id);
    await deliver(id, version);
    await jsonRequest(`/v1/requests/${id}/accept`, { method: "POST", headers: callerAuth, body: {} });

    const before = await ledgerCounts(id);
    const balanceBefore = await balance();

    // Every way this call could be told to move money a second time.
    await deliver(id, version);
    await jsonRequest(`/v1/requests/${id}/accept`, { method: "POST", headers: callerAuth, body: {} });
    await jsonRequest(`/v1/requests/${id}/events`, { headers: callerAuth });
    await jsonRequest(`/v1/requests/${id}/events`, { headers: callerAuth });

    const after = await ledgerCounts(id);
    assertThat(
      "replayed_delivery_and_acceptance_move_nothing",
      JSON.stringify(after) === JSON.stringify(before) && (await balance()) === balanceBefore,
      `${JSON.stringify(before)} -> ${JSON.stringify(after)}`
    );
  }

  // And across the whole run: one hold and at most one resolution per call.
  console.log("\n[phase] 7. the whole ledger");
  {
    const ids = [
      "req_settle_accept",
      "req_settle_revision",
      "req_settle_auto",
      "req_settle_dispute",
      "req_settle_failed",
      "req_settle_replay"
    ];
    // A settled call legitimately carries BOTH a refund and a debit: settlement
    // returns the unused part of the authorized ceiling (200 authorized, 120
    // charged) and records the debit. They are not alternatives, and asserting
    // "at most one resolution" would have called correct settlement a
    // duplicate. What must never happen is a second hold, a second debit or a
    // second refund for the same call.
    const problems = [];
    for (const id of ids) {
      const counts = await ledgerCounts(id);
      if ((counts.hold || 0) !== 1 || (counts.debit || 0) > 1 || (counts.refund || 0) > 1) {
        problems.push(`${id}: ${JSON.stringify(counts)}`);
      }
    }
    assertThat(
      "no_call_holds_debits_or_refunds_twice",
      problems.length === 0,
      problems.join(" | ") || `${ids.length} calls checked`
    );
  }
}

let failed = false;
try {
  await main();
} catch (error) {
  failed = true;
  console.error(`\n[settlement-lifecycle-e2e] aborted: ${error.message}`);
  for (const { label, logs } of children) {
    const tail = logs.join("").split("\n").slice(-15).join("\n");
    console.error(`\n--- ${label} (last lines) ---\n${tail}`);
  }
} finally {
  cleanup();
}

const failures = assertions.filter((entry) => entry.status === "FAIL");
console.log(`\nAssertions: ${assertions.length - failures.length} passed / ${failures.length} failed / ${assertions.length} total`);
process.exit(failed || failures.length > 0 ? 1 : 0);
