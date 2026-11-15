'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatIstDate } from '@/lib/date';
import type { PrescriptionOcrData } from '@/lib/gemini-ocr';
import { openNewPatient } from './AppShell';
import { IconAlert, IconChevronRight, IconEdit, IconPatients, IconSearch, IconSparkle, IconTrash, IconUserPlus } from './Icons';
import { hasAllergy, patientMeta, usePatientSearch, type PatientListItem } from './patients';
import { PrescriptionOcrModal } from './PrescriptionOcrModal';
import { apiJson, Avatar, EmptyState, Modal, PageHeader, Spinner, toast } from './ui';

export function PatientsClient({
  initialPatients,
  totalCount,
  maxPatients,
  isOwner = false,
}: {
  initialPatients: PatientListItem[];
  totalCount: number;
  maxPatients: number | null;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientListItem | null>(null);
  const [editTarget, setEditTarget] = useState<PatientListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { results, loading, setResults } = usePatientSearch(query, initialPatients);

  async function handleDeletePatient() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await apiJson(`/api/patients/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!r.ok) {
      toast(r.error, { tone: 'error' });
      return;
    }
    toast(`Patient ${deleteTarget.name} deleted.`);
    const deletedId = deleteTarget.id;
    setDeleteTarget(null);
    setResults((prev) => prev.filter((p) => p.id !== deletedId));
    router.refresh();
  }

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
              className="btn btn-secondary text-brand-ink gap-1.5"
              title="Scan paper prescription with AI (Beta USP)"
            >
              <IconSparkle className="text-brand" />
              <span>Scan Rx (AI)</span>
              <span className="badge badge-warning text-[10px] px-1 py-0 font-medium">Beta</span>
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
                    {isOwner && <th className="text-right">Actions</th>}
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
                        {isOwner && (
                          <td className="relative z-10 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditTarget(p);
                                }}
                                className="btn btn-ghost btn-sm btn-icon text-muted hover:text-fg"
                                title={`Edit ${p.name}`}
                                aria-label={`Edit ${p.name}`}
                              >
                                <IconEdit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteTarget(p);
                                }}
                                className="btn btn-ghost btn-sm btn-icon text-muted hover:text-danger"
                                title={`Delete ${p.name}`}
                                aria-label={`Delete ${p.name}`}
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
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
                  <li key={p.id} className="relative">
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
                    {isOwner && (
                      <div className="relative z-10 flex justify-end gap-2 border-t border-line/60 px-4 py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditTarget(p);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          <IconEdit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTarget(p);
                          }}
                          className="btn btn-secondary btn-sm text-danger"
                        >
                          <IconTrash className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
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

      {/* Delete Patient Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : 'Delete Patient'}
        description="This will permanently delete this patient and all associated consultations, prescriptions, reports, and bills. This cannot be undone."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDeletePatient()}
              className="btn btn-danger"
            >
              {deleting ? 'Deleting…' : 'Delete patient'}
            </button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="rounded-[var(--r-control)] border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
            <strong>Warning:</strong> Deleting <span className="font-mono">{deleteTarget.patientCode}</span> ({deleteTarget.name}) cannot be reversed.
          </div>
        )}
      </Modal>

      {/* Edit Patient Modal */}
      {editTarget && (
        <EditPatientListModal
          patient={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setResults((prev) =>
              prev.map((item) => (item.id === editTarget.id ? { ...item, ...updated } : item))
            );
            setEditTarget(null);
            toast('Patient details updated.');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditPatientListModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientListItem;
  onClose: () => void;
  onSaved: (updated: Partial<PatientListItem>) => void;
}) {
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [age, setAge] = useState(patient.ageYears !== null ? String(patient.ageYears) : '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(patient.gender as 'MALE' | 'FEMALE' | 'OTHER' | null);
  const [place, setPlace] = useState(patient.place ?? '');
  const [allergies, setAllergies] = useState(patient.allergies ?? '');
  const [chronic, setChronic] = useState(patient.chronicConditions ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      phone: phone.trim(),
      ageYears: age ? Number.parseInt(age, 10) : null,
      gender,
      place: place.trim() || null,
      allergies: allergies.trim() || null,
      chronicConditions: chronic.trim() || null,
    };
    const r = await apiJson<{ patient: { id: string } }>(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      body,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onSaved(body);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${patient.name}`}
      description={`Patient ID: ${patient.patientCode}`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" disabled={saving} className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="edit-patient-list-form" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form id="edit-patient-list-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="edit-p-name">Full name</label>
            <input
              id="edit-p-name"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-p-phone">Mobile number</label>
            <input
              id="edit-p-phone"
              required
              type="tel"
              className="input tnum"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="field">
            <label className="label" htmlFor="edit-p-age">Age (years)</label>
            <input
              id="edit-p-age"
              type="number"
              min={0}
              max={130}
              className="input tnum"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-p-gender">Gender</label>
            <select
              id="edit-p-gender"
              className="select"
              value={gender ?? ''}
              onChange={(e) => setGender((e.target.value as 'MALE' | 'FEMALE' | 'OTHER') || null)}
            >
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-p-place">Place / Locality</label>
            <input
              id="edit-p-place"
              className="input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="edit-p-allergies">Known allergies</label>
          <input
            id="edit-p-allergies"
            className="input"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Sulfa, NSAIDs"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="edit-p-chronic">Chronic conditions</label>
          <input
            id="edit-p-chronic"
            className="input"
            value={chronic}
            onChange={(e) => setChronic(e.target.value)}
            placeholder="e.g. Type 2 Diabetes, HTN, Asthma"
          />
        </div>
      </form>
    </Modal>
  );
}
