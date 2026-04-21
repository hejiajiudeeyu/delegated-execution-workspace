/**
 * Console pattern: General / Dashboard.
 *
 * Mirror of `ops-console/src/pages/general/DashboardPage.tsx`.
 * See `docs/console-content-spec.md §1` for the content contract — every
 * region in this file is justified there with what / why / data / actions.
 *
 * The static data here is a "dumb instance" of the real status payload:
 * field names, enums, and shape match `GET /status`. Numbers are illustrative
 * only — never invent metrics that do not exist in the real product
 * (no sparklines, no QPS, no SLA %, no activity feed).
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Server,
  Zap,
  Wifi,
  Globe,
  UserPlus,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  PackageSearch,
  Info,
  type LucideIcon,
} from "lucide-react";

import { ConsolePageHeader, ConsoleCard, ConsoleButton } from "../shells/console-shell";
import { cn } from "@/app/components/ui/utils";

/* ── Static "dumb instance" of real /status payload ─────────────────── */

type Health = "ok" | "down" | "unknown" | "disabled";

const STATUS = {
  callerRegistered: true,
  responderEnabled: true,
  responderId: "responder-local-1",
  hotlineCount: 3,
  pendingReviewCount: 0,
  /** Past 24h request count (used by NextUp summary). */
  requestsCount: 12,
  todayCount: 7,
  /** Per-status counts derived from /requests (mocked). */
  pendingApprovalsCount: 2,
  failedLast1hCount: 0,
  lastActivityRelative: "12 min ago",
  platform: {
    enabled: false,
    baseUrl: "https://platform.delegated-execution.dev",
    reachable: null as boolean | null,
  },
  runtime: {
    caller: { health: "ok" as Health, pid: 18421, lastError: null as string | null },
    responder: { health: "ok" as Health, pid: 18432, lastError: null as string | null },
    relay: { health: "down" as Health, pid: null as number | null, lastError: "ECONNREFUSED 127.0.0.1:8090" },
  },
};

/* ── Page ───────────────────────────────────────────────────────────── */

export function ConsolePageDashboard() {
  return (
    <>
      <ConsolePageHeader
        kicker="GENERAL · 工作台"
        title="工作台"
        description="本机进程健康、Caller / Responder 启用情况、首次上手进度。"
        actions={
          <>
            <ConsoleButton variant="ghost">
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </ConsoleButton>
          </>
        }
      />

      {!STATUS.callerRegistered && <CallerOnboardingCard />}
      <NextUpCard />
      <PlatformModeCard />
      {STATUS.platform.enabled && STATUS.platform.reachable === false && <PlatformUnreachableAlert />}

      <SectionLabel title="进程健康" hint="本机 4 个核心进程的实时状态" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HealthLamp
          icon={Server}
          label="Caller 进程"
          health={STATUS.runtime.caller.health}
          accent="caller"
          subtitle={pidLabel(STATUS.runtime.caller.pid)}
        />
        <HealthLamp
          icon={Zap}
          label="Responder 进程"
          health={STATUS.responderEnabled ? STATUS.runtime.responder.health : "disabled"}
          accent="responder"
          subtitle={STATUS.responderEnabled ? pidLabel(STATUS.runtime.responder.pid) : "未启用"}
        />
        <HealthLamp
          icon={Wifi}
          label="Relay"
          health={STATUS.runtime.relay.health}
          accent="platform"
          subtitle={STATUS.runtime.relay.health === "down" ? "ECONNREFUSED" : pidLabel(STATUS.runtime.relay.pid)}
        />
        <HealthLamp
          icon={Globe}
          label="Platform API"
          health={
            !STATUS.platform.enabled
              ? "disabled"
              : STATUS.platform.reachable === null
                ? "unknown"
                : STATUS.platform.reachable
                  ? "ok"
                  : "down"
          }
          accent="client"
          subtitle={STATUS.platform.enabled ? "已开启" : "本地模式"}
        />
      </div>

      <SectionLabel title="首次上手流程" hint="完成所有步骤后即可端到端跑通调用" />
      <ConsoleCard>
        <ol className="flex flex-col gap-2">
          {ONBOARDING_STEPS.map((step) => (
            <OnboardingStepRow key={step.n} step={step} />
          ))}
        </ol>
      </ConsoleCard>

      <SectionLabel title="服务健康度" hint="进程异常时可在此直接重启" />
      <ConsoleCard padded={false}>
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          <ServiceRow
            name="caller-controller"
            health={STATUS.runtime.caller.health}
            statusText={STATUS.callerRegistered ? "已注册" : "未注册"}
            error={STATUS.runtime.caller.lastError}
          />
          <ServiceRow
            name="responder-controller"
            health={STATUS.responderEnabled ? STATUS.runtime.responder.health : "disabled"}
            statusText={STATUS.responderEnabled ? "ok" : "disabled"}
            error={STATUS.runtime.responder.lastError}
          />
          <ServiceRow
            name="transport-relay"
            health={STATUS.runtime.relay.health}
            statusText={STATUS.runtime.relay.health === "down" ? "down" : "ok"}
            error={STATUS.runtime.relay.lastError}
          />
          <ServiceRow
            name="platform-api"
            health={
              !STATUS.platform.enabled
                ? "disabled"
                : STATUS.platform.reachable === null
                  ? "unknown"
                  : STATUS.platform.reachable
                    ? "ok"
                    : "down"
            }
            statusText={
              !STATUS.platform.enabled
                ? "本地模式"
                : STATUS.platform.reachable === null
                  ? "检测中…"
                  : STATUS.platform.reachable
                    ? "可达"
                    : "不可达"
            }
            error={null}
            noRestart
          />
        </ul>
      </ConsoleCard>

      {STATUS.responderEnabled && <ResponderSummaryCard />}
    </>
  );
}

