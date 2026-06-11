import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";

const PRICE_CENTS = 500;
const RECHARGE_CENTS = 1200;

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function bearer(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
}

function createFakePlatform() {
  const calls = [];
  const state = {
    adminKey: "sk_admin_paid_call_test",
    owner: { user_id: "user_owner", api_key: "sk_caller_owner" },
    caller: { user_id: "user_caller", api_key: "sk_caller_paid" },
    responderApiKey: "sk_responder_paid",
    balance: 0,
    ledger: [],
    approved: false
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const body = req.method === "GET" ? null : await readJson(req);
    calls.push({ method: req.method, path: url.pathname, body, auth: bearer(req) });

    if (req.method === "GET" && url.pathname === "/healthz") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/users/register") {
      const isOwner = String(body.contact_email || "").includes("owner");
      sendJson(res, 201, isOwner ? state.owner : state.caller);
      return;
    }

    if (req.method === "POST" && url.pathname === "/v2/hotlines") {
      assert.equal(bearer(req), state.owner.api_key);
      assert.equal(body.pricing_hint.fixed_price_cents, PRICE_CENTS);
      sendJson(res, 201, {
        responder_id: body.responder_id,
        hotline_id: body.hotline_id,
        api_key: state.responderApiKey,
        responder_api_key: state.responderApiKey,
        review_status: "pending"
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v2/admin/hotlines/paid.echo.e2e.v1/approve") {
      assert.equal(bearer(req), state.adminKey);
      sendJson(res, 200, { hotline_id: "paid.echo.e2e.v1", status: "enabled", review_status: "approved" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v2/admin/responders/responder_paid_e2e/approve") {
      assert.equal(bearer(req), state.adminKey);
      state.approved = true;
      sendJson(res, 200, { responder_id: "responder_paid_e2e", status: "enabled", review_status: "approved" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/catalog/hotlines/paid.echo.e2e.v1") {
      sendJson(res, state.approved ? 200 : 404, {
        responder_id: "responder_paid_e2e",
        hotline_id: "paid.echo.e2e.v1",
        pricing_hint: {
          pricing_model: "fixed_price",
          currency: "PTS",
          fixed_price_cents: PRICE_CENTS,
          max_total_cents: PRICE_CENTS,
          trust_tier: "untrusted"
        }
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/admin/billing/tenants") {
      assert.equal(bearer(req), state.adminKey);
      state.balance = 0;
      sendJson(res, 201, { tenant_id: body.tenant_id, balance: { credit_balance_cents: 0 } });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/admin/billing/tenants/user_caller/recharges") {
      assert.equal(bearer(req), state.adminKey);
      state.balance += body.amount_cents;
      state.ledger.unshift({ kind: "recharge", amount_cents: body.amount_cents, new_balance_cents: state.balance });
      sendJson(res, 201, { recharge: { state: "captured", credit_balance_cents_after: state.balance } });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/tokens/task") {
      assert.equal(bearer(req), state.caller.api_key);
      if (state.balance < PRICE_CENTS) {
        sendJson(res, 402, { error: { code: "ERR_PREPAID_BALANCE_INSUFFICIENT" } });
        return;
      }
      state.balance -= PRICE_CENTS;
      state.ledger.unshift({ kind: "hold", amount_cents: -PRICE_CENTS, request_id: body.request_id, new_balance_cents: state.balance });
      sendJson(res, 201, { task_token: `tok_${body.request_id}`, claims: { request_id: body.request_id, billing: body.billing } });
      return;
    }

    const eventMatch = url.pathname.match(/^\/v1\/requests\/([^/]+)\/events$/);
    if (req.method === "POST" && eventMatch) {
      assert.equal(bearer(req), state.responderApiKey);
      if (body.event_type === "FAILED") {
        state.balance += PRICE_CENTS;
        state.ledger.unshift({ kind: "refund", amount_cents: PRICE_CENTS, request_id: eventMatch[1], new_balance_cents: state.balance });
      } else {
        state.ledger.unshift({ kind: "debit", amount_cents: 0, request_id: eventMatch[1], new_balance_cents: state.balance });
      }
      sendJson(res, 202, { accepted: true, request_id: eventMatch[1] });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/tenants/me/balance") {
      assert.equal(bearer(req), state.caller.api_key);
      sendJson(res, 200, { tenant_id: state.caller.user_id, balance: { credit_balance_cents: state.balance } });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/tenants/me/ledger") {
      assert.equal(bearer(req), state.caller.api_key);
      sendJson(res, 200, { tenant_id: state.caller.user_id, items: state.ledger });
      return;
    }

    sendJson(res, 404, { error: { code: "not_found", path: url.pathname } });
  });

  return { server, calls, state };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function runPaidCall(baseUrl, adminKey) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tools/paid-call-e2e.mjs"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        PAID_CALL_E2E_PLATFORM_BASE_URL: baseUrl,
        PLATFORM_ADMIN_API_KEY: adminKey,
        PAID_CALL_E2E_RECHARGE_CENTS: String(RECHARGE_CENTS),
        PAID_CALL_E2E_PRICE_CENTS: String(PRICE_CENTS),
        PLATFORM_SECRET_SHOULD_NOT_LEAK: "sk_admin_must_not_leak"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("paid-call e2e child timed out"));
    }, 5000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      resolve({ status, signal, stdout, stderr });
    });
  });
}

const { server, calls, state } = createFakePlatform();
try {
  const baseUrl = await listen(server);
  const result = await runPaidCall(baseUrl, state.adminKey);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Paid call e2e/);
  assert.match(result.stdout, /insufficient_balance_rejected/);
  assert.match(result.stdout, /post_success_balance_700_cents/);
  assert.match(result.stdout, /failed_call_refunded_to_700_cents/);
  assert.match(result.stdout, /ledger_contains_recharge_hold_debit_refund/);
  assert.match(result.stdout, /Assertions: \d+ passed \/ 0 failed/);
  assert.ok(!result.stdout.includes("sk_admin_must_not_leak"));
  assert.deepEqual(
    calls.filter((call) => call.path === "/v1/tokens/task").map((call) => call.body.request_id),
    ["req_paid_call_insufficient", "req_paid_call_success", "req_paid_call_failed"]
  );
  console.log("[paid-call-e2e.test] ok");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
