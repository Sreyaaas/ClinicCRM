'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/auth';
import { formatIstTime } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import {
  IconAlert,
  IconBilling,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconPrinter,
  IconQr,
  IconReceiptMinus,
  IconTrash,
  IconX,
} from './Icons';
import { PatientPicker, type PatientListItem } from './patients';
import { apiJson, Avatar, EmptyState, formatINR, Modal, PageHeader, StatusBadge, toast } from './ui';
import { UpiQrModal } from './UpiQrModal';

export interface BillingSummaryData {
  day: string;
  totalBilled: number;
  totalCollected: number;
  totalUnpaid: number;
  totalGst: number;
  totalExpenses: number;
  netCash: number;
  byMode: { CASH: number; UPI: number; CARD: number; OTHER: number };
  byDoctor: Array<{
    doctorId: string;
    doctorName: string;
    billCount: number;
    collected: number;
    unpaid: number;
  }>;
}

export interface BillingRecordItem {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  discount: number;
  gstRatePercent: number;
  gstAmount: number;
  netAmount: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIAL';
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'OTHER' | null;
  createdAt: string;
  patient: { id: string; patientCode: string; name: string; phone: string };
  doctor: { id: string; name: string; specialty: string | null };
  collectedBy: { id: string; name: string } | null;
}

export interface ExpenseItem {
  id: string;
  category: 'SALARY' | 'RENT' | 'UTILITIES' | 'SUPPLIES' | 'PHARMACY_STOCK' | 'OTHER';
  title: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  createdAt: string;
  recordedBy: { id: string; name: string } | null;
}

type LineCategory = 'CONSULTATION' | 'PROCEDURE' | 'LAB' | 'PHARMACY' | 'OTHER';
interface DraftLineItem {
  key: number;
  label: string;
  category: LineCategory;
  qty: number;
  unitPrice: number;
}

const EXPENSE_LABELS: Record<ExpenseItem['category'], string> = {
  SUPPLIES: 'Supplies',
  SALARY: 'Salary',
  UTILITIES: 'Utilities',
  PHARMACY_STOCK: 'Medicine stock',
  RENT: 'Rent',
  OTHER: 'Other',
};

const MODE_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', OTHER: 'Other' };

