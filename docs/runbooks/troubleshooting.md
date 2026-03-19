# Troubleshooting

<!-- TODO: Document common issues and their resolutions as they are encountered. -->

## Common Issues

### Submodule not initialized

```bash
git submodule update --init --recursive
```

### Workspace install fails

Ensure corepack is enabled and pnpm version matches `packageManager` in `package.json`:

```bash
corepack enable
corepack pnpm install
```

### Boundary check failures

Review `tools/project-boundaries.yaml` and check for newly introduced cross-boundary imports. See [Boundary Rules](../architecture/boundary-rules.md).

### Source integration fails to start

1. Ensure platform `.env` is configured.
2. Check that Docker is running (required for platform deployment).
3. Verify all submodules are on the expected commits.

<!-- TODO: Add more issues and solutions as they arise. -->
