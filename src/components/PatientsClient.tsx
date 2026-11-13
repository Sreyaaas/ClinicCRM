'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatIstDate } from '@/lib/date';
import type { PrescriptionOcrData } from '@/lib/gemini-ocr';
import { openNewPatient } from './AppShell';
import { IconAlert, IconChevronRight, IconPatients, IconSearch, IconSparkle, IconUserPlus } from './Icons';
import { hasAllergy, patientMeta, usePatientSearch, type PatientListItem } from './patients';
import { PrescriptionOcrModal } from './PrescriptionOcrModal';
import { apiJson, Avatar, EmptyState, PageHeader, Spinner, toast } from './ui';

export function PatientsClient({
  initialPatients,
  totalCount,
  maxPatients,
}: {
  initialPatients: PatientListItem[];
  totalCount: number;
  maxPatients: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const { results, loading } = usePatientSearch(query, initialPatients);

  async function handleOcr(data: PrescriptionOcrData) {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description={
          maxPatients !== null ? (
            <>
              <span className="tnum">{totalCount}</span> of {maxPatients} on your plan
            </>
          ) : (
            <>
              <span className="tnum">{totalCount.toLocaleString('en-IN')}</span> registered
            </>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="btn btn-secondary text-brand-ink"
              title="Scan paper prescription with AI"
            >
              <IconSparkle className="text-brand" />
              Scan Rx (AI)
            </button>
            <button type="button" onClick={openNewPatient} className="btn btn-primary">
              <IconUserPlus />
              New patient
            </button>
          </div>
        }
      />

      <div className="input-icon max-w-xl">
        <IconSearch />
        <input
          type="search"
          className="input h-11"
          placeholder="Search name, phone or patient ID"
          aria-label="Search patients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle">
            <Spinner />
          </span>
        )}
      </div>

      <section className="card overflow-hidden">
        {results.length === 0 ? (
          <EmptyState
            icon={<IconPatients />}
            title={query ? 'No matching patients' : 'No patients yet'}
            text={
              query
                ? 'Try a different spelling, or search by the last 4 digits of their phone.'
                : 'Register your first patient to start building their history.'
            }
            action={
              <button type="button" onClick={openNewPatient} className="btn btn-secondary">
                <IconUserPlus /> New patient
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Mobile</th>
                    <th>Last visit</th>
                    <th className="num">Visits</th>
                    <th className="num">Files</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {results.map((p) => {
                    const last = p.visits[0];
                    return (
                      <tr key={p.id} className="relative">
                        <td>
                          <Link href={`/app/patients/${p.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                            <Avatar name={p.name} size="sm" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-medium">{p.name}</span>
                                {hasAllergy(p.allergies) && (
                                  <span title={`Allergy: ${p.allergies}`} className="text-danger">
                                    <IconAlert className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-[12px] text-muted">
                                <span className="font-mono">{p.patientCode}</span>
                                {patientMeta(p) ? ` · ${patientMeta(p)}` : ''}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="tnum text-muted">{p.phone}</td>
                        <td className="max-w-[260px]">
                          {last ? (
                            <span className="block truncate">
                              <span className="text-muted">{formatIstDate(last.visitedAt)}</span>
                              {(last.diagnosis || last.chiefComplaint) && (
                                <span> · {last.diagnosis || last.chiefComplaint}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-subtle">No visits yet</span>
                          )}
                        </td>
                        <td className="num">{p._count.visits}</td>
                        <td className="num text-muted">{p._count.documents}</td>
                        <td className="w-10 text-subtle">
                          <IconChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="list md:hidden">
              {results.map((p) => {
                const last = p.visits[0];
                return (
                  <li key={p.id}>
                    <Link href={`/app/patients/${p.id}`} className="row row-link">
                      <Avatar name={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-medium">{p.name}</span>
                          {hasAllergy(p.allergies) && <IconAlert className="h-3.5 w-3.5 shrink-0 text-danger" />}
                        </span>
                        <span className="block truncate text-[13px] text-muted">
                          <span className="tnum">{p.phone}</span>
                          {patientMeta(p) ? ` · ${patientMeta(p)}` : ''}
                        </span>
                        {last && (
                          <span className="mt-0.5 block truncate text-[12px] text-subtle">
                            Last seen {formatIstDate(last.visitedAt)}
                            {last.diagnosis ? ` · ${last.diagnosis}` : ''}
                          </span>
                        )}
                      </span>
                      <IconChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {results.length >= 40 && (
              <p className="border-t border-line px-5 py-3 text-center text-[12.5px] text-muted">
                Showing the 40 most recent matches — search to find anyone else.
              </p>
            )}
          </>
        )}
      </section>

      <PrescriptionOcrModal
        open={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onApplyExtractedData={(data) => void handleOcr(data)}
      />
    </div>
  );
}
