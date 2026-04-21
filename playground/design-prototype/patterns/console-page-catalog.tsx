/**
 * Console pattern: Caller / Catalog.
 *
 * Mirrors `ops-console/src/pages/caller/CatalogPage.tsx` while also
 * implementing the **single entry point for "试拨" / making a call**.
 * See `docs/console-content-spec.md §5.2`.
 *
 * Key responsibilities (per spec):
 *   - Master-detail browse over hotlines.
 *   - Each hotline card has a primary "试拨" button → opens a Drawer
 *     with the auto-generated form from `input_schema`.
 *   - Empty state (zero hotlines) MUST offer two real paths + a one-click
 *     demo loader. No dead ends.
 *   - Onboarding source banner when `?from=dashboard-onboarding`.
 *   - Accepts `?hotline_id=…&prefill=<base64-json>` to pre-open the drawer
 *     with prefilled fields (used by Calls page "重试" CTA).
 *
 * Static "dumb instance" — field names match real /catalog/hotlines payload.
 */

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PackageSearch,
  PlayCircle,
  Search,
  Send,
  Sparkles,
  Tag as TagIcon,
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

type FieldType = "string" | "enum" | "number" | "bool" | "multiline";

type HotlineField = {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
  description?: string;
  enumValues?: string[];
  default?: string | number | boolean;
  placeholder?: string;
};

type Hotline = {
  hotline_id: string;
  display_name: string;
  one_liner: string;
  description: string;
  task_types: string[];
  tags: string[];
  review_status: "local_only" | "approved" | "pending" | "rejected";
  responder_id: string;
  is_official: boolean;
  input_fields: HotlineField[];
  output_summary: string;
  recommended: string[];
  limitations: string[];
};

const HOTLINES: Hotline[] = [
  {
    hotline_id: "ops.notify@v1",
    display_name: "Slack 通知",
    one_liner: "把一段消息推送到指定的 Slack 频道。",
    description:
      "本机 ops bot 的 Slack 通知能力。在指定 channel 推送 markdown 文本，支持 @ mention 与线程回复。",
    task_types: ["notification", "messaging"],
    tags: ["official", "slack", "instant"],
    review_status: "approved",
    responder_id: "responder-local-1",
    is_official: true,
    input_fields: [
      {
        name: "channel",
        type: "enum",
        required: true,
        label: "频道",
        enumValues: ["#ops", "#engineering", "#general", "#alerts"],
        default: "#ops",
      },
      {
        name: "text",
        type: "multiline",
        required: true,
        label: "消息内容",
        description: "支持 Slack markdown",
        placeholder: "部署完成 🎉",
      },
      {
        name: "mention",
        type: "string",
        required: false,
        label: "@ mention（可选）",
        placeholder: "@channel / @here / @user.name",
      },
    ],
    output_summary: "Slack message timestamp + permalink",
    recommended: ["运维变更播报", "Agent 完成任务后的通知"],
    limitations: ["不发图片附件（用 Slack 上传 API）", "不跨 workspace"],
  },
  {
    hotline_id: "calendar.find_slot@v2",
    display_name: "日历 · 找空档",
    one_liner: "在指定时间窗口里找一段所有参与者都空的时间。",
    description:
      "调用本机日历桥接，在 timeMin / timeMax 之间寻找 attendees 全部 free 的连续时段。返回前 N 个候选。",
    task_types: ["scheduling", "calendar"],
    tags: ["official", "google-calendar"],
    review_status: "approved",
    responder_id: "responder-local-1",
    is_official: true,
    input_fields: [
      { name: "attendees", type: "string", required: true, label: "参与者邮箱（逗号分隔）" },
      { name: "duration_minutes", type: "number", required: true, label: "需要时长（分钟）", default: 30 },
      { name: "time_min", type: "string", required: true, label: "时间窗口起", placeholder: "2026-04-20T09:00:00+08:00" },
      { name: "time_max", type: "string", required: true, label: "时间窗口止", placeholder: "2026-04-21T18:00:00+08:00" },
    ],
    output_summary: "[{start, end, attendees_free}] 候选时段数组",
    recommended: ["Agent 替你约会", "找跨时区会议时段"],
    limitations: ["不创建事件（用 calendar.create_event）", "不读私密日历"],
  },
  {
    hotline_id: "web.search@v1",
    display_name: "网页搜索",
    one_liner: "用配置好的搜索 provider 取关键词的前 N 条结果。",
    description: "封装本机 web search bridge。可选 provider: google / bing / brave。",
    task_types: ["research", "search"],
    tags: ["community", "search"],
    review_status: "approved",
    responder_id: "responder-community-7",
    is_official: false,
    input_fields: [
      { name: "query", type: "string", required: true, label: "关键词" },
      { name: "count", type: "number", required: false, label: "条数", default: 5 },
      { name: "provider", type: "enum", required: false, label: "搜索引擎", enumValues: ["google", "bing", "brave"], default: "google" },
    ],
    output_summary: "[{title, url, snippet}]",
    recommended: ["调研、对比", "查实时新闻"],
    limitations: ["不抓正文（用 web.fetch）", "速率限制：5 RPM"],
  },
  {
    hotline_id: "doc.summarize@v1",
    display_name: "文档总结",
    one_liner: "总结一段长文本或本机文档。",
    description: "调用本机 LLM 做摘要。输入可以是 raw text 或本机文件路径。",
    task_types: ["nlp", "summary"],
    tags: ["local", "llm"],
    review_status: "local_only",
    responder_id: "responder-local-1",
    is_official: true,
    input_fields: [
      { name: "text", type: "multiline", required: false, label: "正文（与 path 二选一）" },
      { name: "path", type: "string", required: false, label: "文件路径（与 text 二选一）", placeholder: "/Users/me/docs/q1.md" },
      { name: "max_chars", type: "number", required: false, label: "摘要上限（字符）", default: 400 },
    ],
    output_summary: "{ summary, bullets[], language }",
    recommended: ["把长文档塞进 agent context 之前先压一压"],
    limitations: ["不会精确引用原文行号", "中文不会逐句翻译，只摘要"],
  },
];

