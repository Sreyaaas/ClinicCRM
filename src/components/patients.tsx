'use client';

import { useEffect, useRef, useState } from 'react';
import { IconAlert, IconChevronRight, IconSearch, IconUserPlus } from './Icons';
import { apiJson, Avatar, Modal, Spinner, useDebounced } from './ui';

export interface PatientListItem {
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
  visits: Array<{
    visitedAt: string;
    diagnosis: string | null;
    chiefComplaint: string | null;
  }>;
}

export interface CreatedPatient {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
}

/** True only when the allergy field names a real allergy (not "None", "Nil", "NKDA"…). */
export function hasAllergy(value: string | null | undefined): value is string {
  if (!value) return false;
  const v = value.trim().toLowerCase().replace(/[.\s]+/g, ' ');
  return !/^(none|nil|no|na|n\/a|nka|nkda|none known|no known( drug)? allerg(y|ies)|not known|-)$/.test(v);
}

export function patientMeta(p: { ageYears: number | null; gender: string | null; place?: string | null }) {
  const parts: string[] = [];
  if (p.ageYears !== null) parts.push(`${p.ageYears} yrs`);
  if (p.gender) parts.push(p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : 'Other');
  if (p.place) parts.push(p.place);
  return parts.join(' · ');
}

/* ───────────────────────── Patient search hook ───────────────────────── */

