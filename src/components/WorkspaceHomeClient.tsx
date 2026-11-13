'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/auth';
import { formatClockTime, formatIstDate, formatIstLongDay, formatIstTime } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { openNewPatient } from './AppShell';
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFollowUp,
  IconMore,
  IconPatients,
  IconPlay,
  IconQueueTv,
  IconRefresh,
  IconSparkle,
  IconStethoscope,
  IconUserPlus,
} from './Icons';
import { PrescriptionOcrModal } from './PrescriptionOcrModal';
import type { PrescriptionOcrData } from '@/lib/gemini-ocr';
import { hasAllergy, NewPatientDialog, PatientPicker, patientMeta, type PatientListItem } from './patients';
import { apiJson, Avatar, Badge, EmptyState, formatINR, Modal, PageHeader, StatusBadge, toast } from './ui';

export type { PatientListItem } from './patients';

export interface DoctorOption {
  id: string;
  name: string;
  specialty: string | null;
  consultationFee: number | null;
  role: string;
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export interface QueueListItem {
  id: string;
  branchId: string | null;
  tokenNumber: number;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes: string | null;
  vitals: Record<string, string> | null;
  patient: {
    id: string;
    patientCode: string;
    name: string;
    phone: string;
    ageYears: number | null;
    gender: string | null;
    place: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    _count: { visits: number; documents: number };
    documents: Array<{ id: string; title: string; docType: string }>;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
    consultationFee: number | null;
  };
  billingRecords: Array<{
    id: string;
    netAmount: number;
    paymentStatus: string;
    paymentMode: string | null;
  }>;
}

export interface AppointmentListItem {
  id: string;
  branchId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  reason: string | null;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  queueEntryId: string | null;
  patient: {
    id: string;
    patientCode: string;
    name: string;
    phone: string;
    ageYears: number | null;
    gender: string | null;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
  };
}

type QuickAction = 'checkin' | 'book' | null;

function formatSlotTime(iso: string): string {
  return formatIstTime(iso);
}

function shiftDay(day: string, delta: number): string {
  const dt = new Date(`${day}T12:00:00.000+05:30`);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}



function vitalsText(v: Record<string, string> | null): string {
  if (!v) return '';
  const labels: Record<string, string> = { bp: 'BP', temp: 'Temp', pulse: 'Pulse', weight: 'Wt', spo2: 'SpO₂' };
  return Object.entries(v)
    .map(([k, val]) => `${labels[k] ?? k} ${val}`)
    .join(' · ');
}

export function WorkspaceHomeClient({
  user,
  initialPatients,
  totalPatientsCount,
  initialQueue,
  initialAppointments,
  doctors,
  branches,
  queueDay,
  todayVisitCount,
  dueFollowUpCount,
  initialAction = null,
  greetingText,
}: {
  user: SessionUser;
  initialPatients: PatientListItem[];
  totalPatientsCount: number;
  initialQueue: QueueListItem[];
  initialAppointments: AppointmentListItem[];
  doctors: DoctorOption[];
  branches: BranchOption[];
  queueDay: string;
  todayVisitCount: number;
  dueFollowUpCount: number;
  initialAction?: QuickAction;
  greetingText: string;
}) {
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const isStaff = user.role === 'STAFF';
  const showQueue = features.queueWorkflow;
  const showAppointments = features.appointments && user.clinic.enableAppointments;
  const myDoctor = doctors.find((d) => d.id === user.id);

  const [mobilePane, setMobilePane] = useState<'queue' | 'appointments'>(showQueue ? 'queue' : 'appointments');
  const [branchId, setBranchId] = useState<string>(user.activeBranchId ?? 'ALL');

  const [queue, setQueue] = useState<QueueListItem[]>(initialQueue);
  const [doctorFilter, setDoctorFilter] = useState<string>(!isStaff && showQueue && myDoctor ? user.id : 'ALL');
  const [showDone, setShowDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentListItem[]>(initialAppointments);
  const [apptDay, setApptDay] = useState(queueDay);

  const [action, setAction] = useState<QuickAction>(initialAction);
  const [picked, setPicked] = useState<PatientListItem | null>(null);
  const [newFromPicker, setNewFromPicker] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

  async function handleOcrFromHome(data: PrescriptionOcrData) {
    setOcrModalOpen(false);
    const pInfo = data.patient;
    const phone = pInfo?.phone?.replace(/\D/g, '').slice(-10);
    if (phone && phone.length === 10) {
      const res = await apiJson<{ patients: Array<{ id: string; name: string; phone: string | null }> }>(
        `/api/patients?search=${encodeURIComponent(phone)}`
      );
      if (res.ok && res.data.patients.length > 0) {
        const match = res.data.patients[0];
        try {
          sessionStorage.setItem('clinic_crm_pending_ocr', JSON.stringify(data));
        } catch {
          // ignore
        }
        toast(`Matched ${match.name} (${phone}). Opening consultation…`);
        router.push(`/app/patients/${match.id}`);
        return;
      }
    }
    if (pInfo?.name) {
      const resName = await apiJson<{ patients: Array<{ id: string; name: string; phone: string | null }> }>(
        `/api/patients?search=${encodeURIComponent(pInfo.name)}`
      );
      if (resName.ok && resName.data.patients.length === 1) {
        const match = resName.data.patients[0];
        try {
          sessionStorage.setItem('clinic_crm_pending_ocr', JSON.stringify(data));
        } catch {
          // ignore
        }
        toast(`Matched ${match.name}. Opening consultation…`);
        router.push(`/app/patients/${match.id}`);
        return;
      }
    }
    // Register as new patient directly
    const createRes = await apiJson<{ patient: { id: string; name: string } }>('/api/patients', {
      method: 'POST',
      body: {
        name: pInfo?.name || 'Prescription Patient',
        phone: pInfo?.phone || undefined,
        gender: pInfo?.gender || 'OTHER',
        ageYears: pInfo?.ageYears || undefined,
        place: pInfo?.place || undefined,
      },
    });
    if (createRes.ok && createRes.data?.patient) {
      try {
        sessionStorage.setItem('clinic_crm_pending_ocr', JSON.stringify(data));
      } catch {
        // ignore
      }
      toast(`Created patient ${createRes.data.patient.name}. Opening consultation…`);
      router.push(`/app/patients/${createRes.data.patient.id}`);
    } else {
      const err = !createRes.ok ? createRes.error : 'Could not auto-create patient chart';
      toast(err, { tone: 'error' });
    }
  }

  // Clear ?action= from the URL once consumed so refresh doesn't reopen it
  useEffect(() => {
    if (initialAction) router.replace('/app', { scroll: false });
  }, [initialAction, router]);

  const refreshQueue = useCallback(async () => {
    if (!showQueue) return;
    const r = await apiJson<{ entries: QueueListItem[] }>(`/api/queue?day=${encodeURIComponent(queueDay)}`);
    if (r.ok) setQueue(r.data.entries);
  }, [showQueue, queueDay]);

  const refreshAppointments = useCallback(
    async (day: string) => {
      if (!showAppointments) return;
      const r = await apiJson<{ appointments: AppointmentListItem[] }>(
        `/api/appointments?day=${encodeURIComponent(day)}`
      );
      if (r.ok) setAppointments(r.data.appointments);
    },
    [showAppointments]
  );

  // Keep the front desk in sync across devices
  useEffect(() => {
    if (!showQueue) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) void refreshQueue();
    }, 30000);
    return () => clearInterval(t);
  }, [showQueue, refreshQueue]);

  async function switchBranch(id: string) {
    setBranchId(id);
    await apiJson('/api/branches', { method: 'PATCH', body: { branchId: id === 'ALL' ? null : id } });
    router.refresh();
  }

  async function setQueueStatus(entry: QueueListItem, status: QueueListItem['status']) {
    const prev = queue;
    setQueue((q) => q.map((e) => (e.id === entry.id ? { ...e, status } : e)));
    const r = await apiJson(`/api/queue/${entry.id}`, { method: 'PATCH', body: { status } });
    if (!r.ok) {
      setQueue(prev);
      toast(r.error, { tone: 'error' });
      return;
    }
    if (status === 'IN_CONSULTATION' && !isStaff) {
      router.push(`/app/patients/${entry.patient.id}?queueEntryId=${entry.id}`);
      return;
    }
    if (status === 'COMPLETED') toast(`Token #${entry.tokenNumber} marked done`);
    if (status === 'NO_SHOW') toast(`Token #${entry.tokenNumber} marked no-show`);
    void refreshQueue();
  }

  async function apptAction(
    appt: AppointmentListItem,
    payload: { status?: AppointmentListItem['status']; checkInToQueue?: boolean }
  ) {
    const r = await apiJson(`/api/appointments/${appt.id}`, { method: 'PATCH', body: payload });
    if (!r.ok) {
      toast(r.error, { tone: 'error' });
      return;
    }
    await Promise.all([refreshAppointments(apptDay), refreshQueue()]);
    if (payload.checkInToQueue) toast(`${appt.patient.name} checked in to the queue`);
    else if (payload.status === 'CONFIRMED') toast('Appointment confirmed');
    else if (payload.status === 'CANCELLED') toast('Appointment cancelled');
    else if (payload.status === 'NO_SHOW') toast('Marked as no-show');
  }

  const byBranch = <T extends { branchId: string | null }>(x: T) =>
    branchId === 'ALL' || !x.branchId || x.branchId === branchId;

  const visibleQueue = queue.filter((q) => byBranch(q) && (doctorFilter === 'ALL' || q.doctor.id === doctorFilter));
  const withDoctor = visibleQueue.filter((q) => q.status === 'IN_CONSULTATION');
  const waiting = visibleQueue.filter((q) => q.status === 'WAITING');
  const finished = visibleQueue.filter((q) => q.status !== 'WAITING' && q.status !== 'IN_CONSULTATION');
  const visibleAppointments = appointments.filter(byBranch);
  const upcomingAppts = visibleAppointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED');

  const firstName = user.name.replace(/^dr\.?\s+/i, '').split(' ')[0];
  const title = `${greetingText}, ${user.role === 'STAFF' ? firstName : `Dr. ${firstName}`}`;

  const stats = (() => {
    const items: Array<{ label: string; value: string | number; icon: React.ReactNode; href?: string; tone?: string }> = [];
    if (showQueue) {
      items.push({ label: 'Waiting', value: waiting.length, icon: <IconClock /> });
      items.push({ label: 'With doctor', value: withDoctor.length, icon: <IconStethoscope /> });
    }
    if (showAppointments)
      items.push({ label: 'Appointments', value: upcomingAppts.length, icon: <IconCalendar /> });
    items.push({ label: 'Visits today', value: todayVisitCount, icon: <IconCheck /> });
    if (user.clinic.enableFollowUps)
      items.push({
        label: 'Follow-ups due',
        value: dueFollowUpCount,
        icon: <IconFollowUp />,
        href: '/app/followups',
        tone: dueFollowUpCount > 0 ? 'text-warning' : undefined,
      });
    if (!showQueue && !showAppointments)
      items.push({
        label: 'Patients',
        value: user.clinic.maxPatients !== null ? `${totalPatientsCount}/${user.clinic.maxPatients}` : totalPatientsCount,
        icon: <IconPatients />,
        href: '/app/patients',
      });
    return items.slice(0, 4);
  })();

  /* ─────────── Render blocks ─────────── */

  const queueCard = showQueue && (
    <section aria-label="Queue" className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <h2 className="card-title">Queue</h2>
          <span className="tab-count">{waiting.length + withDoctor.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {doctors.length > 1 && (
            <select
              aria-label="Filter by doctor"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="select input-sm w-auto max-w-[170px]"
            >
              <option value="ALL">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id === user.id ? 'My patients' : d.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            aria-label="Refresh queue"
            onClick={async () => {
              setRefreshing(true);
              await refreshQueue();
              setRefreshing(false);
            }}
            className="btn btn-ghost btn-icon btn-sm"
          >
            <IconRefresh className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {waiting.length + withDoctor.length === 0 && finished.length === 0 ? (
        <EmptyState
          icon={<IconQueueTv />}
          title="No one in the queue"
          text="Check in a walk-in patient to issue their token."
          action={
            <button type="button" className="btn btn-secondary" onClick={() => setAction('checkin')}>
              Check in patient
            </button>
          }
        />
      ) : (
        <ul className="list">
          {[...withDoctor, ...waiting].map((entry) => (
            <QueueRow
              key={entry.id}
              entry={entry}
              isStaff={isStaff}
              showDoctor={doctorFilter === 'ALL' && doctors.length > 1}
              onStatus={setQueueStatus}
            />
          ))}
          {waiting.length + withDoctor.length === 0 && (
            <li className="px-5 py-6 text-center text-[13px] text-muted">Everyone has been seen.</li>
          )}
          {finished.length > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setShowDone((s) => !s)}
                className="flex w-full items-center justify-between px-5 py-3 text-[13px] font-medium text-muted hover:bg-surface-2"
              >
                <span>
                  {showDone ? 'Hide' : 'Show'} completed ({finished.length})
                </span>
                <IconChevronRight className={`h-4 w-4 transition-transform ${showDone ? 'rotate-90' : ''}`} />
              </button>
            </li>
          )}
          {showDone &&
            finished.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                isStaff={isStaff}
                showDoctor={doctorFilter === 'ALL' && doctors.length > 1}
                onStatus={setQueueStatus}
                muted
              />
            ))}
        </ul>
      )}
    </section>
  );

  const appointmentsCard = showAppointments && (
    <section aria-label="Appointments" className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <h2 className="card-title">Appointments</h2>
          <span className="tab-count">{upcomingAppts.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => {
              const d = shiftDay(apptDay, -1);
              setApptDay(d);
              void refreshAppointments(d);
            }}
          >
            <IconChevronLeft />
          </button>
          <label className="relative">
            <span className="sr-only">Pick date</span>
            <input
              type="date"
              value={apptDay}
              onChange={(e) => {
                if (!e.target.value) return;
                setApptDay(e.target.value);
                void refreshAppointments(e.target.value);
              }}
              className="input input-sm w-[140px] text-center"
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => {
              const d = shiftDay(apptDay, 1);
              setApptDay(d);
              void refreshAppointments(d);
            }}
          >
            <IconChevronRight />
          </button>
          {apptDay !== queueDay && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setApptDay(queueDay);
                void refreshAppointments(queueDay);
              }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {visibleAppointments.length === 0 ? (
        <EmptyState
          icon={<IconCalendar />}
          title={apptDay === queueDay ? 'No appointments today' : `Nothing booked for ${formatIstDate(`${apptDay}T12:00:00+05:30`)}`}
          text={
            features.publicBooking && user.clinic.enablePublicBooking
              ? 'Share your booking link so patients can pick a slot themselves.'
              : 'Book a slot for a patient to see it here.'
          }
          action={
            <button type="button" className="btn btn-secondary" onClick={() => setAction('book')}>
              Book appointment
            </button>
          }
        />
      ) : (
        <ul className="list">
          {visibleAppointments.map((appt) => (
            <AppointmentRow
              key={appt.id}
              appt={appt}
              canQueue={showQueue && apptDay === queueDay}
              onAction={apptAction}
            />
          ))}
        </ul>
      )}
    </section>
  );

  const recentCard = (
    <section aria-label="Recent patients" className="card overflow-hidden">
      <div className="card-header">
        <h2 className="card-title">Recent patients</h2>
        <Link href="/app/patients" className="btn btn-ghost btn-sm">
          View all
          <IconChevronRight />
        </Link>
      </div>
      {initialPatients.length === 0 ? (
        <EmptyState
          icon={<IconPatients />}
          title="No patients yet"
          text="Add your first patient to start their digital record."
          action={
            <button type="button" className="btn btn-primary" onClick={openNewPatient}>
              <IconUserPlus /> New patient
            </button>
          }
        />
      ) : (
        <ul className="list">
          {initialPatients.slice(0, 8).map((p) => {
            const last = p.visits[0];
            return (
              <li key={p.id}>
                <Link href={`/app/patients/${p.id}`} className="row row-link">
                  <Avatar name={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-medium">{p.name}</span>
                      {hasAllergy(p.allergies) && <IconAlert className="h-3.5 w-3.5 shrink-0 text-danger" />}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {last
                        ? `${formatIstDate(last.visitedAt)}${last.diagnosis ? ` · ${last.diagnosis}` : ''}`
                        : patientMeta(p) || p.phone}
                    </span>
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={formatIstLongDay(queueDay)}
        title={title}
        actions={
          <>
            {features.multiBranch && branches.length > 0 && (
              <select
                aria-label="Branch"
                value={branchId}
                onChange={(e) => void switchBranch(e.target.value)}
                className="select w-auto"
              >
                <option value="ALL">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {showAppointments && (
              <button type="button" className="btn btn-secondary max-sm:flex-1" onClick={() => setAction('book')}>
                <IconCalendar />
                Book
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary max-sm:flex-1 text-brand-ink"
              onClick={() => setOcrModalOpen(true)}
              title="Scan paper prescription with AI"
            >
              <IconSparkle className="text-brand" />
              Scan Rx (AI)
            </button>
            {showQueue ? (
              <button type="button" className="btn btn-primary max-sm:flex-1" onClick={() => setAction('checkin')}>
                <IconQueueTv />
                Check in
              </button>
            ) : (
              <button type="button" className="btn btn-primary max-sm:flex-1" onClick={openNewPatient}>
                <IconUserPlus />
                New patient
              </button>
            )}
          </>
        }
      />

      <div className={`grid gap-3 ${stats.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stats.map((s) => {
          const body = (
            <>
              <span className="stat-label">
                {s.icon}
                {s.label}
              </span>
              <span className={`stat-value ${s.tone ?? ''}`}>{s.value}</span>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="stat transition-colors hover:border-line-strong">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="stat">
              {body}
            </div>
          );
        })}
      </div>

      {showQueue && showAppointments && (
        <div role="tablist" aria-label="Today" className="seg seg-block lg:hidden">
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'queue'}
            onClick={() => setMobilePane('queue')}
          >
            Queue · {waiting.length + withDoctor.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'appointments'}
            onClick={() => setMobilePane('appointments')}
          >
            Appointments · {upcomingAppts.length}
          </button>
        </div>
      )}

      {showQueue && showAppointments ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className={mobilePane === 'queue' ? '' : 'max-lg:hidden'}>{queueCard}</div>
          <div className={mobilePane === 'appointments' ? '' : 'max-lg:hidden'}>{appointmentsCard}</div>
        </div>
      ) : showQueue || showAppointments ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {queueCard || appointmentsCard}
          {recentCard}
        </div>
      ) : (
        recentCard
      )}

      {/* ───────── Check-in / booking flow ───────── */}
      <Modal
        open={action !== null && picked === null && newFromPicker === null}
        onClose={() => setAction(null)}
        title={action === 'book' ? 'Book appointment' : 'Check in patient'}
        description="Find the patient, or add them if they're new."
      >
        <PatientPicker onSelect={(p) => setPicked(p)} onCreateNew={(q) => setNewFromPicker(q)} />
      </Modal>

      <NewPatientDialog
        open={newFromPicker !== null}
        initialQuery={newFromPicker ?? ''}
        onClose={() => setNewFromPicker(null)}
        submitLabel="Save & continue"
        onCreated={(p) => {
          setNewFromPicker(null);
          setPicked({
            ...p,
            ageYears: null,
            gender: null,
            place: null,
            allergies: null,
            chronicConditions: null,
            _count: { visits: 0, documents: 0 },
            visits: [],
          });
        }}
      />

      {action === 'checkin' && (
        <CheckInDialog
          patient={picked}
          user={user}
          doctors={doctors}
          branchId={branchId}
          queueDay={queueDay}
          onBack={() => setPicked(null)}
          onDone={async (token, name) => {
            setPicked(null);
            setAction(null);
            setMobilePane('queue');
            toast(`Token #${token} issued to ${name}`);
            await refreshQueue();
          }}
        />
      )}

      {action === 'book' && (
        <BookDialog
          patient={picked}
          user={user}
          doctors={doctors}
          branchId={branchId}
          defaultDay={apptDay}
          onBack={() => setPicked(null)}
          onDone={async (day, time, name) => {
            setPicked(null);
            setAction(null);
            setMobilePane('appointments');
            setApptDay(day);
            toast(`${name} booked for ${formatIstDate(`${day}T12:00:00+05:30`)} at ${time}`);
            await refreshAppointments(day);
          }}
        />
      )}

      <PrescriptionOcrModal
        open={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onApplyExtractedData={(data) => void handleOcrFromHome(data)}
      />
    </div>
  );
}

/* ───────────────────────── Rows ───────────────────────── */

function QueueRow({
  entry,
  isStaff,
  showDoctor,
  onStatus,
  muted = false,
}: {
  entry: QueueListItem;
  isStaff: boolean;
  showDoctor: boolean;
  onStatus: (e: QueueListItem, s: QueueListItem['status']) => void;
  muted?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const bill = entry.billingRecords[0];
  const active = entry.status === 'IN_CONSULTATION';
  const chartHref = `/app/patients/${entry.patient.id}?queueEntryId=${entry.id}`;
  const meta = [
    showDoctor ? entry.doctor.name : null,
    patientMeta(entry.patient) || null,
    entry.notes || null,
  ].filter(Boolean);

  return (
    <li className={`row items-start sm:items-center ${muted ? 'opacity-60' : ''} ${active ? 'bg-brand-softer' : ''}`}>
      <span className={`token ${active ? 'token-active' : ''}`}>{entry.tokenNumber}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={chartHref} className="truncate text-[14.5px] font-medium hover:underline">
            {entry.patient.name}
          </Link>
          <StatusBadge status={entry.status} />
          {hasAllergy(entry.patient.allergies) && (
            <Badge tone="danger">
              <IconAlert className="h-3 w-3" />
              Allergy
            </Badge>
          )}
        </div>
        {meta.length > 0 && <p className="mt-0.5 truncate text-[12.5px] text-muted">{meta.join(' · ')}</p>}
        {(entry.vitals || bill) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            {entry.vitals && Object.keys(entry.vitals).length > 0 && (
              <span className="font-mono text-[11.5px]">{vitalsText(entry.vitals)}</span>
            )}
            {bill && (
              <span className={bill.paymentStatus === 'PAID' ? 'text-success' : 'text-warning'}>
                {formatINR(bill.netAmount)} {bill.paymentStatus === 'PAID' ? 'paid' : 'due'}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        {entry.status === 'WAITING' && !isStaff ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onStatus(entry, 'IN_CONSULTATION')}>
            <IconPlay className="h-3 w-3" />
            <span className="max-sm:hidden">Start</span>
          </button>
        ) : entry.status === 'IN_CONSULTATION' ? (
          <Link href={chartHref} className="btn btn-soft btn-sm">
            Open chart
          </Link>
        ) : (
          <Link href={chartHref} className="btn btn-secondary btn-sm max-sm:hidden">
            Chart
          </Link>
        )}
        {(entry.status === 'WAITING' || entry.status === 'IN_CONSULTATION') && (
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setMenu(false);
              }}
              className="btn btn-ghost btn-icon btn-sm"
            >
              <IconMore />
            </button>
            {menu && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 rounded-xl border border-line bg-surface p-1 shadow-pop"
                style={{ animation: 'pop-in 100ms ease' }}
              >
                <Link role="menuitem" href={chartHref} className="flex h-9 items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2">
                  Open chart
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onStatus(entry, 'COMPLETED');
                  }}
                  className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2"
                >
                  Mark as done
                </button>
                {entry.status === 'IN_CONSULTATION' && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onStatus(entry, 'WAITING');
                    }}
                    className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2"
                  >
                    Move back to waiting
                  </button>
                )}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onStatus(entry, 'NO_SHOW');
                  }}
                  className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] text-danger hover:bg-danger-soft"
                >
                  No-show
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function AppointmentRow({
  appt,
  canQueue,
  onAction,
}: {
  appt: AppointmentListItem;
  canQueue: boolean;
  onAction: (
    a: AppointmentListItem,
    p: { status?: AppointmentListItem['status']; checkInToQueue?: boolean }
  ) => void;
}) {
  const [busy, setBusy] = useState(false);
  const closed = appt.status === 'CANCELLED' || appt.status === 'COMPLETED' || appt.status === 'NO_SHOW';
  const run = async (p: Parameters<typeof onAction>[1]) => {
    setBusy(true);
    await onAction(appt, p);
    setBusy(false);
  };

  return (
    <li className={`row ${closed ? 'opacity-60' : ''}`}>
      <span className="w-[62px] shrink-0 text-[13px] font-semibold tnum">{formatSlotTime(appt.scheduledAt)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/app/patients/${appt.patient.id}`} className="truncate text-[14px] font-medium hover:underline">
            {appt.patient.name}
          </Link>
          {appt.status !== 'SCHEDULED' && <StatusBadge status={appt.status} />}
        </div>
        <p className="truncate text-[12.5px] text-muted">
          {[appt.reason, appt.doctor.name].filter(Boolean).join(' · ')}
        </p>
      </div>
      {!closed && (
        <div className="flex shrink-0 items-center gap-1.5">
          {canQueue && !appt.queueEntryId ? (
            <button type="button" disabled={busy} className="btn btn-soft btn-sm" onClick={() => run({ checkInToQueue: true })}>
              Check in
            </button>
          ) : appt.status === 'SCHEDULED' ? (
            <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => run({ status: 'CONFIRMED' })}>
              Confirm
            </button>
          ) : null}
          <ApptMenu onPick={(s) => run({ status: s })} canConfirm={canQueue && appt.status === 'SCHEDULED'} />
        </div>
      )}
    </li>
  );
}

function ApptMenu({
  onPick,
  canConfirm,
}: {
  onPick: (s: AppointmentListItem['status']) => void;
  canConfirm: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className="btn btn-ghost btn-icon btn-sm"
      >
        <IconMore />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 rounded-xl border border-line bg-surface p-1 shadow-pop"
          style={{ animation: 'pop-in 100ms ease' }}
        >
          {canConfirm && (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onPick('CONFIRMED');
              }}
              className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2"
            >
              Confirm
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onPick('COMPLETED');
            }}
            className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2"
          >
            Mark as completed
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onPick('NO_SHOW');
            }}
            className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] hover:bg-surface-2"
          >
            No-show
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onPick('CANCELLED');
            }}
            className="flex h-9 w-full items-center rounded-lg px-2.5 text-[13px] text-danger hover:bg-danger-soft"
          >
            Cancel appointment
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Dialogs ───────────────────────── */

function SelectedPatient({ patient, onBack }: { patient: PatientListItem; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-control)] border border-line bg-surface-2 px-3 py-2.5">
      <Avatar name={patient.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{patient.name}</p>
        <p className="truncate text-[12px] text-muted">
          {patient.patientCode} · <span className="tnum">{patient.phone}</span>
        </p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        Change
      </button>
    </div>
  );
}

function CheckInDialog({
  patient,
  user,
  doctors,
  branchId,
  queueDay,
  onBack,
  onDone,
}: {
  patient: PatientListItem | null;
  user: SessionUser;
  doctors: DoctorOption[];
  branchId: string;
  queueDay: string;
  onBack: () => void;
  onDone: (token: number, name: string) => void | Promise<void>;
}) {
  const [doctorId, setDoctorId] = useState(doctors.find((d) => d.id === user.id)?.id ?? doctors[0]?.id ?? '');
  const [bp, setBp] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [payStatus, setPayStatus] = useState<'UNPAID' | 'PAID'>(
    user.clinic.billingTiming === 'PRE_CONSULT' ? 'PAID' : 'UNPAID'
  );
  const [payMode, setPayMode] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doc = doctors.find((d) => d.id === doctorId);
  const fee = doc?.consultationFee ?? user.clinic.defaultConsultFee;
  const billingOn = user.clinic.enableBilling;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patient) return;
    setSaving(true);
    setError(null);
    const vitals: Record<string, string> = {};
    if (bp.trim()) vitals.bp = bp.trim();
    if (temp.trim()) vitals.temp = temp.trim();
    if (weight.trim()) vitals.weight = weight.trim();
    const r = await apiJson<{ entry: { tokenNumber: number; patient: { name: string } } }>('/api/queue', {
      body: {
        patientId: patient.id,
        doctorId,
        branchId: branchId !== 'ALL' ? branchId : null,
        queueDay,
        vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
        notes: notes || null,
        feeAmount: fee,
        paymentStatus: payStatus,
        paymentMode: payStatus === 'PAID' ? payMode : null,
      },
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await onDone(r.data.entry.tokenNumber, r.data.entry.patient.name);
  }

  return (
    <Modal
      open={patient !== null}
      onClose={onBack}
      title="Check in"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="submit" form="checkin-form" disabled={saving} className="btn btn-primary">
            {saving ? 'Issuing token…' : 'Issue token'}
          </button>
        </>
      }
    >
      {patient && (
        <form id="checkin-form" onSubmit={submit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="alert alert-danger">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}
          <SelectedPatient patient={patient} onBack={onBack} />
          {hasAllergy(patient.allergies) && (
            <div className="alert alert-danger">
              <IconAlert />
              <span>
                <strong className="font-semibold">Allergic to:</strong> {patient.allergies}
              </span>
            </div>
          )}

          <div className="field">
            <label htmlFor="ci-doc" className="label">
              Doctor
            </label>
            <select id="ci-doc" className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialty ? ` — ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ci-notes" className="label">
              Reason for visit
            </label>
            <input
              id="ci-notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fever since 2 days"
            />
          </div>

          {user.clinic.enableVitals && (
            <fieldset className="field">
              <legend className="label mb-1.5">
                Vitals <span className="font-normal text-muted">(optional)</span>
              </legend>
              <div className="grid grid-cols-3 gap-2">
                <input aria-label="Blood pressure" className="input tnum" placeholder="BP 120/80" value={bp} onChange={(e) => setBp(e.target.value)} />
                <input aria-label="Temperature" className="input tnum" placeholder="Temp °F" value={temp} onChange={(e) => setTemp(e.target.value)} />
                <input aria-label="Weight" className="input tnum" placeholder="Wt kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </fieldset>
          )}

          {billingOn && (
            <div className="rounded-[var(--r-control)] border border-line p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-medium">Consultation fee</p>
                  <p className="text-[12.5px] text-muted tnum">{formatINR(fee)}</p>
                </div>
                <div className="seg" role="group" aria-label="Fee collection">
                  <button type="button" aria-pressed={payStatus === 'UNPAID'} onClick={() => setPayStatus('UNPAID')}>
                    Later
                  </button>
                  <button type="button" aria-pressed={payStatus === 'PAID'} onClick={() => setPayStatus('PAID')}>
                    Paid now
                  </button>
                </div>
              </div>
              {payStatus === 'PAID' && (
                <div className="seg seg-block mt-3" role="group" aria-label="Payment mode">
                  {(['UPI', 'CASH', 'CARD'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={payMode === m} onClick={() => setPayMode(m)}>
                      {m === 'UPI' ? 'UPI' : m === 'CASH' ? 'Cash' : 'Card'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

function BookDialog({
  patient,
  user,
  doctors,
  branchId,
  defaultDay,
  onBack,
  onDone,
}: {
  patient: PatientListItem | null;
  user: SessionUser;
  doctors: DoctorOption[];
  branchId: string;
  defaultDay: string;
  onBack: () => void;
  onDone: (day: string, time: string, name: string) => void | Promise<void>;
}) {
  const [doctorId, setDoctorId] = useState(doctors.find((d) => d.id === user.id)?.id ?? doctors[0]?.id ?? '');
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickTimes = ['09:30', '11:00', '12:30', '16:00', '17:30', '19:00'];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patient) return;
    setSaving(true);
    setError(null);
    const r = await apiJson<{ appointment: { patient: { name: string } } }>('/api/appointments', {
      body: {
        patientId: patient.id,
        doctorId,
        branchId: branchId !== 'ALL' ? branchId : null,
        day,
        time,
        durationMinutes: user.clinic.slotDurationMin || 15,
        reason: reason || null,
      },
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const label = formatClockTime(time);
    await onDone(day, label, r.data.appointment.patient.name);
  }

  return (
    <Modal
      open={patient !== null}
      onClose={onBack}
      title="Book appointment"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="submit" form="book-form" disabled={saving} className="btn btn-primary">
            {saving ? 'Booking…' : 'Book slot'}
          </button>
        </>
      }
    >
      {patient && (
        <form id="book-form" onSubmit={submit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="alert alert-danger">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}
          <SelectedPatient patient={patient} onBack={onBack} />

          {doctors.length > 1 && (
            <div className="field">
              <label htmlFor="ap-doc" className="label">
                Doctor
              </label>
              <select id="ap-doc" className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="ap-date" className="label">
                Date
              </label>
              <input id="ap-date" type="date" required className="input" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ap-time" className="label">
                Time
              </label>
              <input id="ap-time" type="time" required className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="scroll-x -mt-1 flex gap-1.5">
            {quickTimes.map((t) => (
              <button key={t} type="button" className="chip tnum" aria-pressed={time === t} onClick={() => setTime(t)}>
                {formatClockTime(t)}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="ap-reason" className="label">
              Reason <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="ap-reason"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lab review, BP check"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
