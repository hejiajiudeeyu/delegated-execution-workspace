# Documentation Index

This is the documentation root for the fourth-repo orchestration layer.

Business documentation lives in the owning submodule repositories. This layer documents only orchestration, architecture decisions, and operational procedures.

## Orchestration

Cross-repo change process, developer workflow, CI layering, and rollback procedures.

- [Cross-Repo Change Process](orchestration/cross-repo-change-process.md)
- [Developer Workflow](orchestration/developer-workflow.md)
- [CI Layering](orchestration/ci-layering.md)
- [Rollback Playbook](orchestration/rollback-playbook.md)

## Architecture

System-level architecture, boundary governance, and integration path documentation.

- [System Overview](architecture/system-overview.md)
- [Boundary Rules](architecture/boundary-rules.md)
- [Integration Path](architecture/integration-path.md)

## Runbooks

Step-by-step operational guides for common tasks.

- [Local Dev Setup](runbooks/local-dev-setup.md)
- [Troubleshooting](runbooks/troubleshooting.md)

## Decisions

Architecture Decision Records (ADR) for significant design choices.

- [ADR-001: Fourth Repo Purpose](decisions/001-fourth-repo-purpose.md)

## Submodule Documentation

Each submodule maintains its own documentation:

- [Protocol Docs](../repos/protocol/docs/current/README.md)
- [Client Docs](../repos/client/docs/current/README.md)
- [Platform Docs](../repos/platform/docs/current/README.md)
