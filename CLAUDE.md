# CLAUDE.md

This repository is a synthetic monorepo superproject for cross-repo development orchestration.

## 当前进行中的工作（先读这一节）

**唯一真相源** = `.trellis/tasks/07-17-call-anything-private-capability-network-mvp/prd.md`
（单 Operator Selfhost 私有能力网络；owner 于 2026-07-31 决定的方向）

| 想知道什么 | 看哪里 |
|---|---|
| owner 拍过哪些板、授权了什么 | 同目录 `decisions.md` |
| 每条需求做到哪一步、证据是什么 | `docs/planning/private-capability-network/traceability-ledger.md` |
| 当前里程碑的交付单元与进度 | `.trellis/tasks/08-16-M4-first-party-research-hotline/goal.md`（**拟议待激活**：A-08 ADR + research 私仓 + 三个开工决策；M3 已于 2026-08-16 验收关账，挂账清单见 decisions.md D9） |
| 当前认证的跨仓组合 | `releases/current.yaml`（`node tools/release-manifest.mjs verify` 校验） |
| 生产是否与认证组合一致 | `node tools/release-manifest.mjs check https://callanything.xyz`（relay 已带鉴权重开公网，`/relay/buildz` 可直测；2026-08-09 实测不带 override 全绿） |
| 怎么把一个本地程序做成 hotline | `.claude/skills/publish-hotline/SKILL.md`（skill，可直接唤起） |
| console 为何要第三次重做 | `.trellis/tasks/07-15-replace-public-console-frontend/diagnosis-v0.2.0.md` |

**已作废，不要照着做**：根目录 `LOOP.md`（公网 marketplace 闭环，2026-07-31 归档）、`docs/planning/roadmap-2026H2.md` 的阶段表、`docs/planning/product-audit/P0.5-economic-closure-implementation.md`（Marketplace 版经济闭环蓝图，PRD 明令不照搬）。这些文档看起来仍然合理，但方向已变。

台账规则：**状态只能由证据推动**，证据列为空即不得高于 `todo`。

## Start Here

Read in this order before changing behavior:

1. `README.md`
2. `docs/orchestration/cross-repo-change-process.md`
3. `docs/orchestration/developer-workflow.md`
4. `docs/orchestration/agent-workflow.md`
5. `AGENTS.md`

## Repository Boundary

This repository owns only:

- submodule SHA combination management
- local cross-repo integration
- workspace install and task orchestration
- contract and integration certification
- compatible combination bookkeeping

This repository does not own:

- protocol truth-source logic
- client runtime truth
- platform runtime truth
- formal product release

## Development Rules

- `workspace:*` is only for development-time linking here, never for formal release.
- Business changes must be made in the owning submodule under `repos/`.
- Follow the required sequence: owning repo change -> submodule SHA update -> change bundle update -> fourth-repo validation.
- Do not add schema, protocol fields, or runtime implementation here.
- Do not duplicate source out of the formal repositories to create a new truth source.
- Every cross-repo combination update must include a YAML change bundle.
- The main branch of this repository must point only to verified compatible submodule SHAs.
- Do not update fourth-repo orchestration to sidestep required owning-repo changes.
- Do not claim cross-repo completion before fourth-repo integration checks pass.

## Validation

Minimum fourth-repo validation:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```
