import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PrintTriggerButton } from '@/components/PrintTriggerButton';
import { requireSessionUser } from '@/lib/auth';
import { formatIstDateTime } from '@/lib/date';
import { prisma } from '@/lib/prisma';

async function BillPrintLoader({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const { id } = await params;

  const bill = await prisma.billingRecord.findFirst({
    where: { id, clinicId: user.clinicId },
    include: {
      patient: true,
      doctor: { select: { name: true, specialty: true, registrationNo: true } },
    },
  });

  if (!bill) notFound();

  const items = Array.isArray(bill.lineItems)
    ? (bill.lineItems as Array<{ label: string; category?: string; qty: number; unitPrice: number; total: number }>)
    : [
        {
          label: 'OPD Consultation',
          category: 'CONSULTATION',
          qty: 1,
          unitPrice: bill.amount,
          total: bill.amount,
        },
      ];

  return (
    <div className="print-root mx-auto max-w-[820px] space-y-5">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/app/billing" className="btn btn-ghost btn-sm -ml-2.5">
          ← Billing
        </Link>
        <PrintTriggerButton label="Print invoice" />
      </div>

      <article
        data-print-size={user.clinic.printPaperSize || 'A4'}
        className="paper rounded-xl border border-line p-8 shadow-pop sm:p-10"
      >
        {user.clinic.rxWatermark && (
          <p
            aria-hidden="true"
            className="pb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300"
          >
            {user.clinic.rxWatermark}
          </p>
        )}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-semibold">{user.clinic.name}</h1>
            {user.clinic.address && <p className="text-xs text-slate-600">{user.clinic.address}</p>}
            {user.clinic.phone && <p className="text-xs text-slate-600">Tel: {user.clinic.phone}</p>}
            {user.clinic.gstin && (
              <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                GSTIN: {user.clinic.gstin}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax Invoice</p>
            <p className="font-mono text-base font-semibold">{bill.invoiceNumber ?? 'RECEIPT'}</p>
            <p className="text-xs text-slate-600">{formatIstDateTime(bill.createdAt)}</p>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-3 text-sm">
          <div>
            <p>
              <strong>Patient:</strong> {bill.patient.name} ({bill.patient.patientCode})
            </p>
            <p className="text-xs text-slate-600">{bill.patient.phone}</p>
          </div>
          <div className="text-right">
            <p>
              <strong>Doctor:</strong> {bill.doctor.name}
            </p>
            <p className="text-xs text-slate-600">
              Status: {bill.paymentStatus} {bill.paymentMode ? `(${bill.paymentMode})` : ''}
            </p>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-600">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="py-2 font-medium">{item.label}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">₹{item.unitPrice}</td>
                <td className="py-2 text-right font-semibold">₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-slate-300 pt-3 text-right text-sm">
          <p>Subtotal: ₹{bill.amount}</p>
          {bill.discount > 0 && <p>Discount: -₹{bill.discount}</p>}
          {bill.gstAmount > 0 && (
            <p>
              GST ({bill.gstRatePercent}%): ₹{bill.gstAmount}
            </p>
          )}
          <p className="text-lg font-semibold">Grand Total: ₹{bill.netAmount}</p>
        </div>
      </article>
    </div>
  );
}

export const metadata: Metadata = { title: 'Invoice' };

export default function PrintBillPage(props: PageProps<'/app/bills/[id]/print'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BillPrintLoader params={props.params} />
    </Suspense>
  );
}
