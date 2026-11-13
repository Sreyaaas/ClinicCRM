'use client';

import Link from 'next/link';

export interface PrintableVisitData {
  id: string;
  visitedAtText: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  followUpDateText: string | null;
  followUpReason: string | null;
  vitals: Record<string, string> | null;
  clinic: {
    name: string;
    phone: string | null;
    address: string | null;
    rxFooterNote: string | null;
    printPaperSize?: string;
    rxWatermark?: string | null;
  };
  doctor: {
    name: string;
    specialty: string | null;
    registrationNo: string | null;
  };
  patient: {
    id: string;
    patientCode: string;
    name: string;
    phone: string;
    ageYears: number | null;
    gender: string | null;
  };
  prescriptions: Array<{
    id: string;
    medicineName: string;
    dosage: string | null;
    timing: string | null;
    durationDays: number | null;
  }>;
}

export function PrintVisitClient({ data }: { data: PrintableVisitData }) {
  return (
    <div className="print-root mx-auto flex max-w-[820px] flex-col gap-5">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href={`/app/patients/${data.patient.id}`} className="btn btn-ghost btn-sm -ml-2.5">
          ← {data.patient.name}
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary">
          Print or save PDF
        </button>
      </div>

      <article
        data-print-size={data.clinic.printPaperSize || 'A4'}
        className="paper relative rounded-xl border border-line p-8 shadow-pop sm:p-10"
      >
        {data.clinic.rxWatermark && (
          <p
            aria-hidden="true"
            className="pointer-events-none select-none pb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300"
          >
            {data.clinic.rxWatermark}
          </p>
        )}
        {/* Letterhead Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-bold">{data.clinic.name}</h1>
            {data.clinic.address && <p className="text-xs text-slate-600">{data.clinic.address}</p>}
            {data.clinic.phone && <p className="text-xs text-slate-600">Tel: {data.clinic.phone}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold">{data.doctor.name}</p>
            {data.doctor.specialty && <p className="text-xs text-slate-600">{data.doctor.specialty}</p>}
            {data.doctor.registrationNo && (
              <p className="text-xs text-slate-600">Reg: {data.doctor.registrationNo}</p>
            )}
          </div>
        </header>

        {/* Patient & Date */}
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-3 text-sm">
          <div>
            <strong>Patient:</strong> {data.patient.name} ({data.patient.patientCode})
            {data.patient.ageYears !== null ? ` · ${data.patient.ageYears}y` : ''}
            {data.patient.gender ? ` ${data.patient.gender[0]}` : ''}
          </div>
          <div>
            <strong>Date:</strong> {data.visitedAtText}
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="mt-4 space-y-1.5 text-sm">
          {data.vitals && Object.keys(data.vitals).length > 0 && (
            <p className="text-xs text-slate-600">
              <strong>Vitals:</strong>{' '}
              {Object.entries(data.vitals)
                .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                .join(' · ')}
            </p>
          )}
          {data.chiefComplaint && (
            <p>
              <strong>Complaints:</strong> {data.chiefComplaint}
            </p>
          )}
          {data.diagnosis && (
            <p>
              <strong>Diagnosis:</strong> {data.diagnosis}
            </p>
          )}
        </div>

        {/* Rx Table */}
        <div className="mt-5">
          <p className="font-serif text-2xl font-semibold italic text-slate-800">℞</p>
          {data.prescriptions.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">No medications listed.</p>
          ) : (
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
              {data.prescriptions.map((rx) => (
                <li key={rx.id}>
                  <strong>{rx.medicineName}</strong>
                  {(rx.dosage || rx.timing || rx.durationDays) && (
                    <span className="text-slate-700">
                      {' '}
                      — {[rx.dosage, rx.timing, rx.durationDays ? `${rx.durationDays} days` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {data.clinicalNotes && (
          <div className="mt-5 text-sm">
            <strong>Advice / Notes:</strong>
            <p className="mt-0.5 whitespace-pre-line text-slate-700">{data.clinicalNotes}</p>
          </div>
        )}

        {data.followUpDateText && (
          <p className="mt-5 text-sm font-semibold">
            Next Review: {data.followUpDateText}
            {data.followUpReason ? ` (${data.followUpReason})` : ''}
          </p>
        )}

        {data.clinic.rxFooterNote && (
          <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500">
            {data.clinic.rxFooterNote}
          </footer>
        )}
      </article>
    </div>
  );
}
