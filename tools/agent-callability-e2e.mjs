// The M2 exit-criterion proof (plan-2026-08-09 §5), end to end and live:
//
//   an AI agent NOT co-located with the responder completes
//   discover -> read the whole contract -> fill it in correctly ->
//   explicitly consent to the price -> (confirm hotline) human confirmation ->
//   receive the completion webhook
//
// with no SSH, no admin curl, and nobody relaying messages by hand. Every hop
// the agent takes goes through the caller-skill adapter surface — the same
// HTTP truth the MCP tools call — with caller credentials only. Admin
// credentials appear exclusively in the PROVISIONING phase, which is the
// operator deploying the test hotline (authorized 2026-08-09).
//
// Topology: five real processes plus a Docker Postgres. The responder and the
// agent run with separate DELEXEC_HOME directories and talk only through the
// relay, which is the honest local approximation of "not the same machine".
//
//   docker: postgres:16-alpine          (billing store, enforcement on)
//   node:   platform-api                (from repos/platform source)
//   node:   transport-relay             (authenticated, from repos/platform)
//   node:   responder-controller        (repos/client; process-adapter worker)
//   node:   caller-controller           (repos/client; the agent's machine)
//   node:   caller-skill-adapter        (repos/client; the agent's surface)
//
// Usage: node tools/agent-callability-e2e.mjs
// Requires: Docker running. Takes ~1 minute. Exits non-zero on any failure.

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const HOTLINE_ID = "test.paper.qa.v1";
const RESPONDER_ID = "responder_agent_e2e";
const PRICE_CENTS = 120;
const RECHARGE_CENTS = 1000;
const ADMIN_KEY = `sk_admin_agent_e2e_${crypto.randomBytes(8).toString("hex")}`;
const RELAY_TOKEN = `relay_${crypto.randomBytes(12).toString("hex")}`;
const WEBHOOK_SECRET = "agent-e2e-webhook-secret";
const PG_CONTAINER = "agent-callability-e2e-pg";
const PG_PORT = Number(process.env.AGENT_E2E_PG_PORT || 55433);

const PORTS = {
  platform: 18080,
  relay: 18090,
  caller: 18081,
  responder: 18082,
  skill: 18091
};

const assertions = [];
const children = [];
const tempDirs = [];

function assertThat(name, condition, detail = "") {
  assertions.push({ name, status: condition ? "PASS" : "FAIL", detail });
  console.log(`  [${condition ? "ok" : "fail"}] ${name}${detail ? `: ${detail}` : ""}`);
  return condition;
}

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `agent-e2e-${label}-`));
  tempDirs.push(dir);
  return dir;
}

async function jsonRequest(baseUrl, pathname, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
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

// ---------------------------------------------------------------- the contract
//
// The test hotline is deliberately shaped to force every leg of the chain:
// Chinese metadata (the CJK search fix), nested-constraint schema (ajv),
// a fixed price (consent), fulfillment_mode confirm (the human gate), and
// always_on availability (the dispatch gate stays open only while the real
// responder process heartbeats).
const CONTRACT = {
  display_name: "论文要点问答（e2e 测试热线）",
  description: "对一篇论文的要点提问，返回简短回答。端到端测试专用。",
  summary: "论文要点问答",
  input_summary: "提供 question 与可选 style",
  output_summary: "返回 answer 字符串",
  task_types: ["paper_qa"],
  tags: ["e2e", "qa"],
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["question"],
    properties: {
      question: { type: "string", minLength: 4, description: "要问的问题" },
      style: { type: "string", enum: ["brief", "detailed"] }
    }
  },
  output_schema: {
    type: "object",
    additionalProperties: false,
    required: ["answer"],
    properties: { answer: { type: "string" } }
  },
  input_examples: [{ title: "问要点", input: { question: "这篇论文的核心贡献是什么？", style: "brief" } }],
  output_examples: [{ title: "回答", output: { answer: "提出了一种新的对齐方法。" } }],
  not_recommended_for: ["真实生产流量：这是端到端测试夹具"],
  limitations: ["回答是确定性的测试文本"],
  pricing_hint: {
    pricing_model: "fixed_price",
    currency: "PTS",
    fixed_price_cents: PRICE_CENTS,
    max_total_cents: PRICE_CENTS
  },
  fulfillment_mode: "confirm",
  service_tier: "quick",
  availability_policy: "always_on"
};

