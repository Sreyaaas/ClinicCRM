'use client';

import { useState } from 'react';
import { formatClockTime, formatIstLongDay } from '@/lib/date';
import { IconAlert, IconCalendar, IconCheck, IconClock, IconPhone } from './Icons';
import { Avatar } from './ui';

function addDays(day: string, n: number): string {
  const dt = new Date(`${day}T12:00:00.000+05:30`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function fmtTime(t: string) {
  return formatClockTime(t);
}

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

export function PublicBookingClient({
  clinic,
  doctors,
  todayIst,
}: {
  clinic: {
    slug: string;
    name: string;
    phone: string | null;
    address: string | null;
    workingHours: string;
    slotDurationMin: number;
    brandColor: string;
  };
  doctors: Array<{ id: string; name: string; specialty: string | null; consultationFee: number | null }>;
  todayIst: string;
}) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '');
  const [day, setDay] = useState(todayIst);
  const [time, setTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ patientCode: string; doctorName: string; day: string; time: string } | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(todayIst, i));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!time) {
      setError('Please pick a time.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicSlug: clinic.slug,
          doctorId,
          patientName,
          phone,
          ageYears: age ? Number.parseInt(age, 10) : null,
          day,
          time,
          reason: reason || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not confirm the booking. Please call the clinic.');
        return;
      }
      setConfirmed({ patientCode: data.booking.patientCode, doctorName: data.booking.doctorName, day, time });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const dayLabel = (d: string) => formatIstLongDay(d);

  return (
    <div style={{ '--brand': clinic.brandColor } as React.CSSProperties} className="brand-scope min-h-dvh">
      <div className="h-1.5 bg-brand" />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-8">
        <header className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-[20px] font-semibold text-white">
            {clinic.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{clinic.name}</h1>
            {clinic.address && <p className="mt-0.5 text-[13.5px] text-muted">{clinic.address}</p>}
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="flex items-center gap-1.5">
                <IconClock className="h-3.5 w-3.5" /> {clinic.workingHours}
              </span>
              {clinic.phone && (
                <a href={`tel:${clinic.phone}`} className="flex items-center gap-1.5 hover:text-fg">
                  <IconPhone className="h-3.5 w-3.5" /> {clinic.phone}
                </a>
              )}
            </p>
          </div>
        </header>

        {confirmed ? (
          <section className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
              <IconCheck className="h-7 w-7" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-[20px] font-semibold">You’re booked</h2>
              <p className="mt-1 text-[14px] text-muted">Please arrive 10 minutes early.</p>
            </div>
            <dl className="w-full divide-y divide-[var(--line)] rounded-[var(--r-control)] border border-line text-left text-[14px]">
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted">Doctor</dt>
                <dd className="font-medium">{confirmed.doctorName}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted">When</dt>
                <dd className="text-right font-medium">
                  {dayLabel(confirmed.day)}, {fmtTime(confirmed.time)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted">Patient ID</dt>
                <dd className="font-mono font-medium">{confirmed.patientCode}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                setConfirmed(null);
                setPatientName('');
                setReason('');
                setTime('');
              }}
              className="btn btn-secondary"
            >
              Book another visit
            </button>
          </section>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            {error && (
              <div role="alert" className="alert alert-danger">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            {doctors.length > 1 && (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-[14px] font-semibold">Doctor</h2>
                <div className="card list overflow-hidden">
                  {doctors.map((d) => (
                    <label key={d.id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${doctorId === d.id ? 'bg-brand-softer' : 'hover:bg-surface-2'}`}>
                      <input type="radio" name="doctor" className="sr-only" checked={doctorId === d.id} onChange={() => setDoctorId(d.id)} />
                      <Avatar name={d.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{d.name}</span>
                        {d.specialty && <span className="block text-[12.5px] text-muted">{d.specialty}</span>}
                      </span>
                      {d.consultationFee !== null && <span className="text-[13px] text-muted tnum">₹{d.consultationFee}</span>}
                      <span className={`h-4 w-4 rounded-full border ${doctorId === d.id ? 'border-[5px] border-brand' : 'border-line-strong'}`} />
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-2.5">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                <IconCalendar className="h-4 w-4 text-muted" /> Date
              </h2>
              <div className="scroll-x -mx-5 flex gap-2 px-5">
                {days.map((d) => {
                  const dt = new Date(`${d}T12:00:00+05:30`);
                  const sel = d === day;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => setDay(d)}
                      className={`flex w-[60px] shrink-0 flex-col items-center rounded-[var(--r-control)] border py-2.5 transition-colors ${
                        sel ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <span className={`text-[11.5px] ${sel ? 'text-white/80' : 'text-muted'}`}>
                        {d === todayIst ? 'Today' : formatIstLongDay(d).slice(0, 3)}
                      </span>
                      <span className="text-[18px] font-semibold tnum">{dt.getUTCDate()}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                <IconClock className="h-4 w-4 text-muted" /> Time
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {TIME_SLOTS.map((t) => (
                  <button key={t} type="button" className="chip h-10 justify-center tnum" aria-pressed={time === t} onClick={() => setTime(t)}>
                    {fmtTime(t)}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-muted">The clinic will confirm your exact time if needed.</p>
            </section>

            <section className="card flex flex-col gap-4 p-5">
              <h2 className="text-[14px] font-semibold">Patient details</h2>
              <div className="field">
                <label htmlFor="bk-name" className="label">Full name</label>
                <input id="bk-name" required autoComplete="name" className="input h-11" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <div className="field">
                  <label htmlFor="bk-phone" className="label">WhatsApp number</label>
                  <input id="bk-phone" type="tel" inputMode="tel" autoComplete="tel" required className="input h-11 tnum" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="bk-age" className="label">Age</label>
                  <input id="bk-age" inputMode="numeric" className="input h-11 tnum" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="bk-reason" className="label">
                  Reason <span className="font-normal text-muted">(optional)</span>
                </label>
                <input id="bk-reason" className="input h-11" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever, BP check" />
              </div>
            </section>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full">
              {submitting ? 'Booking…' : time ? `Book for ${fmtTime(time)}` : 'Book appointment'}
            </button>
            <p className="text-center text-[12px] text-subtle">Pay at the clinic. No online payment needed.</p>
          </form>
        )}
      </main>
    </div>
  );
}
