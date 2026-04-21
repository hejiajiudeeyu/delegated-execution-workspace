/**
 * Console pattern: Caller / Calls — **人类可读的通话日志**.
 *
 * Mirror of `ops-console/src/pages/caller/CallsPage.tsx` AFTER the UX shift.
 * See `docs/console-content-spec.md §2` for the content contract.
 *
 * Hard rules this page enforces (don't drift):
 *   1. Each row's headline is a HUMAN sentence — HotlineDisplayName + 提炼后的
 *      动作短语；NEVER raw request_id / responder_id / hotline_id in row.
 *   2. Detail panel is three sections — 摘要 / 请求背景 / 请求结果. Each section
 *      offers a "查看原始 JSON" toggle as a developer fallback. raw JSON is
 *      NEVER the default render.
 *   3. The "manual call form" lives in CatalogPage (one button per hotline).
 *      Header CTA "去 Catalog 发起调用" is the only "new call" affordance here.
 *   4. Approval actions belong to the Approvals page; this page only links.
 *   5. Real `RequestItem` shape (request_id / hotline_id / input / etc.) is
 *      kept INSIDE the record and only surfaces inside the raw-JSON fallback.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ShieldAlert,
  ShieldX,
  Send,
  Inbox,
  Mail,
  RotateCcw,
  ScrollText,
  MessageSquareWarning,
  Settings2,
  ShieldPlus,
} from "lucide-react";

import { ConsolePageHeader, ConsoleCard, ConsoleButton } from "../shells/console-shell";
import { cn } from "@/app/components/ui/utils";

/** Encode the previous input JSON for prefilling the catalog try-call drawer. */
function encodePrefill(input: Record<string, unknown>): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(input))));
  } catch {
    return "";
  }
}

/* ── Types ──────────────────────────────────────────────────────────── */

type CallerOrigin =
  | { kind: "manual" }
  | { kind: "agent"; agent_session_label: string };

type ApprovalDetail =
  | { kind: "auto_allow_all" }
  | { kind: "auto_allow_listed" }
  | { kind: "auto_no_approval_needed" }
  | { kind: "manual_approved"; approved_at: string; approver: "you" }
  | { kind: "manual_rejected"; rejected_at: string; reason?: string }
  | { kind: "manual_pending" };

type CallOutcome =
  | {
      kind: "completed";
      duration_ms: number;
      result_human: string;
      result_fields: { label: string; value: string; primary?: boolean }[];
      usage?: { tokens?: number; cost_cny?: number };
      raw_result: Record<string, unknown>;
    }
  | {
      kind: "failed";
      duration_ms: number;
      error: { code: string; user_message: string; suggestion?: string; retryable: boolean };
      raw_result: Record<string, unknown>;
    }
  | { kind: "running"; started_at: string; raw_result: null }
  | { kind: "result_pending"; called_at: string; raw_result: null }
  | { kind: "pending_approval"; raw_result: null }
  | { kind: "rejected_by_approval"; rejected_at: string; reason?: string; raw_result: null };

type CallRecord = {
  request_id: string;
  hotline_id: string;
  responder_id: string;
  created_at: string;
  caller_origin: CallerOrigin;
  approval: ApprovalDetail;
  input: Record<string, unknown>;
  outcome: CallOutcome;
};

type HotlineMeta = {
  hotline_id: string;
  display_name: string;
  one_liner: string;
  summary_template: string;
  field_labels: Record<string, string>;
  field_order: string[];
};

type ResponderMeta = {
  responder_id: string;
  display_name: string;
  adapter_type: "process" | "http";
};

/* ── Mock catalog (in real life: fetched from /catalog/hotlines) ────── */

