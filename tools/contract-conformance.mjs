// Does every field a worker declares survive the trip to the catalogue?
//
// This repository has now fixed the same bug four times. `input_attachments`
// was hardcoded null in the draft builder, so a document hotline published
// without the sentence that tells a caller a file is required. The two fields
// a price consent must name were dropped by the adapter's catalogue
// projection, so every paid call was refused. The worker's service tier was
// overwritten by a guessed default. And then, after that was fixed one layer
// up, the draft builder and the submission body dropped it again — a worker
// declaring `quick` published as `standard`, live in production, on the one
// hotline where the acceptance window governs when money settles.
//
// Every one of those is the same shape: declared upstream, dropped downstream,
// silently, with the catalogue looking complete and every field on it wrong.
// Fixing them one field at a time is not a defense — it asks whoever adds the
// next contract field to remember four call sites, and the fix ships when
// somebody notices in production.
//
// So this asserts the property instead of the instances. It drives the real
// CLI against the real platform, end to end, with a worker that declares
// everything a worker can declare, and compares what comes out of the
// catalogue with what went in. The field list is HOTLINE_VERSION_CONTRACT_FIELDS
// from the protocol itself, so a field added there is covered here the moment
// it exists: it must either be carried, or be classified below as something a
// worker cannot declare, with a reason. A new name in the protocol fails this
// check until somebody says which it is.
//
// Usage: node tools/contract-conformance.mjs [--json]
// Exits non-zero when a declared field does not reach the catalogue.

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

import { createPlatformServer, createPlatformState } from "../repos/platform/apps/platform-api/src/server.js";
import { HOTLINE_VERSION_CONTRACT_FIELDS } from "../repos/protocol/packages/contracts/src/call-state.js";

const ROOT = process.cwd();
const CLI = path.join(ROOT, "repos/client/apps/ops/src/cli.js");
const TAG = "[contract-conformance]";
const HOTLINE_ID = "conformance.every.field.v1";
const RESPONDER_ID = "responder_conformance";
const JSON_OUTPUT = process.argv.includes("--json");

// Fields of a frozen HotlineVersion that a process-adapter worker cannot
// declare, and why. Every entry is a decision, not an oversight — anything not
// here must be carried from the worker's `--contract` output all the way to
// the published catalogue entry.
const NOT_WORKER_DECLARABLE = Object.freeze({
  hotline_id: "the operator names the hotline when registering it; a worker claiming its own id could claim someone else's",
  display_name: "operator-facing naming, set at registration and editable without touching the worker",
  description: "generated from the worker's declaration when the operator writes none",
  task_types: "registration-time classification, not a promise the worker makes",
  service_id: "assigned by the platform when a hotline joins a service",
  tags: "registration-time classification",
  pricing_hint: "the price is the operator's decision, not the worker's — a worker that could set its own price could raise it silently",
  recoverability: "derived by the platform from how a version was published"
});

function fail(message) {
  console.error(`${TAG} ${message}`);
  process.exit(1);
}

// What the worker declares. Deliberately odd values: a field carried by
// accident (a default that happens to match) proves nothing.
const DECLARED = {
  contract_version: 1,
  summary: "Echoes one line back, and is used to prove declarations survive publication.",
  input_schema: {
    type: "object",
    required: ["text"],
    additionalProperties: false,
    properties: { text: { type: "string", minLength: 1, description: "The line to echo back, exactly as given." } }
  },
  output_schema: {
    type: "object",
    required: ["echo"],
    additionalProperties: false,
    properties: { echo: { type: "string", description: "What was sent." } }
  },
  input_attachments: {
    accepts_files: true,
    max_files: 2,
    accepted_mime_types: ["application/pdf"],
    file_roles: [{ role: "source_document", required: false, description: "An optional PDF nobody reads; it is here to be published." }]
  },
  output_attachments: {
    includes_files: true,
    max_total_size_bytes: 1024,
    possible_mime_types: ["text/plain"],
    file_roles: [{ role: "echo_transcript", required: false, description: "The echo, as a file." }]
  },
  input_examples: [{ title: "One line", input: { text: "hello" } }],
  output_examples: [{ title: "The same line", output: { echo: "hello" } }],
  input_summary: "One line of text.",
  output_summary: "That same line, unchanged.",
  recommended_for: ["proving a declaration reaches the catalogue"],
  not_recommended_for: ["any real work at all"],
  limitations: ["echoes; does not think"],
  service_tier: "quick",
  // Legal but not the tier default, and not round: a value carried by accident
  // proves nothing. Bounds are ACCEPTANCE_WINDOW_BOUNDS_S and
  // EXECUTION_BUDGET_BOUNDS_S in the protocol; out-of-bounds is refused at
  // approval, not clamped.
  acceptance_window_s: 90000,
  execution_budget_s: 97,
  // Deliberately not the default. `auto` would pass whether it was carried or
  // quietly defaulted, which is the failure mode this whole check exists to
  // rule out.
  fulfillment_mode: "confirm"
};

// Declared by a worker, but pass-through cannot be PROVEN today, so a green
// result here would mean nothing. Listed rather than silently asserted: the day
// the reason goes away, this becomes a real check.
const UNPROVABLE = Object.freeze({
  privacy_mode: "only `supervised` is supported by this deployment, and it is also the default — a published value cannot be told apart from a defaulted one until `sealed` is runnable"
});

function writeWorker(dir) {
  const file = path.join(dir, "conformance-worker.mjs");
  fs.writeFileSync(
    file,
    `const CONTRACT = ${JSON.stringify(DECLARED, null, 2)};
if (process.argv.includes("--contract")) {
  process.stdout.write(JSON.stringify(CONTRACT));
  process.exit(0);
}
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const task = JSON.parse(raw || "{}");
  process.stdout.write(JSON.stringify({ status: "ok", output: { echo: String(task?.input?.text ?? "") } }));
});
`
  );
  return file;
}