function shiftDay(day: string, delta: number): string {
  const dt = new Date(`${day}T12:00:00.000+05:30`);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${day}T12:00:00+05:30`)
  );
}

function timeOnly(iso: string) {
  return formatIstTime(iso);
}

let lineKey = 0;

export function BillingClient({
  user,
  initialRecords,
  initialExpenses,
  initialSummary,
  doctorOptions,
  initialAction = null,
}: {
  user: SessionUser;
  initialRecords: BillingRecordItem[];
  initialExpenses: ExpenseItem[];
  initialSummary: BillingSummaryData;
  doctorOptions: Array<{ id: string; name: string; consultationFee: number | null }>;
  initialAction?: 'bill' | 'expense' | null;
}) {
  const router = useRouter();
  const features = getPlanFeatures(user.clinic.planTier);
  const today = initialSummary.day;
  const [day, setDay] = useState(initialSummary.day);
  const [records, setRecords] = useState<BillingRecordItem[]>(initialRecords);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [summary, setSummary] = useState<BillingSummaryData>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all');

  const [qrBill, setQrBill] = useState<BillingRecordItem | null>(null);
  const [billOpen, setBillOpen] = useState(initialAction === 'bill');
  const [expOpen, setExpOpen] = useState(initialAction === 'expense' && features.expensesTracker);

  useEffect(() => {
    if (initialAction) router.replace('/app/billing', { scroll: false });
  }, [initialAction, router]);

  async function loadDay(next: string) {
    setDay(next);
    setLoading(true);
    const r = await apiJson<{ records: BillingRecordItem[]; summary: BillingSummaryData; expenses?: ExpenseItem[] }>(
      `/api/billing?day=${encodeURIComponent(next)}`
    );
    if (r.ok) {
      setRecords(r.data.records);
      setSummary(r.data.summary);
      setExpenses(r.data.expenses ?? []);
    } else {
      toast(r.error, { tone: 'error' });
    }
    setLoading(false);
  }

  async function markPaid(bill: BillingRecordItem, mode: 'CASH' | 'UPI' | 'CARD') {
    const r = await apiJson(`/api/billing/${bill.id}`, { method: 'PATCH', body: { paymentStatus: 'PAID', paymentMode: mode } });
    if (!r.ok) return toast(r.error, { tone: 'error' });
    setQrBill(null);
    toast(`${formatINR(bill.netAmount)} received from ${bill.patient.name}`);
    await loadDay(day);
  }

  async function deleteExpense(ex: ExpenseItem) {
    const res = await fetch(`/api/expenses/${ex.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Could not remove expense', { tone: 'error' });
    toast(`Removed “${ex.title}”`);
    await loadDay(day);
  }

  const visible = records.filter((r) =>
    filter === 'all' ? true : filter === 'paid' ? r.paymentStatus === 'PAID' : r.paymentStatus !== 'PAID'
  );
  const dueCount = records.filter((r) => r.paymentStatus !== 'PAID').length;
  const modeTotal = summary.byMode.UPI + summary.byMode.CASH + summary.byMode.CARD + summary.byMode.OTHER;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description={features.expensesTracker ? 'Collections, dues and expenses for the day' : 'Fees collected and pending'}
        actions={
          <>
            {features.expensesTracker && (
              <button type="button" onClick={() => setExpOpen(true)} className="btn btn-secondary max-sm:flex-1">
                <IconReceiptMinus />
                Log expense
              </button>
            )}
            {doctorOptions.length > 0 && (
              <button type="button" onClick={() => setBillOpen(true)} className="btn btn-primary max-sm:flex-1">
                <IconPlus />
                New bill
              </button>
            )}
          </>
        }
      />

      {/* Day navigator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-[var(--r-control)] border border-line-strong bg-surface shadow-card">
          <button type="button" aria-label="Previous day" className="btn btn-ghost btn-icon btn-sm" onClick={() => void loadDay(shiftDay(day, -1))}>
            <IconChevronLeft />
          </button>
          <label className="relative flex h-8 min-w-[118px] cursor-pointer items-center justify-center px-2 text-[13.5px] font-medium">
            {dayLabel(day, today)}
            <input
              type="date"
              aria-label="Pick date"
              value={day}
              max={today}
              onChange={(e) => e.target.value && void loadDay(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            className="btn btn-ghost btn-icon btn-sm"
            disabled={day >= today}
            onClick={() => void loadDay(shiftDay(day, 1))}
          >
            <IconChevronRight />
          </button>
        </div>
        {day !== today && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadDay(today)}>
            Back to today
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className={`grid grid-cols-2 gap-3 ${features.expensesTracker ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <div className="stat">
          <span className="stat-label">Collected</span>
          <span className="stat-value text-success">{formatINR(summary.totalCollected)}</span>
          <span className="stat-foot">{records.length - dueCount} paid bills</span>
        </div>
        <div className="stat">
          <span className="stat-label">Due</span>
          <span className={`stat-value ${summary.totalUnpaid > 0 ? 'text-warning' : ''}`}>{formatINR(summary.totalUnpaid)}</span>
          <span className="stat-foot">{dueCount} pending</span>
        </div>
        {features.expensesTracker && (
          <>
            <div className="stat">
              <span className="stat-label">Expenses</span>
              <span className="stat-value">{formatINR(summary.totalExpenses)}</span>
              <span className="stat-foot">{expenses.length} entries</span>
            </div>
            <div className="stat">
              <span className="stat-label">Net cash</span>
              <span className={`stat-value ${summary.netCash < 0 ? 'text-danger' : ''}`}>{formatINR(summary.netCash)}</span>
              <span className="stat-foot">Collected − expenses</span>
            </div>
          </>
        )}
        {!features.expensesTracker && (
          <div className="stat max-lg:col-span-2">
            <span className="stat-label">Payment split</span>
            <span className="text-[13.5px] tnum">
              UPI {formatINR(summary.byMode.UPI)} · Cash {formatINR(summary.byMode.CASH)}
            </span>
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Bills */}
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">Bills</h2>
            <div className="seg" role="tablist" aria-label="Filter bills">
              {(
                [
                  ['all', `All ${records.length}`],
                  ['due', `Due ${dueCount}`],
                  ['paid', 'Paid'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconBilling />}
              title={records.length === 0 ? `No bills ${day === today ? 'yet today' : 'on this day'}` : 'Nothing in this filter'}
              text={records.length === 0 ? 'Consultation fees recorded at check-in or after a visit show up here.' : undefined}
            />
          ) : (
            <ul className="list">
              {visible.map((r) => (
                <li key={r.id} className="row flex-wrap gap-y-2">
                  <Avatar name={r.patient.name} size="sm" className="max-sm:hidden" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/patients/${r.patient.id}`} className="block truncate text-[14px] font-medium hover:underline">
                      {r.patient.name}
                    </Link>
                    <p className="truncate text-[12.5px] text-muted">
                      {timeOnly(r.createdAt)} · {r.doctor.name}
                      {r.invoiceNumber ? <span className="font-mono"> · {r.invoiceNumber}</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14.5px] font-semibold tnum">{formatINR(r.netAmount)}</p>
                    <p className="text-[12px] text-muted">
                      {r.paymentStatus === 'PAID' ? (
                        MODE_LABEL[r.paymentMode ?? 'OTHER']
                      ) : (
                        <span className="text-warning">Due</span>
                      )}
                      {r.gstAmount > 0 ? ` · GST ${formatINR(r.gstAmount)}` : ''}
                    </p>
                  </div>
                  <div className="flex w-full justify-end gap-1.5 sm:w-auto">
                    {r.paymentStatus !== 'PAID' && (
                      <>
                        <button type="button" onClick={() => void markPaid(r, 'CASH')} className="btn btn-secondary btn-sm">
                          Cash
                        </button>
                        {features.upiQr && (
                          <button type="button" onClick={() => setQrBill(r)} className="btn btn-primary btn-sm">
                            <IconQr /> UPI
                          </button>
                        )}
                      </>
                    )}
                    {r.paymentStatus === 'PAID' && <StatusBadge status="PAID" />}
                    {features.itemizedGstBilling && (
                      <Link href={`/app/bills/${r.id}/print`} aria-label="Print invoice" className="btn btn-ghost btn-icon btn-sm">
                        <IconPrinter />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {/* Payment split */}
          <section className="card card-pad">
            <h2 className="card-title">How patients paid</h2>
            {modeTotal === 0 ? (
              <p className="mt-2 text-[13px] text-muted">No payments yet.</p>
            ) : (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
                  {(['UPI', 'CASH', 'CARD', 'OTHER'] as const).map((m, i) =>
                    summary.byMode[m] > 0 ? (
                      <span
                        key={m}
                        style={{
                          width: `${(summary.byMode[m] / modeTotal) * 100}%`,
                          background: `color-mix(in oklab, var(--brand) ${100 - i * 28}%, var(--surface-3))`,
                        }}
                      />
                    ) : null
                  )}
                </div>
                <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
                  {(['UPI', 'CASH', 'CARD', 'OTHER'] as const)
                    .filter((m) => summary.byMode[m] > 0)
                    .map((m, i) => (
                      <li key={m} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: `color-mix(in oklab, var(--brand) ${100 - i * 28}%, var(--surface-3))` }}
                          />
                          {MODE_LABEL[m]}
                        </span>
                        <span className="font-medium tnum">{formatINR(summary.byMode[m])}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>

          {summary.byDoctor.length > 1 && (
            <section className="card overflow-hidden">
              <div className="card-header min-h-0 py-3">
                <h2 className="card-title">By doctor</h2>
              </div>
              <ul className="list">
                {summary.byDoctor.map((d) => (
                  <li key={d.doctorId} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.doctorName}</span>
                      <span className="text-[12px] text-muted">{d.billCount} bills</span>
                    </span>
                    <span className="text-right tnum">
                      <span className="block font-medium">{formatINR(d.collected)}</span>
                      {d.unpaid > 0 && <span className="text-[12px] text-warning">{formatINR(d.unpaid)} due</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {features.expensesTracker && (
            <section className="card overflow-hidden">
              <div className="card-header min-h-0 py-3">
                <h2 className="card-title">Expenses</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpOpen(true)}>
                  <IconPlus /> Add
                </button>
              </div>
              {expenses.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-muted">No expenses logged.</p>
              ) : (
                <ul className="list">
                  {expenses.map((ex) => (
                    <li key={ex.id} className="group flex items-center gap-3 px-5 py-3 text-[13px]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{ex.title}</span>
                        <span className="text-[12px] text-muted">
                          {EXPENSE_LABELS[ex.category]} · {MODE_LABEL[ex.paymentMode]}
                        </span>
                      </span>
                      <span className="font-medium tnum">{formatINR(ex.amount)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${ex.title}`}
                        onClick={() => void deleteExpense(ex)}
                        className="btn btn-ghost btn-icon btn-sm text-subtle hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <IconTrash />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>

      <NewBillDialog
        open={billOpen}
        onClose={() => setBillOpen(false)}
        user={user}
        doctorOptions={doctorOptions}
        gst={features.itemizedGstBilling}
        onSaved={async (msg) => {
          setBillOpen(false);
          toast(msg);
          await loadDay(today);
        }}
      />

      <Modal
        open={expOpen}
        onClose={() => setExpOpen(false)}
        title="Log expense"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setExpOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="expense-form" className="btn btn-primary">
              Save expense
            </button>
          </>
        }
      >
        {expOpen && (
          <ExpenseForm
            day={day}
            onSaved={async (title) => {
              setExpOpen(false);
              toast(`Expense “${title}” saved`);
              await loadDay(day);
            }}
          />
        )}
      </Modal>

      <UpiQrModal
        open={qrBill !== null}
        onClose={() => setQrBill(null)}
        upiId={user.clinic.upiId}
        clinicName={user.clinic.name}
        patientName={qrBill?.patient.name ?? ''}
        amount={qrBill?.netAmount ?? 0}
        invoiceNumber={qrBill?.invoiceNumber}
        onMarkPaid={qrBill ? () => void markPaid(qrBill, 'UPI') : undefined}
      />
    </div>
  );
}

function ExpenseForm({ day, onSaved }: { day: string; onSaved: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseItem['category']>('SUPPLIES');
  const [mode, setMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const r = await apiJson('/api/expenses', {
      body: { title, amount: Number.parseInt(amount || '0', 10), category, paymentMode: mode, day },
    });
    setSaving(false);
    if (!r.ok) return setError(r.error);
    await onSaved(title);
  }

  return (
    <form id="expense-form" onSubmit={submit} className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="alert alert-danger">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="ex-amt" className="label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted">₹</span>
          <input
            id="ex-amt"
            autoFocus
            data-autofocus
            inputMode="numeric"
            required
            className="input h-12 pl-7 text-[18px] font-semibold tnum"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ex-title" className="label">What for?</label>
        <input id="ex-title" required minLength={2} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gloves & cotton, electricity bill" />
      </div>
      <div className="field">
        <span className="label">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(EXPENSE_LABELS) as ExpenseItem['category'][]).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {EXPENSE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Paid by</span>
        <div className="seg seg-block" role="group" aria-label="Paid by">
          {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

function NewBillDialog({
  open,
  onClose,
  user,
  doctorOptions,
  gst,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
  doctorOptions: Array<{ id: string; name: string; consultationFee: number | null }>;
  gst: boolean;
  onSaved: (msg: string) => Promise<void>;
}) {
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const close = () => {
    setPatient(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={patient ? 'New bill' : 'New bill · choose patient'}
      size={patient ? 'lg' : 'md'}
      footer={
        patient ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPatient(null)}>
              Back
            </button>
            <button type="submit" form="bill-form" className="btn btn-primary">
              Save bill
            </button>
          </>
        ) : undefined
      }
    >
      {open &&
        (patient ? (
          <BillForm
            patient={patient}
            user={user}
            doctorOptions={doctorOptions}
            gst={gst}
            onChangePatient={() => setPatient(null)}
            onSaved={async (msg) => {
              setPatient(null);
              await onSaved(msg);
            }}
          />
        ) : (
          <PatientPicker onSelect={setPatient} />
        ))}
    </Modal>
  );
}

function BillForm({
  patient,
  user,
  doctorOptions,
  gst,
  onChangePatient,
  onSaved,
}: {
  patient: PatientListItem;
  user: SessionUser;
  doctorOptions: Array<{ id: string; name: string; consultationFee: number | null }>;
  gst: boolean;
  onChangePatient: () => void;
  onSaved: (msg: string) => Promise<void>;
}) {
  const initialDoc = doctorOptions.find((d) => d.id === user.id) ?? doctorOptions[0];
  const [doctorId, setDoctorId] = useState(initialDoc?.id ?? '');
  const [items, setItems] = useState<DraftLineItem[]>([
    {
      key: ++lineKey,
      label: 'Consultation',
      category: 'CONSULTATION',
      qty: 1,
      unitPrice: initialDoc?.consultationFee ?? user.clinic.defaultConsultFee,
    },
  ]);
  const [discount, setDiscount] = useState('');
  const [gstRate, setGstRate] = useState('0');
  const [status, setStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [mode, setMode] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sub = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const disc = Number.parseInt(discount || '0', 10) || 0;
  const taxable = Math.max(0, sub - disc);
  const gstAmt = gst ? Math.round((taxable * (Number.parseInt(gstRate, 10) || 0)) / 100) : 0;
  const total = taxable + gstAmt;

  const patch = (key: number, p: Partial<DraftLineItem>) => setItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const r = await apiJson('/api/billing', {
      body: {
        patientId: patient.id,
        doctorId,
        lineItems: items.filter((i) => i.label.trim()).map(({ label, category, qty, unitPrice }) => ({ label, category, qty, unitPrice })),
        discount: disc,
        gstRatePercent: gst ? Number.parseInt(gstRate, 10) || 0 : 0,
        paymentStatus: status,
        paymentMode: status === 'PAID' ? mode : null,
      },
    });
    setSaving(false);
    if (!r.ok) return setError(r.error);
    await onSaved(`${formatINR(total)} bill saved for ${patient.name}`);
  }

  return (
    <form id="bill-form" onSubmit={submit} className="flex flex-col gap-5">
      {error && (
        <div role="alert" className="alert alert-danger">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-[var(--r-control)] border border-line bg-surface-2 px-3 py-2">
          <Avatar name={patient.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">{patient.name}</p>
            <p className="truncate text-[12px] text-muted">{patient.patientCode}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onChangePatient}>
            Change
          </button>
        </div>
        {doctorOptions.length > 1 && (
          <select aria-label="Doctor" className="select h-auto sm:w-56" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctorOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-[var(--r-card)] border border-line">
        <div className="hidden grid-cols-[1fr_64px_100px_92px_32px] gap-2 border-b border-line bg-surface-2 px-3 py-2 text-[12px] font-medium text-muted sm:grid">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <ul>
          {items.map((it) => (
            <li key={it.key} className="grid grid-cols-[1fr_32px] gap-2 border-b border-line px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_64px_100px_92px_32px] sm:items-center">
              <input aria-label="Item" required className="input input-sm" value={it.label} onChange={(e) => patch(it.key, { label: e.target.value })} placeholder="Service or medicine" />
              <button
                type="button"
                aria-label="Remove item"
                disabled={items.length === 1}
                onClick={() => setItems((p) => p.filter((r) => r.key !== it.key))}
                className="btn btn-ghost btn-icon btn-sm sm:order-last"
              >
                <IconX />
              </button>
              <div className="col-span-2 grid grid-cols-[64px_1fr_auto] items-center gap-2 sm:col-span-3 sm:col-start-2 sm:row-start-1 sm:grid-cols-[64px_100px_92px]">
                <input aria-label="Quantity" inputMode="numeric" className="input input-sm text-center tnum" value={it.qty} onChange={(e) => patch(it.key, { qty: Math.max(1, Number.parseInt(e.target.value.replace(/\D/g, '') || '1', 10)) })} />
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">₹</span>
                  <input aria-label="Rate" inputMode="numeric" className="input input-sm pl-6 text-right tnum" value={it.unitPrice} onChange={(e) => patch(it.key, { unitPrice: Number.parseInt(e.target.value.replace(/\D/g, '') || '0', 10) })} />
                </div>
                <span className="text-right text-[13.5px] font-medium tnum">{formatINR(it.qty * it.unitPrice)}</span>
              </div>
            </li>
          ))}
        </ul>
        {gst && (
        <button
          type="button"
          onClick={() => setItems((p) => [...p, { key: ++lineKey, label: '', category: 'OTHER', qty: 1, unitPrice: 0 }])}
          className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-[13px] font-medium text-brand-ink hover:bg-brand-softer"
        >
          <IconPlus className="h-4 w-4" /> Add item
        </button>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="bi-disc" className="label">Discount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                <input id="bi-disc" inputMode="numeric" className="input pl-7 tnum" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </div>
            </div>
            {gst && (
              <div className="field">
                <label htmlFor="bi-gst" className="label">GST</label>
                <select id="bi-gst" className="select" value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                  {['0', '5', '12', '18'].map((g) => (
                    <option key={g} value={g}>
                      {g}%
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="field">
            <span className="label">Payment</span>
            <div className="seg seg-block" role="group" aria-label="Payment status">
              <button type="button" aria-pressed={status === 'PAID'} onClick={() => setStatus('PAID')}>Paid</button>
              <button type="button" aria-pressed={status === 'UNPAID'} onClick={() => setStatus('UNPAID')}>Due</button>
            </div>
            {status === 'PAID' && (
              <div className="seg seg-block mt-2" role="group" aria-label="Payment mode">
                {(['UPI', 'CASH', 'CARD'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <dl className="flex flex-col gap-2 self-start rounded-[var(--r-card)] bg-surface-2 p-4 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tnum">{formatINR(sub)}</dd>
          </div>
          {disc > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="tnum">−{formatINR(disc)}</dd>
            </div>
          )}
          {gstAmt > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">GST {gstRate}%</dt>
              <dd className="tnum">{formatINR(gstAmt)}</dd>
            </div>
          )}
          <div className="divider my-1" />
          <div className="flex items-baseline justify-between">
            <dt className="font-medium">Total</dt>
            <dd className="text-[22px] font-semibold tracking-[-0.02em] tnum">{formatINR(total)}</dd>
          </div>
        </dl>
      </div>
      {saving && <p className="text-[13px] text-muted">Saving…</p>}
    </form>
  );
}