const HOTLINES: Record<string, HotlineMeta> = {
  "local.delegated-execution.workspace-summary.v1": {
    hotline_id: "local.delegated-execution.workspace-summary.v1",
    display_name: "工作区文档总结",
    one_liner: "对长文本/文档进行结构化中文摘要",
    summary_template: "总结 {{source_label}}",
    field_labels: {
      text: "原文",
      source_uri: "原文来源",
      source_label: "原文标题",
      target_lang: "输出语言",
    },
    field_order: ["source_label", "source_uri", "text", "target_lang"],
  },
  "local.demo.calendar.create-event.v1": {
    hotline_id: "local.demo.calendar.create-event.v1",
    display_name: "日历创建日程",
    one_liner: "在本地日历创建一个事件",
    summary_template: "创建日程「{{title}}」({{start_label}})",
    field_labels: {
      title: "事件标题",
      start: "开始时间",
      start_label: "开始时间",
      duration_min: "时长（分钟）",
    },
    field_order: ["title", "start_label", "duration_min"],
  },
  "local.demo.web-search.v1": {
    hotline_id: "local.demo.web-search.v1",
    display_name: "网页搜索",
    one_liner: "外部联网搜索（需要审批）",
    summary_template: "搜索 \u201C{{query}}\u201D",
    field_labels: { query: "查询词" },
    field_order: ["query"],
  },
  "local.demo.translate.zh-en.v1": {
    hotline_id: "local.demo.translate.zh-en.v1",
    display_name: "中英互译",
    one_liner: "短文本中英互译",
    summary_template: "翻译 ({{direction}})",
    field_labels: { text: "原文", direction: "方向" },
    field_order: ["direction", "text"],
  },
  "local.demo.slack.notify.v1": {
    hotline_id: "local.demo.slack.notify.v1",
    display_name: "Slack 通知",
    one_liner: "向指定 Slack 频道发送一条消息",
    summary_template: "推送 \u201C{{message}}\u201D 到 {{channel}}",
    field_labels: { channel: "频道", message: "消息内容", priority: "优先级" },
    field_order: ["channel", "message", "priority"],
  },
};

const RESPONDERS: Record<string, ResponderMeta> = {
  "responder-local-1": {
    responder_id: "responder-local-1",
    display_name: "本地通用 Responder",
    adapter_type: "process",
  },
};

/* ── Approval phrasing ──────────────────────────────────────────────── */

function approvalPhrase(a: ApprovalDetail): { short: string; long: string } {
  switch (a.kind) {
    case "auto_allow_all":
      return { short: "全部自动放行", long: "策略「全部自动放行」生效，未走审批" };
    case "auto_allow_listed":
      return { short: "白名单自动放行", long: "命中白名单，自动放行" };
    case "auto_no_approval_needed":
      return { short: "无需审批", long: "本机自调用，无需审批" };
    case "manual_approved":
      return {
        short: `${a.approved_at.slice(11, 16)} 你手动批准`,
        long: `${a.approved_at} 由你在审批中心批准`,
      };
    case "manual_rejected":
      return {
        short: `${a.rejected_at.slice(11, 16)} 你拒绝`,
        long: `${a.rejected_at} 由你在审批中心拒绝${a.reason ? ` · 原因：${a.reason}` : ""}`,
      };
    case "manual_pending":
      return { short: "等待你审批", long: "审批中，请前往审批中心" };
  }
}

function originPhrase(o: CallerOrigin): string {
  return o.kind === "manual" ? "你手动发起" : `由 ${o.agent_session_label} 发起`;
}

/* ── Outcome phrasing & visuals ─────────────────────────────────────── */

type OutcomeVisual = {
  label: string;
  borderClass: string;
  bgClass: string;
  fgClass: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
};

function outcomeVisual(outcome: CallOutcome): OutcomeVisual {
  switch (outcome.kind) {
    case "completed":
      return {
        label: "已完成",
        borderClass: "border-l-[var(--c-status-success-fg)]",
        bgClass: "bg-[color-mix(in_oklab,var(--c-status-success-fg)_8%,transparent)]",
        fgClass: "c-status-success",
        Icon: CheckCircle2,
        iconClass: "text-[var(--c-status-success-fg)]",
      };
    case "failed":
      return {
        label: "失败",
        borderClass: "border-l-[var(--c-status-error-fg)]",
        bgClass: "bg-[color-mix(in_oklab,var(--c-status-error-fg)_8%,transparent)]",
        fgClass: "c-status-error",
        Icon: XCircle,
        iconClass: "text-[var(--c-status-error-fg)]",
      };
    case "running":
      return {
        label: "进行中",
        borderClass: "border-l-[var(--c-status-info-fg)]",
        bgClass: "bg-[color-mix(in_oklab,var(--c-status-info-fg)_8%,transparent)]",
        fgClass: "c-status-info",
        Icon: Loader2,
        iconClass: "text-[var(--c-status-info-fg)] animate-spin",
      };
    case "result_pending":
      return {
        label: "等待结果",
        borderClass: "border-l-[var(--c-status-warn-fg)]",
        bgClass: "bg-[color-mix(in_oklab,var(--c-status-warn-fg)_8%,transparent)]",
        fgClass: "c-status-warn",
        Icon: Clock,
        iconClass: "text-[var(--c-status-warn-fg)]",
      };
    case "pending_approval":
      return {
        label: "等待审批",
        borderClass: "border-l-[var(--brand-yellow)]",
        bgClass: "bg-[color-mix(in_oklab,var(--brand-yellow)_18%,transparent)]",
        fgClass: "c-status-warn",
        Icon: ShieldAlert,
        iconClass: "text-[var(--brand-orange)]",
      };
    case "rejected_by_approval":
      return {
        label: "被拒绝",
        borderClass: "border-l-[var(--c-status-error-fg)]",
        bgClass: "bg-[color-mix(in_oklab,var(--c-status-error-fg)_8%,transparent)]",
        fgClass: "c-status-error",
        Icon: ShieldX,
        iconClass: "text-[var(--c-status-error-fg)]",
      };
  }
}

