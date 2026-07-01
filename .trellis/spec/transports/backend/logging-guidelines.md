# Backend Logging Guidelines

## Scope

Logging is plain, explicit, and designed for local debugging without exposing secrets.

## Patterns

- Log high-level lifecycle events, readiness, request ids, service ids, hotline ids, and stage names when useful.
- Prefer structured JSON output for CLI evidence and machine-readable status commands.
- Keep noisy debug data behind explicit debug/snapshot commands.
- Redact API keys, bearer tokens, task tokens, secret-store contents, and raw env files.

## What Not To Log

- Caller API keys, Platform API keys, task tokens, bearer tokens, signing secrets, secret-store passphrases, or complete env files.
- Full payloads when they may contain user data unless the command is explicitly producing local test evidence.

## Examples

- `repos/client/apps/ops/src/logging.js` centralizes local ops logging helpers.
- `repos/client/apps/ops/src/cli.js` emits JSON evidence for command outputs.
- Root deployability and compat tools expose `--json` modes for automation.
