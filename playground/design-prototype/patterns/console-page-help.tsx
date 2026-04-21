/**
 * Console pattern: /help — built-in 上手 & 帮助 page.
 *
 * See `docs/console-content-spec.md §5.7`. Goal: when a user is stuck,
 * they should NEVER need to leave the console to find an answer. The
 * existence of this page is the spec's "help gate" guarantee.
 *
 * Structure: sticky left TOC + scroll-anchored articles on the right.
 * Articles are bundled (Phase 1); future Phase 2 fetches via
 * `GET /help/articles?lang=zh-CN`.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  PlayCircle,
  PackageSearch,
  ShieldCheck,
  Globe,
  Wrench,
  HelpCircle,
  MessageSquareWarning,
  ChevronRight,
  Search,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import {
  ConsolePageHeader,
  ConsoleCard,
  ConsoleButton,
} from "../shells/console-shell";
import { cn } from "@/app/components/ui/utils";

/* ── Article catalog ────────────────────────────────────────────────── */

type Article = {
  anchor: string;
  title: string;
  icon: LucideIcon;
  /** One-line "为什么你需要看这章". */
  why: string;
  body: () => React.ReactNode;
};

const ARTICLES: Article[] = [
  {
    anchor: "what-is-caller",
    title: "1. 什么是 Caller / Responder",
    icon: Sparkles,
    why: "看这章，下次再看 sidebar 里的「调用方/响应方」就不会懵。",
    body: () => (
      <>
        <P>
          整个 console 围绕两个角色：<B>Caller</B>（让 Agent 帮你调用别人提供的能力）和{" "}
          <B>Responder</B>（把你写的能力发布出来供别人调用）。同一台机器、同一个本机进程可以
          <B>同时是 Caller 也是 Responder</B> —— 不需要切账号。
        </P>
        <Compare
          rows={[
            {
              label: "你的角色",
              left: "Caller",
              leftSub: "我让 Agent 帮我做事",
              right: "Responder",
              rightSub: "我把能力发布给别人调",
            },
            {
              label: "典型场景",
              left: "Agent 调 Slack / 日历 / 搜索 / 翻译 …",
              right: "我做了一个 Hotline，让别人/别人的 Agent 来用",
            },
            {
              label: "看哪个 sidebar 区",
              left: "「调用方」组：热线目录 / 调用记录 / 审批中心 / 名单管理",
              right: "「响应方」组：Hotline 管理 / 平台发布",
            },
          ]}
        />
        <P>
          每条调用走的链路：<Mono>Caller</Mono> → <Mono>caller-controller</Mono> →（审批）→{" "}
          <Mono>responder-controller</Mono> → <Mono>Hotline</Mono> 实际跑。可以在「概览 / 工作台」
          看到这 4 个进程的健康灯。
        </P>
        <Cta href="/console/dashboard" label="去工作台看 4 个进程" />
      </>
    ),
  },
  {
    anchor: "first-call",
    title: "2. 5 分钟跑通第一次调用",
    icon: PlayCircle,
    why: "上手清单就是干这件事的。这章是详细版。",
    body: () => (
      <>
        <P>从全新装机到看到第一条结果，5 步：</P>
        <Steps
          steps={[
            { n: 1, title: "注册 Caller", desc: "让本机有一个 Caller 身份。", cta: { href: "/caller/register", label: "去注册" } },
            { n: 2, title: "启用本地 Responder", desc: "本地模式下你需要至少一个 Responder。", cta: { href: "/responder/activate", label: "启用" } },
            { n: 3, title: "添加第一个 Hotline", desc: "在 Hotline 管理里创建一个新的本地 hotline。", cta: { href: "/console/hotlines", label: "管理 Hotline" } },
            { n: 4, title: "查看本地草稿", desc: "确认 input/output schema 没有问题。", cta: { href: "/console/hotlines", label: "查看草稿" } },
            {
              n: 5,
              title: "试拨第一个 Hotline ⭐",
              desc: "这步是命门：去 Catalog 选一个 official 的 Hotline 点「试拨」，看到 Calls 列表里出现新一行就完事。",
              cta: { href: "/console/catalog?from=dashboard-onboarding", label: "去 Catalog 试拨" },
            },
          ]}
        />
        <Callout tone="info">
          找不到 Hotline？看下面 §3 解释「Hotline 是什么」；如果 Catalog 是空的，按 Catalog 页里
          「空状态」给的三条路走。
        </Callout>
      </>
    ),
  },
  {
    anchor: "what-is-hotline",
    title: "3. 什么是 Hotline",
    icon: PackageSearch,
    why: "搞清楚这个概念之后，Catalog / Calls / Approvals 三个页面的字段就都顺了。",
    body: () => (
      <>
        <P>
          一个 <B>Hotline</B> ≈ <Mono>REST API + 输入/输出 Schema + 审批策略</Mono>。它是 Responder
          对外暴露的最小调用单元。例子：<Mono>ops.notify@v1</Mono>（往 Slack 推消息）、
          <Mono>calendar.find_slot@v2</Mono>（找空档）。
        </P>
        <P>每个 Hotline 在 Catalog 里都展示：</P>
        <Bullets
          items={[
            <span><B>display_name / one_liner / description</B>：人类语言的功能描述</span>,
            <span><B>input_fields</B>：每个字段的名字、类型、是否必填、helper text — 这就是「试拨」抽屉里看到的表单</span>,
            <span><B>output</B>：返回什么样的结构</span>,
            <span><B>review_status</B>：是 local-only / 已批准 / 待审 / 被拒（决定别的 Caller 能不能在平台模式看到）</span>,
            <span><B>tags</B>：official / community / local — 第一次试拨建议挑 <Mono>official</Mono></span>,
          ]}
        />
        <Cta href="/console/catalog" label="去 Catalog 看几个 Hotline 长什么样" />
      </>
    ),
  },
  {
    anchor: "approvals",
    title: "4. 审批与白名单",
    icon: ShieldCheck,
    why: "你不希望 Agent 替你乱调东西，但也不想每次都点批准。这章告诉你三种模式怎么选。",
    body: () => (
      <>
        <P>
          Caller 有<B>三种审批模式</B>，在「偏好」页或「名单管理」页切换：
        </P>
        <Compare
          rows={[
            {
              label: "manual",
              left: "逐次人工审批",
              leftSub: "默认。最安全。每次 Agent 调用都走审批中心。",
              right: "适合刚上手 / 高风险 hotline",
            },
            {
              label: "allow_listed",
              left: "白名单自动放行",
              leftSub: "命中 Responder 白名单 / Hotline 白名单的自动放行；其它仍走审批。",
              right: "推荐的稳态模式",
            },
            {
              label: "allow_all",
              left: "全部自动放行",
              leftSub: "不审批。⚠️ 高风险。",
              right: "只有完全自治、且后果可控时才用",
            },
          ]}
        />
        <P>
          被拒绝的调用，可以在 Calls 详情里直接「以后自动放行此 Hotline」加白；或者一键切到 allow_listed
          模式（推荐路线）。
        </P>
        <Cta href="/console/access-lists" label="去名单管理" />
      </>
    ),
  },
  {
    anchor: "platform-mode",
    title: "5. 本地模式 vs. 平台模式",
    icon: Globe,
    why: "看这章你就知道什么时候该开「平台发布」、什么时候保持本地。",
    body: () => (
      <>
        <P>
          <B>本地模式</B>：所有 Hotline 和调用记录都留在本机；catalog 只显示本机 Responder 提供的
          hotline。零网络、零 telemetry，最隐私。
        </P>
        <P>
          <B>平台模式</B>：本机 Hotline 草稿可发布到平台 catalog 供他人发现；同时你的 catalog 也会展示
          平台社区已发布的 hotline。需要平台 API 可达。
        </P>
        <Compare
          rows={[
            { label: "Catalog 来源", left: "仅本机 Responder", right: "本机 + 平台社区" },
            { label: "Hotline 可见性", left: "仅自己", right: "可发布给他人" },
            { label: "需要平台 API", left: "否", right: "是" },
            { label: "网络与隐私", left: "完全本地", right: "走平台" },
            { label: "适合", left: "个人脚本 / 内网工具", right: "对外服务 / 社区贡献" },
          ]}
        />
        <Callout tone="warn">
          平台模式开了但 Platform API 不可达 = catalog 查询 + 审核同步会受影响。Dashboard 会有黄色 alert。
        </Callout>
        <Cta href="/console/dashboard" label="去 Dashboard 切换模式" />
      </>
    ),
  },
  {
    anchor: "troubleshooting",
    title: "6. 常见故障排查",
    icon: Wrench,
    why: "调用失败 / Responder 离线 / 平台 ping 不通 — 这章有对照检查。",
    body: () => (
      <>
        <Bullets
          items={[
            <span><B>调用失败 UPSTREAM_TIMEOUT</B>：上游服务慢。Calls 详情点「重试调用」即可，输入会自动预填上次的值。</span>,
            <span><B>Relay down / ECONNREFUSED</B>：本机 transport-relay 进程没起。去「服务健康度」点「重启」。</span>,
            <span><B>Responder unhealthy</B>：先看 Runtime 页的 Responder 日志（点 Calls 详情的「查看 Responder 日志」会带过去定位行）。</span>,
            <span><B>Platform API 不可达</B>：检查 Platform URL 拼写、网络、平台是否在跑。或临时关闭平台模式。</span>,
            <span><B>审批一直 pending</B>：去 Approvals 页看是不是被自动 expire 了；或者切到 allow_listed 模式让信任的 hotline 直接走。</span>,
            <span><B>Catalog 是空的</B>：没有 Responder 发布过 hotline。按 Catalog 空状态卡的三条路走，或加载 demo hotline 试拨。</span>,
          ]}
        />
        <Cta href="/console/runtime" label="去 Runtime 看日志" />
      </>
    ),
  },
  {
    anchor: "faq",
    title: "7. FAQ",
    icon: HelpCircle,
    why: "高频问题速查。",
    body: () => (
      <>
        <Bullets
          items={[
            <span><B>Q: 一定要开平台模式吗？</B> A: 不。本地模式完全够个人脚本和私有工具用。</span>,
            <span><B>Q: 我的输入会被平台看到吗？</B> A: 本地模式下不会；平台模式下只有当 hotline 被发布到平台 catalog 时，平台才会知道这个 hotline 的存在 — 输入仍然只在 Responder 进程里。</span>,
            <span><B>Q: 「审批」会拖慢 Agent 吗？</B> A: 会。这是有意的安全 throttle。把信任的 hotline 加白名单是去掉 throttle 的正路。</span>,
            <span><B>Q: 拒绝过的调用会自动重新发起吗？</B> A: 不会。拒绝是终态。如果想以后放行，加白名单或改模式。</span>,
            <span><B>Q: Hotline 名字里的 @v1 / @v2 是什么？</B> A: 版本号。Responder 升级 hotline schema 时通过 bump 版本号确保 Caller 不被破坏。</span>,
            <span><B>Q: console 多语言怎么改？</B> A: 当前只有 zh-CN；i18n 在 Phase 2。</span>,
            <span><B>Q: console 的数据存在哪？</B> A: 本机 SQLite（路径在 Runtime 页可见）；平台模式下只同步发布的 hotline 元数据。</span>,
            <span><B>Q: 我能贡献 hotline 给社区吗？</B> A: 开平台模式 + 在 Hotline 管理里点「提交审核」。</span>,
          ]}
        />
      </>
    ),
  },
  {
    anchor: "feedback",
    title: "8. 反馈与报告问题",
    icon: MessageSquareWarning,
    why: "卡住了不知道咋办？这章告诉你怎么把问题给我们。",
    body: () => (
      <>
        <P>
          点下面的按钮会做三件事：① 拉本机的诊断包（最近日志 + 进程状态 + 配置脱敏）下载到本地；
          ② 把 GitHub issue 模板自动复制到剪贴板；③ 打开 GitHub issue 创建页。
        </P>
        <ConsoleButton variant="ink">
          <MessageSquareWarning className="h-3.5 w-3.5" />
          生成诊断包并打开 GitHub issue
        </ConsoleButton>
        <Callout tone="info">
          诊断包默认<B>不</B>包含：调用的 input/output、auth token、平台 URL 之外的网络配置。
          上传前你可以本地打开 zip 检查。
        </Callout>
      </>
    ),
  },
];