/* ── Headline rendering (template substitution) ─────────────────────── */

function renderHeadline(record: CallRecord): string {
  const hotline = HOTLINES[record.hotline_id];
  if (!hotline) return `调用一次 · ${record.hotline_id}`;
  return `${hotline.display_name} · ${fillTemplate(hotline.summary_template, record.input)}`;
}

function fillTemplate(tpl: string, data: Record<string, unknown>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    if (v == null) return `[${key}]`;
    if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
    return String(v);
  });
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

function timeAgo(iso: string): string {
  // toy implementation — real one uses Date
  return iso.slice(11, 16);
}

/* ── Mock data (preserves real RequestItem shape inside .raw_result) ── */

const PENDING_APPROVALS = 2;

const RECORDS: CallRecord[] = [
  {
    request_id: "req_2026-04-17T140823_slack-notify-001",
    hotline_id: "local.demo.slack.notify.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 14:08:23",
    caller_origin: { kind: "manual" },
    approval: { kind: "auto_allow_listed" },
    input: { channel: "#ops", message: "部署完成 · v0.4.2 上线", priority: "normal" },
    outcome: {
      kind: "completed",
      duration_ms: 320,
      result_human: "消息已送达 #ops 频道（message_id M-7821）",
      result_fields: [
        { label: "消息 ID", value: "M-7821", primary: true },
        { label: "送达时间", value: "14:08:24" },
        { label: "频道成员数", value: "26" },
      ],
      raw_result: {
        available: true,
        status: "SUCCEEDED",
        result_package: {
          human_summary: "消息已送达 #ops 频道（message_id M-7821）",
          message_id: "M-7821",
          delivered_at: "2026-04-17T14:08:24+08:00",
          channel: "#ops",
        },
      },
    },
  },
  {
    request_id: "req_2026-04-17T140905_calendar-create-014",
    hotline_id: "local.demo.calendar.create-event.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 14:09:05",
    caller_origin: { kind: "agent", agent_session_label: "ops-agent · session #4821" },
    approval: { kind: "manual_approved", approved_at: "2026-04-17 14:09:01", approver: "you" },
    input: {
      title: "客户拜访 · ACME Inc.",
      start: "2026-04-19T15:00:00+08:00",
      start_label: "周日 15:00",
      duration_min: 60,
    },
    outcome: { kind: "running", started_at: "2026-04-17 14:09:06", raw_result: null },
  },
  {
    request_id: "req_2026-04-17T140742_search-web-022",
    hotline_id: "local.demo.web-search.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 14:07:42",
    caller_origin: { kind: "agent", agent_session_label: "ops-agent · session #4820" },
    approval: { kind: "manual_rejected", rejected_at: "2026-04-17 14:07:50", reason: "未命中信任名单" },
    input: { query: "2026 Q2 中国跨境电商监管变化" },
    outcome: {
      kind: "rejected_by_approval",
      rejected_at: "2026-04-17 14:07:50",
      reason: "未命中信任名单",
      raw_result: null,
    },
  },
  {
    request_id: "req_2026-04-17T140542_docs-summarize-019",
    hotline_id: "local.delegated-execution.workspace-summary.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 14:05:42",
    caller_origin: { kind: "manual" },
    approval: { kind: "auto_no_approval_needed" },
    input: {
      source_uri: "drive://reports/Q1.pdf",
      source_label: "Q1 季报",
      target_lang: "zh",
    },
    outcome: {
      kind: "completed",
      duration_ms: 4180,
      result_human: "Q1 营收同比 +18%，新客户净增 142；3 项关键事项完成、1 项延期至 Q2",
      result_fields: [
        { label: "摘要", value: "Q1 营收同比 +18%，新客户净增 142", primary: true },
        { label: "字数", value: "412 → 86" },
        { label: "用时", value: "4.18s" },
      ],
      usage: { tokens: 2340, cost_cny: 0.12 },
      raw_result: {
        available: true,
        status: "SUCCEEDED",
        result_package: {
          human_summary: "Q1 营收同比 +18%，新客户净增 142；3 项关键事项完成、1 项延期至 Q2",
          summary_md: "**Q1 总结**\n- 营收同比 +18%\n- 新客户净增 142\n- ...",
          token_count: 2340,
        },
      },
    },
  },
  {
    request_id: "req_2026-04-17T140401_translate-zh-en-007",
    hotline_id: "local.demo.translate.zh-en.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 14:04:01",
    caller_origin: { kind: "manual" },
    approval: { kind: "auto_no_approval_needed" },
    input: { text: "你好，欢迎来到 …", direction: "zh→en" },
    outcome: {
      kind: "failed",
      duration_ms: 312,
      error: {
        code: "UPSTREAM_TIMEOUT",
        user_message: "翻译服务超时未响应（300ms）",
        suggestion: "网络抖动，稍后再试一次。如果持续失败，可在 Runtime 页查看 Responder 日志。",
        retryable: true,
      },
      raw_result: {
        available: true,
        status: "FAILED",
        result_package: { error: { code: "UPSTREAM_TIMEOUT", message: "上游超时（300ms）" } },
      },
    },
  },
  {
    request_id: "req_2026-04-17T135930_calendar-create-013",
    hotline_id: "local.demo.calendar.create-event.v1",
    responder_id: "responder-local-1",
    created_at: "2026-04-17 13:59:30",
    caller_origin: { kind: "agent", agent_session_label: "ops-agent · session #4819" },
    approval: { kind: "manual_pending" },
    input: {
      title: "周会 · 14:00",
      start: "2026-04-18T14:00:00+08:00",
      start_label: "明天 14:00",
      duration_min: 30,
    },
    outcome: { kind: "pending_approval", raw_result: null },
  },
];

