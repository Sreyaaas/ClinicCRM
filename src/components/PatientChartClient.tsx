'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionUser } from '@/lib/auth';
import { checkPrescriptionSafety } from '@/lib/clinical-safety';
import { formatIstDate, formatIstDateTime, istDateBadge } from '@/lib/date';
import { getPlanFeatures, isDoctorRole } from '@/lib/plans';
import { uploadPatientDocument, type DocTypeValue } from '@/lib/upload-document';
import { buildVisitSummaryMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import {
  IconAiBadge,
  IconAlert,
  IconArrowLeft,
  IconBilling,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconEdit,
  IconExternal,
  IconFile,
  IconFlask,
  IconFollowUp,
  IconMessage,
  IconPhone,
  IconPill,
  IconPlus,
  IconPrinter,
  IconQr,
  IconRefresh,
  IconSearch,
  IconSparkle,
  IconStethoscope,
  IconTrash,
  IconUpload,
  IconX,
} from './Icons';
import { PrescriptionOcrModal } from './PrescriptionOcrModal';
import type { PrescriptionOcrData } from '@/lib/gemini-ocr';
import { hasAllergy, patientMeta } from './patients';
import {
  apiJson,
  Avatar,
  Badge,
  EmptyState,
  formatINR,
  Modal,
  StatusBadge,
  toast,
} from './ui';
import { UpiQrModal } from './UpiQrModal';

export interface ChartPrescription {
  id: string;
  medicineName: string;
  dosage: string | null;
  timing: string | null;
  durationDays: number | null;
  instructions: string | null;
}

export interface ChartDocument {
  id: string;
  visitId: string | null;
  docType: DocTypeValue;
  title: string;
  notes: string | null;
  reportDate: string;
  storageProvider: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: { id: string; name: string; role: string };
}

export interface ChartVisit {
  id: string;
  visitedAt: string;
  chiefComplaint: string | null;
  vitals: Record<string, string> | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  followUpDate: string | null;
  followUpReason: string | null;
  followUpStatus: string;
  doctor: { id: string; name: string; specialty: string | null };
  prescriptions: ChartPrescription[];
  documents: Array<{
    id: string;
    docType: DocTypeValue;
    title: string;
    mimeType: string;
    reportDate: string;
  }>;
}

export interface ChartBilling {
  id: string;
  invoiceNumber: string | null;
  netAmount: number;
  paymentStatus: string;
  paymentMode: string | null;
  createdAt: string;
  doctor: { id: string; name: string };
}

export interface ChartOrder {
  id: string;
  visitId: string | null;
  orderType: 'LAB_TEST' | 'DISPENSARY';
  itemName: string;
  instructions: string | null;
  status: 'ORDERED' | 'IN_PROGRESS' | 'READY' | 'DISPENSED' | 'CANCELLED';
  amount: number;
  createdAt: string;
  doctor: { id: string; name: string };
}

export interface ChartPatient {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  ageYears: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  place: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  notes: string | null;
  visits: ChartVisit[];
  documents: ChartDocument[];
  billingRecords: ChartBilling[];
  clinicalOrders: ChartOrder[];
}

export interface PresetOption {
  id: string;
  medicineName: string;
  defaultDosage: string | null;
  defaultTiming: string | null;
  defaultDuration: number | null;
  instructions: string | null;
}

export interface ChartConditionTemplate {
  id: string;
  name: string;
  diagnosis: string | null;
  clinicalNotes: string | null;
  followUpDays: number | null;
  medicines: Array<{
    medicineName: string;
    dosage?: string;
    timing?: string;
    durationDays?: number;
  }>;
}

interface DraftRxRow {
  key: number;
  medicineName: string;
  dosage: string;
  timing: string;
  durationDays: string;
  instructions?: string;
}

const DOC_TYPE_LABELS: Record<DocTypeValue, string> = {
  BLOOD_REPORT: 'Lab report',
  IMAGING_SCAN: 'Scan / X-ray',
  PAPER_SLIP: 'Handwritten slip',
  ECG: 'ECG',
  DISCHARGE_SUMMARY: 'Discharge summary',
  EXTERNAL_RX: 'Outside prescription',
  OTHER: 'Other',
};

const DOSAGE_OPTIONS = ['1-0-1', '1-0-0', '0-0-1', '1-1-1', '0-1-0', '1-1-1-1', 'SOS', 'Once a week'];
const TIMING_OPTIONS = ['After food', 'Before food', 'With food', 'At bedtime', 'Empty stomach'];
const VITAL_LABELS: Record<string, string> = { bp: 'BP', temp: 'Temp', pulse: 'Pulse', weight: 'Weight', spo2: 'SpO₂' };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addDaysIst(baseIst: string, days: number): string {
  const dt = new Date(`${baseIst}T12:00:00.000+05:30`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

let rxKey = 0;
const newRow = (r: Omit<DraftRxRow, 'key'>): DraftRxRow => ({ key: ++rxKey, ...r });

export function PatientChartClient({
  user,
  initialPatient,
  familyMembers,
  presets,
  conditionTemplates,
  activeQueueId,
  todayIst,
}: {
  user: SessionUser;
  initialPatient: ChartPatient;
  familyMembers: Array<{
    id: string;
    patientCode: string;
    name: string;
    ageYears: number | null;
    gender: string | null;
  }>;
  presets: PresetOption[];
  conditionTemplates: ChartConditionTemplate[];
  activeQueueId: string | null;
  todayIst: string;
}) {
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const canPrescribe = isDoctorRole(user.role);
  const waLang = user.preferredWhatsappLang === 'ml' || user.clinic.whatsappLang === 'ml' ? 'ml' : 'en';
  const billingOn = features.billing && user.clinic.enableBilling;
  const ordersOn = features.labAndPharmacy && user.clinic.enableOrders;

  const [patient, setPatient] = useState<ChartPatient>(initialPatient);
  const [tab, setTab] = useState<'visits' | 'reports' | 'bills' | 'orders'>('visits');
  const [reportFilter, setReportFilter] = useState<string>('ALL');
  const [queueId, setQueueId] = useState(activeQueueId);

  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitSeed, setVisitSeed] = useState<DraftRxRow[] | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrSeedData, setOcrSeedData] = useState<PrescriptionOcrData | null>(null);
  const [ocrSeedFile, setOcrSeedFile] = useState<File | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ChartDocument | null>(null);
  const [qrBill, setQrBill] = useState<ChartBilling | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePatientOpen, setDeletePatientOpen] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  async function handleDeletePatient() {
    setDeletingPatient(true);
    const r = await apiJson(`/api/patients/${patient.id}`, { method: 'DELETE' });
    setDeletingPatient(false);
    if (!r.ok) {
      toast(r.error, { tone: 'error' });
      return;
    }
    toast(`Patient ${patient.name} deleted.`);
    setDeletePatientOpen(false);
    router.push('/app/patients');
  }

  async function reloadPatient() {
    const r = await apiJson<{ patient: ChartPatient }>(`/api/patients/${patient.id}`);
    if (r.ok) setPatient(r.data.patient);
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('clinic_crm_pending_ocr');
      if (raw) {
        sessionStorage.removeItem('clinic_crm_pending_ocr');
        const parsed: PrescriptionOcrData = JSON.parse(raw);
        queueMicrotask(() => {
          setOcrSeedData(parsed);
          setVisitOpen(true);
        });
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleDeleteDoc(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedDoc(null);
      setConfirmDelete(false);
      toast('Document deleted');
      await reloadPatient();
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || 'Could not delete document', { tone: 'error' });
    }
  }

  async function markBillPaid(billId: string, mode: 'CASH' | 'UPI' | 'CARD') {
    const r = await apiJson(`/api/billing/${billId}`, {
      method: 'PATCH',
      body: { paymentStatus: 'PAID', paymentMode: mode },
    });
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setQrBill(null);
    toast(`Payment recorded · ${mode === 'CASH' ? 'Cash' : mode}`);
    await reloadPatient();
  }

  const vitalsHistory = useMemo(
    () => patient.visits.filter((v) => v.vitals && Object.keys(v.vitals).length > 0).slice(0, 5),
    [patient.visits]
  );
  const dueAmount = patient.billingRecords
    .filter((b) => b.paymentStatus !== 'PAID')
    .reduce((s, b) => s + b.netAmount, 0);
  const lastVisit = patient.visits[0];
  const filteredDocs =
    reportFilter === 'ALL' ? patient.documents : patient.documents.filter((d) => d.docType === reportFilter);
  const docTypesPresent = Array.from(new Set(patient.documents.map((d) => d.docType)));
  const phoneDigits = patient.phone.replace(/\D/g, '');
  const waNumber = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Link href={queueId ? '/app' : '/app/patients'} className="btn btn-ghost btn-sm -ml-2.5">
          <IconArrowLeft />
          {queueId ? 'Today' : 'Patients'}
        </Link>
        {queueId && (
          <Badge tone="brand" dot>
            In consultation
          </Badge>
        )}
      </div>

      {/* ───────── Patient header ───────── */}
      <section className="card card-pad">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={patient.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{patient.name}</h1>
                <span className="font-mono text-[12px] text-subtle">{patient.patientCode}</span>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">
                {[patientMeta(patient), patient.phone].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {hasAllergy(patient.allergies) ? (
                  <Badge tone="danger">
                    <IconAlert className="h-3 w-3" />
                    Allergy: {patient.allergies}
                  </Badge>
                ) : (
                  <Badge>No known allergies</Badge>
                )}
                {patient.chronicConditions &&
                  patient.chronicConditions
                    .split(/,\s*/)
                    .filter(Boolean)
                    .map((c) => (
                      <Badge key={c} tone="warning">
                        {c}
                      </Badge>
                    ))}
                {dueAmount > 0 && <Badge tone="warning">{formatINR(dueAmount)} due</Badge>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href={`tel:${patient.phone}`} className="btn btn-secondary btn-icon" aria-label="Call patient" title="Call">
              <IconPhone />
            </a>
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-icon"
              aria-label="WhatsApp patient"
              title="WhatsApp"
            >
              <IconMessage />
            </a>
            <button type="button" onClick={() => setEditOpen(true)} className="btn btn-secondary btn-icon" aria-label="Edit patient" title="Edit details">
              <IconEdit />
            </button>
            {user.role === 'OWNER_DOCTOR' && (
              <button
                type="button"
                onClick={() => setDeletePatientOpen(true)}
                className="btn btn-secondary btn-icon text-danger hover:border-danger hover:bg-danger/10"
                aria-label="Delete patient"
                title="Delete patient"
              >
                <IconTrash />
              </button>
            )}
            <button type="button" onClick={() => setScanOpen(true)} className="btn btn-secondary max-sm:flex-1">
              <IconCamera />
              Add report
            </button>
            {canPrescribe && (
              <>
                <button
                  type="button"
                  onClick={() => setOcrOpen(true)}
                  className="btn btn-secondary max-sm:flex-1 gap-2"
                  title="Scan a paper prescription"
                >
                  <IconAiBadge />
                  <span>Scan prescription</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisitSeed(null);
                    setOcrSeedData(null);
                    setOcrSeedFile(null);
                    setVisitOpen(true);
                  }}
                  className="btn btn-primary max-sm:w-full"
                >
                  <IconPlus />
                  New consultation
                </button>
              </>
            )}
          </div>
        </div>

        {(familyMembers.length > 0 || patient.notes) && (
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 text-[13px] sm:flex-row sm:items-center sm:gap-6">
            {familyMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted">Same phone:</span>
                {familyMembers.map((fm) => (
                  <Link key={fm.id} href={`/app/patients/${fm.id}`} className="chip">
                    <Avatar name={fm.name} size="sm" className="!h-5 !w-5 !text-[9px]" />
                    {fm.name}
                  </Link>
                ))}
              </div>
            )}
            {patient.notes && (
              <p className="min-w-0 text-muted">
                <span className="font-medium text-fg">Note: </span>
                {patient.notes}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ───────── Main ───────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <div role="tablist" aria-label="Patient record" className="tabs">
            <button type="button" role="tab" aria-selected={tab === 'visits'} onClick={() => setTab('visits')}>
              Visits <span className="tab-count">{patient.visits.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'reports'} onClick={() => setTab('reports')}>
              Reports <span className="tab-count">{patient.documents.length}</span>
            </button>
            {features.billing && (
              <button type="button" role="tab" aria-selected={tab === 'bills'} onClick={() => setTab('bills')}>
                Bills <span className="tab-count">{patient.billingRecords.length}</span>
              </button>
            )}
            {ordersOn && (
              <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>
                Lab & pharmacy <span className="tab-count">{patient.clinicalOrders.length}</span>
              </button>
            )}
          </div>

          {/* Visits */}
          {tab === 'visits' && (
            <div role="tabpanel" className="flex flex-col gap-3">
              {patient.visits.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={<IconStethoscope />}
                    title="No visits recorded"
                    text={canPrescribe ? 'Start a consultation to write the first prescription.' : 'Visits will appear here once a doctor records them.'}
                    action={
                      canPrescribe ? (
                        <button type="button" className="btn btn-primary" onClick={() => setVisitOpen(true)}>
                          <IconPlus /> New consultation
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                patient.visits.map((visit, i) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    isLatest={i === 0}
                    canPrescribe={canPrescribe}
                    certificates={features.certificatesPrint}
                    onRepeat={() => {
                      setVisitSeed(
                        visit.prescriptions.map((p) =>
                          newRow({
                            medicineName: p.medicineName,
                            dosage: p.dosage ?? '1-0-1',
                            timing: p.timing ?? 'After food',
                            durationDays: p.durationDays ? String(p.durationDays) : '5',
                          })
                        )
                      );
                      setVisitOpen(true);
                    }}
                    onOpenDoc={(id) => {
                      const d = patient.documents.find((pd) => pd.id === id);
                      if (d) setSelectedDoc(d);
                    }}
                  />
                ))
              )}
            </div>
          )}

          {/* Reports */}
          {tab === 'reports' && (
            <div role="tabpanel" className="flex flex-col gap-3">
              {docTypesPresent.length > 1 && (
                <div className="scroll-x flex gap-1.5">
                  <button type="button" className="chip" aria-pressed={reportFilter === 'ALL'} onClick={() => setReportFilter('ALL')}>
                    All · {patient.documents.length}
                  </button>
                  {docTypesPresent.map((k) => (
                    <button key={k} type="button" className="chip" aria-pressed={reportFilter === k} onClick={() => setReportFilter(k)}>
                      {DOC_TYPE_LABELS[k]}
                    </button>
                  ))}
                </div>
              )}

              {filteredDocs.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={<IconFile />}
                    title="No reports yet"
                    text="Snap a photo of a lab report, scan or handwritten slip — it's compressed and stored privately."
                    action={
                      <button type="button" className="btn btn-secondary" onClick={() => setScanOpen(true)}>
                        <IconCamera /> Add report
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="card group flex items-start gap-3 p-4 text-left transition-colors hover:border-line-strong"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                        {doc.mimeType === 'application/pdf' ? <IconFile className="h-5 w-5" /> : <IconCamera className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium group-hover:underline">{doc.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-muted">
                          {DOC_TYPE_LABELS[doc.docType]} · {formatIstDate(doc.reportDate)}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-subtle">
                          {formatBytes(doc.sizeBytes)} · by {doc.uploadedBy.name}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bills */}
          {tab === 'bills' && features.billing && (
            <div role="tabpanel" className="card overflow-hidden">
              {patient.billingRecords.length === 0 ? (
                <EmptyState icon={<IconBilling />} title="No bills yet" text="Consultation fees and bills for this patient will show here." />
              ) : (
                <ul className="list">
                  {patient.billingRecords.map((bill) => (
                    <li key={bill.id} className="row flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold tnum">{formatINR(bill.netAmount)}</span>
                          <StatusBadge status={bill.paymentStatus} />
                          {bill.paymentMode && bill.paymentStatus === 'PAID' && (
                            <span className="text-[12.5px] text-muted">via {bill.paymentMode === 'CASH' ? 'Cash' : bill.paymentMode}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {bill.invoiceNumber ? <span className="font-mono">{bill.invoiceNumber} · </span> : null}
                          {formatIstDateTime(bill.createdAt)} · {bill.doctor.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bill.paymentStatus !== 'PAID' && (
                          <>
                            {features.upiQr && (
                              <button type="button" onClick={() => setQrBill(bill)} className="btn btn-primary btn-sm">
                                <IconQr /> UPI QR
                              </button>
                            )}
                            <button type="button" onClick={() => void markBillPaid(bill.id, 'CASH')} className="btn btn-secondary btn-sm">
                              Paid in cash
                            </button>
                          </>
                        )}
                        {features.itemizedGstBilling && (
                          <Link href={`/app/bills/${bill.id}/print`} className="btn btn-ghost btn-sm">
                            <IconPrinter /> Invoice
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Orders */}
          {tab === 'orders' && ordersOn && (
            <OrdersPanel patient={patient} canOrder={canPrescribe || user.role === 'STAFF'} onChanged={reloadPatient} />
          )}
        </div>

        {/* ───────── Side column ───────── */}
        <aside className="flex flex-col gap-4">
          <section className="card overflow-hidden">
            <div className="card-header min-h-0 py-3">
              <h2 className="card-title">Summary</h2>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line text-[13px]">
              <SummaryCell label="Visits" value={patient.visits.length} />
              <SummaryCell label="Last visit" value={lastVisit ? formatIstDate(lastVisit.visitedAt) : '—'} />
              <SummaryCell label="Reports" value={patient.documents.length} />
              <SummaryCell
                label="Follow-up"
                value={
                  lastVisit?.followUpDate && lastVisit.followUpStatus !== 'COMPLETED'
                    ? formatIstDate(lastVisit.followUpDate)
                    : '—'
                }
              />
            </dl>
          </section>

          {vitalsHistory.length > 0 && (
            <section className="card overflow-hidden">
              <div className="card-header min-h-0 py-3">
                <h2 className="card-title">Vitals</h2>
                <span className="text-[12px] text-muted">Last {vitalsHistory.length}</span>
              </div>
              <ul className="list">
                {vitalsHistory.map((v) => (
                  <li key={v.id} className="px-5 py-3">
                    <p className="text-[12px] text-muted">{formatIstDate(v.visitedAt)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]">
                      {Object.entries(v.vitals ?? {}).map(([k, val]) => (
                        <span key={k}>
                          <span className="text-muted">{VITAL_LABELS[k] ?? k}</span>{' '}
                          <span className="font-medium tnum">{val}</span>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {/* ───────── Dialogs ───────── */}
      <EditPatientDialog
        open={editOpen}
        patient={patient}
        isOwner={user.role === 'OWNER_DOCTOR'}
        onRequestDelete={() => {
          setEditOpen(false);
          setDeletePatientOpen(true);
        }}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          toast('Patient details updated');
          await reloadPatient();
        }}
      />

      <Modal
        open={deletePatientOpen}
        onClose={() => !deletingPatient && setDeletePatientOpen(false)}
        title={`Delete ${patient.name}?`}
        description="This will permanently delete this patient and all associated consultations, prescriptions, reports, and bills. This cannot be undone."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              disabled={deletingPatient}
              onClick={() => setDeletePatientOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingPatient}
              onClick={() => void handleDeletePatient()}
              className="btn btn-danger"
            >
              {deletingPatient ? 'Deleting…' : 'Delete patient'}
            </button>
          </div>
        }
      >
        <div className="rounded-[var(--r-control)] border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <strong>Warning:</strong> You are permanently deleting patient <span className="font-mono">{patient.patientCode}</span> ({patient.name}).
        </div>
      </Modal>

      <ScanDialog
        open={scanOpen}
        patientId={patient.id}
        todayIst={todayIst}
        onClose={() => setScanOpen(false)}
        onUploaded={async (msg) => {
          setScanOpen(false);
          setTab('reports');
          toast(msg);
          await reloadPatient();
        }}
      />

      {canPrescribe && (
        <>
          <ConsultDialog
            open={visitOpen}
            onClose={() => {
              setVisitOpen(false);
              setOcrSeedData(null);
              setOcrSeedFile(null);
            }}
            user={user}
            patient={patient}
            presets={presets}
            templates={features.conditionTemplates ? conditionTemplates : []}
            seedRows={visitSeed}
            initialOcrData={ocrSeedData}
            initialOcrFile={ocrSeedFile}
            activeQueueId={queueId}
            todayIst={todayIst}
            safetyOn={features.allergySafety}
            billingOn={billingOn}
            waLang={waLang}
            onSaved={async (waUrl) => {
              setVisitOpen(false);
              setVisitSeed(null);
              setOcrSeedData(null);
              setOcrSeedFile(null);
              setTab('visits');
              setQueueId(null);
              toast('Visit saved', { action: { label: 'Send on WhatsApp', href: waUrl } });
              await reloadPatient();
            }}
          />
          <PrescriptionOcrModal
            open={ocrOpen}
            onClose={() => setOcrOpen(false)}
            onApplyExtractedData={(data, file) => {
              setOcrSeedData(data);
              setOcrSeedFile(file ?? null);
              setVisitSeed(null);
              setVisitOpen(true);
            }}
            initialPatientName={patient.name}
          />
        </>
      )}

      <Modal
        open={selectedDoc !== null}
        onClose={() => {
          setSelectedDoc(null);
          setConfirmDelete(false);
        }}
        title={selectedDoc?.title ?? 'Document'}
        description={selectedDoc ? `${DOC_TYPE_LABELS[selectedDoc.docType]} · ${formatIstDate(selectedDoc.reportDate)}` : undefined}
        size="xl"
        headerRight={
          selectedDoc ? (
            <a href={`/api/documents/${selectedDoc.id}/file`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm max-sm:hidden">
              <IconExternal /> Open
            </a>
          ) : undefined
        }
        footer={
          selectedDoc && (canPrescribe || selectedDoc.uploadedBy.id === user.id) ? (
            confirmDelete ? (
              <div className="flex w-full items-center justify-between gap-3">
                <span className="text-[13px] text-muted">Delete this file permanently?</span>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void handleDeleteDoc(selectedDoc.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
                <IconTrash /> Delete file
              </button>
            )
          ) : undefined
        }
      >
        {selectedDoc && (
          <div className="flex flex-col gap-3">
            {selectedDoc.notes && <p className="text-[13px] text-muted">{selectedDoc.notes}</p>}
            {selectedDoc.mimeType === 'application/pdf' ? (
              <iframe
                title={selectedDoc.title}
                src={`/api/documents/${selectedDoc.id}/file`}
                className="h-[68dvh] w-full rounded-xl border border-line bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/documents/${selectedDoc.id}/file`}
                alt={selectedDoc.title}
                className="max-h-[68dvh] w-full rounded-xl border border-line bg-surface-2 object-contain"
              />
            )}
          </div>
        )}
      </Modal>

      <UpiQrModal
        open={qrBill !== null}
        onClose={() => setQrBill(null)}
        upiId={user.clinic.upiId}
        clinicName={user.clinic.name}
        patientName={patient.name}
        amount={qrBill?.netAmount ?? 0}
        invoiceNumber={qrBill?.invoiceNumber}
        onMarkPaid={qrBill ? () => void markBillPaid(qrBill.id, 'UPI') : undefined}
      />
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function SummaryCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface px-5 py-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium tnum">{value}</dd>
    </div>
  );
}

function VisitCard({
  visit,
  isLatest,
  canPrescribe,
  certificates,
  onRepeat,
  onOpenDoc,
}: {
  visit: ChartVisit;
  isLatest: boolean;
  canPrescribe: boolean;
  certificates: boolean;
  onRepeat: () => void;
  onOpenDoc: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(isLatest);
  const vitals = visit.vitals && Object.keys(visit.vitals).length > 0 ? visit.vitals : null;
  const heading = visit.diagnosis || visit.chiefComplaint || 'Consultation';
  const badge = istDateBadge(visit.visitedAt);

  return (
    <article className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-surface-2/60"
      >
        <div className="w-[52px] shrink-0 text-center">
          <p className="text-[11.5px] font-medium uppercase text-muted">{badge.mon}</p>
          <p className="text-[22px] font-semibold leading-none tnum">{badge.day}</p>
          <p className="mt-0.5 text-[11px] text-subtle tnum">{badge.year}</p>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">{heading}</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {visit.doctor.name}
            {visit.prescriptions.length > 0 && ` · ${visit.prescriptions.length} medicine${visit.prescriptions.length > 1 ? 's' : ''}`}
            {visit.documents.length > 0 && ` · ${visit.documents.length} file${visit.documents.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <IconChevronDown className={`mt-1 h-4 w-4 shrink-0 text-subtle transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
          {(visit.chiefComplaint || vitals) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {visit.chiefComplaint && (
                <div>
                  <p className="section-label">Complaint</p>
                  <p className="mt-0.5 text-[13.5px]">{visit.chiefComplaint}</p>
                </div>
              )}
              {vitals && (
                <div>
                  <p className="section-label">Vitals</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13.5px]">
                    {Object.entries(vitals).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-muted">{VITAL_LABELS[k] ?? k}</span> <span className="tnum">{v}</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          )}

          {visit.prescriptions.length > 0 && (
            <div>
              <p className="section-label mb-1.5">Prescription</p>
              <div className="overflow-hidden rounded-[var(--r-control)] border border-line">
                <table className="w-full text-[13.5px]">
                  <tbody>
                    {visit.prescriptions.map((rx, idx) => (
                      <tr key={rx.id} className="border-b border-line last:border-0">
                        <td className="w-8 py-2.5 pl-3 align-top text-[12px] text-subtle tnum">{idx + 1}</td>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium">{rx.medicineName}</p>
                          <p className="text-[12.5px] text-muted sm:hidden">
                            {[rx.dosage, rx.timing, rx.durationDays ? `${rx.durationDays} days` : null].filter(Boolean).join(' · ')}
                          </p>
                        </td>
                        <td className="hidden py-2.5 pr-3 font-mono text-[12.5px] sm:table-cell">{rx.dosage}</td>
                        <td className="hidden py-2.5 pr-3 text-muted sm:table-cell">{rx.timing}</td>
                        <td className="hidden py-2.5 pr-4 text-right text-muted tnum sm:table-cell">
                          {rx.durationDays ? `${rx.durationDays} d` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {visit.clinicalNotes && (
            <div>
              <p className="section-label">Advice</p>
              <p className="mt-0.5 whitespace-pre-line text-[13.5px]">{visit.clinicalNotes}</p>
            </div>
          )}

          {visit.documents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visit.documents.map((d) => (
                <button key={d.id} type="button" className="chip" onClick={() => onOpenDoc(d.id)}>
                  <IconFile /> {d.title}
                </button>
              ))}
            </div>
          )}

          {visit.followUpDate && (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <IconFollowUp className="h-4 w-4 text-muted" />
              <span>
                Follow-up on <span className="font-medium">{formatIstDate(visit.followUpDate)}</span>
                {visit.followUpReason ? ` — ${visit.followUpReason}` : ''}
              </span>
              <StatusBadge status={visit.followUpStatus} />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
            {canPrescribe && visit.prescriptions.length > 0 && (
              <button type="button" onClick={onRepeat} className="btn btn-secondary btn-sm">
                <IconRefresh /> Repeat Rx
              </button>
            )}
            <Link href={`/app/visits/${visit.id}/print`} className="btn btn-secondary btn-sm">
              <IconPrinter /> Print Rx
            </Link>
            {certificates && (
              <Link href={`/app/visits/${visit.id}/certificate`} className="btn btn-ghost btn-sm">
                <IconFile /> Certificate
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function OrdersPanel({
  patient,
  canOrder,
  onChanged,
}: {
  patient: ChartPatient;
  canOrder: boolean;
  onChanged: () => Promise<void>;
}) {
  const [orderType, setOrderType] = useState<'LAB_TEST' | 'DISPENSARY'>('LAB_TEST');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item.trim()) return;
    setSaving(true);
    const r = await apiJson('/api/orders', {
      body: {
        patientId: patient.id,
        visitId: patient.visits[0]?.id ?? null,
        orderType,
        itemName: item.trim(),
        amount: Number.parseInt(amount || '0', 10) || 0,
      },
    });
    setSaving(false);
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setItem('');
    setAmount('');
    toast(orderType === 'LAB_TEST' ? 'Lab test ordered' : 'Pharmacy order added');
    await onChanged();
  }

  async function setStatus(id: string, status: ChartOrder['status']) {
    const r = await apiJson(`/api/orders/${id}`, { method: 'PATCH', body: { status } });
    if (!r.ok) return toast(r.error, { tone: 'error' });
    await onChanged();
  }

  return (
    <div role="tabpanel" className="flex flex-col gap-3">
      {canOrder && (
        <form onSubmit={create} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="seg shrink-0" role="group" aria-label="Order type">
            <button type="button" aria-pressed={orderType === 'LAB_TEST'} onClick={() => setOrderType('LAB_TEST')}>
              <IconFlask className="h-3.5 w-3.5" /> Lab
            </button>
            <button type="button" aria-pressed={orderType === 'DISPENSARY'} onClick={() => setOrderType('DISPENSARY')}>
              <IconPill className="h-3.5 w-3.5" /> Pharmacy
            </button>
          </div>
          <input
            required
            aria-label="Item"
            className="input flex-1"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={orderType === 'LAB_TEST' ? 'e.g. HbA1c, Lipid profile' : 'e.g. Paracetamol 650 × 10'}
          />
          <input
            aria-label="Amount in rupees"
            type="number"
            min={0}
            className="input tnum sm:w-28"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="₹ Amount"
          />
          <button type="submit" disabled={saving} className="btn btn-primary">
            <IconPlus /> Add
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        {patient.clinicalOrders.length === 0 ? (
          <EmptyState icon={<IconFlask />} title="No orders yet" text="Lab investigations and pharmacy issues for this patient appear here." />
        ) : (
          <ul className="list">
            {patient.clinicalOrders.map((o) => (
              <li key={o.id} className="row flex-wrap">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  {o.orderType === 'LAB_TEST' ? <IconFlask className="h-4 w-4" /> : <IconPill className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.itemName}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-[12.5px] text-muted">
                    {formatIstDateTime(o.createdAt)}
                    {o.amount > 0 ? ` · ${formatINR(o.amount)}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {o.status === 'ORDERED' && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(o.id, 'IN_PROGRESS')}>
                      Start
                    </button>
                  )}
                  {(o.status === 'ORDERED' || o.status === 'IN_PROGRESS') && (
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={() => void setStatus(o.id, o.orderType === 'LAB_TEST' ? 'READY' : 'DISPENSED')}
                    >
                      {o.orderType === 'LAB_TEST' ? 'Mark ready' : 'Mark dispensed'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditPatientDialog({
  open,
  patient,
  onClose,
  onSaved,
  isOwner = false,
  onRequestDelete,
}: {
  open: boolean;
  patient: ChartPatient;
  onClose: () => void;
  onSaved: () => Promise<void>;
  isOwner?: boolean;
  onRequestDelete?: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit patient"
      footer={
        <div className="flex w-full items-center justify-between">
          {isOwner && onRequestDelete ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-danger"
              onClick={onRequestDelete}
            >
              <IconTrash /> Delete patient
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="edit-patient-form" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </div>
      }
    >
      {open && <EditPatientForm patient={patient} onSaved={onSaved} />}
    </Modal>
  );
}

function EditPatientForm({ patient, onSaved }: { patient: ChartPatient; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [age, setAge] = useState(patient.ageYears !== null ? String(patient.ageYears) : '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(patient.gender);
  const [place, setPlace] = useState(patient.place ?? '');
  const [allergies, setAllergies] = useState(patient.allergies ?? '');
  const [chronic, setChronic] = useState(patient.chronicConditions ?? '');
  const [notes, setNotes] = useState(patient.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const r = await apiJson(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      body: {
        name,
        phone,
        ageYears: age ? Number.parseInt(age, 10) : null,
        gender,
        place: place || null,
        allergies: allergies || null,
        chronicConditions: chronic || null,
        notes: notes || null,
      },
    });
    setSaving(false);
    if (!r.ok) return setError(r.error);
    await onSaved();
  }

  return (
    <form id="edit-patient-form" onSubmit={submit} className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="alert alert-danger">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="ep-name" className="label">Full name</label>
          <input id="ep-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ep-phone" className="label">Mobile number</label>
          <input id="ep-phone" className="input tnum" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-[110px_1fr] gap-4">
        <div className="field">
          <label htmlFor="ep-age" className="label">Age</label>
          <input id="ep-age" className="input tnum" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field">
          <span className="label">Gender</span>
          <div className="seg seg-block" role="group" aria-label="Gender">
            {(
              [
                ['FEMALE', 'Female'],
                ['MALE', 'Male'],
                ['OTHER', 'Other'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={gender === v} onClick={() => setGender(gender === v ? null : v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ep-place" className="label">Place</label>
        <input id="ep-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ep-allergies" className="label">Drug allergies</label>
        <input id="ep-allergies" className="input" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Leave blank if none" />
      </div>
      <div className="field">
        <label htmlFor="ep-chronic" className="label">Chronic conditions</label>
        <input id="ep-chronic" className="input" value={chronic} onChange={(e) => setChronic(e.target.value)} placeholder="Comma separated" />
      </div>
      <div className="field">
        <label htmlFor="ep-notes" className="label">Notes</label>
        <textarea id="ep-notes" rows={2} className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the team should know" />
      </div>
    </form>
  );
}

function ScanDialog({
  open,
  patientId,
  todayIst,
  onClose,
  onUploaded,
}: {
  open: boolean;
  patientId: string;
  todayIst: string;
  onClose: () => void;
  onUploaded: (msg: string) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<DocTypeValue>('BLOOD_REPORT');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayIst);
  const [notes, setNotes] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Choose or capture at least one photo or PDF.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const base = title.trim() || `${DOC_TYPE_LABELS[docType]} (${date || todayIst})`;
      let orig = 0;
      let comp = 0;
      for (let i = 0; i < files.length; i++) {
        setProgress(i);
        const { document, originalSizeBytes } = await uploadPatientDocument({
          file: files[i],
          patientId,
          docType,
          title: files.length > 1 ? `${base} (page ${i + 1})` : base,
          notes,
          reportDate: date || todayIst,
          highContrastScan: enhance,
        });
        orig += originalSizeBytes;
        comp += document.sizeBytes;
      }
      setFiles([]);
      setTitle('');
      setNotes('');
      await onUploaded(
        `${files.length} file${files.length > 1 ? 's' : ''} saved · ${formatBytes(orig)} → ${formatBytes(comp)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add report"
      description="Photos are compressed before upload to save data."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="scan-form" disabled={uploading} className="btn btn-primary">
            <IconUpload />
            {uploading ? `Uploading ${progress + 1} of ${files.length}…` : 'Save to record'}
          </button>
        </>
      }
    >
      <form id="scan-form" onSubmit={submit} className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="alert alert-danger">
            <IconAlert />
            <span>{error}</span>
          </div>
        )}

        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--r-card)] border-2 border-dashed border-line-strong bg-surface-2 px-4 py-7 text-center transition-colors hover:border-brand hover:bg-brand-softer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-brand-ink shadow-card">
            <IconCamera className="h-5 w-5" />
          </span>
          <span className="text-[14px] font-medium">Take a photo or choose files</span>
          <span className="text-[12.5px] text-muted">Images or PDF · multiple pages allowed</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        {files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                <IconFile className="h-4 w-4 text-muted" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-[12px] text-muted tnum">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  className="text-subtle hover:text-fg"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <IconX className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="field">
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DOC_TYPE_LABELS) as DocTypeValue[]).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={docType === k} onClick={() => setDocType(k)}>
                {DOC_TYPE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div className="field">
            <label htmlFor="sc-title" className="label">
              Title <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="sc-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HbA1c — City Lab" />
          </div>
          <div className="field">
            <label htmlFor="sc-date" className="label">Report date</label>
            <input id="sc-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="sc-notes" className="label">
            Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="sc-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <label className="flex items-center justify-between gap-4 rounded-[var(--r-control)] border border-line px-3.5 py-3">
          <span>
            <span className="block text-[13.5px] font-medium">Enhance as document scan</span>
            <span className="block text-[12.5px] text-muted">Sharper black & white, ~250 KB per page</span>
          </span>
          <input type="checkbox" className="switch" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
        </label>
      </form>
    </Modal>
  );
}

function ConsultDialog({
  open,
  onClose,
  user,
  patient,
  presets,
  templates,
  seedRows,
  initialOcrData,
  initialOcrFile,
  activeQueueId,
  todayIst,
  safetyOn,
  billingOn,
  waLang,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
  patient: ChartPatient;
  presets: PresetOption[];
  templates: ChartConditionTemplate[];
  seedRows: DraftRxRow[] | null;
  initialOcrData?: PrescriptionOcrData | null;
  initialOcrFile?: File | null;
  activeQueueId: string | null;
  todayIst: string;
  safetyOn: boolean;
  billingOn: boolean;
  waLang: 'en' | 'ml';
  onSaved: (waUrl: string) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Consultation · ${patient.name}`}
      description={[patientMeta(patient), patient.patientCode].filter(Boolean).join(' · ')}
      size="xl"
      closedby="closerequest"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="consult-form" className="btn btn-primary">
            Save visit
          </button>
        </>
      }
    >
      {open && (
        <ConsultForm
          user={user}
          patient={patient}
          presets={presets}
          templates={templates}
          seedRows={seedRows}
          initialOcrData={initialOcrData}
          initialOcrFile={initialOcrFile}
          activeQueueId={activeQueueId}
          todayIst={todayIst}
          safetyOn={safetyOn}
          billingOn={billingOn}
          waLang={waLang}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function ConsultForm({
  user,
  patient,
  presets,
  templates,
  seedRows,
  initialOcrData,
  initialOcrFile,
  activeQueueId,
  todayIst,
  safetyOn,
  billingOn,
  waLang,
  onSaved,
}: {
  user: SessionUser;
  patient: ChartPatient;
  presets: PresetOption[];
  templates: ChartConditionTemplate[];
  seedRows: DraftRxRow[] | null;
  initialOcrData?: PrescriptionOcrData | null;
  initialOcrFile?: File | null;
  activeQueueId: string | null;
  todayIst: string;
  safetyOn: boolean;
  billingOn: boolean;
  waLang: 'en' | 'ml';
  onSaved: (waUrl: string) => Promise<void>;
}) {
  const slipFirst = user.defaultCaptureMode === 'SLIP_FIRST';
  const [complaint, setComplaint] = useState(initialOcrData?.visit.chiefComplaint ?? '');
  const [diagnosis, setDiagnosis] = useState(initialOcrData?.visit.diagnosis ?? '');
  const [notes, setNotes] = useState(initialOcrData?.visit.clinicalNotes ?? '');
  const [vitalsOpen, setVitalsOpen] = useState(
    Boolean(initialOcrData?.visit.vitals && Object.values(initialOcrData.visit.vitals).some(Boolean))
  );
  const [vitals, setVitals] = useState({
    bp: initialOcrData?.visit.vitals?.bp ?? '',
    temp: initialOcrData?.visit.vitals?.temp ?? '',
    pulse: initialOcrData?.visit.vitals?.pulse ?? '',
    weight: initialOcrData?.visit.vitals?.weight ?? '',
    spo2: initialOcrData?.visit.vitals?.spo2 ?? '',
  });
  const [followUpDate, setFollowUpDate] = useState(
    initialOcrData?.visit.followUpDays ? addDaysIst(todayIst, initialOcrData.visit.followUpDays) : ''
  );
  const [followUpReason, setFollowUpReason] = useState(initialOcrData?.visit.followUpReason ?? '');

  const [rows, setRows] = useState<DraftRxRow[]>(() => {
    if (initialOcrData?.prescriptions && initialOcrData.prescriptions.length > 0) {
      return initialOcrData.prescriptions.map((m) =>
        newRow({
          medicineName: m.medicineName,
          dosage: m.dosage || '1-0-1',
          timing: m.timing || 'After food',
          durationDays: m.durationDays ? String(m.durationDays) : '5',
          instructions: m.instructions || '',
        })
      );
    }
    return seedRows ?? [];
  });

  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<string | null>(() => {
    if (!initialOcrData) return null;
    const parts: string[] = [];
    if (initialOcrData.visit.diagnosis) parts.push(initialOcrData.visit.diagnosis);
    if (initialOcrData.prescriptions.length > 0) parts.push(`${initialOcrData.prescriptions.length} medications`);
    if (initialOcrData.visit.vitals?.bp) parts.push(`BP ${initialOcrData.visit.vitals.bp}`);
    return parts.join(' · ') || 'Details extracted';
  });

  const [medQuery, setMedQuery] = useState('');
  const [savePresets, setSavePresets] = useState(true);
  const [slip, setSlip] = useState<File | null>(initialOcrFile ?? null);
  const [collectFee, setCollectFee] = useState(billingOn && !activeQueueId);
  const [fee, setFee] = useState(String(user.consultationFee ?? user.clinic.defaultConsultFee));
  const [feeStatus, setFeeStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [feeMode, setFeeMode] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedTpl, setAppliedTpl] = useState<string | null>(null);

  // WiFi drop & offline resilience: auto-drafting
  const draftKey = `nadi_rx_draft_${patient.id}`;
  const [restoredDraft, setRestoredDraft] = useState(false);

  useEffect(() => {
    if (initialOcrData || (seedRows && seedRows.length > 0)) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.complaint === 'string' && data.complaint) setComplaint(data.complaint);
        if (typeof data.diagnosis === 'string' && data.diagnosis) setDiagnosis(data.diagnosis);
        if (typeof data.notes === 'string' && data.notes) setNotes(data.notes);
        if (data.vitals && typeof data.vitals === 'object') {
          setVitals(data.vitals);
          if (Object.values(data.vitals).some(Boolean)) setVitalsOpen(true);
        }
        if (typeof data.followUpDate === 'string' && data.followUpDate) setFollowUpDate(data.followUpDate);
        if (typeof data.followUpReason === 'string' && data.followUpReason) setFollowUpReason(data.followUpReason);
        if (Array.isArray(data.rows) && data.rows.length > 0) {
          setRows(data.rows);
        }
        setRestoredDraft(true);
      }
    } catch {
      // ignore draft parse error
    }
  }, [draftKey, initialOcrData, seedRows]);

  useEffect(() => {
    const hasContent =
      complaint.trim().length > 0 ||
      diagnosis.trim().length > 0 ||
      notes.trim().length > 0 ||
      Object.values(vitals).some((v) => v.trim().length > 0) ||
      followUpDate.trim().length > 0 ||
      rows.some((r) => r.medicineName.trim().length > 0);

    const timer = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              complaint,
              diagnosis,
              notes,
              vitals,
              followUpDate,
              followUpReason,
              rows,
              updatedAt: Date.now(),
            })
          );
        }
      } catch {
        // quota exceeded or private window
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [draftKey, complaint, diagnosis, notes, vitals, followUpDate, followUpReason, rows]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setComplaint('');
    setDiagnosis('');
    setNotes('');
    setVitals({ bp: '', temp: '', pulse: '', weight: '', spo2: '' });
    setFollowUpDate('');
    setFollowUpReason('');
    setRows([]);
    setRestoredDraft(false);
  }

  const alerts = safetyOn
    ? checkPrescriptionSafety({
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        medicines: rows,
      })
    : [];

  const q = medQuery.trim().toLowerCase();
  const suggestions = (q ? presets.filter((p) => p.medicineName.toLowerCase().includes(q)) : presets)
    .filter((p) => !rows.some((r) => r.medicineName === p.medicineName))
    .slice(0, q ? 6 : 8);

  function addPreset(p: PresetOption) {
    setRows((prev) => [
      ...prev,
      newRow({
        medicineName: p.medicineName,
        dosage: p.defaultDosage ?? '1-0-1',
        timing: p.defaultTiming ?? 'After food',
        durationDays: p.defaultDuration ? String(p.defaultDuration) : '5',
      }),
    ]);
    setMedQuery('');
  }

  function addCustom() {
    const name = medQuery.trim();
    if (!name) return;
    setRows((prev) => [...prev, newRow({ medicineName: name, dosage: '1-0-1', timing: 'After food', durationDays: '5' })]);
    setMedQuery('');
  }

  function applyTemplate(tpl: ChartConditionTemplate) {
    if (tpl.diagnosis) setDiagnosis(tpl.diagnosis);
    if (tpl.clinicalNotes) setNotes(tpl.clinicalNotes);
    if (tpl.followUpDays) setFollowUpDate(addDaysIst(todayIst, tpl.followUpDays));
    if (tpl.medicines.length > 0) {
      setRows(
        tpl.medicines.map((m) =>
          newRow({
            medicineName: m.medicineName,
            dosage: m.dosage ?? '1-0-1',
            timing: m.timing ?? 'After food',
            durationDays: m.durationDays ? String(m.durationDays) : '5',
          })
        )
      );
    }
    setAppliedTpl(tpl.id);
  }

  const update = (key: number, field: keyof Omit<DraftRxRow, 'key'>, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  function applyOcrResult(data: PrescriptionOcrData, optFile?: File) {
    if (data.visit.chiefComplaint) setComplaint(data.visit.chiefComplaint);
    if (data.visit.diagnosis) setDiagnosis(data.visit.diagnosis);
    if (data.visit.clinicalNotes) setNotes(data.visit.clinicalNotes);

    if (data.visit.vitals && Object.values(data.visit.vitals).some(Boolean)) {
      setVitals({
        bp: data.visit.vitals.bp || '',
        temp: data.visit.vitals.temp || '',
        pulse: data.visit.vitals.pulse || '',
        weight: data.visit.vitals.weight || '',
        spo2: data.visit.vitals.spo2 || '',
      });
      setVitalsOpen(true);
    }

    if (data.visit.followUpDays) {
      setFollowUpDate(addDaysIst(todayIst, data.visit.followUpDays));
      if (data.visit.followUpReason) setFollowUpReason(data.visit.followUpReason);
    }

    if (data.prescriptions.length > 0) {
      const parsedRows = data.prescriptions.map((m) =>
        newRow({
          medicineName: m.medicineName,
          dosage: m.dosage || '1-0-1',
          timing: m.timing || 'After food',
          durationDays: m.durationDays ? String(m.durationDays) : '5',
          instructions: m.instructions || '',
        })
      );
      setRows(parsedRows);
    }

    if (optFile) {
      setSlip(optFile);
    }

    const parts: string[] = [];
    if (data.visit.diagnosis) parts.push(data.visit.diagnosis);
    if (data.prescriptions.length > 0) parts.push(`${data.prescriptions.length} medications`);
    if (data.visit.vitals?.bp) parts.push(`BP ${data.visit.vitals.bp}`);
    setOcrSummary(parts.join(' · ') || 'Details extracted');
    toast('Prescription details auto-filled');
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const v: Record<string, string> = {};
      for (const [k, val] of Object.entries(vitals)) if (val.trim()) v[k] = val.trim();
      const rx = rows
        .filter((r) => r.medicineName.trim())
        .map((r) => ({
          medicineName: r.medicineName.trim(),
          dosage: r.dosage.trim() || null,
          timing: r.timing.trim() || null,
          durationDays: r.durationDays ? Number.parseInt(r.durationDays, 10) || null : null,
          instructions: r.instructions?.trim() || null,
        }));

      const r = await apiJson<{ visit: { id: string } }>('/api/visits', {
        body: {
          patientId: patient.id,
          queueEntryId: activeQueueId ?? undefined,
          chiefComplaint: complaint || null,
          vitals: Object.keys(v).length > 0 ? v : undefined,
          diagnosis: diagnosis || null,
          clinicalNotes: notes || null,
          followUpDate: followUpDate || null,
          followUpReason: followUpReason || null,
          prescriptions: rx,
          saveNewPresets: savePresets,
          markPreviousFollowUpsDone: true,
          ...(billingOn && collectFee && !activeQueueId
            ? {
                feeAmount: Number.parseInt(fee || '0', 10) || 0,
                paymentStatus: feeStatus,
                paymentMode: feeStatus === 'PAID' ? feeMode : null,
              }
            : {}),
        },
      });
      if (!r.ok) {
        setError(r.error);
        setSaving(false);
        return;
      }

      try {
        localStorage.removeItem(draftKey);
      } catch {}

      if (slip) {
        await uploadPatientDocument({
          file: slip,
          patientId: patient.id,
          visitId: r.data.visit.id,
          docType: 'PAPER_SLIP',
          title: `Handwritten slip (${todayIst})`,
          reportDate: todayIst,
          highContrastScan: false,
        });
      }

      const msg = buildVisitSummaryMessage({
        patientName: patient.name,
        clinicName: user.clinic.name,
        doctorName: user.name,
        registrationNo: user.registrationNo,
        visitDateText: formatIstDate(new Date()),
        items: rx,
        followUpDateText: followUpDate ? formatIstDate(`${followUpDate}T12:00:00+05:30`) : null,
        lang: waLang,
      });
      await onSaved(buildWhatsAppLink(patient.phone, msg));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save visit.');
    } finally {
      setSaving(false);
    }
  }

  const slipInput = (
    <label className="flex cursor-pointer items-center gap-3 rounded-[var(--r-control)] border border-dashed border-line-strong px-3.5 py-3 hover:bg-surface-2">
      <IconCamera className="h-5 w-5 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium">{slip ? slip.name : 'Attach photo of handwritten slip'}</span>
        <span className="block text-[12px] text-muted">{slip ? formatBytes(slip.size) : 'Optional'}</span>
      </span>
      {slip && (
        <button type="button" aria-label="Remove photo" onClick={(e) => { e.preventDefault(); setSlip(null); }} className="text-subtle hover:text-fg">
          <IconX className="h-4 w-4" />
        </button>
      )}
      <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setSlip(e.target.files?.[0] ?? null)} />
    </label>
  );

  return (
    <form id="consult-form" onSubmit={submit} className="flex flex-col gap-5">
      {restoredDraft && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12.5px] text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Restored unsaved consultation notes auto-saved during your previous session.</span>
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="text-[11.5px] font-semibold text-amber-900 dark:text-amber-200 underline hover:opacity-75 shrink-0"
          >
            Discard draft
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-danger">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}

      {hasAllergy(patient.allergies) && (
        <div className="alert alert-danger">
          <IconAlert />
          <span>
            <strong className="font-semibold">Allergic to:</strong> {patient.allergies}
          </span>
        </div>
      )}

      {/* Prescription Scan Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-line bg-surface-2/60 p-3.5 sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-xs">
            <IconSparkle className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-fg">
              Auto-fill from photo
            </span>
            <span className="block text-[12px] text-muted">
              Upload a prescription photo to fill medicines, vitals and diagnosis
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOcrModalOpen(true)}
          className="btn btn-primary btn-sm max-sm:w-full gap-2"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand shadow-xs">
            <IconSparkle className="h-3.5 w-3.5" strokeWidth={2.6} />
          </span>
          Scan prescription
        </button>
      </div>

      {/* Success banner if applied */}
      {ocrSummary && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--r-control)] bg-success-light px-3.5 py-2 text-[12.5px] text-success-ink">
          <span className="flex items-center gap-2">
            <IconCheck className="h-4 w-4 text-success shrink-0" />
            <span>
              <strong>Filled from photo:</strong> {ocrSummary}. Review or tweak any field below.
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOcrSummary(null)}
            className="text-subtle hover:text-fg text-[11px] font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <div className="field">
          <span className="label">Quick packs</span>
          <div className="scroll-x flex gap-1.5">
            {templates.map((tpl) => (
              <button key={tpl.id} type="button" className="chip" aria-pressed={appliedTpl === tpl.id} onClick={() => applyTemplate(tpl)}>
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {slipFirst && slipInput}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="v-complaint" className="label">Complaint</label>
          <input id="v-complaint" className="input" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Fever × 2 days, cough" />
        </div>
        <div className="field">
          <label htmlFor="v-diagnosis" className="label">Diagnosis</label>
          <input id="v-diagnosis" className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral URI" />
        </div>
      </div>

      {user.clinic.enableVitals && (
        <div>
          <button type="button" onClick={() => setVitalsOpen((o) => !o)} className="flex items-center gap-1.5 text-[13px] font-medium text-brand-ink" aria-expanded={vitalsOpen}>
            <IconChevronDown className={`h-4 w-4 transition-transform ${vitalsOpen ? 'rotate-180' : ''}`} />
            Vitals
          </button>
          {vitalsOpen && (
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['bp', 'BP', '120/80'],
                  ['temp', 'Temp', '98.6 °F'],
                  ['pulse', 'Pulse', '72'],
                  ['weight', 'Weight', 'kg'],
                  ['spo2', 'SpO₂', '%'],
                ] as const
              ).map(([k, l, ph]) => (
                <div key={k} className="field">
                  <label htmlFor={`v-${k}`} className="text-[12px] text-muted">{l}</label>
                  <input id={`v-${k}`} className="input tnum" placeholder={ph} value={vitals[k]} onChange={(e) => setVitals((s) => ({ ...s, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rx builder */}
      <div className="rounded-[var(--r-card)] border border-line">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <IconPill className="h-4 w-4 text-muted" />
            Prescription
          </span>
          {rows.length > 0 && <span className="text-[12.5px] text-muted">{rows.length} item{rows.length > 1 ? 's' : ''}</span>}
        </div>

        {alerts.length > 0 && (
          <div role="alert" className="alert alert-danger m-3 mb-0">
            <IconAlert />
            <ul className="flex flex-col gap-0.5">
              {alerts.map((a, i) => (
                <li key={`${a.message}-${i}`}>{a.message}</li>
              ))}
            </ul>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="flex flex-col">
            {rows.map((row, idx) => (
              <li key={row.key} className="grid grid-cols-[20px_1fr_auto] items-center gap-x-2 gap-y-2 border-b border-line px-3 py-2.5 sm:grid-cols-[20px_minmax(0,1fr)_110px_130px_76px_32px]">
                <span className="text-center text-[12px] text-subtle tnum">{idx + 1}</span>
                <input aria-label={`Medicine ${idx + 1}`} className="input input-sm font-medium" value={row.medicineName} onChange={(e) => update(row.key, 'medicineName', e.target.value)} />
                <button type="button" aria-label={`Remove ${row.medicineName || 'medicine'}`} onClick={() => setRows((p) => p.filter((r) => r.key !== row.key))} className="btn btn-ghost btn-icon btn-sm sm:order-last">
                  <IconX />
                </button>
                <div className="col-span-3 grid grid-cols-[1fr_1.2fr_76px] gap-2 pl-7 sm:col-span-3 sm:col-start-3 sm:row-start-1 sm:grid-cols-[110px_130px_76px] sm:pl-0">
                  <input aria-label={`Dosage ${idx + 1}`} list="rx-dosage" className="input input-sm font-mono" value={row.dosage} onChange={(e) => update(row.key, 'dosage', e.target.value)} />
                  <input aria-label={`Timing ${idx + 1}`} list="rx-timing" className="input input-sm" value={row.timing} onChange={(e) => update(row.key, 'timing', e.target.value)} />
                  <div className="relative">
                    <input aria-label={`Days ${idx + 1}`} inputMode="numeric" className="input input-sm pr-6 tnum" value={row.durationDays} onChange={(e) => update(row.key, 'durationDays', e.target.value.replace(/\D/g, ''))} />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-subtle">d</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex gap-2">
            <div className="input-icon flex-1">
              <IconSearch />
              <input
                className="input"
                aria-label="Add medicine"
                placeholder="Add medicine — type a name"
                value={medQuery}
                onChange={(e) => setMedQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestions[0] && q && suggestions[0].medicineName.toLowerCase().startsWith(q)) addPreset(suggestions[0]);
                    else addCustom();
                  }
                }}
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={addCustom} disabled={!medQuery.trim()}>
              <IconPlus />
              <span className="max-sm:hidden">Add</span>
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((p) => (
                <button key={p.id} type="button" className="chip" onClick={() => addPreset(p)}>
                  <IconPlus /> {p.medicineName}
                </button>
              ))}
            </div>
          )}
          <label className="check mt-1 text-[12.5px] text-muted">
            <input type="checkbox" checked={savePresets} onChange={(e) => setSavePresets(e.target.checked)} />
            Remember new medicines for next time
          </label>
        </div>
        <datalist id="rx-dosage">
          {DOSAGE_OPTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id="rx-timing">
          {TIMING_OPTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="v-notes" className="label">Advice & notes</label>
        <textarea id="v-notes" rows={3} className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Diet, rest, tests to do…" />
      </div>

      {user.clinic.enableFollowUps && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <div className="flex items-center justify-between">
              <label htmlFor="v-fudate" className="label">Follow-up</label>
              <div className="flex gap-1">
                {[3, 7, 15, 30].map((d) => {
                  const val = addDaysIst(todayIst, d);
                  return (
                    <button key={d} type="button" className="chip h-6 px-2 text-[11.5px]" aria-pressed={followUpDate === val} onClick={() => setFollowUpDate(followUpDate === val ? '' : val)}>
                      {d}d
                    </button>
                  );
                })}
              </div>
            </div>
            <input id="v-fudate" type="date" className="input" min={todayIst} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="v-fureason" className="label">Follow-up reason</label>
            <input id="v-fureason" className="input" value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} placeholder="e.g. Review lab results" />
          </div>
        </div>
      )}

      {!slipFirst && slipInput}

      {billingOn && !activeQueueId && (
        <div className="rounded-[var(--r-control)] border border-line p-3.5">
          <label className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] font-medium">Record consultation fee</span>
            <input type="checkbox" className="switch" checked={collectFee} onChange={(e) => setCollectFee(e.target.checked)} />
          </label>
          {collectFee && (
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative sm:w-32">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                <input aria-label="Fee amount" inputMode="numeric" className="input pl-7 tnum" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="seg" role="group" aria-label="Fee status">
                <button type="button" aria-pressed={feeStatus === 'PAID'} onClick={() => setFeeStatus('PAID')}>Paid</button>
                <button type="button" aria-pressed={feeStatus === 'UNPAID'} onClick={() => setFeeStatus('UNPAID')}>Due</button>
              </div>
              {feeStatus === 'PAID' && (
                <div className="seg" role="group" aria-label="Payment mode">
                  {(['UPI', 'CASH', 'CARD'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={feeMode === m} onClick={() => setFeeMode(m)}>
                      {m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'UPI'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {saving && <p className="text-[13px] text-muted">Saving visit…</p>}

      <PrescriptionOcrModal
        open={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onApplyExtractedData={applyOcrResult}
        initialPatientName={patient.name}
      />
    </form>
  );
}