async function main() {
  console.log("\n[phase] postgres");
  spawnSync("docker", ["rm", "-f", PG_CONTAINER], { stdio: "ignore" });
  const pg = spawnSync("docker", [
    "run", "-d", "--name", PG_CONTAINER,
    "-e", "POSTGRES_USER=croc", "-e", "POSTGRES_PASSWORD=croc", "-e", "POSTGRES_DB=croc",
    "-p", `${PG_PORT}:5432`, "postgres:16-alpine"
  ], { encoding: "utf8" });
  if (pg.status !== 0) {
    throw new Error(`docker run postgres failed: ${pg.stderr}`);
  }
  // `-h 127.0.0.1` is load-bearing: it forces the readiness probe over TCP.
  // Without it pg_isready uses the unix socket, and the postgres image's
  // entrypoint answers on the socket while it is still initialising — it runs
  // a temporary socket-only server for initdb, then SHUTS IT DOWN and starts
  // the real one. So the probe went green, the platform connected, and the
  // restart dropped the connection mid-migration as ECONNRESET. TCP is not
  // listening until the real server is up, which is the thing being waited on.
  await waitFor(
    () =>
      spawnSync("docker", ["exec", PG_CONTAINER, "pg_isready", "-U", "croc", "-h", "127.0.0.1"], {
        stdio: "ignore"
      }).status === 0,
    { label: "postgres ready" }
  );
  assertThat("postgres_ready", true);

  console.log("\n[phase] platform + relay");
  const platformHome = tempDir("platform-home");
  startChild("platform", path.join(ROOT, "repos/platform/apps/platform-api/src/server.js"), {
    PORT: String(PORTS.platform),
    TOKEN_SECRET: "agent-e2e-token-secret",
    PLATFORM_ADMIN_API_KEY: ADMIN_KEY,
    DATABASE_URL: `postgresql://croc:croc@127.0.0.1:${PG_PORT}/croc`,
    BILLING_ENFORCEMENT: "enforced",
    DELEXEC_HOME: platformHome,
    ARTIFACT_STORE_PATH: path.join(platformHome, "artifacts")
  });
  startChild("relay", path.join(ROOT, "repos/platform/apps/transport-relay/src/server.js"), {
    PORT: String(PORTS.relay),
    RELAY_ADMIN_TOKEN: RELAY_TOKEN,
    RELAY_TOKEN_SECRET: RELAY_TOKEN,
    DELEXEC_HOME: platformHome
  });
  const platformUrl = `http://127.0.0.1:${PORTS.platform}`;
  const relayUrl = `http://127.0.0.1:${PORTS.relay}`;
  await waitFor(async () => (await fetch(`${platformUrl}/buildz`)).ok, { label: "platform up" });
  await waitFor(async () => (await fetch(`${relayUrl}/healthz`)).ok, { label: "relay up" });
  assertThat("platform_and_relay_up", true);

  // -------------------------------------------------------------- provisioning
  // Everything below until "the agent" is the OPERATOR deploying the test
  // fixtures. Admin credentials appear here and in one operator-side check at
  // the very end; the property this harness protects is that the AGENT never
  // holds them, not that they are used exactly once.
  console.log("\n[phase] provisioning (operator)");
  const adminAuth = { Authorization: `Bearer ${ADMIN_KEY}` };

  const caller = await jsonRequest(platformUrl, "/v1/users/register", {
    method: "POST",
    body: { contact_email: "agent-e2e-caller@selfhost.internal" }
  });
  assertThat("caller_registered", caller.status === 201, JSON.stringify(caller.body?.error || ""));
  const callerKey = caller.body.api_key;
  const callerAuth = { Authorization: `Bearer ${callerKey}` };

  const signing = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = signing.publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = signing.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const registered = await jsonRequest(platformUrl, "/v2/responders/register", {
    method: "POST",
    headers: callerAuth,
    body: {
      responder_id: RESPONDER_ID,
      hotline_id: HOTLINE_ID,
      responder_public_key_pem: publicKeyPem,
      task_delivery_address: `local://relay/${RESPONDER_ID}`,
      ...CONTRACT
    }
  });
  assertThat("hotline_registered", registered.status === 201, JSON.stringify(registered.body?.error || ""));
  const responderKey = registered.body?.api_key || registered.body?.responder_api_key;

  for (const [name, p] of [
    ["hotline_approved", `/v2/admin/hotlines/${HOTLINE_ID}/approve`],
    ["responder_approved", `/v2/admin/responders/${RESPONDER_ID}/approve`]
  ]) {
    const approved = await jsonRequest(platformUrl, p, { method: "POST", headers: adminAuth, body: { reason: "e2e" } });
    assertThat(name, approved.status === 200, JSON.stringify(approved.body?.error || approved.body?.problems || ""));
  }

  const tenant = await jsonRequest(platformUrl, "/v1/admin/billing/tenants", {
    method: "POST",
    headers: adminAuth,
    body: { tenant_id: caller.body.user_id, display_name: "agent e2e caller" }
  });
  assertThat("billing_tenant_created", [200, 201].includes(tenant.status), JSON.stringify(tenant.body?.error || ""));
  const recharge = await jsonRequest(
    platformUrl,
    `/v1/admin/billing/tenants/${encodeURIComponent(caller.body.user_id)}/recharges`,
    {
      method: "POST",
      headers: adminAuth,
      body: { recharge_id: `rch_agent_e2e_${Date.now()}`, amount_cents: RECHARGE_CENTS, note: "agent e2e" }
    }
  );
  assertThat("caller_recharged", [200, 201].includes(recharge.status), JSON.stringify(recharge.body?.error || ""));

  // The test worker: a real process adapter, same shape as MinerU's.
  console.log("\n[phase] responder (its own machine)");
  const responderHome = tempDir("responder-home");
  const workerPath = path.join(responderHome, "paper-qa-worker.mjs");
  fs.writeFileSync(
    workerPath,
    `let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const task = JSON.parse(raw);
  const question = task.input?.question || "";
  process.stdout.write(JSON.stringify({
    status: "ok",
    output: { answer: "测试回答：" + question.slice(0, 40) },
    usage: { tokens_in: 10, tokens_out: 12 }
  }));
});
`
  );
  fs.writeFileSync(
    path.join(responderHome, "ops.config.json"),
    JSON.stringify({
      responder: {
        responder_id: RESPONDER_ID,
        display_name: "agent e2e device",
        enabled: true,
        hotlines: [
          {
            hotline_id: HOTLINE_ID,
            task_types: CONTRACT.task_types,
            adapter_type: "process",
            adapter: { cmd: `${process.execPath} ${workerPath}` }
          }
        ]
      }
    })
  );
  startChild("responder", path.join(ROOT, "repos/client/apps/responder-controller/src/server.js"), {
    PORT: String(PORTS.responder),
    DELEXEC_HOME: responderHome,
    RESPONDER_ID,
    HOTLINE_IDS: HOTLINE_ID,
    RESPONDER_SIGNING_PUBLIC_KEY_PEM: publicKeyPem.replace(/\n/g, "\\n"),
    RESPONDER_SIGNING_PRIVATE_KEY_PEM: privateKeyPem.replace(/\n/g, "\\n"),
    PLATFORM_API_BASE_URL: platformUrl,
    RESPONDER_PLATFORM_API_KEY: responderKey,
    TRANSPORT_TYPE: "relay_http",
    TRANSPORT_BASE_URL: relayUrl,
    TRANSPORT_AUTH_TOKEN: RELAY_TOKEN,
    TRANSPORT_RECEIVER: RESPONDER_ID,
    RESPONDER_HEARTBEAT_INTERVAL_MS: "1000"
  });
  await waitFor(async () => (await fetch(`http://127.0.0.1:${PORTS.responder}/healthz`)).ok, { label: "responder up" });
  // always_on means the dispatch gate opens only once the device heartbeats.
  await waitFor(
    async () => {
      const detail = await jsonRequest(platformUrl, `/v2/hotlines/${HOTLINE_ID}`);
      return detail.status === 200 && detail.body.callable === true;
    },
    { label: "hotline callable (heartbeat arrived)" }
  );
  assertThat("responder_up_and_callable", true);

  // ------------------------------------------------------------------ the agent
  // A different DELEXEC_HOME, caller credentials only, every hop through the
  // skill adapter surface the MCP tools call.
  console.log("\n[phase] the agent (a different machine)");
  const agentHome = tempDir("agent-home");
  startChild("caller", path.join(ROOT, "repos/client/apps/caller-controller/src/server.js"), {
    PORT: String(PORTS.caller),
    DELEXEC_HOME: agentHome,
    PLATFORM_API_BASE_URL: platformUrl,
    CALLER_PLATFORM_API_KEY: callerKey,
    PLATFORM_API_KEY: callerKey,
    TRANSPORT_TYPE: "relay_http",
    TRANSPORT_BASE_URL: relayUrl,
    TRANSPORT_AUTH_TOKEN: RELAY_TOKEN,
    TRANSPORT_RECEIVER: "caller-controller"
  });
  startChild("skill", path.join(ROOT, "repos/client/apps/caller-skill-adapter/src/server.js"), {
    PORT: String(PORTS.skill),
    DELEXEC_HOME: agentHome,
    CALLER_CONTROLLER_BASE_URL: `http://127.0.0.1:${PORTS.caller}`,
    PLATFORM_API_BASE_URL: platformUrl,
    CALLER_PLATFORM_API_KEY: callerKey,
    PLATFORM_API_KEY: callerKey
  });
  const skillUrl = `http://127.0.0.1:${PORTS.skill}`;
  await waitFor(async () => (await fetch(`${skillUrl}/healthz`)).ok, { label: "skill adapter up" });
  await waitFor(async () => (await fetch(`http://127.0.0.1:${PORTS.caller}/healthz`)).ok, { label: "caller up" });

  // Completion webhook receiver — the thing that replaces holding a terminal
  // open. Registered with CALLER credentials.
  const received = [];
  const receiver = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      received.push({ signature: req.headers["x-delexec-signature"] || null, raw, body: JSON.parse(raw) });
      res.writeHead(200).end("{}");
    });
  });
  await new Promise((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const receiverUrl = `http://127.0.0.1:${receiver.address().port}/done`;
  const callbackSet = await jsonRequest(platformUrl, "/v1/callers/me/callback", {
    method: "PUT",
    headers: callerAuth,
    body: { url: receiverUrl, secret: WEBHOOK_SECRET }
  });
  assertThat("webhook_registered_with_caller_credentials", callbackSet.status === 200);

  // 1. DISCOVER — in Chinese, which used to tokenize to nothing.
  const found = await jsonRequest(skillUrl, "/skills/caller/search-hotlines-brief", {
    method: "POST",
    body: { query: "论文 要点", limit: 5 }
  });
  assertThat(
    "discovered_via_chinese_query",
    found.status === 200 && found.body.items.some((item) => item.hotline_id === HOTLINE_ID),
    JSON.stringify(found.body?.items?.map((item) => item.hotline_id) || [])
  );

  // 2. READ — the whole published contract, no local draft anywhere.
  const read = await jsonRequest(skillUrl, `/skills/caller/hotlines/${HOTLINE_ID}`);
  assertThat(
    "read_whole_contract",
    read.status === 200 &&
      read.body.contract_source === "platform_catalog" &&
      read.body.input_schema?.required?.includes("question") &&
      Array.isArray(read.body.not_recommended_for) &&
      read.body.pricing_hint?.max_total_cents === PRICE_CENTS &&
      read.body.fulfillment_mode === "confirm",
    JSON.stringify({ source: read.body?.contract_source, fm: read.body?.fulfillment_mode })
  );

  // 3. FILL IT IN — a contract violation is named by field before dispatch...
  const badInput = await jsonRequest(skillUrl, "/skills/caller/prepare-request", {
    method: "POST",
    body: { hotline_id: HOTLINE_ID, input: { question: "短", style: "verbose" }, agent_session_id: "agent_e2e" }
  });
  const badFields = (badInput.body?.errors || []).map((e) => `${e.field}:${e.code}`);
  assertThat(
    "contract_violations_named_by_field",
    badInput.body?.status === "draft" &&
      badFields.some((f) => f.startsWith("question:")) &&
      badFields.some((f) => f.startsWith("style:INVALID_ENUM_VALUE")),
    badFields.join(", ")
  );

  // ...and a paid hotline without consent is refused WITH the price.
  const noConsent = await jsonRequest(skillUrl, "/skills/caller/prepare-request", {
    method: "POST",
    body: {
      hotline_id: HOTLINE_ID,
      input: { question: "这篇论文的核心贡献是什么？", style: "brief" },
      agent_session_id: "agent_e2e"
    }
  });
  const consentError = (noConsent.body?.errors || []).find((e) => e.code === "BILLING_CONSENT_REQUIRED");
  assertThat(
    "refusal_carries_the_price",
    noConsent.body?.status === "draft" && consentError?.pricing_hint?.max_total_cents === PRICE_CENTS,
    JSON.stringify(consentError || noConsent.body?.errors)
  );

  // 4. CONSENT — explicitly, with a ceiling.
  const prepared = await jsonRequest(skillUrl, "/skills/caller/prepare-request", {
    method: "POST",
    body: {
      hotline_id: HOTLINE_ID,
      input: { question: "这篇论文的核心贡献是什么？", style: "brief" },
      billing: { max_charge_cents: 200 },
      agent_session_id: "agent_e2e"
    }
  });
  assertThat(
    "prepared_with_explicit_consent",
    prepared.body?.status === "ready" &&
      prepared.body?.billing?.acknowledged === true &&
      prepared.body?.billing?.max_charge_cents === 200 &&
      prepared.body?.review?.status === "pending",
    JSON.stringify({ status: prepared.body?.status, review: prepared.body?.review?.status })
  );
  const preparedId = prepared.body.prepared_request_id;

  // 5. THE HUMAN GATE — send is refused until a person confirms.
  const blocked = await jsonRequest(skillUrl, "/skills/caller/send-request", {
    method: "POST",
    body: { prepared_request_id: preparedId }
  });
  assertThat(
    "send_blocked_until_confirmed",
    blocked.status === 409 && blocked.body?.error?.code === "PREPARED_REQUEST_CONFIRMATION_REQUIRED"
  );

  const queue = await jsonRequest(skillUrl, "/skills/caller/approvals");
  assertThat(
    "pending_confirmation_visible",
    queue.status === 200 && queue.body.items.some((item) => item.prepared_request_id === preparedId)
  );
  const confirmed = await jsonRequest(skillUrl, `/skills/caller/approvals/${preparedId}/confirm`, {
    method: "POST",
    body: { confirmed_by: "owner" }
  });
  assertThat("human_confirmed", confirmed.status === 200 && confirmed.body?.review?.status === "confirmed");

  // 6. SEND — and stop watching. The webhook is the proof the agent did not
  // have to hold anything open.
  const sent = await jsonRequest(skillUrl, "/skills/caller/send-request", {
    method: "POST",
    body: { prepared_request_id: preparedId, wait: false }
  });
  assertThat("dispatched", sent.status === 202 && Boolean(sent.body?.request_id), JSON.stringify(sent.body?.error || ""));
  const requestId = sent.body.request_id;

  const notice = await waitFor(() => received[0] || null, { label: "completion webhook", timeoutMs: 60000 });
  const expectedSignature = `sha256=${crypto.createHmac("sha256", WEBHOOK_SECRET).update(notice.raw).digest("hex")}`;
  assertThat(
    "webhook_received_signed_completed",
    notice.body.event === "COMPLETED" && notice.body.request_id === requestId && notice.signature === expectedSignature,
    JSON.stringify({ event: notice.body.event, request_id: notice.body.request_id })
  );
  assertThat(
    "webhook_carries_pointer_not_result",
    !notice.raw.includes("测试回答") && typeof notice.body.result_url === "string",
    notice.body.result_url || ""
  );
  assertThat(
    "webhook_names_the_pinned_contract",
    Boolean(notice.body.hotline_version?.version) && notice.body.service_terms?.fulfillment_mode === "confirm"
  );

  // 7. FETCH THE RESULT over the agent's own authenticated fallback (polling
  // still works; the webhook only made it optional).
  const report = await waitFor(
    async () => {
      const r = await jsonRequest(skillUrl, `/skills/caller/requests/${requestId}/report`);
      return r.status === 200 && r.body.status === "SUCCEEDED" ? r : null;
    },
    { label: "terminal report", timeoutMs: 30000 }
  );
  assertThat(
    "result_conforms_to_output_schema",
    typeof report.body.result?.answer === "string" && report.body.result.answer.startsWith("测试回答"),
    report.body.result?.answer || ""
  );

  // 8. THE MONEY MOVED — exactly the price, visible to the caller itself.
  const balance = await waitFor(
    async () => {
      const b = await jsonRequest(platformUrl, "/v1/tenants/me/balance", { headers: callerAuth });
      return b.status === 200 && b.body?.balance?.credit_balance_cents === RECHARGE_CENTS - PRICE_CENTS ? b : null;
    },
    { label: "billing settled", timeoutMs: 30000 }
  );
  assertThat(
    "held_and_settled_exactly_the_price",
    balance.body.balance.credit_balance_cents === RECHARGE_CENTS - PRICE_CENTS,
    `${RECHARGE_CENTS} - ${PRICE_CENTS} = ${balance.body.balance.credit_balance_cents}`
  );

  // 9. THE PLATFORM REACHED ITS OWN VERDICT (FR-040, M3 unit 1). Every other
  // assertion here would have passed before delivery integrity existed: the
  // responder said COMPLETED, and the platform believed it and paid. This one
  // checks that the platform validated the signed result against the contract
  // version the Call pinned, and that "verified" means everything was checked
  // rather than that nothing was.
  const graded = await jsonRequest(platformUrl, `/v1/admin/requests/${requestId}`, { headers: adminAuth });
  const integrity = graded.body?.state?.delivery_integrity;
  assertThat(
    "platform_verified_the_delivery_itself",
    graded.status === 200 && integrity?.tracked === true && integrity?.value === "verified",
    JSON.stringify(integrity ?? null)
  );
}

let failed = false;
try {
  await main();
} catch (error) {
  failed = true;
  console.error(`\n[agent-callability-e2e] aborted: ${error.message}`);
  for (const { label, logs } of children) {
    const tail = logs.join("").split("\n").slice(-12).join("\n");
    if (tail.trim()) {
      console.error(`--- ${label} (last lines) ---\n${tail}`);
    }
  }
} finally {
  cleanup();
}

const passed = assertions.filter((item) => item.status === "PASS").length;
const failedCount = assertions.filter((item) => item.status === "FAIL").length;
console.log(`\nAssertions: ${passed} passed / ${failedCount} failed / ${assertions.length} total`);
process.exit(failed || failedCount > 0 ? 1 : 0);