/* ── NextUp card (always present, 6-state state machine) ───────────────
 * Spec: docs/console-content-spec.md §1.5b
 *
 * This card is the user's "what now" pointer. It is computed once per render
 * from the same status / requests / approvals data the Dashboard already has;
 * the priority is fixed and short-circuits at the first match.
 */

type NextUpState =
  | { kind: "needs_caller_register" }
  | { kind: "has_pending_approvals"; count: number }
  | { kind: "has_recent_failures"; count: number }
  | { kind: "needs_first_hotline" }
  | { kind: "needs_first_call" }
  | { kind: "all_normal"; lastActivityRelative: string; todayCount: number };

function computeNextUpState(): NextUpState {
  if (!STATUS.callerRegistered) return { kind: "needs_caller_register" };
  if (STATUS.pendingApprovalsCount > 0)
    return { kind: "has_pending_approvals", count: STATUS.pendingApprovalsCount };
  if (STATUS.failedLast1hCount > 0)
    return { kind: "has_recent_failures", count: STATUS.failedLast1hCount };
  if (STATUS.hotlineCount === 0 && !STATUS.platform.enabled)
    return { kind: "needs_first_hotline" };
  if (STATUS.requestsCount === 0) return { kind: "needs_first_call" };
  return {
    kind: "all_normal",
    lastActivityRelative: STATUS.lastActivityRelative,
    todayCount: STATUS.todayCount,
  };
}

type NextUpCopy = {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Tailwind class for the 3px left border color. */
  borderClass: string;
  primaryCta?: { label: string; href: string };
  secondaryLinks?: { label: string; href: string }[];
};

function nextUpCopy(state: NextUpState): NextUpCopy {
  switch (state.kind) {
    case "needs_caller_register":
      return {
        icon: UserPlus,
        title: "先把 Caller 注册了",
        body: "注册之后才能搜 Hotline、试拨、收审批。30 秒搞定。",
        borderClass: "border-l-[var(--c-status-error-fg)]",
        primaryCta: {
          label: "立即注册",
          href: "/caller/register?from=dashboard-nextup",
        },
        secondaryLinks: [{ label: "了解 Caller 是什么", href: "/console/help#what-is-caller" }],
      };
    case "has_pending_approvals":
      return {
        icon: ShieldAlert,
        title: `你有 ${state.count} 个调用等审批`,
        body: `这 ${state.count} 条是 Agent 帮你发起的；审批后 Responder 才会执行。`,
        borderClass: "border-l-[var(--brand-yellow)]",
        primaryCta: {
          label: "去审批",
          href: "/console/approvals?from=dashboard-nextup",
        },
        secondaryLinks: [{ label: "换成自动放行模式", href: "/console/preferences" }],
      };
    case "has_recent_failures":
      return {
        icon: AlertCircle,
        title: `最近 1 小时有 ${state.count} 次调用失败`,
        body: "看看哪一条出了问题。常见原因：Responder 离线 / 上游超时 / 鉴权过期。",
        borderClass: "border-l-[var(--c-status-error-fg)]",
        primaryCta: {
          label: "查看失败",
          href: "/console/calls?filter=failed&from=dashboard-nextup",
        },
        secondaryLinks: [{ label: "Runtime 日志", href: "/console/runtime" }],
      };
    case "needs_first_hotline":
      return {
        icon: PackageSearch,
        title: "你还没有任何 Hotline 可调",
        body: "两条路：让你的 Responder 发布一个，或者开启平台模式浏览社区已发布的。",
        borderClass: "border-l-[var(--brand-teal)]",
        primaryCta: {
          label: "去 Catalog",
          href: "/console/catalog?from=dashboard-nextup",
        },
        secondaryLinks: [{ label: "开启平台模式", href: "/console/dashboard" }],
      };
    case "needs_first_call":
      return {
        icon: Sparkles,
        title: "试拨一次跑通端到端",
        body: "从 Catalog 选一个，5 秒内能看到第一条记录。",
        borderClass: "border-l-[var(--brand-teal)]",
        primaryCta: {
          label: "打开 Catalog",
          href: "/console/catalog?from=dashboard-nextup",
        },
        secondaryLinks: [{ label: "什么是 Hotline", href: "/console/help#what-is-hotline" }],
      };
    case "all_normal":
      return {
        icon: CheckCircle2,
        title: "一切正常 ✓",
        body: `上次活动 ${state.lastActivityRelative} · 今日已完成调用 ${state.todayCount} · 没有待审批`,
        borderClass: "border-l-[var(--c-status-success-fg)]",
        secondaryLinks: [
          { label: "查看最近调用", href: "/console/calls" },
          { label: "日志", href: "/console/runtime" },
        ],
      };
  }
}