/* ── Top-level page ─────────────────────────────────────────────────── */

export function ConsolePageCalls() {
  const [selectedId, setSelectedId] = useState<string | null>(RECORDS[0].request_id);
  const selected = RECORDS.find((r) => r.request_id === selectedId) ?? null;
  const runningCount = RECORDS.filter(
    (r) => r.outcome.kind === "running" || r.outcome.kind === "result_pending",
  ).length;

  return (
    <>
      <ConsolePageHeader
        kicker="Caller · 调用记录"
        title="调用记录"
        description="查看你过去发起的 Hotline 调用、执行结果与审批路径。新调用请到 Catalog「试拨」；待审批请到审批中心。"
        actions={
          <>
            <ConsoleButton variant="ghost">
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </ConsoleButton>
            <Link to="/console/approvals?from=calls-detail">
              <ConsoleButton variant="ghost">
                <ShieldCheck className="h-3.5 w-3.5" />
                审批中心
                {PENDING_APPROVALS > 0 && (
                  <span
                    className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10.5px] font-semibold tabular-nums bg-[var(--brand-yellow)] text-[var(--ink)]"
                    style={{ borderRadius: "var(--c-radius-pill)" }}
                  >
                    {PENDING_APPROVALS}
                  </span>
                )}
              </ConsoleButton>
            </Link>
            <Link to="/console/catalog">
              <ConsoleButton variant="ink">
                <PhoneCall className="h-3.5 w-3.5" />
                去 Catalog 发起调用
              </ConsoleButton>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="待审批" value={String(PENDING_APPROVALS)} accent="yellow" actionLabel="去处理审批" />
        <StatCard label="总调用次数" value={String(RECORDS.length)} accent="teal" />
        <StatCard label="进行中" value={String(runningCount)} accent="blue" />
      </div>

      {PENDING_APPROVALS > 0 && <ApprovalReminderBanner pending={PENDING_APPROVALS} />}

      <div className="grid grid-cols-12 gap-4">
        <CallList records={RECORDS} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="col-span-7 min-w-0">
          {selected ? <CallDetail record={selected} /> : <EmptyDetail />}
        </div>
      </div>
    </>
  );
}

