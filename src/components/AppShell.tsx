'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/lib/auth';
import { performSignOut } from '@/lib/client-auth';
import { getPlanDefinition, getPlanFeatures, TRIAL_DAYS } from '@/lib/plans';
import {
  applyThemeMode,
  CLINIC_THEME_KEY,
  readDeviceTheme,
  resolveThemeAccent,
  writeDeviceTheme,
  type ThemeMode,
} from '@/lib/themes';
import {
  IconBilling,
  IconCalendar,
  IconChart,
  IconChevronRight,
  IconFollowUp,
  IconHome,
  IconLogout,
  IconMonitor,
  IconMoon,
  IconMore,
  IconPatients,
  IconPlus,
  IconQueueTv,
  IconReceiptMinus,
  IconSearch,
  IconSettings,
  IconSparkle,
  IconSun,
  IconUser,
  IconUserPlus,
} from './Icons';
import { BRAND_NAME, BrandMark } from './Brand';
import { NewPatientDialog, patientMeta, usePatientSearch } from './patients';
import { Avatar, Modal, Toaster, toast } from './ui';

type NavKey = 'today' | 'patients' | 'followups' | 'billing' | 'analytics' | 'tv' | 'settings';

interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: (p: { className?: string; strokeWidth?: number }) => ReactNode;
  desktopOnly?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER_DOCTOR: 'Owner · Doctor',
  DOCTOR: 'Doctor',
  STAFF: 'Front desk',
};

