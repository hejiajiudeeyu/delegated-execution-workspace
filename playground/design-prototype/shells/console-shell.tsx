/**
 * ConsoleShell — chrome scaffold for console-mode prototypes.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Header (logo · breadcrumb · session · env)          │  56px
 *   ├──────────┬──────────────────────────────────────────┤
 *   │ Sidebar  │ Main                                     │
 *   │ 224px    │ paper bg, max-w-6xl content              │
 *   │ rail     │                                          │
 *   └──────────┴──────────────────────────────────────────┘
 *
 * Activate console-mode tokens via the wrapping `.console-mode` class.
 * Reusable for ops-console, platform-console, or any console-shaped UI.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Activity,
  BookOpen,
  PlayCircle,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import { brandPalette } from "@/app/components/brand-scaffold";
import { BrandIconShapes } from "@/app/components/icons";

export type ConsoleBackdropIntensity = "branded" | "subtle" | "off";

export type ConsoleRoleKey = "general" | "caller" | "responder";

export type ConsoleNavGroup = {
  key: ConsoleRoleKey;
  label: string;
  /** 11px subtitle under the group label — disambiguates "调用方/响应方" jargon. */
  description?: string;
  items: ConsoleNavItem[];
};

export type ConsoleNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
};

export type ConsoleBreadcrumb = {
  label: string;
  href?: string;
};

export type ConsoleSessionInfo = {
  label: string;
  tone: "ok" | "warn" | "error";
  hint?: string;
};

export type ConsoleEnvInfo = {
  label: string;
  detail?: string;
};

/**
 * Cross-page deep-link breadcrumb chip.
 * See `docs/console-content-spec.md §0.6`.
 *
 * `from` MUST be one of the registered enum values in §0.6's table; the shell
 * looks the label up to render the chip. Pass `onBack` for prototype demos
 * (in real ops-console, navigate(-1) is fine).
 */
export type ConsoleFromContext = {
  from: string;
  /** Override label; if missing the shell consults FROM_LABELS. */
  label?: string;
  href?: string;
};

const FROM_LABELS: Record<string, string> = {
  "dashboard-onboarding": "上手清单",
  "dashboard-nextup": "工作台 · 下一步",
  "calls-retry": "调用记录 · 重试",
  "calls-detail": "调用记录",
  "approvals-add-whitelist": "审批中心 · 加入白名单",
  "approvals-tired-banner": "审批中心 · 切换模式",
};

export type ConsoleShellProps = {
  groups: ConsoleNavGroup[];
  activeHref: string;
  breadcrumb: ConsoleBreadcrumb[];
  session?: ConsoleSessionInfo;
  env?: ConsoleEnvInfo;
  /**
   * Cross-page from-context (per spec §0.6). When set, a chip renders above
   * the breadcrumb so the user knows where they came from.
   */
  fromContext?: ConsoleFromContext;
  /**
   * Decorative brand backdrop strength.
   * - "branded" (default): faint poster nod — 9-tile color wash + repeating BrandIconShapes pattern,
   *   tuned far below brand-site so console data stays readable.
   * - "subtle":   pattern only, no color tiles. For long-list / data-heavy pages.
   * - "off":      solid paper, no decoration. For modal/embed surfaces.
   */
  backdrop?: ConsoleBackdropIntensity;
  children: ReactNode;
};

const roleDotClass: Record<ConsoleRoleKey, string> = {
  general: "bg-[var(--brand-blue)]",
  caller: "bg-[var(--brand-teal)]",
  responder: "bg-[var(--brand-orange)]",
};

const roleLabel: Record<ConsoleRoleKey, string> = {
  general: "GENERAL",
  caller: "CALLER",
  responder: "RESPONDER",
};