export function usePatientSearch(query: string, initial?: PatientListItem[]) {
  const debounced = useDebounced(query.trim(), 220);
  const [results, setResults] = useState<PatientListItem[]>(initial ?? []);
  const [loading, setLoading] = useState(false);
  const firstRun = useRef(Boolean(initial));

  useEffect(() => {
    if (firstRun.current && debounced === '') {
      firstRun.current = false;
      return;
    }
    firstRun.current = false;
    let active = true;
    setLoading(true);
    apiJson<{ patients: PatientListItem[] }>(`/api/patients?q=${encodeURIComponent(debounced)}`).then((r) => {
      if (!active) return;
      if (r.ok) setResults(r.data.patients);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  return { results, loading, setResults };
}

/* ───────────────────────── Picker ───────────────────────── */

export function PatientPicker({
  onSelect,
  onCreateNew,
  autoFocus = true,
  placeholder = 'Search by name, phone or patient ID',
}: {
  onSelect: (p: PatientListItem) => void;
  onCreateNew?: (query: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const { results, loading } = usePatientSearch(query);
  const [active, setActive] = useState(0);
  const list = results.slice(0, 8);

  return (
    <div className="flex flex-col gap-3">
      <div className="input-icon">
        <IconSearch />
        <input
          className="input"
          type="search"
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? '' : undefined}
          value={query}
          placeholder={placeholder}
          aria-label="Search patients"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, list.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && list[active]) {
              e.preventDefault();
              onSelect(list[active]);
            }
          }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle">
            <Spinner />
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-[var(--r-control)] border border-line">
        {list.length === 0 && !loading ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted">
            {query ? `No patient matches “${query}”.` : 'No patients yet.'}
          </p>
        ) : (
          <ul className="list max-h-[320px] overflow-y-auto">
            {list.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onSelect(p)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${
                    i === active ? 'bg-surface-2' : ''
                  }`}
                >
                  <Avatar name={p.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium">{p.name}</span>
                      {hasAllergy(p.allergies) && (
                        <span title={`Allergy: ${p.allergies}`} className="text-danger">
                          <IconAlert className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      <span className="tnum">{p.phone}</span>
                      {patientMeta(p) ? ` · ${patientMeta(p)}` : ''}
                    </span>
                  </span>
                  <span className="font-mono text-[11.5px] text-subtle">{p.patientCode}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {onCreateNew && (
          <button
            type="button"
            onClick={() => onCreateNew(query)}
            className="flex w-full items-center gap-3 border-t border-line px-3.5 py-3 text-left text-[13.5px] font-medium text-brand-ink hover:bg-brand-softer"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft">
              <IconUserPlus className="h-4 w-4" />
            </span>
            <span className="flex-1">{query ? `Add “${query}” as new patient` : 'Add new patient'}</span>
            <IconChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── New patient form ───────────────────────── */

export function NewPatientDialog({
  open,
  onClose,
  onCreated,
  initialQuery = '',
  submitLabel = 'Save patient',
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: CreatedPatient) => void | Promise<void>;
  initialQuery?: string;
  submitLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New patient"
      description="Phone and name are enough to get started."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="new-patient-form" className="btn btn-primary">
            {submitLabel}
          </button>
        </>
      }
    >
      {open && <NewPatientForm initialQuery={initialQuery} onCreated={onCreated} />}
    </Modal>
  );
}

function NewPatientForm({
  initialQuery,
  onCreated,
}: {
  initialQuery: string;
  onCreated: (p: CreatedPatient) => void | Promise<void>;
}) {
  const looksLikePhone = /^[+\d\s-]{5,}$/.test(initialQuery.trim());
  const [phone, setPhone] = useState(looksLikePhone ? initialQuery.trim() : '');
  const [name, setName] = useState(looksLikePhone ? '' : initialQuery.trim());
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [place, setPlace] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronic, setChronic] = useState('');
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const dupQuery = useDebounced(phoneDigits.length >= 6 ? phone.trim() : '', 300);
  const [familyRes, setFamilyRes] = useState<{ q: string; list: PatientListItem[] }>({ q: '', list: [] });
  const family = dupQuery && familyRes.q === dupQuery ? familyRes.list : [];

  useEffect(() => {
    if (!dupQuery) return;
    let active = true;
    apiJson<{ patients: PatientListItem[] }>(`/api/patients?q=${encodeURIComponent(dupQuery)}`).then((r) => {
      if (active && r.ok) setFamilyRes({ q: dupQuery, list: r.data.patients.filter((p) => p.phone === dupQuery) });
    });
    return () => {
      active = false;
    };
  }, [dupQuery]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const r = await apiJson<{ patient: CreatedPatient }>('/api/patients', {
      body: {
        name,
        phone,
        ageYears: age ? Number.parseInt(age, 10) : null,
        gender: gender || null,
        place: place || null,
        allergies: allergies || null,
        chronicConditions: chronic || null,
      },
    });
    if (!r.ok) {
      setError(r.error);
      setSaving(false);
      return;
    }
    await onCreated(r.data.patient);
    setSaving(false);
  }

  return (
    <form id="new-patient-form" onSubmit={submit} className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="alert alert-danger">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="np-phone" className="label">
            Mobile number
          </label>
          <input
            id="np-phone"
            className="input tnum"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            required
            autoFocus={!looksLikePhone}
            data-autofocus={!looksLikePhone ? '' : undefined}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98470 12345"
          />
        </div>
        <div className="field">
          <label htmlFor="np-name" className="label">
            Full name
          </label>
          <input
            id="np-name"
            className="input"
            required
            autoFocus={looksLikePhone}
            data-autofocus={looksLikePhone ? '' : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patient name"
          />
        </div>
      </div>

      {family.length > 0 && (
        <div className="alert alert-warning">
          <IconAlert />
          <div className="text-[13px]">
            <p className="font-medium">This number is already registered</p>
            <p className="mt-0.5 opacity-90">
              {family.map((m) => `${m.name} (${m.patientCode})`).join(', ')}. You can still add a family member.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[110px_1fr] gap-4">
        <div className="field">
          <label htmlFor="np-age" className="label">
            Age
          </label>
          <input
            id="np-age"
            className="input tnum"
            type="number"
            inputMode="numeric"
            min={0}
            max={130}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Years"
          />
        </div>
        <div className="field">
          <span className="label" id="np-gender-label">
            Gender
          </span>
          <div role="group" aria-labelledby="np-gender-label" className="seg seg-block">
            {(
              [
                ['FEMALE', 'Female'],
                ['MALE', 'Male'],
                ['OTHER', 'Other'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={gender === v}
                onClick={() => setGender(gender === v ? '' : v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="np-allergy" className="label">
          Drug allergies
        </label>
        <input
          id="np-allergy"
          className="input"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. Penicillin, Sulfa — leave blank if none"
        />
      </div>

      {more ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="np-place" className="label">
              Place
            </label>
            <input id="np-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="np-chronic" className="label">
              Chronic conditions
            </label>
            <input
              id="np-chronic"
              className="input"
              value={chronic}
              onChange={(e) => setChronic(e.target.value)}
              placeholder="e.g. Diabetes, Hypertension"
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="link self-start text-[13px]">
          + Add place & chronic conditions
        </button>
      )}

      {saving && (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner /> Saving…
        </p>
      )}
    </form>
  );
}
