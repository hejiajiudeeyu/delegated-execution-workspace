/**
 * Console pattern: Caller / Approvals — 审批中心.
 *
 * Mirrors `ops-console/src/pages/caller/CallerApprovalsPage.tsx`.
 * Spec: `docs/console-content-spec.md §4`.
 *
 * Demonstrates two key UX additions from spec:
 *   - §4.0b · M7 「审批疲劳」横幅 (3 trigger types)
 *   - §4.3 · M6 加白名单后教育 popover (mode-aware copy)
 */

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldPlus,
  Info,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  ConsolePageHeader,
  ConsoleCard,
  ConsoleButton,
} from "../shells/console-shell";
import { cn } from "@/app/components/ui/utils";

/* ── Types & mock data ──────────────────────────────────────────────── */

type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
type ApprovalMode = "manual" | "allow_listed" | "allow_all";
type RiskSeverity = "high" | "medium" | "low" | "info";

type RiskFactor = { severity: RiskSeverity; label: string; description: string };

type Execution =
  | {
      status: "running";
      responder_id: string;
      started_at: string;
    }
  | {
      status: "succeeded";
      responder_id: string;
      finished_at: string;
      duration_ms: number;
      human_summary: string;
      result_fields: { label: string; value: string; primary?: boolean }[];
      usage?: { tokens?: number; cost_cny?: number };
    }
  | {
      status: "failed";
      responder_id: string;
      finished_at: string;
      duration_ms: number;
      error: { code: string; message: string };
    };

type ApprovalRecord = {
  id: string;
  request_id: string;
  hotline_id: string;
  hotline_display_name: string;
  agent_session_id: string;
  purpose?: string;
  input_summary?: string;
  risk_factors: RiskFactor[];
  overall_risk: RiskSeverity;
  status: ApprovalStatus;
  created_at: string;
  expires_at?: string;
  decided_at?: string;
  decided_by?: "you";
  rejected_reason?: string;
  execution?: Execution;
};

const RECORDS: ApprovalRecord[] = [
  {
    id: "apv_2026-04-17T140905",
    request_id: "req_2026-04-17T140905_calendar-create-014",
    hotline_id: "local.demo.calendar.create-event.v1",
    hotline_display_name: "日历创建日程",
    agent_session_id: "ops-agent · session #4821",
    purpose: "Agent 帮你约的客户拜访",
    input_summary: "客户拜访 · ACME Inc. · 周日 15:00 · 60min",
    risk_factors: [
      { severity: "low", label: "写动作", description: "会修改外部日历" },
      { severity: "info", label: "复用 OAuth", description: "已授权 Google Calendar，无需二次授权" },
    ],
    overall_risk: "low",
    status: "pending",
    created_at: "2026-04-17 14:09:01",
    expires_at: "2026-04-17 14:24:01",
  },
  {
    id: "apv_2026-04-17T140820",
    request_id: "req_2026-04-17T140820_db-query-088",
    hotline_id: "local.demo.db.query.v1",
    hotline_display_name: "数据库查询",
    agent_session_id: "ops-agent · session #4821",
    purpose: "Agent 想查 user_id=usr_18429 的最近订单",
    input_summary: "SELECT … WHERE user_id='usr_18429' LIMIT 20",
    risk_factors: [
      { severity: "medium", label: "读敏感表", description: "users / orders 表包含 PII" },
    ],
    overall_risk: "medium",
    status: "pending",
    created_at: "2026-04-17 14:08:20",
    expires_at: "2026-04-17 14:23:20",
  },
  {
    id: "apv_2026-04-17T140521",
    request_id: "req_2026-04-17T140521_payment-charge-001",
    hotline_id: "local.demo.payment.charge.v1",
    hotline_display_name: "支付扣款",
    agent_session_id: "ops-agent · session #4820",
    purpose: "Agent 想完成订单 ord_7821 的扣款",
    input_summary: "amount=¥420 · order=ord_7821 · method=alipay",
    risk_factors: [
      { severity: "high", label: "金额操作", description: "非可逆 · 涉及真实付款" },
      { severity: "medium", label: "无幂等键", description: "重复执行可能多次扣款" },
    ],
    overall_risk: "high",
    status: "pending",
    created_at: "2026-04-17 14:05:21",
    expires_at: "2026-04-17 14:20:21",
  },
  {
    id: "apv_2026-04-17T140423",
    request_id: "req_2026-04-17T140423_slack-notify-002",
    hotline_id: "local.demo.slack.notify.v1",
    hotline_display_name: "Slack 通知",
    agent_session_id: "ops-agent · session #4819",
    purpose: "推送一条状态报告",
    input_summary: "channel=#ops · message=「日报已生成」",
    risk_factors: [],
    overall_risk: "info",
    status: "approved",
    created_at: "2026-04-17 14:04:23",
    decided_at: "2026-04-17 14:04:30",
    decided_by: "you",
    execution: {
      status: "succeeded",
      responder_id: "responder-local-1",
      finished_at: "2026-04-17 14:04:31",
      duration_ms: 320,
      human_summary: "消息已送达 #ops 频道（message_id M-7822）",
      result_fields: [{ label: "消息 ID", value: "M-7822", primary: true }],
    },
  },
  {
    id: "apv_2026-04-17T140742",
    request_id: "req_2026-04-17T140742_search-web-022",
    hotline_id: "local.demo.web-search.v1",
    hotline_display_name: "网页搜索",
    agent_session_id: "ops-agent · session #4820",
    purpose: "Agent 想查 Q2 跨境电商监管动态",
    input_summary: "query=2026 Q2 中国跨境电商监管变化",
    risk_factors: [
      { severity: "medium", label: "外部联网", description: "调用 web search provider" },
    ],
    overall_risk: "medium",
    status: "rejected",
    created_at: "2026-04-17 14:07:42",
    decided_at: "2026-04-17 14:07:50",
    decided_by: "you",
    rejected_reason: "未命中信任名单",
  },
];

