#!/usr/bin/env node

const MCP_ADAPTER_BASE = (process.env.MCP_ADAPTER_BASE_URL || "http://localhost:8092").replace(/\/+$/, "");
const MCP_ENDPOINT = process.env.MCP_ENDPOINT_URL || `${MCP_ADAPTER_BASE}/mcp`;
const TEST_HOTLINE_ID = process.env.AGENT_E2E_HOTLINE_ID || "local.delegated-execution.workspace-summary.v1";
const TEST_SESSION_ID = `mcp-golden-four-${Date.now()}`;
const REQUEST_TIMEOUT_MS = Number(process.env.MCP_GOLDEN_FOUR_TIMEOUT_MS || 10000);

const EXPECTED_TOOLS = [
  "caller_skill_search_hotlines_brief",
  "caller_skill_search_hotlines_detailed",
  "caller_skill_read_hotline",
  "caller_skill_prepare_request",
  "caller_skill_send_request",
  "caller_skill_report_response"
];

const assertions = [];
let nextId = 1;

function assertThat(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  assertions.push({ name, status, detail });
  const icon = condition ? "ok" : "fail";
  console.log(`  [${icon}] ${name}${detail ? `: ${detail}` : ""}`);
  return condition;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    if (text) {
      body = JSON.parse(text);
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? `request_timeout_${REQUEST_TIMEOUT_MS}ms`
      : error instanceof Error
        ? error.message
        : String(error);
    return {
      ok: false,
      status: 0,
      body: { error: message }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function rpc(method, params = undefined) {
  const payload = {
    jsonrpc: "2.0",
    id: nextId++,
    method,
    ...(params === undefined ? {} : { params })
  };
  const response = await fetchJson(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      accept: "application/json, text/event-stream"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`mcp_http_${response.status}`);
  }
  if (response.body?.error) {
    throw new Error(response.body.error.message || "mcp_rpc_error");
  }
  return response.body?.result;
}

async function callTool(name, args) {
  const result = await rpc("tools/call", {
    name,
    arguments: args
  });
  return result?.structuredContent ?? result;
}

function printSummary() {
  const passed = assertions.filter((item) => item.status === "PASS").length;
  const failed = assertions.filter((item) => item.status === "FAIL").length;
  console.log(`\nAssertions: ${passed} passed / ${failed} failed / ${assertions.length} total`);
  if (failed) {
    console.log("Failed assertions:");
    for (const item of assertions) {
      if (item.status === "FAIL") {
        console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
      }
    }
  }
  return failed === 0;
}

async function main() {
  console.log("=".repeat(72));
  console.log("MCP host golden-four");
  console.log("=".repeat(72));
  console.log(`mcp_endpoint=${MCP_ENDPOINT}`);
  console.log(`hotline=${TEST_HOTLINE_ID}`);

  console.log("\n[1/4] Tool discovery");
  const listed = await rpc("tools/list");
  const tools = listed?.tools ?? [];
  const toolNames = tools.map((tool) => tool.name).sort();
  const missing = EXPECTED_TOOLS.filter((name) => !toolNames.includes(name));
  assertThat("tool_discovery_six_tools", tools.length === 6 && missing.length === 0, `tools=${toolNames.join(",")}`);

  console.log("\n[2/4] Hotline search");
  const search = await callTool("caller_skill_search_hotlines_brief", {
    task_type: "text_summarize",
    task_goal: "summarize workspace status",
    limit: 8
  });
  const searchItems = search?.items ?? [];
  const target = searchItems.find((item) => item.hotline_id === TEST_HOTLINE_ID);
  assertThat("search_hotlines_brief_finds_workspace_summary", Boolean(target), `count=${searchItems.length}`);

  console.log("\n[3/4] Prepare request");
  const prepared = await callTool("caller_skill_prepare_request", {
    hotline_id: TEST_HOTLINE_ID,
    input: {
      text: "MCP golden-four validates host wiring, request capability creation, signed result delivery, and report recovery.",
      instruction: "Summarize the validation goal in one sentence."
    },
    agent_session_id: TEST_SESSION_ID
  });
  const preparedId = prepared?.prepared_request_id;
  assertThat("prepare_request_ready", prepared?.status === "ready", `status=${prepared?.status}`);
  assertThat("prepare_request_returns_id", Boolean(preparedId), String(preparedId || ""));
  assertThat("prepare_request_returns_expiry", Boolean(prepared?.expires_at), String(prepared?.expires_at || ""));
  assertThat(
    "prepare_request_local_review_not_required",
    prepared?.review?.required === false && prepared?.review?.status === "not_required",
    `review=${JSON.stringify(prepared?.review ?? null)}`
  );
  if (!preparedId) {
    return false;
  }

  console.log("\n[4/4] Send and report");
  const sent = await callTool("caller_skill_send_request", {
    prepared_request_id: preparedId,
    wait: true
  });
  const requestId = sent?.request_id || "";
  const sentPackage = sent?.result_package;
  assertThat("send_request_succeeded", sent?.status === "SUCCEEDED", `status=${sent?.status}`);
  assertThat("send_request_returns_request_id", /^req_[0-9a-f-]{36}$/i.test(requestId), requestId);
  assertThat(
    "send_request_signed_result",
    sentPackage?.signature_algorithm === "Ed25519" &&
      Boolean(sentPackage?.signer_public_key_pem) &&
      Boolean(sentPackage?.signature_base64) &&
      sentPackage?.schema_valid === true,
    `algorithm=${sentPackage?.signature_algorithm} schema_valid=${sentPackage?.schema_valid}`
  );

  const report = await callTool("caller_skill_report_response", {
    request_id: requestId
  });
  const reportPackage = report?.result_package;
  assertThat("report_response_succeeded", report?.status === "SUCCEEDED", `status=${report?.status}`);
  assertThat(
    "report_response_signature_matches",
    Boolean(sentPackage?.signature_base64) && sentPackage.signature_base64 === reportPackage?.signature_base64,
    "signature_base64 stable"
  );

  return printSummary();
}

main()
  .then((ok) => {
    process.exit(ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(`[mcp-golden-four] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