function NextUpCard() {
  const state = computeNextUpState();
  const copy = nextUpCopy(state);
  const Icon = copy.icon;
  return (
    <ConsoleCard className={cn("border-l-[3px]", copy.borderClass)}>
      <div className="flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center h-9 w-9 c-ink-border bg-white shrink-0"
          style={{ borderRadius: "var(--c-radius)" }}
        >
          <Icon className="h-4 w-4 text-[var(--ink)]" strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)]">
              下一步
            </span>
            <span className="text-[10.5px] text-[var(--brand-muted)]/70">
              · 自动判断当前最该处理的事
            </span>
          </div>
          <p className="text-[14px] font-semibold text-[var(--ink)] mt-0.5">{copy.title}</p>
          <p className="text-[12.5px] text-[var(--brand-muted)] mt-0.5 leading-relaxed">
            {copy.body}
          </p>
          {copy.secondaryLinks && copy.secondaryLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {copy.secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-[11.5px] font-medium text-[var(--brand-muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5"
                >
                  {link.label}
                  <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                </Link>
              ))}
            </div>
          )}
        </div>
        {copy.primaryCta && (
          <Link to={copy.primaryCta.href} className="shrink-0">
            <ConsoleButton>
              {copy.primaryCta.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </ConsoleButton>
          </Link>
        )}
      </div>
    </ConsoleCard>
  );
}

/* ── Caller onboarding (conditional) ────────────────────────────────── */

function CallerOnboardingCard() {
  return (
    <ConsoleCard className="border-l-[3px] border-l-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_8%,transparent)]">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center h-9 w-9 c-ink-border bg-[var(--brand-teal)]"
          style={{ borderRadius: "var(--c-radius)" }}
        >
          <UserPlus className="h-4 w-4 text-white" strokeWidth={2.5} />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-[var(--ink)]">注册 Caller，解锁 Hotline 调用能力</p>
          <p className="text-[12.5px] text-[var(--brand-muted)] mt-0.5 leading-relaxed">
            还没有 Caller 身份。先注册才能浏览 Hotline 目录、发起调用、查看审批。
          </p>
        </div>
        <ConsoleButton variant="ink">
          立即注册
          <ChevronRight className="h-3.5 w-3.5" />
        </ConsoleButton>
      </div>
    </ConsoleCard>
  );
}

/* ── Platform mode toggle ───────────────────────────────────────────── */