/* ── Page ───────────────────────────────────────────────────────────── */

const FILTER_TABS: { value: ApprovalStatus | "all"; label: string }[] = [
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已批准" },
  { value: "rejected", label: "已拒绝" },
  { value: "expired", label: "已过期" },
  { value: "all", label: "全部" },
];

export function ConsolePageApprovals() {
  const [search] = useSearchParams();
  const focusId = search.get("focus");
  const [tab, setTab] = useState<ApprovalStatus | "all">("pending");
  const [policyMode, setPolicyMode] = useState<ApprovalMode>("manual");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [whitelistFeedback, setWhitelistFeedback] = useState<{
    targetId: string;
    hotlineDisplayName: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return RECORDS;
    return RECORDS.filter((r) => r.status === tab);
  }, [tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0, expired: 0 };
    RECORDS.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, []);

  // Spec §4.0b · M7 trigger demo: in this static prototype we always show
  // the "queue stacking" trigger (≥3 pending here, real threshold ≥5).
  const tiredBannerKind: TiredBannerKind | null = useMemo(() => {
    if (bannerDismissed) return null;
    if (counts.pending >= 3 && policyMode === "manual") {
      return { kind: "queue_backlog", count: counts.pending };
    }
    return null;
  }, [counts.pending, policyMode, bannerDismissed]);

  return (
    <>
      <ConsolePageHeader
        kicker="CALLER · 审批中心"
        title="Hotline 调用审批"
        description="Agent 发起的 Hotline 调用需要你手动审批后才会执行。审批后能看到执行回放。"
        actions={
          <>
            <ConsoleButton variant="ghost">
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </ConsoleButton>
            <ModeChip mode={policyMode} onChange={setPolicyMode} />
          </>
        }
      />

      {focusId && (
        <FocusedRecordHint
          focusId={focusId}
          record={RECORDS.find((r) => r.request_id === focusId)}
        />
      )}

      {tiredBannerKind && (
        <TiredBanner
          kind={tiredBannerKind}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <FilterTabs value={tab} onChange={setTab} counts={counts} />

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          filtered.map((r) => (
            <ApprovalCard
              key={r.id}
              record={r}
              policyMode={policyMode}
              focused={focusId === r.request_id}
              onAddedToWhitelist={() =>
                setWhitelistFeedback({ targetId: r.id, hotlineDisplayName: r.hotline_display_name })
              }
              whitelistPopoverOpen={whitelistFeedback?.targetId === r.id}
              onCloseWhitelistPopover={() => setWhitelistFeedback(null)}
              policyModeForPopover={policyMode}
            />
          ))
        )}
      </div>
    </>
  );
}

