'use client';

import type { PlanTier } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/lib/auth';
import { performSignOut } from '@/lib/client-auth';
import { formatIstDateTime } from '@/lib/date';
import {
  formatStorageMb,
  getPlanDefinition,
  getPlanFeatures,
  isDoctorRole,
  PLAN_DEFAULTS,
  PLAN_ORDER,
} from '@/lib/plans';
import type { InfrastructureStatus } from '@/lib/supabase';
import { resolveThemeAccent, THEME_PRESETS } from '@/lib/themes';
import { ThemeSwitcher } from './AppShell';
import {
  IconBuilding,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  IconLock,
  IconLogout,
  IconPalette,
  IconPatients,
  IconPill,
  IconShield,
  IconSparkle,
  IconTrash,
  IconUser,
} from './Icons';
import { apiJson, Avatar, Badge, EmptyState, PageHeader, toast } from './ui';

export interface SettingsMemberItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER_DOCTOR' | 'DOCTOR' | 'STAFF';
  specialty: string | null;
  registrationNo: string | null;
  consultationFee: number | null;
  isActive: boolean;
}

export interface SettingsPresetItem {
  id: string;
  medicineName: string;
  defaultDosage: string | null;
  defaultTiming: string | null;
  defaultDuration: number | null;
}

export interface SettingsTemplateItem {
  id: string;
  name: string;
  diagnosis: string | null;
  clinicalNotes: string | null;
  followUpDays: number | null;
  medicinesCount: number;
}

export interface SettingsBranchItem {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  isDefault: boolean;
}

export interface SettingsAuditItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
}

export type SettingsTabId = 'profile' | 'clinic' | 'appearance' | 'presets' | 'team' | 'plan' | 'security';

const ROLE_LABEL: Record<string, string> = { OWNER_DOCTOR: 'Owner', DOCTOR: 'Doctor', STAFF: 'Front desk' };

/* ───────────────────────── Layout helpers ───────────────────────── */

