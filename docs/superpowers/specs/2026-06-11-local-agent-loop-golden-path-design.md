# Local Agent Loop Golden Path Design

## Goal

Make the first-run experience local-first: a fresh user should understand how to register locally, enable a local responder, add an example Hotline, run one local call, and debug it before thinking about platform, self-host, LAN, or public exposure.

## Scope

This stage is client-owned and local-first. It does not change protocol fields, platform runtime behavior, public-stack exposure, billing, email transport, marketplace, or formal release gates.

## Product Shape

The first useful outcome is not "deploy a platform"; it is "my local machine exposes a Hotline that an Agent can call, and I can inspect what happened." The UI should therefore bias first-run CTAs toward local Hotline creation and local debug commands. Platform publishing remains visible as an optional follow-up after the local path is understandable.

## Initial Implementation Slice

The first slice corrects misleading first-run guidance:

- Dashboard `NextUpCard` sends users without Hotlines to local Hotline management, not Catalog/platform mode.
- Empty Catalog explains that the Catalog is empty because no local Hotline is configured yet, and sends users to add the built-in example Hotline.
- Runtime page highlights local debug commands (`delexec-ops bootstrap`, `status`, `run-example`, `debug-snapshot`, local logs) before self-host/public-stack readiness.

## Acceptance

- Unit tests prove the local-first copy and CTAs.
- Existing ops-console unit tests still pass.
- No platform/selfhost claims are introduced as prerequisites for the local path.