// Async on purpose: the platform under test is running in THIS process, so a
// synchronous spawn would block the event loop that has to answer the CLI, and
// every call would time out waiting for a server that cannot reply.
async function cli(args, env) {
  let stdout = "";
  try {
    ({ stdout } = await execFileAsync(process.execPath, [CLI, ...args], { encoding: "utf8", env }));
  } catch (error) {
    fail(`cli ${args[0]} failed: ${(error.stderr || error.stdout || error.message || "").trim().slice(0, 400)}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : {};
}

function request(baseUrl, urlPath, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlPath, baseUrl);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      target,
      {
        method,
        headers: { ...(payload ? { "content-type": "application/json; charset=utf-8" } : {}), ...headers }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode, body: parsed, text });
        });
      }
    );
    req.on("error", reject);
    req.end(payload);
  });
}

// Compared by value: the platform stores these as JSON and returns its own key
// order, and an undeclared list comes back as []. Neither is drift.
function canonical(value) {
  if (Array.isArray(value)) {
    return value.length === 0 ? null : value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  }
  return value ?? null;
}

const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

async function main() {
  // Every contract field is either declared by the worker here, or classified
  // as something a worker cannot declare. A field that is neither is a field
  // nobody has decided about, which is how they get dropped.
  const unclassified = HOTLINE_VERSION_CONTRACT_FIELDS.filter(
    (field) => !(field in DECLARED) && !(field in NOT_WORKER_DECLARABLE) && !(field in UNPROVABLE)
  );
  if (unclassified.length > 0) {
    fail(
      `the protocol has contract fields this check does not cover: ${unclassified.join(", ")}. ` +
        `Declare each in DECLARED so it is proven to reach the catalogue, or add it to NOT_WORKER_DECLARABLE or UNPROVABLE with the reason.`
    );
  }

  const home = fs.mkdtempSync(path.join(os.tmpdir(), "contract-conformance-"));
  const state = createPlatformState({ bootstrapEnabled: true });
  const server = createPlatformServer({ serviceName: "contract-conformance", state });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const platformUrl = `http://127.0.0.1:${server.address().port}`;
  const admin = { authorization: `Bearer ${state.adminApiKey}` };

  try {
    const workerPath = writeWorker(home);
    const env = { ...process.env, DELEXEC_HOME: home, PLATFORM_API_BASE_URL: platformUrl };

    await cli(["responder", "init", "--responder-id", RESPONDER_ID], env);
    await cli(["auth", "register", "--email", "conformance@example.org", "--platform", platformUrl], env);
    await cli(
      ["responder", "add-hotline", "--type", "process", "--hotline-id", HOTLINE_ID, "--cmd", `${process.execPath} ${workerPath}`],
      env
    );
    await cli(["submit-review", "--hotline-id", HOTLINE_ID], env);

    for (const [what, urlPath] of [
      ["hotline", `/v2/admin/hotlines/${HOTLINE_ID}/approve`],
      // The catalogue publishes an entry only when its responder is routable
      // too, so approving the hotline alone leaves it hidden.
      ["responder", `/v2/admin/responders/${RESPONDER_ID}/approve`]
    ]) {
      const approved = await request(platformUrl, urlPath, {
        method: "POST",
        headers: admin,
        body: { reason: "contract conformance" }
      });
      if (approved.status !== 200) {
        fail(`approving the ${what} failed (${approved.status}): ${approved.text?.slice(0, 300)}`);
      }
    }

    const published = await request(platformUrl, `/v2/hotlines/${HOTLINE_ID}`);
    if (published.status !== 200) {
      const detail = await request(platformUrl, `/v1/catalog/hotlines/${HOTLINE_ID}`, { headers: admin });
      fail(
        `the hotline never reached the public catalogue (${published.status}); nothing can be compared. ` +
          `admin view: ${JSON.stringify({
            status: detail.body?.status,
            review_status: detail.body?.review_status,
            responder_id: detail.body?.responder_id
          })}`
      );
    }

    const dropped = [];
    const carried = [];
    for (const field of HOTLINE_VERSION_CONTRACT_FIELDS) {
      if (!(field in DECLARED)) {
        continue;
      }
      if (same(DECLARED[field], published.body[field])) {
        carried.push(field);
      } else {
        dropped.push({
          field,
          declared: DECLARED[field],
          published: published.body[field] ?? null
        });
      }
    }

    if (JSON_OUTPUT) {
      console.log(
        JSON.stringify(
          {
            ok: dropped.length === 0,
            carried,
            dropped,
            not_worker_declarable: Object.keys(NOT_WORKER_DECLARABLE),
            unprovable: UNPROVABLE
          },
          null,
          2
        )
      );
    }

    if (dropped.length > 0) {
      for (const item of dropped) {
        console.error(
          `${TAG} ${item.field}: the worker declared ${JSON.stringify(item.declared)?.slice(0, 120)} and the catalogue published ${JSON.stringify(item.published)?.slice(0, 120)}`
        );
      }
      fail(`${dropped.length} declared field(s) did not reach the catalogue: ${dropped.map((item) => item.field).join(", ")}`);
    }

    if (!JSON_OUTPUT) {
      console.log(
        `${TAG} ok — ${carried.length} declared field(s) reached the catalogue unchanged; ` +
          `${Object.keys(UNPROVABLE).length} not provable today (${Object.keys(UNPROVABLE).join(", ")})`
      );
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(home, { recursive: true, force: true });
  }
}

await main();
