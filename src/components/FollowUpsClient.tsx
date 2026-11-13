'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconCheck, IconFollowUp, IconMessage, IconPhone } from './Icons';
import { apiJson, Avatar, EmptyState, PageHeader, StatusBadge, toast } from './ui';

export interface FollowUpItem {
  id: string;
  followUpDate: string | null;
  followUpDateText: string;
  followUpReason: string | null;
  followUpStatus: 'PENDING' | 'REMINDED' | 'COMPLETED' | 'MISSED';
  diagnosis: string | null;
  patient: {
    id: string;
    patientCode: string;
    name: string;
    phone: string;
    place: string | null;
  };
  doctor: { id: string; name: string };
  whatsappEn: string;
  whatsappMl: string;
}

type Filter = 'due' | 'today' | 'overdue' | 'upcoming' | 'all';

const FILTERS: Array<[Filter, string]> = [
  ['due', 'Due now'],
  ['today', 'Today'],
  ['overdue', 'Overdue'],
  ['upcoming', 'Upcoming'],
  ['all', 'All'],
];

function istDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso)
  );
}

function relativeDue(iso: string | null, today: string): { text: string; tone: 'danger' | 'warning' | 'muted' } {
  if (!iso) return { text: 'No date', tone: 'muted' };
  const d = istDay(iso);
  const diff = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (diff === 0) return { text: 'Due today', tone: 'warning' };
  if (diff === 1) return { text: 'Tomorrow', tone: 'muted' };
  if (diff > 1) return { text: `In ${diff} days`, tone: 'muted' };
  if (diff === -1) return { text: 'Overdue · 1 day', tone: 'danger' };
  return { text: `Overdue · ${-diff} days`, tone: 'danger' };
}

export function FollowUpsClient({ initialItems, todayStr }: { initialItems: FollowUpItem[]; todayStr: string }) {
  const [filter, setFilter] = useState<Filter>('due');
  const [items, setItems] = useState<FollowUpItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  async function load(next: Filter) {
    setFilter(next);
    setLoading(true);
    const r = await apiJson<{ items: FollowUpItem[] }>(`/api/followups?filter=${next}`);
    if (r.ok) setItems(r.data.items);
    else toast(r.error, { tone: 'error' });
    setLoading(false);
  }

  async function setStatus(item: FollowUpItem, status: FollowUpItem['followUpStatus'], quiet = false) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, followUpStatus: status } : i)));
    const r = await apiJson(`/api/visits/${item.id}`, { method: 'PATCH', body: { followUpStatus: status } });
    if (!r.ok) {
      toast(r.error, { tone: 'error' });
      return load(filter);
    }
    if (status === 'COMPLETED') {
      toast(`${item.patient.name} marked as followed up`);
      if (filter !== 'all') setItems((prev) => prev.filter((i) => i.id !== item.id));
    } else if (!quiet) {
      void load(filter);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Follow-ups"
        description="Remind patients on WhatsApp when they're due back — one tap, in English or Malayalam."
      />

      <div className="scroll-x -mx-4 px-4 md:mx-0 md:px-0">
        <div className="seg" role="tablist" aria-label="Follow-up filter">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => void load(k)}>
              {l}
              {k === filter && !loading && <span className="text-subtle tnum">{items.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconFollowUp />}
            title={filter === 'due' ? 'All caught up' : 'Nothing here'}
            text={
              filter === 'due'
                ? 'No patients are due for a follow-up right now. Set a follow-up date while writing a prescription.'
                : 'No follow-ups match this filter.'
            }
          />
        ) : (
          <ul className="list">
            {items.map((item) => {
              const due = relativeDue(item.followUpDate, todayStr);
              const done = item.followUpStatus === 'COMPLETED';
              return (
                <li key={item.id} className={`row flex-wrap items-start gap-y-3 sm:items-center ${done ? 'opacity-60' : ''}`}>
                  <Avatar name={item.patient.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/app/patients/${item.patient.id}`} className="text-[14.5px] font-medium hover:underline">
                        {item.patient.name}
                      </Link>
                      {item.followUpStatus !== 'PENDING' && <StatusBadge status={item.followUpStatus} />}
                    </div>
                    <p className="mt-0.5 text-[12.5px]">
                      <span
                        className={
                          due.tone === 'danger' ? 'font-medium text-danger' : due.tone === 'warning' ? 'font-medium text-warning' : 'text-muted'
                        }
                      >
                        {due.text}
                      </span>
                      <span className="text-muted"> · {item.followUpDateText}</span>
                    </p>
                    <p className="truncate text-[12.5px] text-muted">
                      {[item.followUpReason || item.diagnosis, item.doctor.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex w-full items-center gap-1.5 pl-12 sm:w-auto sm:pl-0">
                    <a href={`tel:${item.patient.phone}`} aria-label={`Call ${item.patient.name}`} className="btn btn-secondary btn-icon btn-sm">
                      <IconPhone />
                    </a>
                    <a
                      href={item.whatsappEn}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void setStatus(item, 'REMINDED', true)}
                      className="btn btn-soft btn-sm max-sm:flex-1"
                    >
                      <IconMessage /> Remind
                    </a>
                    <a
                      href={item.whatsappMl}
                      target="_blank"
                      rel="noreferrer"
                      title="Send reminder in Malayalam"
                      onClick={() => void setStatus(item, 'REMINDED', true)}
                      className="btn btn-secondary btn-sm"
                      lang="ml"
                    >
                      മല
                    </a>
                    {!done && (
                      <button type="button" onClick={() => void setStatus(item, 'COMPLETED')} className="btn btn-secondary btn-sm" title="Mark done">
                        <IconCheck />
                        <span className="max-sm:hidden">Done</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
