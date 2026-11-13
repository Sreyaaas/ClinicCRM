'use client';

import Link from 'next/link';
import { useState } from 'react';

export function PrintCertificateClient({
  data,
}: {
  data: {
    clinicName: string;
    clinicAddress: string | null;
    clinicPhone: string | null;
    doctorName: string;
    doctorSpecialty: string | null;
    doctorRegNo: string | null;
    patientId: string;
    patientName: string;
    patientCode: string;
    patientAge: number | null;
    patientGender: string | null;
    visitedAtText: string;
    diagnosis: string | null;
  };
}) {
  const [certType, setCertType] = useState<'FITNESS' | 'SICK_LEAVE' | 'REFERRAL'>('FITNESS');
  const [daysOff, setDaysOff] = useState('3');
  const [referralTo, setReferralTo] = useState('Specialist / Higher Centre');
  const [customNote, setCustomNote] = useState('');

  return (
    <div className="print-root mx-auto flex max-w-[820px] flex-col gap-5">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href={`/app/patients/${data.patientId}`} className="btn btn-ghost btn-sm -ml-2.5">
          ← {data.patientName}
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary">
          Print or save PDF
        </button>
      </div>

      <div className="no-print card flex flex-col gap-4 p-5">
        <div className="seg seg-block" role="group" aria-label="Certificate type">
          {(
            [
              ['FITNESS', 'Fitness'],
              ['SICK_LEAVE', 'Medical leave'],
              ['REFERRAL', 'Referral'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={certType === v} onClick={() => setCertType(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        {certType === 'SICK_LEAVE' && (
          <div className="field">
            <label htmlFor="c-days" className="label">
              Recommended Rest Days
            </label>
            <input
              id="c-days"
              type="number"
              min={1}
              value={daysOff}
              onChange={(e) => setDaysOff(e.target.value)}
              className="input"
            />
          </div>
        )}
        {certType === 'REFERRAL' && (
          <div className="field">
            <label htmlFor="c-ref" className="label">
              Referred To
            </label>
            <input
              id="c-ref"
              value={referralTo}
              onChange={(e) => setReferralTo(e.target.value)}
              className="input"
            />
          </div>
        )}
        <div className="field sm:col-span-2">
          <label htmlFor="c-note" className="label">
            Additional Clinical Remarks (Optional)
          </label>
          <input
            id="c-note"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Optional remarks printed on certificate..."
            className="input"
          />
        </div>
        </div>
      </div>

      <article className="paper rounded-xl border border-line p-8 shadow-pop sm:p-12">
        <header className="flex flex-wrap justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-semibold">{data.clinicName}</h1>
            {data.clinicAddress && <p className="text-xs text-slate-600">{data.clinicAddress}</p>}
            {data.clinicPhone && <p className="text-xs text-slate-600">Tel: {data.clinicPhone}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold">{data.doctorName}</p>
            {data.doctorSpecialty && <p className="text-xs text-slate-600">{data.doctorSpecialty}</p>}
            {data.doctorRegNo && <p className="text-xs text-slate-600">Reg: {data.doctorRegNo}</p>}
          </div>
        </header>

        <h2 className="mt-6 text-center text-lg font-semibold uppercase tracking-wide underline underline-offset-4">
          {certType === 'FITNESS'
            ? 'Medical Fitness Certificate'
            : certType === 'SICK_LEAVE'
              ? 'Medical Leave Certificate'
              : 'Specialist Referral Letter'}
        </h2>

        <p className="mt-4 text-right text-xs text-slate-600">Date: {data.visitedAtText}</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <p>
            This is to certify that{' '}
            <strong>
              {data.patientName} ({data.patientCode}
              {data.patientAge !== null ? `, ${data.patientAge}y` : ''}
              {data.patientGender ? ` ${data.patientGender}` : ''})
            </strong>{' '}
            was examined at {data.clinicName} on {data.visitedAtText}.
          </p>

          {data.diagnosis && (
            <p>
              <strong>Clinical Finding / Diagnosis:</strong> {data.diagnosis}
            </p>
          )}

          {certType === 'FITNESS' && (
            <p>
              On clinical examination today, the patient is found medically fit to resume regular duties and daily activities.
            </p>
          )}

          {certType === 'SICK_LEAVE' && (
            <p>
              The patient is advised medical rest for <strong>{daysOff || '3'} day(s)</strong> starting from {data.visitedAtText} for complete recovery.
            </p>
          )}

          {certType === 'REFERRAL' && (
            <p>
              Kindly evaluate the patient further at <strong>{referralTo}</strong> for specialist opinion and management.
            </p>
          )}

          {customNote && <p>{customNote}</p>}
        </div>

        <footer className="mt-14 flex justify-end">
          <div className="text-right text-sm">
            <div className="mb-1 h-10 w-44 border-b border-slate-400" />
            <p className="font-bold">{data.doctorName}</p>
            {data.doctorRegNo && <p className="text-xs text-slate-600">Reg: {data.doctorRegNo}</p>}
          </div>
        </footer>
      </article>
    </div>
  );
}