function PlatformModeCard() {
  const enabled = STATUS.platform.enabled;
  return (
    <div className="space-y-3">
      <ConsoleCard
        className={cn(
          enabled && "border-l-[3px] border-l-[var(--brand-purple)] bg-[color-mix(in_oklab,var(--brand-purple)_6%,transparent)]",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[var(--ink)]">
              {enabled ? "平台发布已开启" : "当前为本地模式"}
            </p>
            <p className="text-[12.5px] text-[var(--brand-muted)] mt-0.5 leading-relaxed">
              {enabled
                ? "Hotline 会先在本地生成草稿，再决定是否提交到平台 catalog。Platform URL: "
                : "本机所有 Hotline / 调用都不会推到平台。Platform URL（已配置但未启用）: "}
              <code className="console-mono text-[var(--ink)]">{STATUS.platform.baseUrl}</code>
            </p>
          </div>
          <ConsoleButton variant={enabled ? "ghost" : "ink"}>
            {enabled ? "关闭平台发布" : "开启平台发布"}
          </ConsoleButton>
        </div>
      </ConsoleCard>
      {!enabled && <PlatformValueDisclosure />}
    </div>
  );
}

/* ── L9 · 「为什么要开平台模式」价值对比卡（spec §1.2b） ────────────── */

function PlatformValueDisclosure() {
  const [open, setOpen] = useState(false);
  return (
    <ConsoleCard className="bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5 text-[var(--brand-purple)]" strokeWidth={2.5} />
        <span className="text-[12.5px] font-semibold text-[var(--ink)]">
          为什么要开平台模式？
        </span>
        <span className="text-[11.5px] text-[var(--brand-muted)] hidden sm:inline">
          一句话：本地模式只跑你自己的 Hotline；平台模式让 Agent 也能调用社区已发布的能力。
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-[var(--brand-muted)] transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </button>
      {open && (
        <div
          className="mt-3 pt-3 border-t overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="grid grid-cols-[140px_1fr_1fr] text-[11.5px] border c-ink-border"
            style={{ borderRadius: "var(--c-radius-sm)" }}
          >
            <CompareHead label="" />
            <CompareHead label="本地模式 · 当前" tone="muted" />
            <CompareHead label="平台模式" tone="purple" />

            <CompareRow
              label="可调用的 Hotline"
              local="只有本机自己写 / 启动的 Hotline"
              platform="本机 + 平台 catalog 里 official / 社区发布的 Hotline"
            />
            <CompareRow
              label="新能力来源"
              local="必须自己实现 + 启动 Responder"
              platform="可以直接「订阅」别人发的，免去自己写"
            />
            <CompareRow
              label="发布你的 Hotline"
              local="只能本机消费 — 别人调不到"
              platform="可发到平台让其他 caller 用，可设可见性 / 计费"
            />
            <CompareRow
              label="数据流向"
              local="所有调用日志只在本机 SQLite"
              platform="本机日志 + 你主动 publish 的 Hotline 元信息上行（请求体不上行）"
            />
            <CompareRow
              label="网络要求"
              local="纯离线可跑"
              platform="需要能 ping 通 platform.baseUrl"
            />
            <CompareRow
              label="什么时候不该开"
              local="—"
              platform="完全离线 / 强隐私场景 / 还在本地试 Hotline 时"
              tone="warn"
            />
          </div>
          <p className="mt-2.5 text-[11px] text-[var(--brand-muted)] leading-relaxed">
            开关动作只切换「客户端是否连接 Platform」。已发布的 Hotline 不会因为你关掉就下架。
          </p>
        </div>
      )}
    </ConsoleCard>
  );
}

function CompareHead({ label, tone }: { label: string; tone?: "muted" | "purple" }) {
  return (
    <div
      className={cn(
        "px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.12em] uppercase border-b",
        tone === "purple"
          ? "bg-[color-mix(in_oklab,var(--brand-purple)_10%,transparent)] text-[var(--brand-purple)]"
          : tone === "muted"
            ? "bg-[var(--brand-secondary)]/40 text-[var(--brand-muted)]"
            : "bg-[var(--brand-secondary)]/20 text-[var(--brand-muted)]",
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {label}
    </div>
  );
}

function CompareRow({
  label,
  local,
  platform,
  tone,
}: {
  label: string;
  local: string;
  platform: string;
  tone?: "warn";
}) {
  return (
    <>
      <div
        className="px-2.5 py-1.5 text-[var(--brand-muted)] font-medium border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {label}
      </div>
      <div
        className="px-2.5 py-1.5 text-[var(--ink)] border-t border-l"
        style={{ borderColor: "var(--border)" }}
      >
        {local}
      </div>
      <div
        className={cn(
          "px-2.5 py-1.5 border-t border-l leading-snug",
          tone === "warn" ? "text-[var(--c-status-warn-fg)] bg-[var(--c-status-warn-bg)]/40" : "text-[var(--ink)]",
        )}
        style={{ borderColor: "var(--border)" }}
      >
        {platform}
      </div>
    </>
  );
}

function PlatformUnreachableAlert() {
  return (
    <div
      className="px-4 py-3 c-status-warn flex items-start gap-3"
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <span className="c-dot bg-[var(--c-status-warn-fg)]" />
      <div className="flex-1">
        <p className="text-[12.5px] font-semibold">Platform API 不可达</p>
        <p className="text-[12px] mt-0.5 leading-relaxed opacity-90">
          已开启平台发布，但 <code className="console-mono">{STATUS.platform.baseUrl}</code> ping
          不通。请启动平台服务，或确认 Platform URL 配置正确。
        </p>
      </div>
    </div>
  );
}

/* ── Health lamp (4-grid) ───────────────────────────────────────────── */

function HealthLamp({
  icon: Icon,
  label,
  health,
  accent,
  subtitle,
}: {
  icon: LucideIcon;
  label: string;
  health: Health;
  accent: "caller" | "responder" | "platform" | "client";
  subtitle: string;
}) {
  const accentBg: Record<typeof accent, string> = {
    caller: "bg-[var(--brand-teal)]",
    responder: "bg-[var(--brand-orange)]",
    platform: "bg-[var(--brand-purple)]",
    client: "bg-[var(--brand-blue)]",
  };
  return (
    <ConsoleCard padded={false}>
      <div className="flex items-start justify-between px-4 pt-3">
        <span className="text-[12px] font-medium text-[var(--brand-muted)]">{label}</span>
        <span
          className={cn(
            "inline-flex items-center justify-center h-6 w-6 c-ink-border-2 text-[var(--ink)]",
            accentBg[accent],
          )}
          style={{ borderRadius: "var(--c-radius-sm)" }}
        >
          <Icon className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </div>
      <div className="px-4 pb-4 pt-2 flex items-center gap-2">
        <HealthDot health={health} />
        <span className="text-[16px] font-semibold tabular-nums text-[var(--ink)]">
          {healthLabel(health)}
        </span>
      </div>
      <div
        className="px-4 py-2 border-t text-[11.5px] text-[var(--brand-muted)] truncate console-mono"
        style={{ borderColor: "var(--border)" }}
      >
        {subtitle}
      </div>
    </ConsoleCard>
  );
}

function HealthDot({ health }: { health: Health }) {
  const cls: Record<Health, string> = {
    ok: "bg-[var(--c-status-success-fg)]",
    down: "bg-[var(--c-status-error-fg)] animate-pulse",
    unknown: "bg-[var(--brand-muted)]/50",
    disabled: "bg-[var(--brand-muted)]/30",
  };
  return <span className={cn("h-2 w-2 rounded-full shrink-0", cls[health])} />;
}

function healthLabel(h: Health): string {
  switch (h) {
    case "ok": return "运行中";
    case "down": return "停止";
    case "unknown": return "—";
    case "disabled": return "未启用";
  }
}

function pidLabel(pid: number | null) {
  return pid != null ? `PID ${pid}` : "—";
}

/* ── Onboarding steps (4 fixed, real triggers) ──────────────────────── */

type OnboardingStep = {
  n: number;
  title: string;
  description: string;
  done: boolean;
  ctaDone: string;
  ctaPending: string;
  /**
   * Step 5 is "试拨第一个 Hotline" — the make-or-break of onboarding.
   * Highlighted differently when not yet done so it can't be ignored.
   */
  isClimax?: boolean;
  href?: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    n: 1,
    title: "注册 Caller",
    description: "先获取 Caller 身份，解锁搜索和调用 Hotline 的能力。",
    done: STATUS.callerRegistered,
    ctaDone: "继续查看",
    ctaPending: "前往注册",
  },
  {
    n: 2,
    title: "启用本地 Responder",
    description: "本地模式下先启用 Responder Runtime，再添加自己的 Hotline。",
    done: STATUS.responderEnabled,
    ctaDone: "继续查看",
    ctaPending: "启用 Responder",
  },
  {
    n: 3,
    title: "添加第一个 Hotline",
    description: "创建本地 Hotline，并生成可检查的配置草稿。",
    done: STATUS.responderEnabled && STATUS.hotlineCount > 0,
    ctaDone: "继续查看",
    ctaPending: "管理 Hotline",
  },
  {
    n: 4,
    title: "查看本地草稿",
    description: "确认输入填写说明、输出结构和本地运行配置，再决定是否发布到平台。",
    done: STATUS.responderEnabled && STATUS.hotlineCount > 0,
    ctaDone: "继续查看",
    ctaPending: "查看草稿",
  },
  {
    n: 5,
    title: "试拨第一个 Hotline",
    description: "打开 Catalog，挑一个带 official 标签的 Hotline 点「试拨」就能验证端到端跑通。",
    done: STATUS.requestsCount > 0,
    ctaDone: "查看记录",
    ctaPending: "打开 Catalog",
    /** Step 5 is the make-or-break step of the onboarding — see spec §1.5. */
    isClimax: true,
    href: "/console/catalog?from=dashboard-onboarding",
  },
];

function OnboardingStepRow({ step }: { step: OnboardingStep }) {
  const climaxPending = step.isClimax && !step.done;
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 border",
        step.done
          ? "bg-[var(--c-status-success-bg)]/40 border-[var(--c-status-success-fg)]/25"
          : climaxPending
            ? "bg-[color-mix(in_oklab,var(--brand-teal)_8%,transparent)] border-l-[3px] border-l-[var(--brand-teal)]"
            : "bg-white",
      )}
      style={{
        borderRadius: "var(--c-radius)",
        borderColor: step.done
          ? undefined
          : climaxPending
            ? undefined
            : "var(--border)",
      }}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center h-6 w-6 text-[11px] font-bold tabular-nums shrink-0",
          step.done
            ? "bg-[var(--c-status-success-fg)] text-white"
            : climaxPending
              ? "c-ink-border-2 bg-[var(--brand-teal)] text-white"
              : "c-ink-border bg-white text-[var(--ink)]",
        )}
        style={{ borderRadius: "var(--c-radius-pill)" }}
      >
        {step.done ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> : step.n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
          {step.title}
          {climaxPending && (
            <span className="c-status c-status-info">关键 · 不要跳过</span>
          )}
        </p>
        <p className="text-[11.5px] text-[var(--brand-muted)] mt-0.5 leading-snug">
          {step.description}
        </p>
      </div>
      {step.href ? (
        <Link to={step.href} className="shrink-0">
          <ConsoleButton variant={step.done ? "ghost" : climaxPending ? "primary" : "ink"}>
            {step.done ? step.ctaDone : step.ctaPending}
            <ChevronRight className="h-3 w-3" />
          </ConsoleButton>
        </Link>
      ) : (
        <ConsoleButton variant={step.done ? "ghost" : "ink"}>
          {step.done ? step.ctaDone : step.ctaPending}
          <ChevronRight className="h-3 w-3" />
        </ConsoleButton>
      )}
    </li>
  );
}

