# Quality Guidelines

## Scope

@delexec/transport-emailengine is part of emailengine transport adapter package. Quality means preserving the owning repository boundary, keeping tests near the behavior, and proving cross-repo compatibility when contracts or submodule SHAs move.

## Required Patterns

- Read the owning repository rules before changing behavior: root `CLAUDE.md` / `AGENTS.md`, then the submodule's `CLAUDE.md`, `AGENTS.md`, and `CONTRIBUTING.md` when present.
- Keep `delexec-ops` usable as the primary end-user surface; do not require users to assemble internal packages manually.
- Keep changes small and reviewable. Prefer focused commits by workstream.
- Update docs under `docs/current` or package README files when externally visible behavior changes.
- For cross-repo compatibility, run the fourth-repo gate: `corepack pnpm run check:submodules`, `check:boundaries`, `check:bundles`, `test:contracts`, and `test:integration`.

## Forbidden Patterns

- Do not add protocol fields, schemas, or runtime truth in the fourth repository.
- Do not update submodule SHAs without a matching `changes/*.yaml` bundle.
- Do not bypass the owning repo by editing orchestration scripts only.
- Do not print secrets, API keys, env file contents, or raw bearer tokens in CLI output, logs, tests, or docs.
- Do not treat local 502s from agent/e2e services as code regressions without first proving the local stack is running.

## Testing Requirements

- Run `npm --prefix repos/client run test:unit` when this area changes.
- Run `npm --prefix repos/client run test:integration` when this area changes.
- For root compatibility status, use `corepack pnpm --silent run compat:status -- --json` before claiming the repo is cleanly closed out.
- Add or update unit/integration tests at the layer where behavior changes, not only at the fourth-repo wrapper layer.

## Review Checklist

- Owning repository is correct for the behavior changed.
- Protocol, client, platform, docs, and change bundle are synchronized when a contract crosses repos.
- Existing direct hotline/caller/responder flows still work after adding logical or platform-mediated flows.
- Error codes are explicit and retryability is intentional.

## Current References

- Use repos/client/packages/transports/emailengine/src/index.js as a current reference.
- Use repos/client/tests/integration/emailengine-transport.integration.test.js as a current reference.
