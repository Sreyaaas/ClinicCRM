'use client';

import { useState } from 'react';
import { istDateBadge } from '@/lib/date';
import { IconChart, IconDownload } from './Icons';
import { apiJson, EmptyState, formatINR, PageHeader, toast } from './ui';

export interface AnalyticsPayload {
  rangeDays: number;
  kpis: {
    collectedRevenue: number;
    pendingDues: number;
    totalExpenses: number;
    netProfit: number;
    totalGst: number;
    visitCount: number;
    newPatientsCount: number;
    revisitRatePercent: number;
    ordersCount: number;
  };
  byMode: Record<string, number>;
  byDoctor: Array<{
    doctorId: string;
    doctorName: string;
    revenue: number;
    bills: number;
    visits: number;
  }>;
  dailySeries: Array<{ day: string; collected: number; visits: number }>;
  topDiagnoses: Array<{ name: string; count: number }>;
}

const MODE_LABEL: Record<string, string> = { UPI: 'UPI', CASH: 'Cash', CARD: 'Card', OTHER: 'Other' };

function shortDay(day: string) {
  const b = istDateBadge(`${day}T12:00:00+05:30`);
  return `${b.day} ${b.mon}`;
}

function niceMax(v: number): number {
  if (v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function AnalyticsClient({ initialData }: { initialData: AnalyticsPayload }) {
  const [data, setData] = useState<AnalyticsPayload>(initialData);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  async function switchRange(days: 7 | 30 | 90) {
    setLoading(true);
    const r = await apiJson<AnalyticsPayload>(`/api/analytics?days=${days}`);
    if (r.ok) setData(r.data);
    else toast(r.error, { tone: 'error' });
    setLoading(false);
  }

  const k = data.kpis;
  const series = data.dailySeries;
  const yMax = niceMax(Math.max(0, ...series.map((d) => d.collected)));
  const ticks = [0, 0.5, 1].map((t) => Math.round(yMax * t));
  const modeTotal = Object.values(data.byMode).reduce((s, v) => s + v, 0);
  const maxDoc = Math.max(1, ...data.byDoctor.map((d) => d.revenue));
  const maxDx = Math.max(1, ...data.topDiagnoses.map((d) => d.count));

  return (
    <div className={`flex flex-col gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <PageHeader
        title="Reports"
        description="Revenue, expenses and patient trends"
        actions={
          <>
            <div className="seg" role="tablist" aria-label="Date range">
              {([7, 30, 90] as const).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={data.rangeDays === d} disabled={loading} onClick={() => void switchRange(d)}>
                  {d} days
                </button>
              ))}
            </div>
            <a href={`/api/analytics?days=${data.rangeDays}&format=csv`} className="btn btn-secondary">
              <IconDownload />
              Export CSV
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat">
          <span className="stat-label">Collected</span>
          <span className="stat-value">{formatINR(k.collectedRevenue)}</span>
          <span className="stat-foot">{k.pendingDues > 0 ? `${formatINR(k.pendingDues)} still due` : 'No pending dues'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Net profit</span>
          <span className={`stat-value ${k.netProfit < 0 ? 'text-danger' : ''}`}>{formatINR(k.netProfit)}</span>
          <span className="stat-foot">After {formatINR(k.totalExpenses)} expenses</span>
        </div>
        <div className="stat">
          <span className="stat-label">Visits</span>
          <span className="stat-value">{k.visitCount.toLocaleString('en-IN')}</span>
          <span className="stat-foot">{k.newPatientsCount} new patients</span>
        </div>
        <div className="stat">
          <span className="stat-label">Returning patients</span>
          <span className="stat-value">{k.revisitRatePercent}%</span>
          <span className="stat-foot">{k.totalGst > 0 ? `GST collected ${formatINR(k.totalGst)}` : `${k.ordersCount} lab/pharmacy orders`}</span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Daily collections */}
        <section className="card card-pad">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="card-title">Daily collections</h2>
            <span className="text-[12px] text-muted">Recent active days</span>
          </div>
          {series.length === 0 ? (
            <EmptyState icon={<IconChart />} title="No collections in this period" />
          ) : (
            <div className="mt-5 grid grid-cols-[auto_1fr] gap-x-3">
              <div className="flex h-48 flex-col justify-between pb-0 text-right text-[11px] text-subtle tnum">
                {[...ticks].reverse().map((t) => (
                  <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-1/2">
                    {t >= 1000 ? `₹${Math.round(t / 1000)}k` : `₹${t}`}
                  </span>
                ))}
              </div>
              <div className="relative h-48">
                {[0, 0.5, 1].map((t) => (
                  <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${t * 100}%` }} />
                ))}
                <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
                  {series.map((pt, i) => {
                    const h = (pt.collected / yMax) * 100;
                    const active = hover === i;
                    return (
                      <button
                        key={pt.day}
                        type="button"
                        aria-label={`${shortDay(pt.day)}: ${formatINR(pt.collected)}, ${pt.visits} visits`}
                        onMouseEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        className="relative flex h-full flex-1 items-end justify-center"
                      >
                        <span
                          className="w-full max-w-[28px] rounded-t-[4px] transition-colors"
                          style={{
                            height: `${Math.max(pt.collected > 0 ? 2 : 0, h)}%`,
                            background: active ? 'var(--brand)' : 'color-mix(in oklab, var(--brand) 72%, var(--surface))',
                          }}
                        />
                        {active && (
                          <span
                            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-[12px] shadow-pop"
                            style={{ bottom: `calc(${Math.min(h, 80)}% + 8px)` }}
                          >
                            <span className="block text-muted">{shortDay(pt.day)}</span>
                            <span className="block font-semibold tnum">{formatINR(pt.collected)}</span>
                            <span className="block text-muted">{pt.visits} visits</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <span />
              <div className="mt-2 flex justify-between text-[11px] text-subtle">
                <span>{shortDay(series[0].day)}</span>
                {series.length > 2 && <span>{shortDay(series[Math.floor(series.length / 2)].day)}</span>}
                <span>{shortDay(series[series.length - 1].day)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Payment split */}
        <section className="card card-pad">
          <h2 className="card-title">Payment methods</h2>
          {modeTotal === 0 ? (
            <p className="mt-3 text-[13px] text-muted">No payments recorded.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {(['UPI', 'CASH', 'CARD', 'OTHER'] as const)
                .filter((m) => (data.byMode[m] ?? 0) > 0)
                .map((m) => {
                  const v = data.byMode[m] ?? 0;
                  const pct = Math.round((v / modeTotal) * 100);
                  return (
                    <li key={m}>
                      <div className="flex justify-between text-[13px]">
                        <span>{MODE_LABEL[m]}</span>
                        <span className="tnum">
                          <span className="font-medium">{formatINR(v)}</span>
                          <span className="ml-1.5 text-muted">{pct}%</span>
                        </span>
                      </div>
                      <div className="mini-bar mt-1.5">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">By doctor</h2>
          </div>
          {data.byDoctor.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No billing in this period.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th className="num">Visits</th>
                    <th className="num">Bills</th>
                    <th className="num">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDoctor.map((d) => (
                    <tr key={d.doctorId}>
                      <td>
                        <span className="block font-medium">{d.doctorName}</span>
                        <span className="mini-bar mt-1.5 block max-w-[160px]">
                          <span style={{ width: `${(d.revenue / maxDoc) * 100}%` }} />
                        </span>
                      </td>
                      <td className="num">{d.visits}</td>
                      <td className="num">{d.bills}</td>
                      <td className="num font-medium">{formatINR(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">Top diagnoses</h2>
          </div>
          {data.topDiagnoses.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No diagnoses recorded.</p>
          ) : (
            <ul className="flex flex-col gap-3.5 px-5 py-4">
              {data.topDiagnoses.map((dx) => (
                <li key={dx.name}>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate">{dx.name}</span>
                    <span className="font-medium tnum">{dx.count}</span>
                  </div>
                  <div className="mini-bar mt-1.5">
                    <span style={{ width: `${(dx.count / maxDx) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
