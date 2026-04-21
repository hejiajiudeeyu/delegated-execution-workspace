/**
 * Console pattern: Caller / Access Lists.
 *
 * Mirror of `ops-console/src/pages/caller/AccessListsPage.tsx`.
 * See `docs/console-content-spec.md §3` for the content contract.
 *
 * Real business model:
 *  - 3 tabs (NOT 4): responder whitelist / hotline whitelist / blocklist.
 *    There is exactly ONE unified blocklist; "responder-block" /
 *    "hotline-block" do not exist as separate concepts.
 *  - 3 approval modes (manual / allow_listed / allow_all). Whitelists are
 *    only effective in `allow_listed`; otherwise they show an "未生效" chip.
 *  - Mode color: amber (manual, default safe) / cyan (allow_listed) /
 *    rose (allow_all, destructive).
 *  - This page does not change the mode; it links to `/caller/preferences`.
 */

import { useState } from "react";
import {
  ShieldCheck,
  ShieldBan,
  Plus,
  X,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { ConsolePageHeader, ConsoleCard, ConsoleButton } from "../shells/console-shell";
import { cn } from "@/app/components/ui/utils";

/* ── Real enums (from PreferencesPage MODE_OPTIONS) ─────────────────── */

type ApprovalMode = "manual" | "allow_listed" | "allow_all";

type ListKey = "responderWhitelist" | "hotlineWhitelist" | "blocklist";

type ListMeta = {
  key: ListKey;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  description: string;
  placeholder: string;
  emptyTitle: string;
  emptyHint: string;
  isWhitelist: boolean;
};

const LIST_META: ListMeta[] = [
  {
    key: "responderWhitelist",
    label: "Responder 白名单",
    icon: ShieldCheck,
    iconClass: "c-role-caller",
    description:
      "命中此名单的 Responder，请求会自动放行。仅在「白名单自动放行」模式下生效。",
    placeholder: "responder_id，例如 my-company-bot",
    emptyTitle: "Responder 白名单为空",
    emptyHint:
      "在审批中心点「加入白名单」会沉淀过来；也可以在这里手动添加你信任的 Responder。",
    isWhitelist: true,
  },
  {
    key: "hotlineWhitelist",
    label: "Hotline 白名单",
    icon: ShieldCheck,
    iconClass: "c-role-caller",
    description:
      "命中此名单的 Hotline，请求会自动放行。仅在「白名单自动放行」模式下生效。",
    placeholder: "hotline_id，例如 local.delegated-execution.workspace-summary.v1",
    emptyTitle: "Hotline 白名单为空",
    emptyHint:
      "审批通过后可以选「加入白名单」沉淀；也可以在这里手动添加你信任的 Hotline。",
    isWhitelist: true,
  },
  {
    key: "blocklist",
    label: "黑名单",
    icon: ShieldBan,
    iconClass: "text-[var(--brand-red)]",
    description:
      "命中此名单的 Hotline 或 Responder 一律拒绝。在所有审批模式下都永远生效。",
    placeholder: "需要封锁的 hotline_id 或 responder_id",
    emptyTitle: "黑名单为空",
    emptyHint: "出现明确滥用时把对方的 ID 加进来即可。",
    isWhitelist: false,
  },
];

type StaticData = Record<ListKey, string[]>;

/* "Dumb instances" of real GlobalPolicy — IDs follow real format. */
const INITIAL_DATA: StaticData = {
  responderWhitelist: ["my-company-bot", "research-assistant-prod", "kazik-personal"],
  hotlineWhitelist: [
    "local.delegated-execution.workspace-summary.v1",
    "local.demo.calendar.create-event.v1",
    "local.demo.web-search.v1",
  ],
  blocklist: ["legacy.payment.charge.v0"],
};

const MODE_OPTIONS: Record<ApprovalMode, {
  badgeLabel: string;
  title: string;
  message: string;
  toneCls: string;
  iconCls: string;
}> = {
  manual: {
    badgeLabel: "全部手动审批",
    title: "审批模式：全部手动审批",
    message:
      "下方白名单已保存但当前不会自动放行；切到「白名单自动放行」后才生效。Blocklist 永远生效。",
    toneCls: "c-status-warn",
    iconCls: "text-[var(--c-status-warn-fg)]",
  },
  allow_listed: {
    badgeLabel: "白名单自动放行",
    title: "审批模式：白名单自动放行（生效中）",
    message:
      "命中下方任一白名单的请求会自动放行；其余请求继续走审批中心人工批准。Blocklist 永远生效。",
    toneCls: "c-status-info",
    iconCls: "text-[var(--c-status-info-fg)]",
  },
  allow_all: {
    badgeLabel: "全部自动放行",
    title: "审批模式：全部自动放行",
    message:
      "所有 Hotline 调用直接执行，无需审批。下方白名单不会被特殊使用，但 Blocklist 仍然会拒绝命中项。",
    toneCls: "c-status-error",
    iconCls: "text-[var(--c-status-error-fg)]",
  },
};

export function ConsolePageAccessLists() {
  const [data, setData] = useState<StaticData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<ListKey>("responderWhitelist");
  /* Hard-coded for visual review; in real page it comes from /caller/global-policy. */
  const [mode] = useState<ApprovalMode>("manual");

  const counts = LIST_META.reduce<Record<ListKey, number>>(
    (acc, m) => {
      acc[m.key] = data[m.key].length;
      return acc;
    },
    {} as Record<ListKey, number>,
  );

  const handleAdd = (key: ListKey, value: string) => {
    if (!value.trim()) return;
    if (data[key].includes(value.trim())) return;
    setData((prev) => ({ ...prev, [key]: [...prev[key], value.trim()] }));
  };

  const handleRemove = (key: ListKey, value: string) => {
    setData((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== value) }));
  };

  const meta = LIST_META.find((m) => m.key === activeTab)!;

  return (
    <>
      <ConsolePageHeader
        kicker="Caller · 名单管理"
        title="名单管理"
        description="维护 Responder / Hotline 白名单与 Blocklist。审批中心的「加入白名单」也会沉淀到这里。"
      />

      <div className="flex flex-col gap-4">
        <ModeStatusCard mode={mode} />

        <ConsoleCard padded={false} className="overflow-hidden">
          <TabsBar active={activeTab} onChange={setActiveTab} counts={counts} mode={mode} />
          <ListPanel
            meta={meta}
            mode={mode}
            items={data[meta.key]}
            onAdd={(v) => handleAdd(meta.key, v)}
            onRemove={(v) => handleRemove(meta.key, v)}
          />
        </ConsoleCard>
      </div>
    </>
  );
}