/* ── Service health row (with restart) ──────────────────────────────── */

function ServiceRow({
  name,
  health,
  statusText,
  error,
  noRestart,
}: {
  name: string;
  health: Health;
  statusText: string;
  error: string | null;
  noRestart?: boolean;
}) {
  const showRestart = !noRestart && health === "down";
  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      <HealthDot health={health} />
      <span className="font-mono text-[12.5px] text-[var(--ink)] console-mono w-56 shrink-0 truncate">
        {name}
      </span>
      <span className="text-[12px] text-[var(--brand-muted)] flex-1 truncate">
        {statusText}
        {error && (
          <span className="ml-2 text-[var(--c-status-error-fg)]">· {error}</span>
        )}
      </span>
      {showRestart && (
        <ConsoleButton variant="ghost">
          <RefreshCw className="h-3 w-3" />
          重启
        </ConsoleButton>
      )}
    </li>
  );
}

/* ── Responder summary (conditional) ────────────────────────────────── */

function ResponderSummaryCard() {
  return (
    <ConsoleCard>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-[var(--brand-orange)]" strokeWidth={2.5} />
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">Responder 摘要</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[12.5px]">
        <SummaryItem label="Responder ID" value={STATUS.responderId} mono />
        <SummaryItem label="Hotline 总数" value={String(STATUS.hotlineCount)} bold />
        <SummaryItem
          label="待审核"
          value={STATUS.platform.enabled ? String(STATUS.pendingReviewCount) : "本地模式"}
          bold={STATUS.platform.enabled}
        />
      </div>
    </ConsoleCard>
  );
}

function SummaryItem({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-[var(--ink)]",
          mono && "console-mono text-[12px]",
          bold && "text-[15px] font-semibold tabular-nums",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Misc ───────────────────────────────────────────────────────────── */

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mt-2">
      <h2 className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
        <ChevronRight className="h-3 w-3" strokeWidth={3} />
        {title}
      </h2>
      {hint && <span className="text-[11px] text-[var(--brand-muted)]">{hint}</span>}
    </div>
  );
}
