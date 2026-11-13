'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { IconAlert, IconCheckCircle, IconInfo, IconX } from './Icons';

/* ───────────────────────── Formatting ───────────────────────── */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export function formatINR(value: number): string {
  return `₹${inr.format(value)}`;
}

export function initials(name: string): string {
  const cleaned = name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_HUES = [200, 160, 260, 20, 330, 45, 290, 120, 0, 230];
function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function Avatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const hue = hueFor(name);
  return (
    <span
      aria-hidden="true"
      className={`avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : ''} ${className}`}
      style={{
        background: `color-mix(in oklab, hsl(${hue} 70% 50%) 16%, var(--surface))`,
        color: `color-mix(in oklab, hsl(${hue} 65% 38%) 80%, var(--fg))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ───────────────────────── Status badges ───────────────────────── */

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  WAITING: { label: 'Waiting', tone: 'neutral' },
  IN_CONSULTATION: { label: 'With doctor', tone: 'brand' },
  COMPLETED: { label: 'Done', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  NO_SHOW: { label: 'No-show', tone: 'danger' },
  SCHEDULED: { label: 'Scheduled', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  CHECKED_IN: { label: 'Checked in', tone: 'brand' },
  PAID: { label: 'Paid', tone: 'success' },
  UNPAID: { label: 'Due', tone: 'warning' },
  PARTIAL: { label: 'Partly paid', tone: 'warning' },
  PENDING: { label: 'Pending', tone: 'warning' },
  REMINDED: { label: 'Reminded', tone: 'info' },
  MISSED: { label: 'Missed', tone: 'danger' },
  ORDERED: { label: 'Ordered', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  READY: { label: 'Ready', tone: 'success' },
  DISPENSED: { label: 'Dispensed', tone: 'success' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const entry = STATUS_MAP[status] ?? { label: status.replace(/_/g, ' ').toLowerCase(), tone: 'neutral' as Tone };
  return <Badge tone={entry.tone} dot>{label ?? entry.label}</Badge>;
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className = '',
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const toneClass = tone === 'neutral' ? '' : `badge-${tone}`;
  return <span className={`badge ${toneClass} ${dot ? 'badge-dot' : ''} ${className}`}>{children}</span>;
}

/* ───────────────────────── Layout helpers ───────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty ${className}`}>
      {icon && <span className="empty-icon">{icon}</span>}
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── Modal / bottom sheet ───────────────────────── */

const MODAL_WIDTHS = { sm: '420px', md: '520px', lg: '680px', xl: '880px' } as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  headerRight,
  footer,
  size = 'md',
  closedby = 'any',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof MODAL_WIDTHS;
  closedby?: 'any' | 'closerequest' | 'none';
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  const programmatic = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Native showModal focuses the first button; prefer an explicit autofocus target
      const target = dialog.querySelector<HTMLElement>('[data-autofocus]');
      if (target) requestAnimationFrame(() => target.focus());
    } else if (!open && dialog.open) {
      // Parent closed us — don't echo back through onClose
      programmatic.current = true;
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      onCloseRef.current();
    };
    dialog.addEventListener('close', handleClose);

    let pressedOutside = false;
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const down = (e: PointerEvent) => {
      pressedOutside = closedby === 'any' && e.target === dialog && outside(e);
    };
    const up = (e: PointerEvent) => {
      if (pressedOutside && e.target === dialog && outside(e)) dialog.close();
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', down);
    dialog.addEventListener('pointerup', up);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', down);
      dialog.removeEventListener('pointerup', up);
    };
  }, [closedby]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="modal"
      style={{ '--modal-w': MODAL_WIDTHS[size] } as React.CSSProperties}
    >
      {open && (
        <>
          <div className="modal-head">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-[15px] font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 truncate text-[13px] text-muted">{description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerRight}
              <button
                type="button"
                aria-label="Close"
                onClick={() => ref.current?.close()}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <IconX />
              </button>
            </div>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

/* ───────────────────────── Toasts ───────────────────────── */

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; href?: string; onClick?: () => void };
}

let toastSeq = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function toast(
  message: string,
  opts: { tone?: ToastTone; action?: ToastItem['action']; duration?: number } = {}
) {
  const item: ToastItem = { id: ++toastSeq, message, tone: opts.tone ?? 'success', action: opts.action };
  toasts = [...toasts.slice(-2), item];
  emit();
  const duration = opts.duration ?? (opts.action ? 9000 : opts.tone === 'error' ? 6000 : 3500);
  setTimeout(() => dismissToast(item.id), duration);
}

function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: ToastItem[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6 md:left-auto md:right-6 md:items-end"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-[13.5px] shadow-pop"
          style={{ animation: 'toast-in 180ms ease' }}
        >
          <span
            className={`mt-px ${t.tone === 'error' ? 'text-danger' : t.tone === 'info' ? 'text-info' : 'text-success'}`}
          >
            {t.tone === 'error' ? (
              <IconAlert className="h-[18px] w-[18px]" />
            ) : t.tone === 'info' ? (
              <IconInfo className="h-[18px] w-[18px]" />
            ) : (
              <IconCheckCircle className="h-[18px] w-[18px]" />
            )}
          </span>
          <p className="min-w-0 flex-1 font-medium">{t.message}</p>
          {t.action &&
            (t.action.href ? (
              <a
                href={t.action.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => dismissToast(t.id)}
                className="link shrink-0 text-[13px]"
              >
                {t.action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick?.();
                  dismissToast(t.id);
                }}
                className="link shrink-0 text-[13px]"
              >
                {t.action.label}
              </button>
            ))}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="-mr-1 shrink-0 text-subtle hover:text-fg"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Small hooks ───────────────────────── */

export function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Shared JSON helper that surfaces API error messages consistently. */
export async function apiJson<T = Record<string, unknown>>(
  url: string,
  init?: { method?: string; body?: unknown }
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? (init?.body !== undefined ? 'POST' : 'GET'),
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as { error?: string }).error || `Request failed (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}
