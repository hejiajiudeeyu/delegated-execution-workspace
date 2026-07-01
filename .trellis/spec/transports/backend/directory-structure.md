# Backend Directory Structure

## Scope

The transport family under `repos/client/packages/transports` provides adapter packages such as local, relay-http, email, emailengine, and gmail.

## Layout

- Each adapter package owns its own `package.json` and `src/index.js`.
- Integration tests for adapters live in `repos/client/tests/integration/*-transport.integration.test.js`.
- Shared transport semantics should be extracted deliberately; do not copy/paste behavior across adapters without checking the existing package family.

## Module Organization

- Keep adapter construction and send/receive behavior in the adapter package.
- Keep protocol validation in `@delexec/contracts` and caller/responder orchestration in controller packages.
- Keep environment-specific setup at the CLI/service boundary.

## Examples

- Use `repos/client/packages/transports/local/src/index.js` as the local adapter reference.
- Use `repos/client/packages/transports/relay-http/src/index.js` as the relay-backed adapter reference.
- Use `repos/client/tests/integration/email-transport.integration.test.js` and related tests for expected behavior.
