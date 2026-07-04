# T-503 重演 · 人工走查摩擦记录(进行中,2026-07-04)

> Owner 手动浏览器走查中实时记录;彩排规则=只记不修,走完统一立卡。

| # | severity | 环节 | 摩擦 | 证据 | 归属 | 修复方向 |
|---|----------|------|------|------|------|----------|
| M1 | major(待确认) | 加载 | gateway 滚动 v0.1.7 后,浏览器仍显示旧版"Gateway Unreachable"界面——疑似浏览器/Cloudflare 缓存旧 main.js,硬刷新后恢复(待 owner 确认刷新行为) | owner 口述"最初没看到 locked 面板" | `repos/platform`(console 资产版本化/缓存头)+ 部署文档 | src/*.js 加内容指纹或 no-cache;发版说明提醒硬刷新 |
| M2 | major | 恢复演练 | "TYPE RESET TO CONFIRM" 输入框 placeholder 就是灰色 "RESET",看起来像已填好 → 直接点按钮得 400 VALIDATION_FAILED,用户不知道要手动输入 | owner 截图(400 卡片) | `repos/platform` console | placeholder 改为提示性文案(如 "在此输入 RESET");或改确认复选框 |
| M3 | major | 全局反馈 | 操作结果反馈不明显:400 错误渲染在页面底部的 "Reset Gateway Store 400" 卡片+折叠的 raw JSON,离触发按钮很远,无字段级红框/内联提示;成功也同样不醒目 → owner "不知道操作结果是成功还是失败" | owner 截图+口述 | `repos/platform` console | 按钮旁内联 toast/状态条;字段级校验高亮;成功态显式绿色确认 |
| M4 | minor | 文案 | 侧边栏会话徽章文案 "Unlock required"/"Locked" 与文档/runbook 用语不一致,首次用户难对应 | owner 口述"没看到 locked 面板" | `repos/platform` console + 文档 | 统一状态用语,徽章加 tooltip |
| M5 | major | 恢复后引导 | 破坏性恢复清掉 admin key 后,Billing/Audit 面板只回 401 raw JSON,没有任何"请先到 Gateway Credentials 保存 admin key"的引导——owner 无法自行推断因果 | owner 粘贴的 401 响应(Create Billing Tenant / Audit Trail) | `repos/platform` console | 401 时面板内渲染"缺少 admin 凭据 → 去配置"引导卡,链接直达 credentials 面板 |
| M6 | major | Audit 面板 | 401 被渲染成 "No audit events found / 0 audit events loaded (empty result set)"——**认证失败伪装成空列表**,误导性强(raw JSON 里才看得到 status 401) | owner 粘贴:status 401 + items[] 显示为空态 | `repos/platform` console | 非 2xx 一律渲染错误态,不得走空态分支 |
| M7 | minor | Review Queue | 空队列文案对首次操作员不够安心("0 条"究竟是没任务还是坏了);且已批准+启用的条目完全不可见,无法回看刚处理过的内容 | owner 走查(自动化已消费唯一 pending 条目) | `repos/platform` console | 空态附"最近已处理"列表或链接到 Responders/Hotlines 面板 |
| M8 | major | Billing 面板 | 填入 tenant_id 后 Balance/Ledger 不自动加载,必须点 "Load Tenant";而"未加载"与"确实为空"的空态文案一样("No billing tenant loaded"/"No ledger rows"),操作员无法区分;Load/Create 两按钮职责也不直观 | owner 截图(id 已填、面板全空、徽章 Ready) | `repos/platform` console | 输入 id 失焦/回车即加载;空态区分"尚未加载/查询为空";Create 仅在 Load 报 not found 时高亮 |
| M9 | minor | Billing 面板 | AMOUNT_CENTS 预填默认值(截图为 10000),误点充值会记一笔意外金额;充值属敏感操作,不应有默认金额 | owner 截图 | `repos/platform` console | 金额默认空+必填校验 |
| M10 | major | 凭据保存 | Save Credential 不做任何有效性校验:粘贴错误(如带 `PLATFORM_ADMIN_API_KEY=` 前缀/空格)也保存成功,徽章亮 "Ready",随后所有 admin 代理请求 401——"Ready" 是假信号;服务端核实真 key 有效(57 字符,直查账本 3 行俱在),坏的是网关存的副本 | owner:Ready 徽章 + billing balance/ledger 双 401 raw JSON;我方服务端验证 | `repos/platform` gateway+console | 保存时用该 key 实调一次 platform-api 验活,失败即拒存并提示;徽章语义改为"已验证" |
| — | 复发确认 | Billing 面板 | M6 的"401 伪装空态"在 Billing 同样存在:balance/ledger 双 401 被渲染成 "No billing tenant loaded"/"No ledger rows found" | owner 粘贴的 raw JSON | 同 M6 | 同 M6 |

## 状态

- Owner 卡在 M2(400),已给出解法(手动输入 RESET),等待走查继续。
- M1 待 owner 确认"是否刷新后才恢复"。
