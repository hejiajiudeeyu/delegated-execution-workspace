---
name: publish-hotline
description: Turn a local program into a callable hotline on the delegated-execution network — write the worker, declare its contract, register, submit, approve, and verify it is genuinely callable. Use when someone wants to expose a script, CLI, model or service as a hotline, add a hotline to a responder device, or when a hotline was published but an agent cannot call it correctly.
---

# Publishing a hotline

A hotline is a local program plus a **contract**: what it takes, what it returns,
what it is not for, how long it needs, and what it costs. The program is the easy
half. Everything that goes wrong goes wrong in the contract, and it goes wrong
quietly — the hotline publishes, the catalogue looks fine, and a caller finds out
only when a call fails.

## The one rule everything else follows

**The contract follows the worker.** The worker declares it; nothing else is a
source of truth. The platform used to fill in missing schemas from a template
and once described a PDF parser to the public as a text summariser. It does not
guess any more — it says `contract_declared: false` instead — so a worker that
declares nothing publishes nothing usable.

## 1. Write the worker

A process-adapter worker is a program that:

- prints its contract as JSON to stdout when run with `--contract`, then exits 0
- otherwise reads one JSON task on stdin and writes one JSON result to stdout

```js
const CONTRACT = {
  contract_version: 1,                    // ← the positive signal; see the trap below
  input_schema:  { type: "object", required: ["text"], additionalProperties: false,
                   properties: { text: { type: "string", minLength: 1 } } },
  output_schema: { type: "object", required: ["summary"], additionalProperties: false,
                   properties: { summary: { type: "string" } } },
  input_examples:  [{ title: "A request",  input:  { text: "..." } }],
  output_examples: [{ title: "Its result", output: { summary: "..." } }],
  not_recommended_for: ["what this is the wrong tool for"],
  limitations: ["what it cannot do even when used correctly"],
  service_tier: "quick"                   // quick | standard | deep
};

if (process.argv.includes("--contract")) {
  process.stdout.write(JSON.stringify(CONTRACT));
  process.exit(0);
}

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const task = JSON.parse(raw);
  const text = String(task?.input?.text ?? "");
  process.stdout.write(JSON.stringify({
    status: "ok",
    output: { summary: text.slice(0, 100) },
    usage: { tokens_in: text.length, tokens_out: 0 }
  }));
});
```

Failures are `{ status: "error", error: { code, message, retryable } }`. Say
`retryable: false` when retrying cannot help — a caller that retries a
permanent failure learns nothing and pays twice in time.

## 2. What the publication gate will refuse

Approval fails with `CONTRACT_HOTLINE_INCOMPLETE` and an itemised list unless
the declaration has:

- **both** `input_schema` and `output_schema`
- **at least one worked example in each direction**, and each example must pass
  the schema it claims to illustrate
- **`not_recommended_for` or `limitations`** — a hotline with no stated limits
  is one that will be blamed for everything it was never meant to do

## 3. Register, submit, approve

```bash
DELEXEC_HOME=~/.delexec-<device> delexec-ops add-hotline \
  --type process --hotline-id my.thing.v1 \
  --cmd "node /abs/path/to/worker.mjs" \
  --fixed-price-cents 20 --currency PTS      # omit both for a free hotline

DELEXEC_HOME=~/.delexec-<device> delexec-ops submit-review --hotline-id my.thing.v1
```

Then the operator approves it — in the console, or
`POST /v2/admin/hotlines/:id/approve` with a reason. Approval is what freezes
version 1 and its content digest.

## 4. Verify it is actually callable

Publishing is not the same as being callable. Check all three:

```bash
# the device's own view of what the platform is missing
DELEXEC_HOME=~/.delexec-<device> delexec-ops responder contract-check

# what the platform actually published
curl -s https://<platform>/platform/v2/hotlines/my.thing.v1 | jq '{input_schema, not_recommended_for, execution_budget_s, pricing_hint}'

# what an AGENT sees — the surface that matters
curl -s http://127.0.0.1:8091/skills/caller/hotlines/my.thing.v1 | jq '{contract_source, local_only, pricing_hint}'
```

`contract_source` must be `platform_catalog`. If it is a local draft, the agent
is reading something the network never published.

Then make one real call and check the platform's own verdict — not the
responder's claim about itself:

```
GET /v1/admin/requests/:id → state.delivery_integrity.value == "verified"
```

`verified` means the output was checked against the contract this call pinned
and everything was checkable. `unchecked` means something could not be judged —
read `reason`, it names what.

## The traps

Each of these shipped to production at least once.

**Silence must be distinguishable from an answer.** A worker that does *not*
implement `--contract` still prints something parseable when asked. That is why
`contract_version` exists: it is the positive signal. Without it the client
mistakes noise for a declaration.

**Output files need `contract_role`.** If `output_attachments.file_roles` says a
role is required, each result artifact must carry `contract_role: "<that role>"`.
Result artifacts otherwise carry no role at all, and the delivery is graded
`unchecked` rather than verified — silently weaker, not failed. Note this is a
*different* vocabulary from an artifact descriptor's `role`
(`input`/`output`/`evidence`, which is the direction bytes travel).

**Document hotlines must declare `input_attachments`.** It is the sentence that
tells a caller a file is required and how to send it. A hotline that needs a PDF
and does not say so is uncallable by anyone who reads only the contract — which
is every agent.

**`service_tier` sets two clocks, not one.** It drives the acceptance window
(quick 24h / standard 72h / deep 7d) *and* the execution budget (5m / 30m / 4h).
Declare `execution_budget_s` explicitly if the work needs longer than its tier
implies — a real ML load on a cold model can take minutes, and every clock in
the system derives from this number. Out-of-bounds values are **refused, not
clamped**: a budget quietly moved is a promise quietly changed.

**A priced hotline needs consent that names the listing.** The caller must send
`billing.max_charge_cents`, and the consent must also name `pricing_hint_version`
and `trust_tier_seen` — agreeing to "20 PTS" without saying which listing said 20
is not agreement to anything checkable. The platform refuses otherwise.

**Resubmission: the digest decides.** A resubmission whose declaration hashes to
the published version keeps its approval. Anything that moves the digest —
including a changed display name — re-enters review, correctly. Silence about a
field carries it forward rather than clearing it.

**Never run a test suite while a device is running.** The supervisor binds fixed
ports (8079/8081/8091). On 2026-08-10 a test run reconfigured a production
device through one: five fixture hotlines written in and the real hotline
downgraded to `local_only`. The CLI now refuses on a `DELEXEC_HOME` mismatch,
but that guard does not cover tests talking HTTP to 8091 directly. Stop the
device first, every time.

## Where the truth actually lives

This file goes stale; those do not.

- publication gate and contract validation — `repos/protocol/packages/contracts/src/hotline-contract.js`
- what a frozen version contains — `HOTLINE_VERSION_CONTRACT_FIELDS` in `repos/protocol/packages/contracts/src/call-state.js`
- tier defaults and bounds — `repos/protocol/docs/current/spec/defaults-v0.1.md` §6.1–6.3
- a real worker, end to end — `repos/client/apps/ops/src/mineru-hotline-worker.js`
- the whole path exercised — `tools/agent-callability-e2e.mjs`
