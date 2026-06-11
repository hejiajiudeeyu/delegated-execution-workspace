# P1 Local First-Run Polish Design

## Goal

Make the current local-first client path understandable and verifiable for a real user or coding agent who wants to run the product on one machine before thinking about LAN, public hosting, platform review, or marketplace publishing.

## Product Decision

The next product stage stays local-first. The user-facing promise is:

1. install the CLI or work from source
2. run one bootstrap command
3. inspect status
4. run one example call
5. capture a debug snapshot if anything fails

The first-run path should not start with platform/selfhost setup. Platform publishing remains a later workflow after the local client proves that caller, responder, local hotline discovery, and a self-call work on the same machine.

## Scope

This P1 slice aligns onboarding surfaces and adds a lightweight guard against stale first-run commands.

In scope:

- README local quick start language
- local-mode onboarding guide
- agent local install playbook
- coding-agent onboarding guide
- end-user AI deployment guide
- deployment guide local CLI section
- matching zh-CN guide variants where the same stale commands appear
- a static onboarding checker that fails on deprecated first-run commands and missing recommended bootstrap/status/run-example/debug-snapshot commands

Out of scope:

- new protocol fields
- platform/selfhost runtime behavior
- marketplace publishing
- UI wizard redesign
- changing submodule SHAs

## Recommended Path

For repository source installs:

```bash
npm install
npm run ops -- bootstrap --email localtest@example.com --text "Summarize this bootstrap request."
npm run ops -- status
npm run ops -- run-example --text "Summarize this follow-up request."
npm run ops -- debug-snapshot
```

For installed-package usage:

```bash
npm install -g @delexec/ops
delexec-ops bootstrap --email you@example.com --text "Summarize this bootstrap request."
delexec-ops status
delexec-ops run-example --text "Summarize this follow-up request."
delexec-ops debug-snapshot
```

Use an isolated `DELEXEC_HOME` and isolated service ports for repeatable local testing. The port list must include `OPS_PORT_MCP_ADAPTER`.

## Error Handling And Debugging

The primary troubleshooting surface is `delexec-ops status` plus `delexec-ops debug-snapshot`. Manual `curl` calls remain valid for advanced API debugging, but they should not be the main first-run path.

The docs should explicitly keep platform approval and review out of the initial success criteria.

## Testing

Add a repository-local static checker under `repos/client/scripts/` and wire it into `repos/client/package.json`.

The checker should verify:

- recommended onboarding docs do not mention the stale `delexec-ops auth login` first-run command
- first-run docs include `bootstrap`, `status`, `run-example`, and `debug-snapshot`
- isolated local setup docs include `OPS_PORT_MCP_ADAPTER`

Verification should include:

- first a failing checker run before docs are updated
- then a passing checker run after docs are updated
- relevant existing runtime/package checks where feasible

## Self-Review

- No placeholders remain.
- The design keeps business changes in `repos/client`.
- The scope is a single implementation slice.
- The recommended path is explicit for both source and installed-package users.