/* ── Page ───────────────────────────────────────────────────────────── */

export function ConsolePageCatalog() {
  const [search] = useSearchParams();
  const fromQuery = search.get("from");
  const initialHotlineId = search.get("hotline_id");
  const prefillRaw = search.get("prefill");

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    initialHotlineId && HOTLINES.some((h) => h.hotline_id === initialHotlineId)
      ? initialHotlineId
      : HOTLINES[0]?.hotline_id ?? "",
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(Boolean(initialHotlineId));
  const [tipDismissed, setTipDismissed] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HOTLINES;
    return HOTLINES.filter((h) =>
      [h.hotline_id, h.display_name, h.one_liner, h.description, ...h.task_types]
        .some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  const selected = HOTLINES.find((h) => h.hotline_id === selectedId);

  const prefill = useMemo<Record<string, string | number | boolean> | null>(() => {
    if (!prefillRaw) return null;
    try {
      return JSON.parse(atob(prefillRaw));
    } catch {
      return null;
    }
  }, [prefillRaw]);

  const isEmpty = HOTLINES.length === 0;

  return (
    <>
      <ConsolePageHeader
        kicker="CALLER · 热线目录"
        title="热线目录"
        description="浏览本机和平台上的 Hotline；从这里发起调用（试拨）。"
      />

      {fromQuery === "dashboard-onboarding" && !tipDismissed && (
        <OnboardingTip
          message="第一次试拨指南：选一个带 official 标签的 Hotline 点「试拨」即可。结果会自动跳到 调用记录。"
          onDismiss={() => setTipDismissed(true)}
        />
      )}
      {fromQuery === "dashboard-nextup" && !tipDismissed && (
        <OnboardingTip
          message="工作台「下一步」推荐你试拨一次。选一个 Hotline 开始。"
          onDismiss={() => setTipDismissed(true)}
        />
      )}

      {isEmpty ? (
        <EmptyCatalog />
      ) : (
        <div className="grid grid-cols-12 gap-5 mt-4">
          <div className="col-span-5 flex flex-col gap-3">
            <SearchBox value={query} onChange={setQuery} />
            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <ConsoleCard className="text-[12.5px] text-[var(--brand-muted)]">
                  没有匹配「{query}」的 Hotline。
                </ConsoleCard>
              ) : (
                filtered.map((h) => (
                  <HotlineCard
                    key={h.hotline_id}
                    hotline={h}
                    active={h.hotline_id === selectedId}
                    onSelect={() => setSelectedId(h.hotline_id)}
                    onTryCall={() => {
                      setSelectedId(h.hotline_id);
                      setDrawerOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          </div>
          <div className="col-span-7">
            {selected ? (
              <HotlineDetail
                hotline={selected}
                onTryCall={() => setDrawerOpen(true)}
              />
            ) : (
              <ConsoleCard className="text-[12.5px] text-[var(--brand-muted)]">
                左侧选一个 Hotline 查看详情。
              </ConsoleCard>
            )}
          </div>
        </div>
      )}

      {drawerOpen && selected && (
        <TryCallDrawer
          hotline={selected}
          prefill={prefill}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

/* ── Onboarding tip banner ──────────────────────────────────────────── */

function OnboardingTip({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="px-4 py-2.5 c-status-info flex items-start gap-3 mb-3"
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.5} />
      <p className="flex-1 text-[12.5px] leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[var(--brand-muted)] hover:text-[var(--ink)] shrink-0"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Search box ─────────────────────────────────────────────────────── */

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
        placeholder="搜索 hotline_id / display_name / 描述 / task_type"
        className="flex-1 bg-transparent text-[12.5px] text-[var(--ink)] placeholder:text-[var(--brand-muted)]/70 outline-none"
      />
    </div>
  );
}

/* ── Hotline card ───────────────────────────────────────────────────── */

function HotlineCard({
  hotline,
  active,
  onSelect,
  onTryCall,
}: {
  hotline: Hotline;
  active: boolean;
  onSelect: () => void;
  onTryCall: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-white border p-3",
        active && "c-ink-border c-shadow-1",
      )}
      style={{
        borderColor: active ? undefined : "var(--border)",
        borderRadius: "var(--c-radius)",
      }}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <button
          type="button"
          onClick={onSelect}
          className="text-left flex-1 min-w-0"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--ink)] truncate">
              {hotline.display_name}
            </span>
            {hotline.is_official && (
              <span className="c-status c-status-info">official</span>
            )}
          </div>
          <code className="console-mono text-[11px] text-[var(--brand-muted)] truncate block">
            {hotline.hotline_id}
          </code>
        </button>
      </div>
      <p className="text-[11.5px] text-[var(--brand-muted)] leading-snug line-clamp-2">
        {hotline.one_liner}
      </p>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        {hotline.task_types.map((t) => (
          <span
            key={t}
            className="inline-flex items-center px-1.5 py-px text-[10.5px] font-medium bg-[var(--brand-secondary)]/60 text-[var(--brand-muted)]"
            style={{ borderRadius: "var(--c-radius-pill)" }}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <ConsoleButton onClick={onTryCall} className="!py-1 !px-2.5 !text-[12px]">
          <PlayCircle className="h-3.5 w-3.5" />
          试拨
        </ConsoleButton>
        <button
          type="button"
          onClick={onSelect}
          className="text-[11.5px] font-medium text-[var(--brand-muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5"
        >
          查看详情 <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* ── Hotline detail ─────────────────────────────────────────────────── */

function HotlineDetail({ hotline, onTryCall }: { hotline: Hotline; onTryCall: () => void }) {
  return (
    <ConsoleCard padded={false}>
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)]">
            HOTLINE
          </span>
          <ReviewBadge status={hotline.review_status} />
          {hotline.is_official && <span className="c-status c-status-info">official</span>}
        </div>
        <h2 className="text-[18px] font-semibold text-[var(--ink)] tracking-tight">
          {hotline.display_name}
        </h2>
        <code className="console-mono text-[12px] text-[var(--brand-muted)]">
          {hotline.hotline_id}
        </code>
        <p className="text-[12.5px] text-[var(--brand-muted)] leading-relaxed mt-2">
          {hotline.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {hotline.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-1.5 py-px text-[10.5px] font-medium bg-[var(--brand-secondary)]/60 text-[var(--brand-muted)]"
              style={{ borderRadius: "var(--c-radius-pill)" }}
            >
              <TagIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b" style={{ borderColor: "var(--border)" }}>
        <SubBlock title="输入字段">
          <ul className="flex flex-col gap-2">
            {hotline.input_fields.map((f) => (
              <FieldRow key={f.name} field={f} />
            ))}
          </ul>
        </SubBlock>
        <SubBlock title="输出">
          <code className="console-mono text-[11.5px] text-[var(--ink)] block bg-[var(--brand-secondary)]/40 px-2 py-1.5 leading-relaxed whitespace-pre-wrap" style={{ borderRadius: "var(--c-radius-sm)" }}>
            {hotline.output_summary}
          </code>
        </SubBlock>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b" style={{ borderColor: "var(--border)" }}>
        <SubBlock title="适合做什么">
          <ul className="flex flex-col gap-1 text-[12px] text-[var(--ink)]">
            {hotline.recommended.map((r) => (
              <li key={r} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[var(--c-status-success-fg)] mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </SubBlock>
        <SubBlock title="不适合做什么">
          <ul className="flex flex-col gap-1 text-[12px] text-[var(--brand-muted)]">
            {hotline.limitations.map((l) => (
              <li key={l} className="flex items-start gap-1.5">
                <X className="h-3 w-3 mt-0.5 shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        </SubBlock>
      </div>

      <div className="px-5 py-4 flex items-center justify-between bg-[var(--brand-secondary)]/30">
        <div className="text-[12px] text-[var(--brand-muted)]">
          Responder · <code className="console-mono text-[var(--ink)]">{hotline.responder_id}</code>
        </div>
        <ConsoleButton onClick={onTryCall}>
          <PlayCircle className="h-3.5 w-3.5" />
          试拨这个 Hotline
        </ConsoleButton>
      </div>
    </ConsoleCard>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)] mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function FieldRow({ field }: { field: HotlineField }) {
  return (
    <li className="flex items-baseline gap-2">
      <code className="console-mono text-[11.5px] text-[var(--ink)] shrink-0">{field.name}</code>
      <span
        className="inline-flex items-center px-1 py-px text-[9.5px] font-semibold bg-[var(--brand-secondary)] text-[var(--brand-muted)] uppercase"
        style={{ borderRadius: "var(--c-radius-sm)" }}
      >
        {field.type}
      </span>
      {field.required && (
        <span className="text-[10px] text-[var(--c-status-error-fg)] font-semibold">必填</span>
      )}
      {field.description && (
        <span className="text-[11.5px] text-[var(--brand-muted)] truncate">· {field.description}</span>
      )}
    </li>
  );
}

function ReviewBadge({ status }: { status: Hotline["review_status"] }) {
  const map: Record<Hotline["review_status"], { label: string; cls: string }> = {
    local_only: { label: "local-only", cls: "c-status-info" },
    approved: { label: "approved", cls: "c-status-success" },
    pending: { label: "pending", cls: "c-status-warn" },
    rejected: { label: "rejected", cls: "c-status-error" },
  };
  const { label, cls } = map[status];
  return <span className={cn("c-status", cls)}>{label}</span>;
}

/* ── Empty catalog (M8 · two-path + demo loader) ────────────────────── */

function EmptyCatalog() {
  return (
    <ConsoleCard className="mt-4">
      <div className="flex flex-col items-center text-center py-6 max-w-lg mx-auto">
        <span
          className="inline-flex items-center justify-center h-12 w-12 c-ink-border-2 bg-white mb-3"
          style={{ borderRadius: "var(--c-radius)" }}
        >
          <PackageSearch className="h-6 w-6 text-[var(--ink)]" strokeWidth={2.5} />
        </span>
        <h3 className="text-[16px] font-semibold text-[var(--ink)]">你的 Catalog 是空的</h3>
        <p className="text-[12.5px] text-[var(--brand-muted)] mt-1 leading-relaxed">
          你需要至少一个 Hotline 才能发起调用。三条路径自选：
        </p>

        <div className="mt-5 w-full flex flex-col gap-2.5">
          <PathRow
            n={1}
            title="让你的 Responder 发布一个 Hotline"
            body="如果本机已经启用了 Responder，去管理页创建一个新的 hotline。"
            cta={{ label: "打开 Hotline 管理", href: "/console/hotlines", variant: "primary" }}
          />
          <PathRow
            n={2}
            title="开启平台模式，浏览社区已发布的"
            body="平台模式下 Catalog 会拉取社区贡献的 hotline 索引。"
            cta={{ label: "去 Dashboard 启用平台模式", href: "/console/dashboard", variant: "ink" }}
          />
          <PathRow
            n={3}
            title="不想配置？一键加载 3 个 demo Hotline"
            body="加载 ops.notify / calendar.find_slot / web.search 用于试拨练手。可随时清除。"
            cta={{ label: "加载 demo Hotline", href: "#", variant: "ghost" }}
          />
        </div>
      </div>
    </ConsoleCard>
  );
}

function PathRow({
  n,
  title,
  body,
  cta,
}: {
  n: number;
  title: string;
  body: string;
  cta: { label: string; href: string; variant: "primary" | "ink" | "ghost" };
}) {
  const inner = (
    <ConsoleButton variant={cta.variant} className="shrink-0">
      {cta.label}
      <ChevronRight className="h-3.5 w-3.5" />
    </ConsoleButton>
  );
  return (
    <div
      className="flex items-start gap-3 p-3 border bg-white text-left"
      style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius)" }}
    >
      <span
        className="inline-flex items-center justify-center h-6 w-6 text-[11px] font-bold tabular-nums shrink-0 c-ink-border bg-white text-[var(--ink)]"
        style={{ borderRadius: "var(--c-radius-pill)" }}
      >
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[11.5px] text-[var(--brand-muted)] mt-0.5 leading-snug">{body}</p>
      </div>
      {cta.href === "#" ? inner : <Link to={cta.href}>{inner}</Link>}
    </div>
  );
}

/* ── Try-call drawer (right-side sheet) ─────────────────────────────── */

function TryCallDrawer({
  hotline,
  prefill,
  onClose,
}: {
  hotline: Hotline;
  prefill: Record<string, string | number | boolean> | null;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [responderId] = useState(hotline.responder_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭抽屉"
        className="flex-1 bg-[var(--ink)]/30 backdrop-blur-[1px]"
      />
      <aside
        className="w-[460px] bg-[var(--surface)] border-l shadow-2xl flex flex-col"
        style={{ borderColor: "var(--border)" }}
      >
        <header className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)]">
              试拨
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--brand-muted)] hover:text-[var(--ink)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--ink)] mt-1">
            {hotline.display_name}
          </h3>
          <code className="console-mono text-[11.5px] text-[var(--brand-muted)]">
            {hotline.hotline_id}
          </code>
          {prefill && (
            <p className="mt-2 text-[11.5px] text-[var(--c-status-info-fg)] inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              已用上次失败的输入预填，改完直接重发即可。
            </p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <label className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-muted)]">
              Responder
            </label>
            <select
              value={responderId}
              className="mt-1 w-full px-2.5 py-1.5 bg-white border text-[12.5px] text-[var(--ink)]"
              style={{ borderColor: "var(--border)", borderRadius: "var(--c-radius-sm)" }}
            >
              <option value={hotline.responder_id}>{hotline.responder_id}</option>
            </select>
          </div>

          <div className="flex flex-col gap-3.5">
            {hotline.input_fields.map((f) => (
              <FormField
                key={f.name}
                field={f}
                prefilled={prefill?.[f.name]}
              />
            ))}
          </div>
        </form>

        <footer
          className="px-5 py-3 border-t flex items-center justify-end gap-2 bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          <ConsoleButton variant="ghost" onClick={onClose}>
            取消
          </ConsoleButton>
          <ConsoleButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            发送调用
          </ConsoleButton>
        </footer>
      </aside>
    </div>
  );
}

function FormField({
  field,
  prefilled,
}: {
  field: HotlineField;
  prefilled?: string | number | boolean;
}) {
  const id = `field-${field.name}`;
  const value = prefilled ?? field.default ?? "";
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-semibold text-[var(--ink)]">
        {field.label}
        {field.required && <span className="text-[var(--c-status-error-fg)] ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-[11px] text-[var(--brand-muted)] leading-snug mt-0.5">
          {field.description}
        </p>
      )}
      <div className="mt-1">{renderControl(id, field, value)}</div>
    </div>
  );
}

function renderControl(
  id: string,
  field: HotlineField,
  defaultValue: string | number | boolean,
) {
  const baseInput =
    "w-full px-2.5 py-1.5 bg-white border text-[12.5px] text-[var(--ink)] placeholder:text-[var(--brand-muted)]/70 outline-none focus:c-ink-border";
  const baseStyle = { borderColor: "var(--border)", borderRadius: "var(--c-radius-sm)" };

  switch (field.type) {
    case "string":
      return (
        <input
          id={id}
          defaultValue={String(defaultValue ?? "")}
          placeholder={field.placeholder}
          className={baseInput}
          style={baseStyle}
        />
      );
    case "multiline":
      return (
        <textarea
          id={id}
          rows={3}
          defaultValue={String(defaultValue ?? "")}
          placeholder={field.placeholder}
          className={cn(baseInput, "leading-relaxed")}
          style={baseStyle}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          defaultValue={defaultValue !== undefined ? Number(defaultValue) : undefined}
          className={baseInput}
          style={baseStyle}
        />
      );
    case "enum":
      return (
        <select
          id={id}
          defaultValue={String(defaultValue ?? "")}
          className={baseInput}
          style={baseStyle}
        >
          {(field.enumValues ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    case "bool":
      return (
        <label htmlFor={id} className="inline-flex items-center gap-2 text-[12.5px] text-[var(--ink)]">
          <input
            id={id}
            type="checkbox"
            defaultChecked={Boolean(defaultValue)}
            className="h-3.5 w-3.5"
          />
          启用
        </label>
      );
  }
}

/* ── Exports for tile thumbnail ─────────────────────────────────────── */

export const CATALOG_DEMO_THUMB_DATA: { name: string; tag: string; icon: LucideIcon }[] = [
  { name: "Slack 通知", tag: "official", icon: Send },
  { name: "日历 · 找空档", tag: "official", icon: ArrowRight },
  { name: "网页搜索", tag: "community", icon: Search },
  { name: "文档总结", tag: "local", icon: PackageSearch },
];
