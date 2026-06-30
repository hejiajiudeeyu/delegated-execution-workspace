# T-104 GHCR 镜像公开可拉取

- 仓库：`repos/platform`（CI 与文档）+ `[人工]`（GitHub 包可见性、发版 tag）
- 依赖：无
- 修复断点：B4（五个镜像匿名拉取 403）
- 完成标志：匿名 `docker pull ghcr.io/hejiajiudeeyu/rsp-platform:<tag>` 成功

## 背景

所有 compose 文件默认引用 `ghcr.io/hejiajiudeeyu/rsp-{platform,relay,gateway,caller,responder}:${IMAGE_TAG:-latest}`。2026-06-11 验证：五个镜像匿名访问 GHCR tags API 全部 403——要么从未发布，要么包可见性是 private。`deploy/public-stack` 是 registry-only（无 build fallback），所以陌生 operator 第一步 `compose pull` 即失败。

CI 已有 `.github/workflows/images.yml`：`type=sha` 每次构建、`v*` tag 时发 tag 和 `latest`。

## 执行步骤

1. 读 `repos/platform/.github/workflows/images.yml` 全文，回答并记录：哪些镜像在 CI 中构建？触发条件？是否包含 `rsp-caller`/`rsp-responder`（compose 引用了它们，但 CI 可能只建三个）？
2. 若 CI 缺 compose 引用的镜像，补全 workflow（按现有 job 的写法复制改名），或者——如果 `rsp-caller`/`rsp-responder` 只被非主路径 profile（`deploy/all-in-one`、`deploy/ops`）引用——在这些 compose/README 标注「需本地 build」，主路径 `public-stack` 三镜像（platform/relay/gateway）必须全部在 CI 内。两种方案选其一，在回复中说明理由。
3. 检查 `deploy/public-stack/.env.example` 与 `deploy/public-stack/README`：`IMAGE_TAG` 默认 `latest`，但 `latest` 只在 `v*` tag 时推送。在 README/onboarding 文档里写明「首次拉取请使用具体发布 tag」，并给出查询命令。
4. 在 platform 仓库提交上述 CI/文档改动。
5. `[人工]` 输出操作清单给用户：
   - 在 GitHub 上把 `rsp-platform`、`rsp-relay`、`rsp-gateway`（以及若适用 caller/responder）的 GHCR package 可见性改为 **public**（Settings → Packages → Change visibility）
   - 打一个 `v0.1.x` tag 并 push，触发 images workflow 发布带 tag 镜像
   - 发布后验证：`docker logout ghcr.io && docker pull ghcr.io/hejiajiudeeyu/rsp-platform:v0.1.x`
6. 回第四仓：submodule SHA + change bundle + 验证链。

## 验收标准

1. CI workflow 覆盖 public-stack 引用的全部镜像（或给出非主路径镜像的本地 build 标注方案）。
2. `[人工]` 清单完整：可见性、tag、验证命令。
3. （人工步骤完成后）匿名 `docker pull` 三个 public-stack 镜像成功。
4. 第四仓验证链全绿。

## 防跑偏

- agent 不得自行 push tag 或改 GitHub 包设置——那是 `[人工]` 步骤。
- 不要重写 Dockerfile 或 compose 拓扑，只解决「能不能拉到镜像」。
