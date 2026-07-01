# Backend Quality Guidelines

## Required Patterns

- Keep adapters and services focused on their owning layer.
- Add unit tests for pure helpers and integration tests for HTTP/transport behavior.
- Use contract helpers for protocol semantics and structured errors.
- Validate with `npm --prefix repos/client run test:unit` and `npm --prefix repos/client run test:integration` for transport changes.

## Forbidden Patterns

- Do not bypass caller-controller/responder-controller flows by sending directly from a CLI wrapper unless that is the explicit adapter contract.
- Do not duplicate protocol validation in transport adapters.
- Do not mark fourth-repo compatibility complete without the required root validation chain when submodule SHAs move.

## Checklist

- Existing direct local, relay-http, and remote paths still pass.
- Error codes and retryability match protocol expectations.
- Tests cover invalid input, timeout/failure, and success paths.
