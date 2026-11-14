'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { IconAlert, IconCheck, IconCopy } from './Icons';
import { formatINR, Modal, toast } from './ui';

export function UpiQrModal({
  open,
  onClose,
  upiId,
  clinicName,
  patientName,
  amount,
  invoiceNumber,
  onMarkPaid,
}: {
  open: boolean;
  onClose: () => void;
  upiId: string | null;
  clinicName: string;
  patientName: string;
  amount: number;
  invoiceNumber?: string | null;
  onMarkPaid?: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const effectiveUpi = upiId?.trim() || 'clinic@upi';
  const note = invoiceNumber ? `${invoiceNumber} ${patientName}` : `Consult ${patientName}`;
  const upiUri = `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
    clinicName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note.slice(0, 40))}`;

  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(upiUri, { width: 480, margin: 1, color: { dark: '#111111', light: '#ffffff' } })
      .then((url) => active && setQrDataUrl(url))
      .catch(() => active && setQrDataUrl(''));
    return () => {
      active = false;
    };
  }, [open, upiUri]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Collect via UPI"
      description={`${patientName}${invoiceNumber ? ` · ${invoiceNumber}` : ''}`}
      size="sm"
      footer={
        <>
          <a href={upiUri} className="btn btn-secondary sm:hidden">
            Open UPI app
          </a>
          {onMarkPaid && (
            <button type="button" onClick={onMarkPaid} className="btn btn-primary">
              <IconCheck />
              Mark as paid
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[34px] font-semibold tracking-[-0.03em] tnum">{formatINR(amount)}</p>

        <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`UPI QR code for ${formatINR(amount)} to ${effectiveUpi}`}
              width={220}
              height={220}
              className="block h-[220px] w-[220px]"
            />
          ) : (
            <div className="skeleton h-[220px] w-[220px]" />
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(effectiveUpi);
              toast('UPI ID copied');
            } catch {
              // ignore
            }
          }}
          className="inline-flex items-center gap-1.5 font-mono text-[13px] text-muted hover:text-fg"
        >
          {effectiveUpi}
          <IconCopy className="h-3.5 w-3.5" />
        </button>

        <p className="text-[12.5px] text-muted">Scan with GPay, PhonePe, Paytm or any UPI app.</p>

        <div className="alert alert-warning w-full text-left">
          <IconAlert />
          <span className="text-[12.5px]">
            <strong>In development:</strong> Automatic UPI payment reconciliation is coming soon. Please verify receipt on your phone and click &quot;Mark as paid&quot;.
          </span>
        </div>
      </div>
    </Modal>
  );
}