/* ── Stat cards ─────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  accent,
  actionLabel,
}: {
  label: string;
  value: string;
  accent: "yellow" | "teal" | "blue";
  actionLabel?: string;
}) {
  const accentBg = {
    yellow: "bg-[var(--brand-yellow)]",
    teal: "bg-[var(--brand-teal)]",
    blue: "bg-[var(--brand-blue)]",
  }[accent];
  return (
    <ConsoleCard padded={false}>
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[12px] font-medium text-[var(--brand-muted)]">{label}</span>
        <span
          className={cn("inline-block h-2.5 w-2.5 c-ink-border", accentBg)}
          style={{ borderRadius: "var(--c-radius-pill)" }}
        />
      </div>
      <div className="px-4 mt-1 pb-3">
        <div className="text-[24px] font-semibold leading-none tabular-nums text-[var(--ink)]">{value}</div>
        {actionLabel && (
          <Link
            to="/console/approvals?from=calls-detail"
            className="mt-2 inline-flex items-center gap-0.5 text-[11.5px] font-medium text-[var(--ink)] hover:text-[var(--brand-orange)]"
          >
            {actionLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </ConsoleCard>
  );
}

/* ── Approval reminder banner (sticky-ish, full-width) ──────────────── */

function ApprovalReminderBanner({ pending }: { pending: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-[color-mix(in_oklab,var(--brand-yellow)_18%,transparent)] border-l-[3px] border-l-[var(--brand-yellow)] c-ink-border"
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <ShieldAlert className="h-4 w-4 text-[var(--brand-orange)] shrink-0" strokeWidth={2.5} />
      <p className="text-[12.5px] text-[var(--ink)] leading-snug flex-1">
        当前有 <strong className="font-mono tabular-nums">{pending}</strong> 个待审批的 Hotline 调用，独立放在审批中心处理。
      </p>
      <Link
        to="/console/approvals?from=calls-detail"
        className="text-[12px] font-semibold text-[var(--ink)] hover:text-[var(--brand-orange)] inline-flex items-center gap-0.5"
      >
        前往审批中心
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/* ── Master list ────────────────────────────────────────────────────── */

function CallList({
  records,
  selectedId,
  onSelect,
}: {
  records: CallRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ConsoleCard padded={false} className="col-span-5 overflow-hidden flex flex-col">
      <div
        className="px-4 py-2 border-b text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-muted)] flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <span>通话日志</span>
        <span className="font-mono text-[10.5px] normal-case tracking-normal">
          {records.length} 条 · 5s 自动刷新
        </span>
      </div>
      <ul className="divide-y flex-1 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
        {records.map((r) => (
          <CallRow key={r.request_id} record={r} active={r.request_id === selectedId} onSelect={onSelect} />
        ))}
      </ul>
    </ConsoleCard>
  );
}

function CallRow({
  record,
  active,
  onSelect,
}: {
  record: CallRecord;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const headline = renderHeadline(record);
  const v = outcomeVisual(record.outcome);
  const ap = approvalPhrase(record.approval);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(record.request_id)}
        className={cn(
          "w-full text-left px-4 py-3 transition-colors flex items-start gap-3",
          active
            ? "bg-[var(--brand-secondary)]/60 border-l-[2px] border-l-[var(--brand-ink)]"
            : "hover:bg-[var(--brand-secondary)]/30 border-l-[2px] border-l-transparent",
        )}
      >
        <v.Icon className={cn("h-4 w-4 mt-0.5 shrink-0", v.iconClass)} strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-[var(--ink)] leading-snug truncate">{headline}</p>
          <p className="text-[11.5px] text-[var(--brand-muted)] mt-1 leading-relaxed truncate">
            <span className="tabular-nums">{timeAgo(record.created_at)}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{originPhrase(record.caller_origin)}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{ap.short}</span>
          </p>
        </div>
        <span className={cn("c-status shrink-0", v.fgClass)}>{v.label}</span>
      </button>
    </li>
  );
}

/* ── Empty detail state ─────────────────────────────────────────────── */

function EmptyDetail() {
  return (
    <ConsoleCard className="h-full flex items-center justify-center text-center" padded>
      <div className="py-12">
        <Inbox className="h-8 w-8 text-[var(--brand-muted)]/60 mx-auto" strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-[var(--ink)] mt-3">选一条记录查看详情</p>
        <p className="text-[12px] text-[var(--brand-muted)] mt-1.5 leading-relaxed max-w-xs mx-auto">
          摘要、请求背景与执行结果会按人话渲染；机器字段（request_id、原始 JSON）默认折叠。
        </p>
      </div>
    </ConsoleCard>
  );
}

/* ── Detail panel — three sections ──────────────────────────────────── */

function CallDetail({ record }: { record: CallRecord }) {
  return (
    <div className="flex flex-col gap-3">
      <SummarySection record={record} />
      <ContextSection record={record} />
      <OutcomeSection record={record} />
    </div>
  );
}

/* ── Section A · 摘要 ──────────────────────────────────────────────── */

function SummarySection({ record }: { record: CallRecord }) {
  const hotline = HOTLINES[record.hotline_id];
  const headline = hotline?.display_name ?? "调用一次";
  const subline =
    record.outcome.kind === "completed"
      ? record.outcome.result_human
      : record.outcome.kind === "failed"
        ? `${record.outcome.error.user_message}`
        : record.outcome.kind === "running"
          ? "Responder 正在执行中…"
          : record.outcome.kind === "result_pending"
            ? "调用已发出，结果尚未返回"
            : record.outcome.kind === "pending_approval"
              ? "等待你审批；批准后才会执行"
              : `${record.outcome.rejected_at.slice(11, 16)} 被拒绝${record.outcome.reason ? ` · ${record.outcome.reason}` : ""}`;

  const v = outcomeVisual(record.outcome);
  const ap = approvalPhrase(record.approval);
  const durationChip =
    record.outcome.kind === "completed" || record.outcome.kind === "failed"
      ? fmtDuration(record.outcome.duration_ms)
      : null;

  return (
    <ConsoleCard className="relative">
      <SectionLabel label="摘要" />
      <div className="flex items-start gap-3">
        <v.Icon className={cn("h-5 w-5 mt-0.5 shrink-0", v.iconClass)} strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold leading-tight text-[var(--ink)]">
            {headline} · {fillTemplate(hotline?.summary_template ?? "调用一次", record.input)}
          </h2>
          <p className="text-[13.5px] text-[var(--brand-muted)] mt-1.5 leading-relaxed">{subline}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={cn("c-status", v.fgClass)}>{v.label}</span>
            {durationChip && (
              <span className="c-status c-status-info">
                <Clock className="h-3 w-3" />
                耗时 {durationChip}
              </span>
            )}
            <span
              className={cn(
                "c-status",
                record.approval.kind === "manual_pending"
                  ? "c-status-warn"
                  : record.approval.kind === "manual_rejected"
                    ? "c-status-error"
                    : "c-status-info",
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {ap.short}
            </span>
          </div>
        </div>
      </div>
    </ConsoleCard>
  );
}

/* ── Section B · 请求背景 ──────────────────────────────────────────── */

function ContextSection({ record }: { record: CallRecord }) {
  const hotline = HOTLINES[record.hotline_id];
  const responder = RESPONDERS[record.responder_id];
  const ap = approvalPhrase(record.approval);
  const [rawOpen, setRawOpen] = useState(false);

  const fieldOrder = hotline?.field_order ?? Object.keys(record.input);
  const labels = hotline?.field_labels ?? {};

  return (
    <ConsoleCard>
      <SectionLabel
        label="请求背景"
        action={
          <RawJsonToggle
            open={rawOpen}
            onToggle={() => setRawOpen(!rawOpen)}
            ariaLabel="查看原始请求 JSON"
          />
        }
      />
      <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
        <ContextRow
          label="时间"
          value={
            <span>
              {record.created_at}
              <span className="ml-2 text-[11.5px] text-[var(--brand-muted)]">（4 分钟前）</span>
            </span>
          }
        />
        <ContextRow label="发起方" value={originPhrase(record.caller_origin)} />
        <ContextRow
          label="Hotline"
          value={
            <div>
              <p className="text-[var(--ink)]">{hotline?.display_name ?? record.hotline_id}</p>
              {hotline?.one_liner && (
                <p className="text-[11.5px] text-[var(--brand-muted)] mt-0.5">{hotline.one_liner}</p>
              )}
              <code
                className="console-mono text-[10.5px] text-[var(--brand-muted)]/80 mt-0.5 block truncate"
                title={record.hotline_id}
              >
                {record.hotline_id}
              </code>
            </div>
          }
        />
        <ContextRow
          label="Responder"
          value={
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[var(--ink)]">{responder?.display_name ?? record.responder_id}</span>
              {responder && (
                <span className="c-status c-status-info">{responder.adapter_type}</span>
              )}
            </div>
          }
        />
        <ContextRow label="审批路径" value={ap.long} />
        <ContextRow
          label="输入参数"
          value={
            <div className="flex flex-col gap-1.5 text-[12.5px]">
              {fieldOrder
                .filter((k) => record.input[k] !== undefined)
                .map((k) => (
                  <div key={k} className="flex items-baseline gap-2">
                    <span className="text-[var(--brand-muted)] w-20 shrink-0">{labels[k] ?? humanizeKey(k)}</span>
                    <span className="text-[var(--ink)] break-words flex-1">{renderValue(record.input[k])}</span>
                  </div>
                ))}
            </div>
          }
        />
      </dl>
      {rawOpen && (
        <div className="mt-3">
          <RawBlock
            label="原始 input JSON · GET /requests/{request_id}"
            value={{ request_id: record.request_id, hotline_id: record.hotline_id, input: record.input }}
          />
        </div>
      )}
    </ConsoleCard>
  );
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[var(--brand-muted)] tabular-nums">{label}</dt>
      <dd className="text-[var(--ink)] min-w-0">{value}</dd>
    </>
  );
}

function humanizeKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-[var(--brand-muted)] italic">空</span>;
  if (typeof v === "string") {
    if (v.length > 80) {
      return (
        <span title={v}>
          {v.slice(0, 80)}
          <span className="text-[var(--brand-muted)]">…</span>
        </span>
      );
    }
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-[var(--brand-muted)] italic">空数组</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {v.slice(0, 5).map((item, i) => (
          <li key={i}>{renderValue(item)}</li>
        ))}
        {v.length > 5 && (
          <li className="text-[var(--brand-muted)]">还有 {v.length - 5} 项…</li>
        )}
      </ul>
    );
  }
  return <code className="console-mono text-[11.5px] text-[var(--brand-muted)]">[嵌套对象]</code>;
}