export function openNewPatient() {
  window.dispatchEvent(new CustomEvent('crm:new-patient'));
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const plan = getPlanDefinition(user.clinic.planTier);
  const accent = resolveThemeAccent(user.clinic);
  const darkSidebar = features.whiteLabelBranding && user.clinic.sidebarTone === 'dark';
  const showPlanBox = !(features.whiteLabelBranding && user.clinic.hidePoweredBy);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  /* Theme: device choice wins; otherwise the clinic default (Growth+) */
  useEffect(() => {
    const clinicDefault: ThemeMode | null = features.nightAndLayoutCustomization
      ? ((user.clinic.colorMode as ThemeMode) ?? null)
      : null;
    try {
      if (clinicDefault && clinicDefault !== 'light') localStorage.setItem(CLINIC_THEME_KEY, clinicDefault);
      else localStorage.removeItem(CLINIC_THEME_KEY);
    } catch {
      // storage unavailable
    }
    if (!readDeviceTheme()) applyThemeMode(clinicDefault ?? 'system');
  }, [features.nightAndLayoutCustomization, user.clinic.colorMode]);

  /* Global shortcuts & events */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    const onNew = () => setNewPatientOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('crm:new-patient', onNew);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('crm:new-patient', onNew);
    };
  }, []);

  const nav: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { key: 'today', href: '/app', label: 'Today', icon: IconHome },
      { key: 'patients', href: '/app/patients', label: 'Patients', icon: IconPatients },
    ];
    if (user.clinic.enableFollowUps)
      items.push({ key: 'followups', href: '/app/followups', label: 'Follow-ups', icon: IconFollowUp });
    if (features.billing && user.clinic.enableBilling)
      items.push({ key: 'billing', href: '/app/billing', label: 'Billing', icon: IconBilling });
    if (features.analyticsMis)
      items.push({ key: 'analytics', href: '/app/analytics', label: 'Reports', icon: IconChart });
    if (features.waitingRoomBoard)
      items.push({ key: 'tv', href: '/app/queue-board', label: 'Waiting room TV', icon: IconQueueTv, desktopOnly: true });
    items.push({ key: 'settings', href: '/app/settings', label: 'Settings', icon: IconSettings });
    return items;
  }, [features, user.clinic.enableBilling, user.clinic.enableFollowUps]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/app') return pathname === '/app' || pathname.startsWith('/app/visits');
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // Bottom bar: Today · Patients · [+] · Billing|Follow-ups · More
  const fourth = nav.find((n) => n.key === 'billing') ?? nav.find((n) => n.key === 'followups');
  const bottomLeft = nav.filter((n) => n.key === 'today' || n.key === 'patients');
  const moreItems = nav.filter((n) => !bottomLeft.includes(n) && n !== fourth && !n.desktopOnly);
  const moreActive = moreItems.some((n) => isActive(n.href));

  const quickActions = [
    {
      label: 'New patient',
      hint: 'Register and open their chart',
      icon: IconUserPlus,
      run: () => setNewPatientOpen(true),
    },
    {
      label: 'Scan prescription',
      hint: 'AI handwriting & medicine reader',
      icon: (p: { className?: string }) => <IconSparkle {...p} strokeWidth={2.6} />,
      run: () => router.push('/app?action=ocr'),
    },
    ...(features.queueWorkflow
      ? [
          {
            label: 'Check in to queue',
            hint: 'Issue a token for a walk-in',
            icon: IconQueueTv,
            run: () => router.push('/app?action=checkin'),
          },
        ]
      : []),
    ...(features.appointments && user.clinic.enableAppointments
      ? [
          {
            label: 'Book appointment',
            hint: 'Reserve a time slot',
            icon: IconCalendar,
            run: () => router.push('/app?action=book'),
          },
        ]
      : []),
    ...(features.billing && user.clinic.enableBilling
      ? [
          {
            label: 'New bill',
            hint: 'Record a payment or due',
            icon: IconBilling,
            run: () => router.push('/app/billing?action=bill'),
          },
        ]
      : []),
    ...(features.expensesTracker && features.billing && user.clinic.enableBilling
      ? [
          {
            label: 'Log expense',
            hint: 'Supplies, salary, utilities…',
            icon: IconReceiptMinus,
            run: () => router.push('/app/billing?action=expense'),
          },
        ]
      : []),
    ...(features.publicBooking && user.clinic.enablePublicBooking
      ? [
          {
            label: 'Copy booking link',
            hint: 'Share public appointment page',
            icon: IconCalendar,
            run: async () => {
              const url = `${window.location.origin}/book/${user.clinic.slug}`;
              try {
                await navigator.clipboard.writeText(url);
                toast('Booking link copied', { action: { label: 'Open', href: url } });
              } catch {
                toast(url, { tone: 'info' });
              }
            },
          },
        ]
      : []),
  ];

  return (
    <div
      style={{ '--brand': accent } as React.CSSProperties}
      data-density={features.nightAndLayoutCustomization ? user.clinic.uiDensity : 'comfortable'}
      data-radius={features.nightAndLayoutCustomization ? user.clinic.cardRadius : 'rounded'}
      className="crm-shell min-h-dvh md:flex"
    >
      {/* ───────── Desktop sidebar ───────── */}
      <aside
        className={`no-print sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line md:flex ${
          darkSidebar ? 'sidebar-dark bg-surface text-fg' : 'bg-surface'
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <ClinicMark name={user.clinic.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{user.clinic.name}</p>
            <p className="truncate text-[12px] text-muted">{plan.shortName} plan</p>
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full items-center gap-2.5 rounded-[var(--r-control)] border border-line bg-surface-2 px-3 text-[13px] text-muted transition-colors hover:text-fg"
          >
            <IconSearch className="h-4 w-4" />
            <span className="flex-1 text-left">Search patients…</span>
            <span className="kbd">Ctrl K</span>
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {nav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group flex h-9 items-center gap-3 rounded-[var(--r-control)] px-3 text-[13.5px] font-medium transition-colors ${
                  active ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {features.publicBooking && user.clinic.enablePublicBooking && (
            <>
              <p className="mt-5 px-3 pb-1 text-[11.5px] font-medium text-subtle">Share</p>
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/book/${user.clinic.slug}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast('Booking link copied', { action: { label: 'Open', href: url } });
                  } catch {
                    toast(url, { tone: 'info' });
                  }
                }}
                className="flex h-9 items-center gap-3 rounded-[var(--r-control)] px-3 text-left text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <IconCalendar className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">Copy booking link</span>
              </button>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-2 p-3">
          {showPlanBox && user.clinic.subscriptionStatus === 'TRIAL' && user.clinic.trialDaysLeft !== null && (
            <Link
              href="/app/settings?tab=plan"
              className="rounded-[var(--r-control)] border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-strong"
            >
              <p className="text-[12.5px] font-medium">
                {user.clinic.trialDaysLeft} days left in trial
              </p>
              <div className="mini-bar mt-2">
                <span style={{ width: `${Math.max(4, Math.min(100, (user.clinic.trialDaysLeft / TRIAL_DAYS) * 100))}%` }} />
              </div>
            </Link>
          )}
          <UserMenu user={user} />
          {showPlanBox && (
            <Link href="/" target="_blank" className="flex items-center gap-2 px-2 pt-1 text-[12px] text-subtle hover:text-muted">
              <BrandMark size={16} />
              <span>
                <span className="font-semibold text-muted">{BRAND_NAME}</span> · the pulse of your clinic
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* ───────── Main column ───────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] px-4 backdrop-blur-xl md:hidden">
          <Link href="/app" className="flex min-w-0 flex-1 items-center gap-2.5">
            <ClinicMark name={user.clinic.name} size="sm" />
            <span className="truncate text-[15px] font-semibold">{user.clinic.name}</span>
          </Link>
          <button
            type="button"
            aria-label="Search patients"
            onClick={() => setPaletteOpen(true)}
            className="btn btn-ghost btn-icon"
          >
            <IconSearch className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Account and more"
            onClick={() => setMoreOpen(true)}
            className="-mr-1 rounded-full"
          >
            <Avatar name={user.name} size="sm" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>

      {/* ───────── Mobile bottom navigation ───────── */}
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
          {bottomLeft.map((item) => (
            <TabLink key={item.key} item={item} active={isActive(item.href)} />
          ))}
          <div className="flex items-center justify-center">
            <button
              type="button"
              aria-label="Quick actions"
              onClick={() => setQuickOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-[var(--brand-contrast)] shadow-[0_6px_16px_-4px_color-mix(in_oklab,var(--brand)_60%,transparent)] transition-transform active:scale-95"
            >
              <IconPlus className="h-6 w-6" strokeWidth={2.2} />
            </button>
          </div>
          {fourth ? <TabLink item={fourth} active={isActive(fourth.href)} /> : <span />}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-current={moreActive ? 'page' : undefined}
            className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              moreActive ? 'text-brand-ink' : 'text-muted'
            }`}
          >
            <IconMore className="h-[22px] w-[22px]" />
            More
          </button>
        </div>
      </nav>

      {/* ───────── Overlays ───────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        nav={nav}
        onNewPatient={() => {
          setPaletteOpen(false);
          setNewPatientOpen(true);
        }}
      />

      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick actions" size="sm">
        <ul className="-mx-2 flex flex-col">
          {quickActions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  a.run();
                }}
                className="flex w-full items-center gap-3.5 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">{a.label}</span>
                  <span className="block text-[12.5px] text-muted">{a.hint}</span>
                </span>
                <IconChevronRight className="h-4 w-4 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu" size="sm">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{user.name}</p>
              <p className="truncate text-[13px] text-muted">
                {ROLE_LABEL[user.role]} · {user.clinic.name}
              </p>
            </div>
          </div>

          {features.publicBooking && user.clinic.enablePublicBooking && (
            <div className="rounded-xl border border-line bg-surface-2/80 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-fg">Public booking link</p>
                <p className="truncate font-mono text-[11.5px] text-muted">
                  /book/{user.clinic.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/book/${user.clinic.slug}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast('Booking link copied', { action: { label: 'Open', href: url } });
                  } catch {
                    toast(url, { tone: 'info' });
                  }
                }}
                className="btn btn-primary btn-sm h-8 px-3 text-[12px] shrink-0"
              >
                Copy link
              </button>
            </div>
          )}

          {moreItems.length > 0 && (
            <ul className="card list overflow-hidden">
              {moreItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="row row-link min-h-[52px] py-2.5"
                  >
                    <item.icon className="h-5 w-5 text-muted" />
                    <span className="flex-1 text-[14.5px] font-medium">{item.label}</span>
                    <IconChevronRight className="h-4 w-4 text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <p className="section-label">Appearance</p>
            <ThemeSwitcher block />
          </div>

          <button
            type="button"
            onClick={() => void performSignOut()}
            className="btn btn-secondary btn-lg w-full text-danger"
          >
            <IconLogout />
            Sign out
          </button>
          {showPlanBox && (
            <p className="flex items-center justify-center gap-2 text-[12px] text-subtle">
              <BrandMark size={16} />
              <span className="font-semibold text-muted">{BRAND_NAME}</span>
            </p>
          )}
        </div>
      </Modal>

      <NewPatientDialog
        open={newPatientOpen}
        onClose={() => setNewPatientOpen(false)}
        submitLabel="Save & open chart"
        onCreated={(p) => {
          setNewPatientOpen(false);
          toast(`${p.name} added as ${p.patientCode}`);
          router.push(`/app/patients/${p.id}`);
        }}
      />

      <Toaster />
    </div>
  );
}

/* ───────────────────────── Pieces ───────────────────────── */

function ClinicMark({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const letter = name.replace(/^(dr\.?\s+)/i, '').trim().charAt(0).toUpperCase() || 'C';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-brand font-semibold text-[var(--brand-contrast)] ${
        size === 'sm' ? 'h-7 w-7 rounded-lg text-[13px]' : 'h-9 w-9 rounded-[10px] text-[15px]'
      }`}
    >
      {letter}
    </span>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
        active ? 'text-brand-ink' : 'text-muted'
      }`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.8} />
      {item.label}
    </Link>
  );
}

export function ThemeSwitcher({ block = false }: { block?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  useEffect(() => {
    const read = () => {
      const device = readDeviceTheme();
      if (device) return setMode(device);
      const attr = document.documentElement.dataset.theme;
      setMode(attr === 'dark' || attr === 'light' ? attr : 'system');
    };
    read();
    window.addEventListener('crm:theme', read);
    return () => window.removeEventListener('crm:theme', read);
  }, []);

  const options: Array<[ThemeMode, string, (p: { className?: string }) => ReactNode]> = [
    ['light', 'Light', IconSun],
    ['dark', 'Dark', IconMoon],
    ['system', 'Auto', IconMonitor],
  ];
  return (
    <div role="group" aria-label="Appearance" className={`seg ${block ? 'seg-block' : ''}`}>
      {options.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => {
            writeDeviceTheme(value);
            setMode(value);
          }}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] px-2 py-2 text-left transition-colors hover:bg-surface-2"
      >
        <Avatar name={user.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name}</span>
          <span className="block truncate text-[12px] text-muted">{ROLE_LABEL[user.role]}</span>
        </span>
        <IconMore className="h-4 w-4 text-subtle" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-[264px] rounded-xl border border-line bg-surface p-1.5 text-fg shadow-pop"
          style={{ animation: 'pop-in 120ms ease' }}
        >
          <div className="px-2 pb-2 pt-1.5">
            <p className="mb-2 text-[12px] font-medium text-muted">Appearance</p>
            <ThemeSwitcher block />
          </div>
          <div className="divider my-1" />
          <Link
            role="menuitem"
            href="/app/settings?tab=profile"
            onClick={() => setOpen(false)}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-[13.5px] hover:bg-surface-2"
          >
            <IconUser className="h-4 w-4 text-muted" /> My profile
          </Link>
          <Link
            role="menuitem"
            href="/app/settings?tab=appearance"
            onClick={() => setOpen(false)}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-[13.5px] hover:bg-surface-2"
          >
            <IconSettings className="h-4 w-4 text-muted" /> Clinic settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => void performSignOut()}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-[13.5px] text-danger hover:bg-danger-soft"
          >
            <IconLogout className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function CommandPalette({
  open,
  onClose,
  nav,
  onNewPatient,
}: {
  open: boolean;
  onClose: () => void;
  nav: NavItem[];
  onNewPatient: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Search" size="lg">
      {open && <PaletteBody nav={nav} onClose={onClose} onNewPatient={onNewPatient} />}
    </Modal>
  );
}

function PaletteBody({
  nav,
  onClose,
  onNewPatient,
}: {
  nav: NavItem[];
  onClose: () => void;
  onNewPatient: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { results, loading } = usePatientSearch(query);
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const pages = nav.filter((n) => !q || n.label.toLowerCase().includes(q));
  const patients = results.slice(0, q ? 8 : 5);

  type Entry = { id: string; run: () => void; node: ReactNode };
  const entries: Entry[] = [
    ...patients.map((p) => ({
      id: `p-${p.id}`,
      run: () => {
        onClose();
        router.push(`/app/patients/${p.id}`);
      },
      node: (
        <>
          <Avatar name={p.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
            <span className="block truncate text-[12px] text-muted">
              <span className="tnum">{p.phone}</span>
              {patientMeta(p) ? ` · ${patientMeta(p)}` : ''}
            </span>
          </span>
          <span className="font-mono text-[11.5px] text-subtle">{p.patientCode}</span>
        </>
      ),
    })),
    {
      id: 'new-patient',
      run: onNewPatient,
      node: (
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <IconUserPlus className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[13.5px] font-medium">New patient</span>
        </>
      ),
    },
    ...pages.map((n) => ({
      id: `n-${n.key}`,
      run: () => {
        onClose();
        router.push(n.href);
      },
      node: (
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted">
            <n.icon className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[13.5px]">Go to {n.label}</span>
        </>
      ),
    })),
  ];

  const safeActive = Math.min(active, Math.max(0, entries.length - 1));

  return (
    <div className="-m-5 flex flex-col max-sm:-m-4">
      <div className="input-icon border-b border-line">
        <IconSearch />
        <input
          autoFocus
          data-autofocus
          type="search"
          aria-label="Search patients and pages"
          placeholder="Search patients by name, phone or ID…"
          className="h-14 w-full bg-transparent pl-11 pr-4 text-[15px] outline-none placeholder:text-subtle"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, entries.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              entries[safeActive]?.run();
            }
          }}
        />
      </div>
      <div className="max-h-[60dvh] overflow-y-auto p-2">
        {patients.length > 0 && (
          <p className="px-2 pb-1 pt-2 text-[11.5px] font-medium text-subtle">
            {q ? 'Patients' : 'Recent patients'}
          </p>
        )}
        {q && !loading && patients.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-muted">No patients match “{query}”.</p>
        )}
        <ul>
          {entries.map((entry, i) => (
            <li key={entry.id}>
              {entry.id === 'new-patient' && (
                <p className="px-2 pb-1 pt-3 text-[11.5px] font-medium text-subtle">Actions</p>
              )}
              <button
                type="button"
                onMouseMove={() => setActive(i)}
                onClick={entry.run}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${
                  i === safeActive ? 'bg-surface-2' : ''
                }`}
              >
                {entry.node}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
