# Cross-Repo Change Process

This repository is a synthetic monorepo superproject. It is a development orchestration layer, not a business truth source.

## Strong Constraints

1. `workspace:*` is only for fourth-repo development-time resolution and must not become a formal release dependency.
2. The main branch of this repository must point only to verified compatible submodule combinations.
3. This repository only orchestrates, validates, and routes work. Business changes must land in the owning repository under `repos/`.

## Repository Responsibilities

This repository is allowed to do only these things:

- provide a unified Codex/Cursor workspace
- orchestrate local cross-repo integration
- validate integration and contract compatibility
- record and certify compatible combinations of protocol, client, and platform commits

This repository must not:

- define new business schema, protocol fields, or runtime behavior
- duplicate protocol, client, or platform source as a new truth source
- replace release ownership of the three formal repositories

## CI Responsibility Split

### Formal Repository CI

The three formal repositories continue to own:

- standalone install
- standalone build
- standalone test
- standalone release

This repository must not replace those release gates.

### Fourth-Repository CI

This repository owns only combination validity:

- submodule SHA integrity
- cross-repo workspace install
- Nx graph and affected evaluation
- contract checks
- source integration checks
- change bundle validation

The goal is to certify that a specific set of protocol/client/platform commits forms a usable integration combination.

Fourth-repository CI is a combination-validity gate. It is not a substitute for formal repository release CI.

Recommended fourth-repository CI job split:

- `submodule-integrity`
- `workspace-install`
- `nx-graph-and-affected`
- `contracts-check`
- `source-integration-check`
- `change-bundle-validate`

The CI output should answer only one question: "Does this specific SHA combination work together?"

## Day-To-Day Change Flow

1. Develop in the owning formal repository first.
2. Create or update an integration branch in this repository.
3. Move each submodule to the target branch or commit.
4. Add or update a change bundle YAML under `changes/`.
5. Run fourth-repo checks.
6. Merge in the formal repositories.
7. Update this repository main branch to the verified compatible SHAs.

## Main Branch Rule

The main branch of this repository must always point to the latest verified compatible combination.

Experimental combinations may exist on integration branches, but not on main.

The main branch of this repository is the compatibility ledger. It should always identify the latest verified combination that can be used by Codex/Cursor and by local source integration.

## Change Bundle

Every cross-repo combination update must include a YAML bundle.

Required fields:

- `change_id`
- `goal`
- `protocol_sha`
- `client_sha`
- `platform_sha`
- `owner`
- `risk_level`
- `affected_scope`
- `contracts_check`
- `integration_check`
- `notes`

Recommended file format:

```yaml
change_id: CHG-2026-001
goal: establish fourth-repo synthetic monorepo orchestration
protocol_sha: abc123
client_sha: def456
platform_sha: ghi789
owner: hejiajiudeeyu
risk_level: medium
affected_scope:
  - protocol
  - client
  - platform
contracts_check: passed
integration_check: passed
notes: source integration and boundary checks succeeded
```

## Rollback Rule

This repository is the compatibility ledger.

Rollback is performed by returning submodule SHAs to the previous verified bundle, not by rewriting formal repository history first.

Every verified bundle should remain available as a rollback target. If a new SHA combination fails integration, revert the submodule references to the last verified bundle and re-run the fourth-repo checks.

## Submodule Update Strategy

Daily development should follow one flow:

1. Develop on branches in the formal repositories.
2. Create an integration branch in this repository.
3. Point each submodule at the target branch or commit.
4. Add or update the bundle YAML for that combination.
5. Run the fourth-repo checks.
6. Merge in the formal repositories.
7. Move this repository main branch to the verified SHAs.

This repository main branch must not point to long-lived experimental combinations.

## Boundary Governance

Nx is used here for graph visualization and affected evaluation.

Boundary enforcement is explicit and lives in `tools/project-boundaries.yaml`, not in the business repositories. This repository treats the world as:

- `protocol/contracts`
- `shared/runtime-support`
- `client/runtime`
- `client/transports`
- `client/ops`
- `platform/data`
- `platform/api`
- `platform/relay`
- `platform/gateway`

Allowed edges:

- `protocol -> client`
- `protocol -> platform`
- `shared/runtime-support -> client`
- `shared/runtime-support -> platform`

Forbidden edges:

- `client -> platform`
- `platform -> client`

`@delexec/runtime-utils` and `@delexec/sqlite-store` are currently treated as shared support packages even though they live physically in the client repository. This keeps the fourth-repo boundary policy aligned with current implementation reality without reintroducing platform-to-client product coupling.

## Agent Rules

Agents may route, validate, orchestrate, and update submodule SHAs here.

Agents must not:

- add business schema, protocol fields, or runtime implementation here
- copy source out of the three formal repositories to create a new truth source
- modify orchestration files to avoid making required changes in the owning repository
- claim cross-repo work is complete without fourth-repo integration checks
- update submodule SHAs without a change bundle