/* ── Section C · 请求结果 ──────────────────────────────────────────── */

function OutcomeSection({ record }: { record: CallRecord }) {
  const o = record.outcome;
  const v = outcomeVisual(o);
  const [rawOpen, setRawOpen] = useState(false);

  let body: React.ReactNode;
  switch (o.kind) {
    case "completed":
      body = (
        <div className="space-y-3">
          <p className="text-[13.5px] text-[var(--ink)] leading-relaxed">{o.result_human}</p>
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
            {o.result_fields.map((f) => (
              <ContextRow
                key={f.label}
                label={f.label}
                value={
                  <span className={cn(f.primary && "font-semibold text-[var(--ink)]")}>{f.value}</span>
                }
              />
            ))}
          </dl>
          {o.usage && (
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--brand-muted)]">用量</span>
              {o.usage.tokens != null && (
                <span className="c-status c-status-info">tokens {o.usage.tokens}</span>
              )}
              {o.usage.cost_cny != null && (
                <span className="c-status c-status-info">¥{o.usage.cost_cny.toFixed(2)}</span>
              )}
            </div>
          )}
        </div>
      );
      break;
    case "failed": {
      const retryHref = `/console/catalog?hotline_id=${encodeURIComponent(record.hotline_id)}&from=calls-retry&prefill=${encodePrefill(record.input)}`;
      const runtimeHref = `/console/runtime?service=responder&filter=${encodeURIComponent(record.request_id)}&from=calls-detail`;
      body = (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="console-mono text-[11px] bg-white px-2 py-0.5 c-ink-border" style={{ borderRadius: "var(--c-radius-sm)" }}>
              {o.error.code}
            </code>
            <span className="text-[13px] text-[var(--ink)]">{o.error.user_message}</span>
          </div>
          {o.error.suggestion && (
            <p className="text-[12.5px] text-[var(--brand-muted)] leading-relaxed bg-white px-3 py-2 c-ink-border" style={{ borderRadius: "var(--c-radius-sm)" }}>
              <strong className="text-[var(--ink)]">建议：</strong>
              {o.error.suggestion}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {o.error.retryable ? (
              <Link to={retryHref}>
                <ConsoleButton>
                  <RotateCcw className="h-3.5 w-3.5" />
                  重试调用（带上原输入）
                </ConsoleButton>
              </Link>
            ) : (
              <ConsoleButton
                disabled
                title="该错误类型不支持自动重试。请先按建议修复（鉴权 / 参数 / 限流），再去 Catalog 手动发起。"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重试不可用
              </ConsoleButton>
            )}
            <Link to={runtimeHref}>
              <ConsoleButton variant="ghost">
                <ScrollText className="h-3.5 w-3.5" />
                查看 Responder 日志
              </ConsoleButton>
            </Link>
            <ConsoleButton
              variant="ghost"
              onClick={() => {
                /* In ops-console: triggers diagnostic-bundle flow with pre-filled request_id. */
              }}
              title="生成诊断包并复制 GitHub issue 模板"
            >
              <MessageSquareWarning className="h-3.5 w-3.5" />
              报告问题
            </ConsoleButton>
          </div>
        </div>
      );
      break;
    }
    case "running":
      body = (
        <p className="text-[13px] text-[var(--ink)]">
          Responder 正在执行（已开始 {timeAgo(o.started_at)}）。拿到结果会自动刷新。
        </p>
      );
      break;
    case "result_pending":
      body = (
        <p className="text-[13px] text-[var(--ink)]">
          请求已被 Responder 接收（{timeAgo(o.called_at)}），结果尚未返回；正在以 3s 间隔轮询最新执行状态。
        </p>
      );
      break;
    case "pending_approval":
      body = (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--ink)]">
            这条调用由 Agent 发起，需要你在审批中心手动批准后才会执行。
          </p>
          <Link to={`/console/approvals?focus=${encodeURIComponent(record.request_id)}&from=calls-detail`}>
            <ConsoleButton variant="ink">
              <ShieldCheck className="h-3.5 w-3.5" />
              打开审批中心处理这一条
            </ConsoleButton>
          </Link>
        </div>
      );
      break;
    case "rejected_by_approval":
      body = (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--ink)]">
            你在 {o.rejected_at} 拒绝了这条调用，Responder 未执行。
          </p>
          {o.reason && (
            <p className="text-[12.5px] text-[var(--brand-muted)]">
              <strong className="text-[var(--ink)]">拒绝理由：</strong>
              {o.reason}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ConsoleButton
              onClick={() => {
                /* In ops-console: confirm dialog → POST /caller/global-policy/whitelist
                   then toast + popover (M6 from spec) explaining future calls auto-pass. */
              }}
              title="加入 Hotline 白名单后，该 Hotline 的未来调用会自动放行"
            >
              <ShieldPlus className="h-3.5 w-3.5" />
              以后自动放行此 Hotline
            </ConsoleButton>
            <Link to="/console/preferences?from=calls-detail#approval-mode">
              <ConsoleButton variant="ghost">
                <Settings2 className="h-3.5 w-3.5" />
                换成「白名单自动放行」模式
              </ConsoleButton>
            </Link>
          </div>
        </div>
      );
      break;
  }

  return (
    <ConsoleCard className={cn("border-l-[3px]", v.borderClass, v.bgClass)}>
      <SectionLabel
        label="请求结果"
        action={
          o.raw_result ? (
            <RawJsonToggle
              open={rawOpen}
              onToggle={() => setRawOpen(!rawOpen)}
              ariaLabel="查看原始结果 JSON"
            />
          ) : null
        }
      />
      {body}
      {rawOpen && o.raw_result && (
        <div className="mt-3">
          <RawBlock label="原始 result JSON · GET /requests/{request_id}/result" value={o.raw_result} />
        </div>
      )}
    </ConsoleCard>
  );
}

/* ── Common bits ────────────────────────────────────────────────────── */

function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
        {label}
      </span>
      {action}
    </div>
  );
}

function RawJsonToggle({
  open,
  onToggle,
  ariaLabel,
}: {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 text-[11px] text-[var(--brand-muted)] hover:text-[var(--ink)] transition-colors"
    >
      {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      查看原始 JSON
    </button>
  );
}

function RawBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-[var(--brand-muted)] mb-1.5 console-mono">
        {label}
      </p>
      <pre
        className="text-[11.5px] leading-[1.55] text-[var(--ink)] console-mono whitespace-pre overflow-x-auto bg-[var(--brand-secondary)]/40 px-3 py-2 max-h-64 c-ink-border"
        style={{ borderRadius: "var(--c-radius-sm)" }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/* Unused exports kept around to avoid accidental removal during refactors;
 * they only land in the bundle if referenced. */
void Mail;
void Send;
void ExternalLink;