/* ── Mode chip in header (lets reviewer flip mode + see M7/M6 reactions) ─ */

function ModeChip({ mode, onChange }: { mode: ApprovalMode; onChange: (m: ApprovalMode) => void }) {
  const modes: { value: ApprovalMode; label: string; tone: "warn" | "info" | "error" }[] = [
    { value: "manual", label: "manual", tone: "warn" },
    { value: "allow_listed", label: "allow_listed", tone: "info" },
    { value: "allow_all", label: "allow_all", tone: "error" },
  ];
  return (
    <div className="inline-flex items-center gap-1 px-1 py-1 bg-white border" style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius-pill)" }}>
      <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)] px-2">mode</span>
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "text-[11.5px] font-semibold px-2 py-0.5",
            mode === m.value
              ? m.tone === "warn"
                ? "bg-[var(--c-status-warn-bg)] text-[var(--c-status-warn-fg)] c-ink-border"
                : m.tone === "info"
                  ? "bg-[var(--c-status-info-bg)] text-[var(--c-status-info-fg)] c-ink-border"
                  : "bg-[var(--c-status-error-bg)] text-[var(--c-status-error-fg)] c-ink-border"
              : "text-[var(--brand-muted)] hover:text-[var(--ink)]",
          )}
          style={{ borderRadius: "var(--c-radius-pill)" }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Focused record hint (deep-link from Calls page) ────────────────── */

function FocusedRecordHint({ focusId, record }: { focusId: string; record?: ApprovalRecord }) {
  return (
    <div
      className="px-3 py-2 c-status-info inline-flex items-center gap-2 text-[12px]"
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>
        从调用记录跳过来定位 {record ? `「${record.hotline_display_name}」` : "请求"}{" "}
        <code className="console-mono text-[10.5px] text-[var(--brand-muted)]">{focusId.slice(0, 28)}…</code>
      </span>
    </div>
  );
}

/* ── M7 · 审批疲劳 banner ───────────────────────────────────────────── */

type TiredBannerKind =
  | { kind: "mode_total"; count: number }
  | { kind: "hotline_repeated"; count: number; hotline_display_name: string }
  | { kind: "queue_backlog"; count: number };

function TiredBanner({ kind, onDismiss }: { kind: TiredBannerKind; onDismiss: () => void }) {
  let title = "";
  let primary: { label: string; href: string } = { label: "", href: "" };
  let secondary: { label: string; href: string } = { label: "", href: "" };
  switch (kind.kind) {
    case "mode_total":
      title = `过去 30 天你手动批准了 ${kind.count} 次 — 切换到「白名单自动放行」可以省下大部分手动操作。`;
      primary = { label: "去切换模式", href: "/console/preferences?from=approvals-tired-banner" };
      secondary = { label: "了解三种模式", href: "/console/help#approvals" };
      break;
    case "hotline_repeated":
      title = `你已经在 7 天内手动批准了 ${kind.count} 次「${kind.hotline_display_name}」 — 加它到白名单后未来调用自动放行。`;
      primary = { label: "加入 Hotline 白名单", href: "/console/access-lists?from=approvals-tired-banner" };
      secondary = { label: "了解白名单", href: "/console/help#approvals" };
      break;
    case "queue_backlog":
      title = `当前有 ${kind.count} 条待审批 — 一次性批准信任的 hotline 后，剩下的会显著少。`;
      primary = { label: "查看信任的 hotline", href: "/console/access-lists" };
      secondary = { label: "了解审批策略", href: "/console/help#approvals" };
      break;
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 bg-[color-mix(in_oklab,var(--brand-yellow)_18%,transparent)] border-l-[3px] border-l-[var(--brand-yellow)] c-ink-border"
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <ShieldAlert className="h-4 w-4 text-[var(--brand-orange)] mt-0.5 shrink-0" strokeWidth={2.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-[var(--ink)] leading-snug">{title}</p>
        <div className="flex items-center gap-2 mt-2">
          <Link to={primary.href}>
            <ConsoleButton>
              {primary.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </ConsoleButton>
          </Link>
          <Link
            to={secondary.href}
            className="text-[11.5px] font-medium text-[var(--brand-muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5"
          >
            {secondary.label}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[var(--brand-muted)] hover:text-[var(--ink)] shrink-0"
        aria-label="关闭"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Filter tabs ────────────────────────────────────────────────────── */

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: ApprovalStatus | "all";
  onChange: (v: ApprovalStatus | "all") => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="inline-flex p-1 bg-[var(--brand-secondary)]/40" style={{ borderRadius: "var(--c-radius)" }}>
      {FILTER_TABS.map((t) => {
        const c = t.value === "all" ? RECORDS.length : counts[t.value] ?? 0;
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold",
              active
                ? "bg-white c-ink-border c-shadow-1 text-[var(--ink)]"
                : "text-[var(--brand-muted)] hover:text-[var(--ink)]",
            )}
            style={{ borderRadius: "var(--c-radius-sm)" }}
          >
            {t.label}
            <span className="text-[10.5px] font-mono tabular-nums opacity-75">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Approval card ──────────────────────────────────────────────────── */

function ApprovalCard({
  record,
  policyMode,
  focused,
  onAddedToWhitelist,
  whitelistPopoverOpen,
  onCloseWhitelistPopover,
  policyModeForPopover,
}: {
  record: ApprovalRecord;
  policyMode: ApprovalMode;
  focused: boolean;
  onAddedToWhitelist: () => void;
  whitelistPopoverOpen: boolean;
  onCloseWhitelistPopover: () => void;
  policyModeForPopover: ApprovalMode;
}) {
  return (
    <ConsoleCard
      className={cn(
        focused && "ring-2 ring-[var(--brand-ink)]",
        record.overall_risk === "high" && "border-l-[3px] border-l-[var(--c-status-error-fg)]",
      )}
    >
      <div className="flex items-start gap-3">
        <RiskIconView severity={record.overall_risk} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold text-[var(--ink)]">
              {record.hotline_display_name}
            </h3>
            <code className="console-mono text-[11px] text-[var(--brand-muted)]">
              {record.hotline_id}
            </code>
            <RiskBadge risk={record.overall_risk} />
            <StatusBadge status={record.status} />
          </div>

          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[12.5px] mt-2.5">
            {record.purpose && <ContextRow label="调用目的" value={record.purpose} />}
            <ContextRow
              label="Agent Session"
              value={
                <code className="console-mono text-[11.5px] text-[var(--ink)]">
                  {record.agent_session_id}
                </code>
              }
            />
            {record.input_summary && (
              <ContextRow
                label="输入摘要"
                value={<span className="text-[var(--ink)]">{record.input_summary}</span>}
              />
            )}
            <ContextRow label="发起时间" value={record.created_at} />
            {record.status === "pending" && record.expires_at && (
              <ContextRow
                label="审批截止"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {record.expires_at}（约 15 分钟）
                  </span>
                }
              />
            )}
            {record.status === "rejected" && record.rejected_reason && (
              <ContextRow
                label="拒绝理由"
                value={<span className="text-[var(--c-status-error-fg)]">{record.rejected_reason}</span>}
              />
            )}
          </dl>

          {record.risk_factors.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)]">
                风险因素
              </span>
              {record.risk_factors.map((f) => (
                <RiskChip key={f.label} factor={f} />
              ))}
            </div>
          )}

          {record.status === "pending" && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <ConsoleButton>
                <CheckCircle2 className="h-3.5 w-3.5" />
                批准
              </ConsoleButton>
              <div className="relative">
                <ConsoleButton variant="ghost" onClick={onAddedToWhitelist}>
                  <ShieldPlus className="h-3.5 w-3.5" />
                  加入 Hotline 白名单
                </ConsoleButton>
                {whitelistPopoverOpen && (
                  <WhitelistPopover
                    hotlineDisplayName={record.hotline_display_name}
                    mode={policyModeForPopover}
                    onClose={onCloseWhitelistPopover}
                  />
                )}
              </div>
              <ConsoleButton variant="danger">
                <ShieldX className="h-3.5 w-3.5" />
                拒绝
              </ConsoleButton>
              <span className="ml-auto text-[11.5px] text-[var(--brand-muted)]">
                批准后 Agent 可继续执行调用
              </span>
            </div>
          )}

          {record.execution && (
            <ExecutionBlock execution={record.execution} requestId={record.request_id} />
          )}
        </div>
      </div>

      {/* Hint shown when current policy mode would auto-pass this record. */}
      {record.status === "pending" && policyMode === "allow_all" && (
        <ModeMismatchHint />
      )}
    </ConsoleCard>
  );
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[var(--brand-muted)]">{label}</dt>
      <dd className="text-[var(--ink)] min-w-0">{value}</dd>
    </>
  );
}