/* ── Mode status banner (3 real modes) ──────────────────────────────── */

function ModeStatusCard({ mode }: { mode: ApprovalMode }) {
  const cfg = MODE_OPTIONS[mode];
  return (
    <div
      className={cn("flex items-start gap-3 px-4 py-3 border", cfg.toneCls)}
      style={{
        borderColor: "var(--border)",
        borderRadius: "var(--c-radius)",
      }}
    >
      <ShieldCheck className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.iconCls)} strokeWidth={2.5} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold text-[13px]">{cfg.title}</p>
          <a
            href="#preferences"
            className="text-[12px] font-medium underline underline-offset-2 hover:opacity-80 shrink-0 inline-flex items-center gap-1"
          >
            切换模式
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <p className="text-[12.5px] mt-0.5 leading-relaxed opacity-90">{cfg.message}</p>
      </div>
    </div>
  );
}

/* ── Tabs (3 tabs, with not-effective awareness) ────────────────────── */

function TabsBar({
  active,
  onChange,
  counts,
  mode,
}: {
  active: ListKey;
  onChange: (k: ListKey) => void;
  counts: Record<ListKey, number>;
  mode: ApprovalMode;
}) {
  return (
    <div
      className="border-b px-3 pt-3 pb-0 flex items-end gap-1"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="inline-flex p-1 bg-[var(--brand-secondary)]/60"
        style={{ borderRadius: "var(--c-radius)" }}
      >
        {LIST_META.map((m) => {
          const Icon = m.icon;
          const isActive = m.key === active;
          /* Whitelist not effective unless mode === allow_listed */
          const notEffective =
            m.isWhitelist && mode !== "allow_listed" && counts[m.key] > 0;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(m.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                isActive
                  ? "bg-white text-[var(--ink)] c-ink-border c-shadow-1"
                  : "text-[var(--brand-muted)] hover:text-[var(--ink)]",
              )}
              style={{ borderRadius: "var(--c-radius-sm)" }}
            >
              <Icon
                className={cn("h-3.5 w-3.5", isActive && m.iconClass)}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{m.label}</span>
              <CountChip n={counts[m.key]} active={isActive} />
              {notEffective && (
                <span
                  className="inline-flex items-center px-1.5 py-0 text-[9.5px] font-semibold uppercase tracking-wider bg-[var(--c-status-warn-bg)] text-[var(--c-status-warn-fg)]"
                  style={{ borderRadius: "var(--c-radius-pill)" }}
                  title="当前审批模式不是「白名单自动放行」，名单不会触发自动放行"
                >
                  未生效
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountChip({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10.5px] font-semibold tabular-nums",
        active
          ? "bg-[var(--brand-ink)] text-white"
          : "bg-[var(--brand-secondary)] text-[var(--brand-muted)]",
      )}
      style={{ borderRadius: "var(--c-radius-pill)" }}
    >
      {n}
    </span>
  );
}

/* ── ListPanel (3-zone) ─────────────────────────────────────────────── */

function ListPanel({
  meta,
  mode,
  items,
  onAdd,
  onRemove,
}: {
  meta: ListMeta;
  mode: ApprovalMode;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const notEffective = meta.isWhitelist && mode !== "allow_listed" && items.length > 0;

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[var(--ink)] flex items-center gap-2">
            {meta.label}
            <span className="text-[11px] font-medium text-[var(--brand-muted)]">
              {items.length} 条
            </span>
            {notEffective && (
              <span
                className="inline-flex items-center px-1.5 py-0 text-[9.5px] font-semibold uppercase tracking-wider bg-[var(--c-status-warn-bg)] text-[var(--c-status-warn-fg)]"
                style={{ borderRadius: "var(--c-radius-pill)" }}
              >
                未生效
              </span>
            )}
          </h3>
          <p className="text-[12.5px] text-[var(--brand-muted)] mt-1 leading-relaxed">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        {items.length === 0 ? (
          <EmptyState meta={meta} />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {items.map((item) => (
              <li
                key={item}
                className="group flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--brand-secondary)]/40 transition-colors"
              >
                <span className="font-mono text-[12.5px] text-[var(--ink)] flex-1 truncate console-mono">
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100",
                    "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium",
                    "text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10",
                    "transition-opacity",
                  )}
                  style={{ borderRadius: "var(--c-radius-sm)" }}
                  aria-label={`移除 ${item}`}
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddRow placeholder={meta.placeholder} onAdd={onAdd} />
    </div>
  );
}

function EmptyState({ meta }: { meta: ListMeta }) {
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-2.5">
      <span
        className="inline-flex items-center justify-center h-10 w-10 c-ink-border bg-[var(--brand-secondary)]/40"
        style={{ borderRadius: "var(--c-radius)" }}
      >
        <Icon className={cn("h-5 w-5", meta.iconClass)} strokeWidth={2} />
      </span>
      <p className="text-[13px] font-semibold text-[var(--ink)]">{meta.emptyTitle}</p>
      <p className="text-[12.5px] text-[var(--brand-muted)] max-w-sm leading-relaxed">
        {meta.emptyHint}
      </p>
    </div>
  );
}

function AddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (v: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };
  return (
    <div
      className="border-t px-5 py-3 bg-[var(--brand-secondary)]/30"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
        添加新条目
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className={cn(
            "flex-1 px-3 py-1.5 text-[13px] bg-white border",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-ink)]/30",
            "placeholder:text-[var(--brand-muted)]/60 console-mono",
          )}
          style={{
            borderColor: "var(--border)",
            borderRadius: "var(--c-radius)",
          }}
        />
        <ConsoleButton onClick={submit} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" />
          添加
        </ConsoleButton>
      </div>
    </div>
  );
}

export { ConsolePageAccessLists as default };