export function ConsoleShell({
  groups,
  activeHref,
  breadcrumb,
  session,
  env,
  fromContext,
  backdrop = "branded",
  children,
}: ConsoleShellProps) {
  return (
    <div className="console-mode relative min-h-screen flex flex-col bg-[var(--surface)] text-[var(--ink)]">
      <ConsoleBackdrop intensity={backdrop} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <ConsoleHeader breadcrumb={breadcrumb} session={session} env={env} />
        <div className="flex flex-1 min-h-0">
          <ConsoleSidebar groups={groups} activeHref={activeHref} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-8 py-8">
              {fromContext && <FromContextChip ctx={fromContext} />}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function FromContextChip({ ctx }: { ctx: ConsoleFromContext }) {
  const label = ctx.label ?? FROM_LABELS[ctx.from] ?? ctx.from;
  const Tag = ctx.href ? Link : "div";
  const tagProps: Record<string, unknown> = ctx.href ? { to: ctx.href } : {};
  return (
    <Tag
      {...tagProps}
      className={cn(
        "inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 text-[11.5px] font-medium",
        "bg-[var(--brand-secondary)]/60 text-[var(--brand-muted)]",
        ctx.href && "hover:text-[var(--ink)] hover:bg-[var(--brand-secondary)] cursor-pointer",
      )}
      style={{ borderRadius: "var(--c-radius-pill)" }}
    >
      <ChevronLeft className="h-3 w-3" strokeWidth={2.5} />
      <span>
        从 <span className="text-[var(--ink)] font-semibold">{label}</span> 跳过来
      </span>
    </Tag>
  );
}

/* ── Backdrop ───────────────────────────────────────────────────────────
 * Carries the brand "poster" pattern from the marketing site into the
 * console — but in console mode the strengths are tuned WAY down so that
 * data, JSON, log streams and long lists stay legible. Cards remain fully
 * opaque to anchor reading; the decoration shows through main/sidebar/
 * header chrome and through the gaps between cards.
 */
export function ConsoleBackdrop({
  intensity = "branded",
}: {
  intensity?: ConsoleBackdropIntensity;
}) {
  if (intensity === "off") return null;

  const tilesOpacity = intensity === "branded" ? 0.08 : 0;
  const patternOpacity = intensity === "branded" ? 0.06 : 0.045;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {tilesOpacity > 0 && (
        <div
          className="absolute inset-0 grid grid-cols-3 grid-rows-3"
          style={{ opacity: tilesOpacity }}
        >
          {[
            brandPalette.yellow,
            brandPalette.purple,
            brandPalette.blue,
            brandPalette.pink,
            brandPalette.green,
            brandPalette.orange,
            brandPalette.indigo,
            brandPalette.red,
            brandPalette.teal,
          ].map((color, index) => (
            <div key={`${color}-${index}`} style={{ backgroundColor: color }} />
          ))}
        </div>
      )}

      <div className="absolute inset-0" style={{ opacity: patternOpacity }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="console-brand-grid"
              x="0"
              y="0"
              width="240"
              height="240"
              patternUnits="userSpaceOnUse"
            >
              <rect width="240" height="240" fill="none" />
              <g transform="translate(20 20) scale(1)">
                <BrandIconShapes lineColor={brandPalette.ink} showText={true} />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#console-brand-grid)" />
        </svg>
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────── */

function ConsoleHeader({
  breadcrumb,
  session,
  env,
}: {
  breadcrumb: ConsoleBreadcrumb[];
  session?: ConsoleSessionInfo;
  env?: ConsoleEnvInfo;
}) {
  return (
    <header
      className="h-14 flex items-center px-5 border-b bg-white/80"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3 mr-6 shrink-0">
        <span
          className="inline-flex items-center justify-center w-7 h-7 c-ink-border-2 bg-[var(--brand-green)] font-black text-[13px]"
          style={{ borderRadius: "var(--c-radius-sm)" }}
        >
          C
        </span>
        <span className="font-semibold text-[13px] tracking-tight">
          CALL ANYTHING
          <span className="ml-1.5 text-[var(--brand-muted)] font-normal">
            / Console
          </span>
        </span>
      </div>

      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-[13px] min-w-0 flex-1"
      >
        {breadcrumb.map((crumb, idx) => {
          const isLast = idx === breadcrumb.length - 1;
          return (
            <div key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
              {idx > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-[var(--brand-muted)]"
                  strokeWidth={2}
                />
              )}
              {crumb.href && !isLast ? (
                <Link
                  to={crumb.href}
                  className="text-[var(--brand-muted)] hover:text-[var(--ink)] truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    isLast ? "font-semibold text-[var(--ink)]" : "text-[var(--brand-muted)]",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {session && <SessionBadge session={session} />}
        {env && <EnvBadge env={env} />}
      </div>
    </header>
  );
}

function SessionBadge({ session }: { session: ConsoleSessionInfo }) {
  const cls =
    session.tone === "ok"
      ? "c-status-success"
      : session.tone === "warn"
        ? "c-status-warn"
        : "c-status-error";
  return (
    <span className={cn("c-status", cls)} title={session.hint}>
      <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
      {session.label}
    </span>
  );
}

function EnvBadge({ env }: { env: ConsoleEnvInfo }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 c-ink-border text-[11px] font-semibold uppercase tracking-wider"
      style={{ borderRadius: "var(--c-radius-sm)" }}
      title={env.detail}
    >
      <Activity className="h-3 w-3" strokeWidth={2.5} />
      {env.label}
    </span>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────── */

function ConsoleSidebar({
  groups,
  activeHref,
}: {
  groups: ConsoleNavGroup[];
  activeHref: string;
}) {
  return (
    <aside
      className="w-56 shrink-0 border-r bg-[color-mix(in_oklab,var(--sidebar)_92%,transparent)] overflow-y-auto flex flex-col"
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <nav className="py-3 flex-1">
        {groups.map((group, gi) => (
          <SidebarGroup
            key={group.key}
            group={group}
            activeHref={activeHref}
            divided={gi > 0}
          />
        ))}
      </nav>
      <SidebarHelpFooter activeHref={activeHref} />
    </aside>
  );
}

function SidebarGroup({
  group,
  activeHref,
  divided,
}: {
  group: ConsoleNavGroup;
  activeHref: string;
  divided: boolean;
}) {
  return (
    <div
      className={cn(
        "px-2 py-2",
        divided && "mt-2 pt-3 border-t",
      )}
      style={divided ? { borderColor: "var(--sidebar-border)" } : undefined}
    >
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", roleDotClass[group.key])}
          />
          <span className="text-[10.5px] font-semibold tracking-[0.14em] text-[var(--brand-muted)]">
            {roleLabel[group.key]}
          </span>
          <span className="text-[10.5px] font-medium text-[var(--brand-muted)]/70">
            / {group.label}
          </span>
        </div>
        {group.description && (
          <p className="text-[10.5px] text-[var(--brand-muted)]/80 leading-tight mt-1 ml-3.5">
            {group.description}
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <li key={item.href}>
            <SidebarItem item={item} active={item.href === activeHref} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Per spec §0.5 — only three links, no more. This is a help gate, not a nav. */
const HELP_LINKS: { href: string; label: string; icon: LucideIcon; tone: "primary" | "muted" }[] = [
  { href: "/console/help", label: "使用指南", icon: BookOpen, tone: "primary" },
  { href: "/console/help#first-call", label: "示例 Hotline 速跑", icon: PlayCircle, tone: "muted" },
  { href: "/console/help#feedback", label: "报告问题", icon: MessageSquareWarning, tone: "muted" },
];

function SidebarHelpFooter({ activeHref }: { activeHref: string }) {
  return (
    <div
      className="border-t px-2 py-3 bg-[color-mix(in_oklab,var(--brand-secondary)_30%,transparent)]"
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-[var(--brand-muted)] uppercase">
        上手 & 帮助
      </div>
      <ul className="flex flex-col gap-0.5">
        {HELP_LINKS.map((link) => {
          const Icon = link.icon;
          const active = activeHref === link.href || activeHref.startsWith("/console/help");
          return (
            <li key={link.href}>
              <Link
                to={link.href}
                className={cn(
                  "group flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium",
                  "transition-colors",
                  active && link.tone === "primary"
                    ? "bg-white c-ink-border c-shadow-1 text-[var(--ink)]"
                    : "text-[var(--brand-muted)] hover:text-[var(--ink)] hover:bg-[var(--brand-secondary)]/60",
                )}
                style={{ borderRadius: "var(--c-radius)" }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="flex-1 truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SidebarItem({
  item,
  active,
}: {
  item: ConsoleNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium",
        "transition-colors",
        active
          ? "bg-white c-ink-border c-shadow-1 text-[var(--ink)]"
          : "text-[var(--brand-muted)] hover:text-[var(--ink)] hover:bg-[var(--brand-secondary)]/60",
      )}
      style={{ borderRadius: "var(--c-radius)" }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={cn(
            "px-1.5 py-px text-[10px] font-semibold tabular-nums",
            active
              ? "bg-[var(--brand-ink)] text-white"
              : "bg-[var(--brand-secondary)] text-[var(--brand-muted)]",
          )}
          style={{ borderRadius: "var(--c-radius-pill)" }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/* ── Section primitives for use inside Main ─────────────────────────── */

export function ConsolePageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div className="min-w-0">
        {kicker && <div className="c-kicker mb-2">{kicker}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-[var(--brand-muted)] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Card primitive scoped to console mode — paper-on-paper white card. */
export function ConsoleCard({
  className,
  children,
  padded = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn(
        "bg-[var(--card)] border",
        padded && "p-5",
        className,
      )}
      style={{
        borderColor: "var(--border)",
        borderRadius: "var(--c-radius)",
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Primary CTA — light brutalist: ink border + 2px hard offset shadow + lift. */
export function ConsoleButton({
  variant = "primary",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ink" | "ghost" | "danger";
}) {
  const base = "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold transition-colors";
  const variants: Record<NonNullable<typeof variant>, string> = {
    primary:
      "bg-[var(--brand-green)] c-ink-border c-shadow-1 c-lift c-lift-active text-[var(--ink)]",
    ink:
      "bg-[var(--brand-ink)] text-white hover:bg-[var(--brand-ink)]/90",
    ghost:
      "bg-transparent text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--brand-secondary)]",
    danger:
      "bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red)]/90",
  };
  return (
    <button
      className={cn(base, variants[variant], className)}
      style={{ borderRadius: "var(--c-radius)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