/* ── M6 · 加白名单后教育 popover ────────────────────────────────────── */

function WhitelistPopover({
  hotlineDisplayName,
  mode,
  onClose,
}: {
  hotlineDisplayName: string;
  mode: ApprovalMode;
  onClose: () => void;
}) {
  const effective = mode === "allow_listed";
  return (
    <div
      className="absolute top-full left-0 mt-1.5 w-[340px] z-20 bg-white c-ink-border-2 c-shadow-1 p-3.5"
      style={{ borderRadius: "var(--c-radius)" }}
      role="status"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2
          className={cn("h-4 w-4 mt-0.5 shrink-0", effective ? "text-[var(--c-status-success-fg)]" : "text-[var(--brand-yellow)]")}
          strokeWidth={2.5}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[var(--ink)]">
            {effective ? "已加入白名单 ✓" : "已加入白名单 ✓ · 但当前模式不会自动放行"}
          </p>
          {effective ? (
            <p className="text-[11.5px] text-[var(--brand-muted)] mt-1 leading-relaxed">
              后续 <strong className="text-[var(--ink)]">{hotlineDisplayName}</strong> 的调用会自动放行，不再来打扰你。
            </p>
          ) : (
            <p className="text-[11.5px] text-[var(--brand-muted)] mt-1 leading-relaxed">
              你现在是「<code className="console-mono text-[var(--ink)]">{mode}</code>」模式 — 名单不生效。切到「白名单自动放行」才会按白名单走。
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {effective ? (
              <Link
                to="/console/access-lists?from=approvals-add-whitelist"
                className="text-[11.5px] font-semibold text-[var(--ink)] hover:text-[var(--brand-orange)] inline-flex items-center gap-0.5"
              >
                查看 / 管理白名单
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <>
                <Link to="/console/preferences?from=approvals-add-whitelist">
                  <ConsoleButton className="!py-1 !px-2 !text-[11.5px]">
                    <Settings2 className="h-3 w-3" />
                    切换到白名单自动放行
                  </ConsoleButton>
                </Link>
                <Link
                  to="/console/access-lists?from=approvals-add-whitelist"
                  className="text-[11px] font-medium text-[var(--brand-muted)] hover:text-[var(--ink)]"
                >
                  保留当前模式，先看名单 →
                </Link>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--brand-muted)] hover:text-[var(--ink)] shrink-0"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Mode mismatch sub-hint (allow_all + pending shouldn't normally coexist) ── */

function ModeMismatchHint() {
  return (
    <div
      className="mt-3 px-3 py-1.5 text-[11.5px] c-status-info inline-flex items-center gap-1.5"
      style={{ borderRadius: "var(--c-radius-sm)" }}
    >
      <Info className="h-3 w-3" strokeWidth={2.5} />
      当前模式 <strong>allow_all</strong> 应该不会有 pending — 这条可能是模式切换瞬间产生的边界情况。
    </div>
  );
}

/* ── ExecutionBlock ─────────────────────────────────────────────────── */

function ExecutionBlock({ execution, requestId }: { execution: Execution; requestId: string }) {
  const tone =
    execution.status === "running"
      ? { border: "border-l-[var(--c-status-info-fg)]", bg: "bg-[var(--c-status-info-bg)]/40", icon: Loader2, iconClass: "text-[var(--c-status-info-fg)] animate-spin", title: "Agent 正在执行调用…" }
      : execution.status === "succeeded"
        ? { border: "border-l-[var(--c-status-success-fg)]", bg: "bg-[var(--c-status-success-bg)]/40", icon: CheckCircle2, iconClass: "text-[var(--c-status-success-fg)]", title: "执行成功" }
        : { border: "border-l-[var(--c-status-error-fg)]", bg: "bg-[var(--c-status-error-bg)]/40", icon: XCircle, iconClass: "text-[var(--c-status-error-fg)]", title: "执行失败" };

  const Icon = tone.icon;

  return (
    <div className={cn("mt-4 border-l-[3px]", tone.border, tone.bg, "px-3.5 py-3")} style={{ borderRadius: "var(--c-radius-sm)" }}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", tone.iconClass)} strokeWidth={2.5} />
        <span className="text-[12.5px] font-semibold text-[var(--ink)]">{tone.title}</span>
        <code className="console-mono text-[10.5px] text-[var(--brand-muted)] ml-auto truncate">
          {requestId.slice(0, 28)}…
        </code>
      </div>

      <div className="mt-1.5 text-[11.5px] text-[var(--brand-muted)] inline-flex items-center gap-1">
        <User className="h-3 w-3" />
        由 <code className="console-mono text-[var(--ink)]">{execution.responder_id}</code> 处理
      </div>

      {execution.status === "succeeded" && (
        <>
          <p className="mt-2 text-[12.5px] text-[var(--ink)] leading-relaxed">
            {execution.human_summary}
          </p>
          <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1 text-[12px]">
            {execution.result_fields.map((f) => (
              <ContextRow
                key={f.label}
                label={f.label}
                value={<span className={cn(f.primary && "font-semibold text-[var(--ink)]")}>{f.value}</span>}
              />
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-[var(--brand-muted)]">
            完成于 {execution.finished_at} · 耗时 {execution.duration_ms}ms
          </p>
        </>
      )}

      {execution.status === "failed" && (
        <div className="mt-2 space-y-1">
          <code className="console-mono text-[11.5px] text-[var(--c-status-error-fg)]">
            {execution.error.code}
          </code>
          <p className="text-[12px] text-[var(--ink)]">{execution.error.message}</p>
          <p className="text-[11px] text-[var(--brand-muted)]">
            失败于 {execution.finished_at} · 耗时 {execution.duration_ms}ms
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Risk visuals ───────────────────────────────────────────────────── */

function RiskIconView({ severity }: { severity: RiskSeverity }) {
  const Icon: LucideIcon = severity === "high" ? ShieldAlert : severity === "info" ? Info : ShieldCheck;
  return (
    <Icon
      className={cn("h-5 w-5 mt-0.5 shrink-0", riskIconClass(severity))}
      strokeWidth={2.5}
    />
  );
}

function riskIconClass(severity: RiskSeverity): string {
  switch (severity) {
    case "high": return "text-[var(--c-status-error-fg)]";
    case "medium": return "text-[var(--brand-orange)]";
    case "low": return "text-[var(--c-status-success-fg)]";
    case "info": return "text-[var(--c-status-info-fg)]";
  }
}

function RiskBadge({ risk }: { risk: RiskSeverity }) {
  const map: Record<RiskSeverity, { label: string; cls: string }> = {
    high: { label: "高风险", cls: "c-status-error" },
    medium: { label: "中风险", cls: "c-status-warn" },
    low: { label: "低风险", cls: "c-status-success" },
    info: { label: "提示", cls: "c-status-info" },
  };
  return <span className={cn("c-status", map[risk].cls)}>{map[risk].label}</span>;
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; cls: string }> = {
    pending: { label: "待审批", cls: "c-status-warn" },
    approved: { label: "已批准", cls: "c-status-success" },
    rejected: { label: "已拒绝", cls: "c-status-error" },
    expired: { label: "已过期", cls: "c-status-info" },
  };
  return <span className={cn("c-status", map[status].cls)}>{map[status].label}</span>;
}

function RiskChip({ factor }: { factor: RiskFactor }) {
  const map: Record<RiskSeverity, string> = {
    high: "c-status-error",
    medium: "c-status-warn",
    low: "c-status-success",
    info: "c-status-info",
  };
  return (
    <span
      className={cn("c-status", map[factor.severity])}
      title={factor.description}
    >
      {factor.label}
    </span>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

function EmptyState({ tab }: { tab: ApprovalStatus | "all" }) {
  const isPending = tab === "pending";
  return (
    <ConsoleCard className="text-center py-12">
      <ShieldCheck className="h-8 w-8 text-[var(--brand-muted)]/60 mx-auto" strokeWidth={1.5} />
      <p className="text-[13px] font-medium text-[var(--ink)] mt-3">
        {isPending ? "暂无待审批请求" : "暂无记录"}
      </p>
      {isPending && (
        <p className="text-[12px] text-[var(--brand-muted)] mt-1.5 leading-relaxed max-w-xs mx-auto">
          Agent 调用 Hotline 触发审批时会出现在这里。
        </p>
      )}
    </ConsoleCard>
  );
}
