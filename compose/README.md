# Compose Orchestration

This directory is reserved for fourth-repo development orchestration artifacts.

The fourth repository does not duplicate formal deploy manifests from `repos/platform`.

Current policy:

- local platform startup uses `repos/platform/deploy/platform/docker-compose.yml`
- public operator deployment remains owned by `repos/platform`
- any compose file added here must exist only to orchestrate cross-repo development flows