/* ── Page ───────────────────────────────────────────────────────────── */

export function ConsolePageHelp() {
  const location = useLocation();
  const initialAnchor = location.hash.slice(1);
  const [activeAnchor, setActiveAnchor] = useState(
    initialAnchor && ARTICLES.some((a) => a.anchor === initialAnchor)
      ? initialAnchor
      : ARTICLES[0].anchor,
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter((a) =>
      [a.title, a.why, a.anchor].some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  useEffect(() => {
    if (initialAnchor) {
      const el = document.getElementById(initialAnchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialAnchor]);

  return (
    <>
      <ConsolePageHeader
        kicker="HELP · 上手 & 帮助"
        title="使用指南"
        description="所有上手、概念、故障排查都在这里。卡住了不需要离开 console。"
      />

      <SearchBox value={query} onChange={setQuery} />

      <div className="grid grid-cols-12 gap-6 mt-4">
        <aside className="col-span-3">
          <div className="sticky top-4">
            <Toc
              articles={filtered}
              active={activeAnchor}
              onSelect={(a) => setActiveAnchor(a)}
            />
          </div>
        </aside>

        <div className="col-span-9 flex flex-col gap-6">
          {filtered.length === 0 ? (
            <ConsoleCard className="text-[12.5px] text-[var(--brand-muted)]">
              没有匹配「{query}」的章节。试试更短的关键词，或者{" "}
              <a
                href="https://github.com/anyone/delegated-execution-dev/issues"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--ink)]"
              >
                到 GitHub 提问
              </a>
              。
            </ConsoleCard>
          ) : (
            filtered.map((a) => <ArticleBlock key={a.anchor} article={a} />)
          )}
        </div>
      </div>
    </>
  );
}

/* ── TOC ────────────────────────────────────────────────────────────── */

function Toc({
  articles,
  active,
  onSelect,
}: {
  articles: Article[];
  active: string;
  onSelect: (anchor: string) => void;
}) {
  return (
    <ConsoleCard padded={false}>
      <div className="px-4 py-2 border-b text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]" style={{ borderColor: "var(--border)" }}>
        目录
      </div>
      <ul className="py-2">
        {articles.map((a) => {
          const Icon = a.icon;
          const isActive = a.anchor === active;
          return (
            <li key={a.anchor}>
              <a
                href={`#${a.anchor}`}
                onClick={() => onSelect(a.anchor)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium",
                  isActive
                    ? "bg-white c-ink-border c-shadow-1 text-[var(--ink)] mx-2"
                    : "text-[var(--brand-muted)] hover:text-[var(--ink)] hover:bg-[var(--brand-secondary)]/40 mx-2",
                )}
                style={{ borderRadius: "var(--c-radius)" }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1 truncate">{a.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </ConsoleCard>
  );
}

/* ── Article block ──────────────────────────────────────────────────── */

function ArticleBlock({ article }: { article: Article }) {
  const Icon = article.icon;
  return (
    <ConsoleCard id={article.anchor} className="scroll-mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-[var(--ink)]" strokeWidth={2.5} />
        <h2 className="text-[18px] font-semibold tracking-tight text-[var(--ink)]">{article.title}</h2>
      </div>
      <p className="text-[12.5px] text-[var(--brand-muted)] mb-4 italic leading-relaxed">
        {article.why}
      </p>
      <div className="flex flex-col gap-3 text-[13.5px] text-[var(--ink)] leading-relaxed">
        {article.body()}
      </div>
    </ConsoleCard>
  );
}

/* ── Reusable bits ──────────────────────────────────────────────────── */

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-[var(--ink)]">{children}</strong>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="console-mono text-[12px] bg-[var(--brand-secondary)]/60 px-1 py-px text-[var(--ink)]" style={{ borderRadius: "var(--c-radius-sm)" }}>
      {children}
    </code>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <ChevronRight className="h-3 w-3 mt-1 shrink-0 text-[var(--brand-muted)]" strokeWidth={2.5} />
          <span className="flex-1 leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({
  steps,
}: {
  steps: { n: number; title: string; desc: string; cta?: { href: string; label: string } }[];
}) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s) => (
        <li
          key={s.n}
          className="flex items-start gap-3 px-3 py-2.5 bg-white border"
          style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius)" }}
        >
          <span
            className="inline-flex items-center justify-center h-6 w-6 text-[11px] font-bold tabular-nums shrink-0 c-ink-border bg-white"
            style={{ borderRadius: "var(--c-radius-pill)" }}
          >
            {s.n}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)]">{s.title}</p>
            <p className="text-[12px] text-[var(--brand-muted)] leading-snug mt-0.5">{s.desc}</p>
          </div>
          {s.cta && (
            <Link to={s.cta.href} className="shrink-0">
              <ConsoleButton variant="ghost">
                {s.cta.label}
                <ChevronRight className="h-3 w-3" />
              </ConsoleButton>
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

function Compare({
  rows,
}: {
  rows: { label: string; left: string; leftSub?: string; right: string; rightSub?: string }[];
}) {
  return (
    <div className="overflow-hidden border" style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius)" }}>
      <table className="w-full text-[12.5px]">
        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
          {rows.map((r) => (
            <tr key={r.label} className="bg-white">
              <th className="text-left px-3 py-2.5 align-top font-mono text-[11px] uppercase tracking-wider text-[var(--brand-muted)] w-32">
                {r.label}
              </th>
              <td className="px-3 py-2.5 align-top border-x" style={{ borderColor: "var(--border)" }}>
                <p className="font-semibold text-[var(--ink)]">{r.left}</p>
                {r.leftSub && <p className="text-[var(--brand-muted)] mt-0.5">{r.leftSub}</p>}
              </td>
              <td className="px-3 py-2.5 align-top">
                <p className="font-semibold text-[var(--ink)]">{r.right}</p>
                {r.rightSub && <p className="text-[var(--brand-muted)] mt-0.5">{r.rightSub}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) {
  const cls = tone === "warn" ? "c-status-warn" : "c-status-info";
  return (
    <div
      className={cn("px-3 py-2 leading-relaxed text-[12.5px]", cls)}
      style={{ borderRadius: "var(--c-radius-sm)" }}
    >
      {children}
    </div>
  );
}

function Cta({ href, label }: { href: string; label: string }) {
  return (
    <Link to={href} className="inline-flex">
      <ConsoleButton>
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </ConsoleButton>
    </Link>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-white border"
      style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius)" }}
    >
      <Search className="h-3.5 w-3.5 text-[var(--brand-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜帮助：试试「试拨」「白名单」「平台模式」"
        className="flex-1 bg-transparent text-[12.5px] text-[var(--ink)] placeholder:text-[var(--brand-muted)]/70 outline-none"
      />
    </div>
  );
}