function Section({
  title,
  description,
  children,
  footer,
  aside,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5 sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3 sm:px-6">{footer}</div>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  lockedLabel,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  lockedLabel?: string;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[13.5px] font-medium">
          {label}
          {lockedLabel && (
            <Badge>
              <IconLock className="h-3 w-3" />
              {lockedLabel}
            </Badge>
          )}
        </span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Locked({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-info">
      <IconLock />
      <div className="text-[13px]">
        {children}{' '}
        <Link href="/app/settings?tab=plan" className="link">
          See plans
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────────── Main ───────────────────────── */

export function SettingsClient({
  user,
  initialTab,
  initialMembers,
  initialPresets,
  initialTemplates,
  initialBranches,
  initialAudit,
  usage,
  infra,
}: {
  user: SessionUser;
  initialTab: SettingsTabId;
  initialMembers: SettingsMemberItem[];
  initialPresets: SettingsPresetItem[];
  initialTemplates: SettingsTemplateItem[];
  initialBranches: SettingsBranchItem[];
  initialAudit: SettingsAuditItem[];
  usage: { patients: number; storageMb: number };
  infra: InfrastructureStatus;
}) {
  const isOwner = user.role === 'OWNER_DOCTOR';
  const isDoctor = isDoctorRole(user.role);

  const tabs: Array<{ id: SettingsTabId; label: string; icon: ReactNode; show: boolean }> = [
    { id: 'profile', label: 'My profile', icon: <IconUser />, show: true },
    { id: 'clinic', label: 'Clinic', icon: <IconBuilding />, show: isOwner },
    { id: 'appearance', label: 'Appearance', icon: <IconPalette />, show: true },
    { id: 'presets', label: 'Prescribing', icon: <IconPill />, show: isDoctor },
    { id: 'team', label: 'Team & branches', icon: <IconPatients />, show: true },
    { id: 'plan', label: 'Plan & usage', icon: <IconSparkle />, show: true },
    { id: 'security', label: 'Security & data', icon: <IconShield />, show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<SettingsTabId>(
    visibleTabs.some((t) => t.id === initialTab) ? initialTab : visibleTabs[0].id
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={`${user.clinic.name} · ${getPlanDefinition(user.clinic.planTier).label}`} />

      <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="scroll-x -mx-4 px-4 lg:sticky lg:top-8 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:flex-col">
            {visibleTabs.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => {
                    setTab(t.id);
                    window.history.replaceState(null, '', `/app/settings?tab=${t.id}`);
                  }}
                  className={`flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-[var(--r-control)] px-3 text-left text-[13.5px] font-medium transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                    tab === t.id ? 'bg-surface text-fg shadow-card ring-1 ring-line lg:bg-brand-soft lg:text-brand-ink lg:shadow-none lg:ring-0' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {tab === 'profile' && <ProfileTab user={user} />}
          {tab === 'clinic' && isOwner && <ClinicTab user={user} />}
          {tab === 'appearance' && <AppearanceTab user={user} isOwner={isOwner} />}
          {tab === 'presets' && isDoctor && <PresetsTab user={user} initialPresets={initialPresets} initialTemplates={initialTemplates} />}
          {tab === 'team' && <TeamTab user={user} initialMembers={initialMembers} initialBranches={initialBranches} />}
          {tab === 'plan' && <PlanTab user={user} usage={usage} members={initialMembers} branches={initialBranches} />}
          {tab === 'security' && <SecurityTab user={user} infra={infra} audit={initialAudit} />}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Profile ───────────────────────── */

function ProfileTab({ user }: { user: SessionUser }) {
  const router = useRouter();
  const isDoctor = isDoctorRole(user.role);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [specialty, setSpecialty] = useState(user.specialty ?? '');
  const [regNo, setRegNo] = useState(user.registrationNo ?? '');
  const [fee, setFee] = useState(String(user.consultationFee ?? user.clinic.defaultConsultFee));
  const [capture, setCapture] = useState<'HYBRID' | 'SLIP_FIRST' | 'RX_FIRST'>(
    (user.defaultCaptureMode as 'HYBRID' | 'SLIP_FIRST' | 'RX_FIRST') || 'HYBRID'
  );
  const [lang, setLang] = useState<'default' | 'en' | 'ml'>(
    user.preferredWhatsappLang === 'en' || user.preferredWhatsappLang === 'ml' ? user.preferredWhatsappLang : 'default'
  );
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const r = await apiJson('/api/profile', {
      method: 'PATCH',
      body: {
        name,
        phone: phone || null,
        preferredWhatsappLang: lang === 'default' ? null : lang,
        ...(isDoctor
          ? {
              specialty: specialty || null,
              registrationNo: regNo || null,
              consultationFee: fee ? Number.parseInt(fee, 10) : null,
              defaultCaptureMode: capture,
            }
          : {}),
      },
    });
    setSaving(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    toast('Profile saved');
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <Section
        title="My profile"
        description="Shown on prescriptions and to your team."
        footer={
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        }
      >
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={name || user.name} size="lg" />
          <div>
            <p className="text-[15px] font-semibold">{name || user.name}</p>
            <p className="text-[13px] text-muted">
              {user.email} · {ROLE_LABEL[user.role]}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="pf-name" className="label">Full name</label>
            <input id="pf-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-phone" className="label">Mobile</label>
            <input id="pf-phone" className="input tnum" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {isDoctor && (
            <>
              <div className="field">
                <label htmlFor="pf-spec" className="label">Specialty</label>
                <input id="pf-spec" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pf-reg" className="label">Registration number</label>
                <input id="pf-reg" className="input" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. TCMC 44219" />
              </div>
              <div className="field">
                <label htmlFor="pf-fee" className="label">Consultation fee</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                  <input id="pf-fee" className="input pl-7 tnum" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="pf-lang" className="label">WhatsApp message language</label>
            <select id="pf-lang" className="select" value={lang} onChange={(e) => setLang(e.target.value as 'default' | 'en' | 'ml')}>
              <option value="default">Clinic default ({user.clinic.whatsappLang === 'ml' ? 'Malayalam' : 'English'})</option>
              <option value="en">English</option>
              <option value="ml">Malayalam</option>
            </select>
          </div>
        </div>

        {isDoctor && (
          <div className="mt-6 field">
            <span className="label">How you record consultations</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['HYBRID', 'Typed + photo', 'Type the Rx, optionally attach a slip photo'],
                  ['SLIP_FIRST', 'Photo first', 'Snap your handwritten slip first'],
                  ['RX_FIRST', 'Typed only', 'Fully digital prescriptions'],
                ] as const
              ).map(([v, l, h]) => (
                <label
                  key={v}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-[var(--r-control)] border p-3 transition-colors ${
                    capture === v ? 'border-brand bg-brand-softer' : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <input type="radio" name="capture" className="sr-only" checked={capture === v} onChange={() => setCapture(v)} />
                  <span className="text-[13.5px] font-medium">{l}</span>
                  <span className="text-[12px] text-muted">{h}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Section>
    </form>
  );
}

/* ───────────────────────── Clinic ───────────────────────── */

function ClinicTab({ user }: { user: SessionUser }) {
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const c = user.clinic;
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone ?? '');
  const [address, setAddress] = useState(c.address ?? '');
  const [upi, setUpi] = useState(c.upiId ?? '');
  const [gstin, setGstin] = useState(c.gstin ?? '');
  const [footer, setFooter] = useState(c.rxFooterNote ?? '');
  const [waLang, setWaLang] = useState<'en' | 'ml'>(c.whatsappLang === 'ml' ? 'ml' : 'en');
  const [hours, setHours] = useState(c.workingHours);
  const [slot, setSlot] = useState(String(c.slotDurationMin));
  const [publicBooking, setPublicBooking] = useState(c.enablePublicBooking);
  const [appointments, setAppointments] = useState(c.enableAppointments);
  const [billing, setBilling] = useState(c.enableBilling);
  const [followUps, setFollowUps] = useState(c.enableFollowUps);
  const [vitals, setVitals] = useState(c.enableVitals);
  const [orders, setOrders] = useState(c.enableOrders);
  const [timing, setTiming] = useState(c.billingTiming);
  const [fee, setFee] = useState(String(c.defaultConsultFee));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const r = await apiJson('/api/clinic', {
      method: 'PATCH',
      body: {
        name,
        phone: phone || null,
        address: address || null,
        upiId: upi || null,
        ...(features.itemizedGstBilling ? { gstin: gstin || null } : {}),
        rxFooterNote: footer || null,
        whatsappLang: waLang,
        workingHours: hours,
        slotDurationMin: Number.parseInt(slot || '15', 10) || 15,
        enablePublicBooking: publicBooking,
        enableAppointments: appointments,
        enableBilling: billing,
        enableFollowUps: followUps,
        enableVitals: vitals,
        ...(features.labAndPharmacy ? { enableOrders: orders } : {}),
        billingTiming: timing,
        defaultConsultFee: Number.parseInt(fee || '200', 10) || 200,
      },
    });
    setSaving(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    toast('Clinic settings saved');
    router.refresh();
  }

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/book/${c.slug}` : `/book/${c.slug}`;
  const saveBtn = (
    <button type="submit" disabled={saving} className="btn btn-primary">
      {saving ? 'Saving…' : 'Save changes'}
    </button>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Section title="Clinic details" description="Printed on prescriptions, bills and your booking page." footer={saveBtn}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="cl-name" className="label">Clinic name</label>
            <input id="cl-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cl-phone" className="label">Phone</label>
            <input id="cl-phone" className="input tnum" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="cl-addr" className="label">Address</label>
            <input id="cl-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cl-hrs" className="label">Working hours</label>
            <input id="cl-hrs" className="input" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Sat, 9 AM – 1 PM, 5 – 8 PM" />
          </div>
          <div className="field">
            <label htmlFor="cl-footer" className="label">Footer note on Rx & bills</label>
            <input id="cl-footer" className="input" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="e.g. Closed on Sundays" />
          </div>
        </div>
      </Section>

      <Section title="Payments" description="Used for UPI QR codes and bills." footer={saveBtn}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="cl-upi" className="label">UPI ID</label>
            <input id="cl-upi" className="input font-mono" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourclinic@okicici" />
          </div>
          <div className="field">
            <label htmlFor="cl-fee" className="label">Default consultation fee</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input id="cl-fee" className="input pl-7 tnum" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cl-timing" className="label">When is the fee collected?</label>
            <select id="cl-timing" className="select" value={timing} onChange={(e) => setTiming(e.target.value as typeof timing)}>
              <option value="FLEXIBLE">Anytime</option>
              <option value="PRE_CONSULT">Before seeing the doctor</option>
              <option value="POST_CONSULT">After consultation</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cl-gst" className="label">GSTIN</label>
            <input
              id="cl-gst"
              className="input font-mono"
              disabled={!features.itemizedGstBilling}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder={features.itemizedGstBilling ? '32AABCK1234F1Z5' : 'Available on Growth plan'}
            />
          </div>
        </div>
      </Section>

      <Section title="Appointments & messages" footer={saveBtn}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="cl-slot" className="label">Slot length</label>
            <select id="cl-slot" className="select" value={slot} onChange={(e) => setSlot(e.target.value)}>
              {['10', '15', '20', '30'].map((s) => (
                <option key={s} value={s}>
                  {s} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cl-wa" className="label">WhatsApp language</label>
            <select id="cl-wa" className="select" value={waLang} onChange={(e) => setWaLang(e.target.value as 'en' | 'ml')}>
              <option value="en">English</option>
              <option value="ml">Malayalam</option>
            </select>
          </div>
        </div>
        {features.publicBooking && (
          <div className="mt-5 flex flex-col gap-3 rounded-[var(--r-control)] border border-line bg-surface-2 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">Online booking page</p>
              <p className="truncate font-mono text-[12.5px] text-muted">{bookingUrl}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bookingUrl);
                    toast('Booking link copied');
                  } catch {
                    // ignore
                  }
                }}
              >
                <IconCopy /> Copy
              </button>
              <Link href={`/book/${c.slug}`} target="_blank" className="btn btn-secondary btn-sm">
                <IconExternal /> Open
              </Link>
            </div>
          </div>
        )}
      </Section>

      <Section title="Features" description="Turn off what your clinic doesn't use to keep screens simple." footer={saveBtn}>
        <div className="-my-3 divide-y divide-[var(--line)]">
          <ToggleRow label="Follow-up reminders" hint="Due list and WhatsApp reminders" checked={followUps} onChange={setFollowUps} />
          <ToggleRow label="Vitals" hint="BP, temperature, weight at check-in and consult" checked={vitals} onChange={setVitals} />
          <ToggleRow
            label="Appointments"
            hint="Book time slots for patients"
            checked={appointments}
            onChange={setAppointments}
            disabled={!features.appointments}
            lockedLabel={features.appointments ? undefined : 'Solo Pro'}
          />
          <ToggleRow
            label="Online self-booking"
            hint="Patients book from your public link"
            checked={publicBooking}
            onChange={setPublicBooking}
            disabled={!features.publicBooking}
            lockedLabel={features.publicBooking ? undefined : 'Solo Pro'}
          />
          <ToggleRow
            label="Billing & UPI"
            hint="Fees, dues and QR payments"
            checked={billing}
            onChange={setBilling}
            disabled={!features.billing}
            lockedLabel={features.billing ? undefined : 'Solo Pro'}
          />
          <ToggleRow
            label="Lab & pharmacy orders"
            hint="Track investigations and dispensing"
            checked={orders}
            onChange={setOrders}
            disabled={!features.labAndPharmacy}
            lockedLabel={features.labAndPharmacy ? undefined : 'Growth'}
          />
        </div>
      </Section>
    </form>
  );
}

/* ───────────────────────── Appearance ───────────────────────── */

function AppearanceTab({ user, isOwner }: { user: SessionUser; isOwner: boolean }) {
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const c = user.clinic;
  const [preset, setPreset] = useState(c.themePreset || 'teal');
  const [brandColor, setBrandColor] = useState(c.brandColor || '#0f766e');
  const [colorMode, setColorMode] = useState<'light' | 'dark' | 'system'>((c.colorMode as 'light' | 'dark' | 'system') || 'light');
  const [density, setDensity] = useState<'comfortable' | 'compact'>((c.uiDensity as 'comfortable' | 'compact') || 'comfortable');
  const [radius, setRadius] = useState<'rounded' | 'soft' | 'sharp'>((c.cardRadius as 'rounded' | 'soft' | 'sharp') || 'rounded');
  const [sidebar, setSidebar] = useState<'light' | 'dark'>((c.sidebarTone as 'light' | 'dark') || 'light');
  const [paper, setPaper] = useState<'A4' | 'A5' | 'THERMAL'>((c.printPaperSize as 'A4' | 'A5' | 'THERMAL') || 'A4');
  const [watermark, setWatermark] = useState(c.rxWatermark ?? '');
  const [hidePoweredBy, setHidePoweredBy] = useState(c.hidePoweredBy);
  const [saving, setSaving] = useState(false);

  const savedAccent = resolveThemeAccent(c);
  const previewAccent = preset === 'custom' ? brandColor : THEME_PRESETS.find((t) => t.id === preset)?.color ?? savedAccent;

  // Live preview of accent, density and corners on the whole app shell
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.crm-shell');
    if (!shell) return;
    const prev = {
      brand: shell.style.getPropertyValue('--brand'),
      density: shell.dataset.density,
      radius: shell.dataset.radius,
    };
    shell.style.setProperty('--brand', previewAccent);
    if (features.nightAndLayoutCustomization) {
      shell.dataset.density = density;
      shell.dataset.radius = radius;
    }
    return () => {
      shell.style.setProperty('--brand', prev.brand);
      if (prev.density) shell.dataset.density = prev.density;
      if (prev.radius) shell.dataset.radius = prev.radius;
    };
  }, [previewAccent, density, radius, features.nightAndLayoutCustomization]);

  async function save() {
    setSaving(true);
    const r = await apiJson('/api/clinic', {
      method: 'PATCH',
      body: {
        themePreset: preset,
        ...(features.whiteLabelBranding ? { brandColor, sidebarTone: sidebar, rxWatermark: watermark || null, hidePoweredBy } : {}),
        colorMode,
        uiDensity: density,
        cardRadius: radius,
        printPaperSize: paper,
      },
    });
    setSaving(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    toast('Appearance saved for everyone in your clinic');
    router.refresh();
  }

  const dirty =
    preset !== (c.themePreset || 'teal') ||
    (preset === 'custom' && brandColor !== c.brandColor) ||
    colorMode !== c.colorMode ||
    density !== c.uiDensity ||
    radius !== c.cardRadius ||
    sidebar !== c.sidebarTone ||
    paper !== c.printPaperSize ||
    watermark !== (c.rxWatermark ?? '') ||
    hidePoweredBy !== c.hidePoweredBy;

  const saveBar = (
    <>
      {dirty && <span className="mr-auto text-[12.5px] text-muted">Previewing — not saved yet</span>}
      <button type="button" disabled={saving || !dirty} onClick={() => void save()} className="btn btn-primary">
        {saving ? 'Saving…' : 'Save for clinic'}
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title="This device" description="Light or dark mode just for you, on this phone or computer.">
        <div className="max-w-sm">
          <ThemeSwitcher block />
        </div>
      </Section>

      {isOwner ? (
        <>
          <Section title="Accent color" description="Used for buttons, highlights and your booking page." footer={saveBar}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {THEME_PRESETS.map((t) => {
                const selected = preset === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreset(t.id)}
                    aria-pressed={selected}
                    className={`relative flex items-center gap-3 rounded-[var(--r-control)] border p-3 text-left transition-colors ${
                      selected ? 'border-transparent ring-2 ring-[var(--brand)]' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: t.color }}>
                      {selected && <IconCheck className="h-4 w-4 text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium">{t.label}</span>
                      <span className="block truncate text-[12px] text-muted">{t.description}</span>
                    </span>
                  </button>
                );
              })}
              <label
                className={`relative flex items-center gap-3 rounded-[var(--r-control)] border p-3 transition-colors ${
                  features.whiteLabelBranding ? 'cursor-pointer hover:bg-surface-2' : 'cursor-not-allowed opacity-50'
                } ${preset === 'custom' ? 'border-transparent ring-2 ring-[var(--brand)]' : 'border-line'}`}
              >
                <input
                  type="color"
                  disabled={!features.whiteLabelBranding}
                  value={brandColor}
                  aria-label="Custom brand color"
                  onChange={(e) => {
                    setBrandColor(e.target.value);
                    setPreset('custom');
                  }}
                  className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">Custom</span>
                  <span className="block truncate font-mono text-[12px] text-muted">
                    {features.whiteLabelBranding ? brandColor : 'Enterprise plan'}
                  </span>
                </span>
              </label>
            </div>

            {/* Preview */}
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[var(--r-control)] border border-dashed border-line-strong p-4">
              <span className="mr-2 text-[12.5px] text-muted">Preview</span>
              <button type="button" className="btn btn-primary btn-sm">Primary</button>
              <button type="button" className="btn btn-soft btn-sm">Soft</button>
              <span className="badge badge-brand badge-dot">With doctor</span>
              <span className="token token-active h-8 w-8 text-[13px]">12</span>
            </div>
          </Section>

          <Section
            title="Layout"
            description="Default mode, spacing and corner style for everyone in the clinic."
            footer={saveBar}
          >
            <fieldset className="grid gap-5 sm:grid-cols-3">
              <div className="field">
                <span className="label">Default mode</span>
                <div className="seg seg-block">
                  {(['light', 'dark', 'system'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={colorMode === m} onClick={() => setColorMode(m)}>
                      {m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Spacing</span>
                <div className="seg seg-block">
                  <button type="button" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>Comfortable</button>
                  <button type="button" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>Compact</button>
                </div>
              </div>
              <div className="field">
                <span className="label">Corners</span>
                <div className="seg seg-block">
                  {(['sharp', 'rounded', 'soft'] as const).map((r) => (
                    <button key={r} type="button" aria-pressed={radius === r} onClick={() => setRadius(r)}>
                      {r === 'sharp' ? 'Sharp' : r === 'rounded' ? 'Rounded' : 'Soft'}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          </Section>

          <Section title="Printing & branding" footer={saveBar}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="field">
                <span className="label">Paper size for Rx & receipts</span>
                <div className="seg seg-block">
                  {(
                    [
                      ['A4', 'A4'],
                      ['A5', 'A5'],
                      ['THERMAL', '80 mm'],
                    ] as const
                  ).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={paper === v} onClick={() => setPaper(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Sidebar</span>
                <div className="seg seg-block">
                  <button type="button" disabled={!features.whiteLabelBranding} aria-pressed={sidebar === 'light'} onClick={() => setSidebar('light')}>Match theme</button>
                  <button type="button" disabled={!features.whiteLabelBranding} aria-pressed={sidebar === 'dark'} onClick={() => setSidebar('dark')}>Always dark</button>
                </div>
                {!features.whiteLabelBranding && <span className="hint">Enterprise plan.</span>}
              </div>
              <div className="field sm:col-span-2">
                <label htmlFor="th-wm" className="label">Watermark on prints</label>
                <input
                  id="th-wm"
                  className="input"
                  disabled={!features.whiteLabelBranding}
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder={features.whiteLabelBranding ? 'e.g. KERALA CARE NETWORK' : 'Enterprise plan'}
                />
              </div>
            </div>
            {features.whiteLabelBranding && (
              <div className="mt-2">
                <ToggleRow label="Hide plan & trial box" hint="Pure white-label navigation" checked={hidePoweredBy} onChange={setHidePoweredBy} />
              </div>
            )}
          </Section>
        </>
      ) : (
        <p className="text-[13px] text-muted">Clinic colors and print settings are managed by the clinic owner.</p>
      )}
    </div>
  );
}

/* ───────────────────────── Prescribing ───────────────────────── */

function PresetsTab({
  user,
  initialPresets,
  initialTemplates,
}: {
  user: SessionUser;
  initialPresets: SettingsPresetItem[];
  initialTemplates: SettingsTemplateItem[];
}) {
  const features = getPlanFeatures(user.clinic.planTier);
  const [presets, setPresets] = useState(initialPresets);
  const [med, setMed] = useState('');
  const [dose, setDose] = useState('1-0-1');
  const [timing, setTiming] = useState('After food');
  const [days, setDays] = useState('5');
  const [templates, setTemplates] = useState(initialTemplates);
  const [tName, setTName] = useState('');
  const [tDiag, setTDiag] = useState('');
  const [tMed, setTMed] = useState('');
  const [tDays, setTDays] = useState('3');
  const [busy, setBusy] = useState(false);

  async function addPreset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!med.trim()) return;
    setBusy(true);
    const r = await apiJson<{ preset: SettingsPresetItem }>('/api/presets', {
      body: {
        medicineName: med,
        defaultDosage: dose || null,
        defaultTiming: timing || null,
        defaultDuration: days ? Number.parseInt(days, 10) : null,
      },
    });
    setBusy(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setPresets((p) => [...p, r.data.preset]);
    setMed('');
    toast(`${r.data.preset.medicineName} added`);
  }

  async function addTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tName.trim() || !tMed.trim()) return;
    setBusy(true);
    const r = await apiJson<{ template: { id: string; name: string; diagnosis: string | null; clinicalNotes: string | null; followUpDays: number | null; medicines: unknown[] } }>(
      '/api/templates',
      {
        body: {
          name: tName,
          diagnosis: tDiag || null,
          followUpDays: tDays ? Number.parseInt(tDays, 10) : null,
          medicines: tMed
            .split(/\n|,/)
            .map((m) => m.trim())
            .filter(Boolean)
            .map((m) => ({ medicineName: m, dosage: '1-0-1', timing: 'After food', durationDays: 5 })),
        },
      }
    );
    setBusy(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    const t = r.data.template;
    setTemplates((p) => [
      ...p,
      { id: t.id, name: t.name, diagnosis: t.diagnosis, clinicalNotes: t.clinicalNotes, followUpDays: t.followUpDays, medicinesCount: Array.isArray(t.medicines) ? t.medicines.length : 1 },
    ]);
    setTName('');
    setTDiag('');
    setTMed('');
    toast(`Pack “${t.name}” created`);
  }

  async function del(url: string, onOk: () => void) {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) onOk();
    else toast('Could not delete', { tone: 'error' });
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Saved medicines" description="Appear as one-tap suggestions while writing a prescription.">
        <form onSubmit={addPreset} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_130px_70px_auto]">
          <input aria-label="Medicine" required className="input" value={med} onChange={(e) => setMed(e.target.value)} placeholder="e.g. Tab. Dolo 650" />
          <input aria-label="Dosage" className="input font-mono" value={dose} onChange={(e) => setDose(e.target.value)} />
          <input aria-label="Timing" className="input" value={timing} onChange={(e) => setTiming(e.target.value)} />
          <input aria-label="Days" inputMode="numeric" className="input tnum" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
          <button type="submit" disabled={busy} className="btn btn-primary">Add</button>
        </form>
        {presets.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted">No saved medicines yet. They are also saved automatically when you prescribe.</p>
        ) : (
          <ul className="list mt-4 overflow-hidden rounded-[var(--r-control)] border border-line">
            {presets.map((p) => (
              <li key={p.id} className="group flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{p.medicineName}</span>
                  <span className="text-[12px] text-muted">
                    {[p.defaultDosage, p.defaultTiming, p.defaultDuration ? `${p.defaultDuration} days` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${p.medicineName}`}
                  onClick={() => void del(`/api/presets/${p.id}`, () => setPresets((x) => x.filter((y) => y.id !== p.id)))}
                  className="btn btn-ghost btn-icon btn-sm text-subtle hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Quick packs" description="Fill diagnosis, medicines and follow-up in one tap for common conditions.">
        {!features.conditionTemplates ? (
          <Locked>Quick packs are available on Solo Pro and above.</Locked>
        ) : (
          <>
            <form onSubmit={addTemplate} className="grid gap-3 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="tp-name" className="label">Pack name</label>
                <input id="tp-name" required className="input" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Viral fever" />
              </div>
              <div className="field">
                <label htmlFor="tp-diag" className="label">Diagnosis</label>
                <input id="tp-diag" className="input" value={tDiag} onChange={(e) => setTDiag(e.target.value)} />
              </div>
              <div className="field sm:col-span-2">
                <label htmlFor="tp-med" className="label">Medicines</label>
                <textarea id="tp-med" required rows={2} className="textarea" value={tMed} onChange={(e) => setTMed(e.target.value)} placeholder="One per line or comma separated" />
              </div>
              <div className="flex items-end gap-3 sm:col-span-2">
                <div className="field w-36">
                  <label htmlFor="tp-days" className="label">Follow-up (days)</label>
                  <input id="tp-days" inputMode="numeric" className="input tnum" value={tDays} onChange={(e) => setTDays(e.target.value.replace(/\D/g, ''))} />
                </div>
                <button type="submit" disabled={busy} className="btn btn-primary ml-auto">Create pack</button>
              </div>
            </form>
            {templates.length > 0 && (
              <ul className="list mt-5 overflow-hidden rounded-[var(--r-control)] border border-line">
                {templates.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{t.name}</span>
                      <span className="text-[12px] text-muted">
                        {[t.diagnosis, `${t.medicinesCount} medicine${t.medicinesCount === 1 ? '' : 's'}`, t.followUpDays ? `follow-up ${t.followUpDays}d` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => void del(`/api/templates/${t.id}`, () => setTemplates((x) => x.filter((y) => y.id !== t.id)))}
                      className="btn btn-ghost btn-icon btn-sm text-subtle hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <IconTrash />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

/* ───────────────────────── Team ───────────────────────── */

function TeamTab({
  user,
  initialMembers,
  initialBranches,
}: {
  user: SessionUser;
  initialMembers: SettingsMemberItem[];
  initialBranches: SettingsBranchItem[];
}) {
  const isOwner = user.role === 'OWNER_DOCTOR';
  const features = getPlanFeatures(user.clinic.planTier);
  const plan = getPlanDefinition(user.clinic.planTier);
  const [members, setMembers] = useState(initialMembers);
  const [branches, setBranches] = useState(initialBranches);
  const [adding, setAdding] = useState(false);
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [mRole, setMRole] = useState<'DOCTOR' | 'STAFF'>('DOCTOR');
  const [mSpecialty, setMSpecialty] = useState('General Medicine');
  const [mFee, setMFee] = useState(String(user.clinic.defaultConsultFee));
  const [bName, setBName] = useState('');
  const [bCode, setBCode] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const docs = members.filter((m) => m.isActive && isDoctorRole(m.role)).length;
  const staff = members.filter((m) => m.isActive && m.role === 'STAFF').length;
  const cap = (n: number) => (n >= 999 ? '∞' : n);

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const r = await apiJson<{ member: SettingsMemberItem }>('/api/team', {
      body: {
        name: mName,
        email: mEmail,
        password: mPassword,
        role: mRole,
        specialty: mRole === 'DOCTOR' ? mSpecialty : undefined,
        consultationFee: mRole === 'DOCTOR' ? Number.parseInt(mFee || '300', 10) || 300 : undefined,
      },
    });
    setBusy(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setMembers((p) => [...p, r.data.member]);
    setMName('');
    setMEmail('');
    setMPassword('');
    setAdding(false);
    toast(`${r.data.member.name} can now sign in`);
  }

  async function toggleActive(m: SettingsMemberItem) {
    const r = await apiJson(`/api/team/${m.id}`, { method: 'PATCH', body: { isActive: !m.isActive } });
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setMembers((p) => p.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x)));
    toast(m.isActive ? `${m.name} paused` : `${m.name} reactivated`);
  }

  async function addBranch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const r = await apiJson<{ branch: SettingsBranchItem }>('/api/branches', { body: { name: bName, code: bCode, address: bAddress || null } });
    setBusy(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setBranches((p) => [...p, r.data.branch]);
    setBName('');
    setBCode('');
    setBAddress('');
    toast(`Branch ${r.data.branch.name} added`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Team"
        description={`${docs}/${cap(plan.maxDoctors)} doctors · ${staff}/${cap(plan.maxStaff)} front desk`}
        aside={
          isOwner && features.teamManagement && !adding ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
              Add member
            </button>
          ) : undefined
        }
      >
        {!features.teamManagement && <div className="mb-4"><Locked>Add doctors and front-desk staff on Clinic Core and above.</Locked></div>}

        {adding && (
          <form onSubmit={addMember} className="mb-5 flex flex-col gap-4 rounded-[var(--r-card)] border border-line bg-surface-2 p-4">
            <div className="seg self-start" role="group" aria-label="Role">
              <button type="button" aria-pressed={mRole === 'DOCTOR'} onClick={() => setMRole('DOCTOR')}>Doctor</button>
              <button type="button" aria-pressed={mRole === 'STAFF'} onClick={() => setMRole('STAFF')}>Front desk / nurse</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input aria-label="Full name" required className="input" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Full name" />
              <input aria-label="Email" required type="email" className="input" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="Login email" />
              <input aria-label="Temporary password" required type="password" minLength={6} autoComplete="new-password" className="input" value={mPassword} onChange={(e) => setMPassword(e.target.value)} placeholder="Temporary password (6+)" />
              {mRole === 'DOCTOR' && (
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <input aria-label="Specialty" className="input" value={mSpecialty} onChange={(e) => setMSpecialty(e.target.value)} placeholder="Specialty" />
                  <input aria-label="Fee" inputMode="numeric" className="input tnum" value={mFee} onChange={(e) => setMFee(e.target.value.replace(/\D/g, ''))} placeholder="Fee ₹" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
              <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Adding…' : 'Add member'}</button>
            </div>
          </form>
        )}

        <ul className="list overflow-hidden rounded-[var(--r-control)] border border-line">
          {members.map((m) => (
            <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${m.isActive ? '' : 'opacity-55'}`}>
              <Avatar name={m.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium">{m.name}</span>
                  {m.id === user.id && <span className="text-[12px] text-muted">(you)</span>}
                </span>
                <span className="block truncate text-[12px] text-muted">
                  {[ROLE_LABEL[m.role], m.specialty, m.email].filter(Boolean).join(' · ')}
                </span>
              </span>
              {!m.isActive && <Badge>Paused</Badge>}
              {isOwner && m.id !== user.id && (
                <button type="button" onClick={() => void toggleActive(m)} className="btn btn-ghost btn-sm">
                  {m.isActive ? 'Pause' : 'Reactivate'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Branches" description={features.multiBranch ? `${Math.max(1, branches.length)} of ${plan.maxBranches} branches` : undefined}>
        {!features.multiBranch ? (
          <Locked>Run multiple branches from one account on the Enterprise plan.</Locked>
        ) : (
          <>
            {isOwner && (
              <form onSubmit={addBranch} className="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
                <input aria-label="Branch name" required className="input" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Branch name" />
                <input aria-label="Branch code" required className="input font-mono uppercase" value={bCode} onChange={(e) => setBCode(e.target.value)} placeholder="Code" />
                <input aria-label="Address" className="input" value={bAddress} onChange={(e) => setBAddress(e.target.value)} placeholder="Address (optional)" />
                <button type="submit" disabled={busy} className="btn btn-primary">Add</button>
              </form>
            )}
            {branches.length === 0 ? (
              <EmptyState title="No branches yet" className="py-8" />
            ) : (
              <ul className="list mt-4 overflow-hidden rounded-[var(--r-control)] border border-line">
                {branches.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <IconBuilding className="h-4 w-4 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium">
                        {b.name}
                        <span className="font-mono text-[12px] font-normal text-subtle">{b.code}</span>
                      </span>
                      {b.address && <span className="block truncate text-[12px] text-muted">{b.address}</span>}
                    </span>
                    {b.isDefault && <Badge tone="brand">Main</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

/* ───────────────────────── Plan ───────────────────────── */

function PlanTab({
  user,
  usage,
  members,
  branches,
}: {
  user: SessionUser;
  usage: { patients: number; storageMb: number };
  members: SettingsMemberItem[];
  branches: SettingsBranchItem[];
}) {
  const router = useRouter();
  const isOwner = user.role === 'OWNER_DOCTOR';
  const current = getPlanDefinition(user.clinic.planTier);
  const [switching, setSwitching] = useState<PlanTier | null>(null);
  const docs = members.filter((m) => m.isActive && isDoctorRole(m.role)).length;
  const staff = members.filter((m) => m.isActive && m.role === 'STAFF').length;

  async function switchPlan(tier: PlanTier) {
    setSwitching(tier);
    const r = await apiJson('/api/clinic/plan', { body: { planTier: tier } });
    setSwitching(null);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    toast(`Switched to ${PLAN_DEFAULTS[tier].label}`);
    router.refresh();
  }

  const meters: Array<{ label: string; used: number; max: number | null; fmt?: (n: number) => string }> = [
    { label: 'Patients', used: usage.patients, max: user.clinic.maxPatients },
    { label: 'Storage', used: usage.storageMb, max: user.clinic.maxStorageMb, fmt: (n) => formatStorageMb(Math.round(n)) },
    { label: 'Doctors', used: docs, max: current.maxDoctors >= 999 ? null : current.maxDoctors },
    { label: 'Front desk', used: staff, max: current.maxStaff >= 999 ? null : current.maxStaff },
    { label: 'Branches', used: Math.max(1, branches.length), max: current.maxBranches },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={`${current.label}`}
        description={
          user.clinic.subscriptionStatus === 'TRIAL' && user.clinic.trialDaysLeft !== null
            ? `Free trial · ${user.clinic.trialDaysLeft} days left`
            : `₹${current.monthlyPriceInr.toLocaleString('en-IN')} per month`
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {meters.map((m) => {
            const pct = m.max ? Math.min(100, (m.used / m.max) * 100) : 0;
            const f = m.fmt ?? ((n: number) => n.toLocaleString('en-IN'));
            return (
              <div key={m.label}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">{m.label}</span>
                  <span className="font-medium tnum">
                    {f(m.used)}
                    <span className="text-muted"> / {m.max === null ? 'Unlimited' : f(m.max)}</span>
                  </span>
                </div>
                <div className="mini-bar mt-2">
                  <span style={{ width: `${m.max ? Math.max(2, pct) : 0}%`, background: pct > 85 ? 'var(--warning)' : undefined }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const p = PLAN_DEFAULTS[tier];
          const isCurrent = tier === user.clinic.planTier;
          return (
            <article
              key={tier}
              className={`card flex flex-col p-5 ${isCurrent ? 'ring-2 ring-[var(--brand)]' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{p.label}</h3>
                {isCurrent ? <Badge tone="brand">Current</Badge> : p.recommended ? <Badge>Popular</Badge> : null}
              </div>
              <p className="mt-2 text-[26px] font-semibold tracking-[-0.02em] tnum">
                {p.monthlyPriceInr === 0 ? 'Free' : `₹${p.monthlyPriceInr.toLocaleString('en-IN')}`}
                {p.monthlyPriceInr > 0 && <span className="text-[13px] font-normal text-muted"> /month</span>}
              </p>
              <p className="mt-1 text-[13px] text-muted">{p.tagline}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-[13px]">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              {isOwner && (
                <button
                  type="button"
                  disabled={isCurrent || switching !== null}
                  onClick={() => void switchPlan(tier)}
                  className={`btn mt-5 w-full ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {isCurrent ? 'Your plan' : switching === tier ? 'Switching…' : `Switch to ${p.shortName}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Security ───────────────────────── */

function SecurityTab({ user, infra, audit }: { user: SessionUser; infra: InfrastructureStatus; audit: SettingsAuditItem[] }) {
  const features = getPlanFeatures(user.clinic.planTier);
  const isOwner = user.role === 'OWNER_DOCTOR';
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);

  async function changePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const r = await apiJson('/api/profile/password', { body: { currentPassword: cur, newPassword: next } });
    setSaving(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setCur('');
    setNext('');
    toast('Password changed');
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={changePw}>
        <Section
          title="Password"
          footer={
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Updating…' : 'Update password'}
            </button>
          }
        >
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="pw-cur" className="label">Current password</label>
              <input id="pw-cur" required type="password" autoComplete="current-password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pw-new" className="label">New password</label>
              <input id="pw-new" required type="password" minLength={6} autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
              <span className="hint">At least 6 characters</span>
            </div>
          </div>
        </Section>
      </form>

      <Section title="Your data" description="Stored in your own database and private file storage.">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
          <div className="rounded-[var(--r-control)] bg-surface-2 p-3">
            <dt className="text-muted">Database</dt>
            <dd className="mt-0.5 font-medium">{infra.databaseMode === 'local-pglite' ? 'Local test database' : 'Cloud Postgres'}</dd>
          </div>
          <div className="rounded-[var(--r-control)] bg-surface-2 p-3">
            <dt className="text-muted">Files</dt>
            <dd className="mt-0.5 font-medium uppercase">{infra.storageProvider}</dd>
          </div>
          <div className="rounded-[var(--r-control)] bg-surface-2 p-3">
            <dt className="text-muted">Auth keys</dt>
            <dd className="mt-0.5 font-medium">{infra.supabaseMode === 'dummy-local' ? 'Test keys' : 'Connected'}</dd>
          </div>
        </dl>
        {isOwner && (
          <a href="/api/export" className="btn btn-secondary mt-4">
            <IconDownload /> Download full backup (JSON)
          </a>
        )}
      </Section>

      <Section title="Activity log" description="Who did what, and when.">
        {!features.auditLogs ? (
          <Locked>The staff activity log is available on Growth and Enterprise.</Locked>
        ) : audit.length === 0 ? (
          <p className="text-[13px] text-muted">No activity recorded yet.</p>
        ) : (
          <ul className="list -mx-1">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-1 py-3">
                <Avatar name={a.actorName} size="sm" />
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="font-medium">{a.actorName}</span> <span className="text-muted">{a.summary}</span>
                  <span className="block text-[12px] text-subtle">{formatIstDateTime(a.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <button type="button" onClick={() => void performSignOut()} className="btn btn-secondary self-start text-danger lg:hidden">
        <IconLogout /> Sign out
      </button>
    </div>
  );
}
