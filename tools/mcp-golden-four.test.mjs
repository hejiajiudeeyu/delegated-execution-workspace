import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const EXPECTED_TOOLS = [
  "caller_skill_search_hotlines_brief",
  "caller_skill_search_hotlines_detailed",
  "caller_skill_read_hotline",
  "caller_skill_prepare_request",
  "caller_skill_send_request",
  "caller_skill_report_response"
];

const HOTLINE_ID = "local.delegated-execution.workspace-summary.v1";
const SIGNATURE = "sig_test_same";

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function toolResult(body) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    structuredContent: body,
    isError: false
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createFakeMcpServer() {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== "POST" || url.pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const body = await readJson(req);
    calls.push(body);
    let result;
    if (body.method === "tools/list") {
      result = rpcResult(body.id, {
        tools: EXPECTED_TOOLS.map((name) => ({ name, description: name, inputSchema: { type: "object" } }))
      });
    } else if (body.method === "tools/call") {
      const name = body.params?.name;
      if (name === "caller_skill_search_hotlines_brief") {
        result = rpcResult(body.id, toolResult({ items: [{ hotline_id: HOTLINE_ID }] }));
      } else if (name === "caller_skill_prepare_request") {
        result = rpcResult(body.id, toolResult({
          status: "ready",
          prepared_request_id: "prep_gold_1",
          expires_at: "2026-06-06T12:00:00.000Z",
          review: { required: false, status: "not_required" }
        }));
      } else if (name === "caller_skill_send_request") {
        result = rpcResult(body.id, toolResult({
          status: "SUCCEEDED",
          request_id: "req_123e4567-e89b-12d3-a456-426614174000",
          result_package: {
            signature_algorithm: "Ed25519",
            signer_public_key_pem: "-----BEGIN PUBLIC KEY-----\\nTEST\\n-----END PUBLIC KEY-----",
            signature_base64: SIGNATURE,
            schema_valid: true
          }
        }));
      } else if (name === "caller_skill_report_response") {
        result = rpcResult(body.id, toolResult({
          status: "SUCCEEDED",
          request_id: "req_123e4567-e89b-12d3-a456-426614174000",
          result_package: {
            signature_algorithm: "Ed25519",
            signer_public_key_pem: "-----BEGIN PUBLIC KEY-----\\nTEST\\n-----END PUBLIC KEY-----",
            signature_base64: SIGNATURE,
            schema_valid: true
          }
        }));
      } else {
        result = { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "unknown tool" } };
      }
    } else {
      result = rpcResult(body.id, {});
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(result));
  });
  return { server, calls };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function runGoldenFour(baseUrl) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tools/mcp-golden-four.mjs"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        MCP_ADAPTER_BASE_URL: baseUrl,
        MCP_GOLDEN_FOUR_TIMEOUT_MS: "1000",
        PLATFORM_ADMIN_API_KEY: "sk_admin_must_not_leak"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("mcp-golden-four child timed out"));
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

const { server, calls } = createFakeMcpServer();
try {
  const baseUrl = await listen(server);
  const result = await runGoldenFour(baseUrl);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /MCP host golden-four/);
  assert.match(result.stdout, /tool_discovery_six_tools/);
  assert.match(result.stdout, /search_hotlines_brief_finds_workspace_summary/);
  assert.match(result.stdout, /prepare_request_ready/);
  assert.match(result.stdout, /send_request_signed_result/);
  assert.match(result.stdout, /report_response_signature_matches/);
  assert.match(result.stdout, /Assertions: 11 passed \/ 0 failed \/ 11 total/);
  assert.ok(!result.stdout.includes("sk_admin_must_not_leak"));
  assert.deepEqual(
    calls.filter((call) => call.method === "tools/call").map((call) => call.params.name),
    [
      "caller_skill_search_hotlines_brief",
      "caller_skill_prepare_request",
      "caller_skill_send_request",
      "caller_skill_report_response"
    ]
  );
  console.log("[mcp-golden-four.test] ok");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
