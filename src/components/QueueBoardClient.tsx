'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconArrowLeft, IconExternal } from './Icons';

export interface BoardEntry {
  id: string;
  tokenNumber: number;
  status: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string | null;
}

function maskName(name: string): string {
  // Show first name + initial for privacy on a public screen
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function QueueBoardClient({
  clinicName,
  initialEntries,
  queueDay,
}: {
  clinicName: string;
  initialEntries: BoardEntry[];
  queueDay: string;
}) {
  const [entries, setEntries] = useState<BoardEntry[]>(initialEntries);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const clock = setInterval(() => setNow(new Date()), 30000);
    const timer = setInterval(async () => {
      const res = await fetch(`/api/queue?day=${encodeURIComponent(queueDay)}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      setEntries(
        data.entries.map(
          (q: {
            id: string;
            tokenNumber: number;
            status: string;
            patient: { name: string };
            doctor: { id: string; name: string; specialty: string | null };
          }) => ({
            id: q.id,
            tokenNumber: q.tokenNumber,
            status: q.status,
            patientName: q.patient.name,
            doctorId: q.doctor.id,
            doctorName: q.doctor.name,
            specialty: q.doctor.specialty,
          })
        )
      );
    }, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [queueDay]);

  const serving = entries.filter((e) => e.status === 'IN_CONSULTATION');
  const waiting = entries.filter((e) => e.status === 'WAITING');

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/app" className="btn btn-ghost btn-sm -ml-2.5">
          <IconArrowLeft /> Today
        </Link>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
        >
          <IconExternal /> Full screen
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] text-muted">Live queue</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] md:text-[36px]">{clinicName}</h1>
        </div>
        {now && (
          <p className="text-[28px] font-semibold text-muted tnum md:text-[36px]">
            {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(now)}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line bg-brand px-6 py-4 text-[var(--brand-contrast)]">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em]">Now seeing</h2>
          </div>
          {serving.length === 0 ? (
            <p className="px-6 py-16 text-center text-[18px] text-muted">Please wait — the doctor will call you shortly.</p>
          ) : (
            <ul className="list">
              {serving.map((e) => (
                <li key={e.id} className="flex items-center gap-6 px-6 py-6">
                  <span className="text-[64px] font-semibold leading-none tracking-[-0.04em] text-brand-ink tnum md:text-[84px]">
                    {e.tokenNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[24px] font-semibold md:text-[30px]">{maskName(e.patientName)}</p>
                    <p className="truncate text-[16px] text-muted md:text-[18px]">
                      {e.doctorName}
                      {e.specialty ? ` · ${e.specialty}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-muted">Up next</h2>
            <span className="text-[15px] font-semibold text-muted tnum">{waiting.length} waiting</span>
          </div>
          {waiting.length === 0 ? (
            <p className="px-6 py-16 text-center text-[16px] text-muted">No one waiting.</p>
          ) : (
            <ul className="list">
              {waiting.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center gap-4 px-6 py-4">
                  <span className="token h-12 w-12 text-[20px]">{e.tokenNumber}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-medium">{maskName(e.patientName)}</p>
                    <p className="truncate text-[14px] text-muted">{e.doctorName}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="text-center text-[12px] text-subtle">Updates automatically every 15 seconds</p>
    </div>
  );
}
