'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface TourStop {
  time: string;
  period: string;
  title: string;
  text: string;
  screen: ReactNode;
}

const DURATION = 6000;

/** Interactive walk through a clinic day — auto-advances, pauses on hover, click any time to jump. */
export function DayTour({ stops }: { stops: TourStop[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Only start the clock once the section is on screen
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % stops.length), DURATION);
    return () => clearTimeout(t);
  }, [active, paused, seen, stops.length]);

  const stop = stops[active];

  return (
    <div
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14"
    >
      {/* Times */}
      <ol className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:gap-0 lg:overflow-visible">
        {stops.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.time} className="shrink-0 lg:border-t lg:border-line lg:last:border-b">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={on ? 'step' : undefined}
                className={`w-full rounded-2xl px-4 py-3 text-left transition-colors lg:rounded-none lg:px-0 lg:py-6 ${
                  on ? 'bg-[var(--fg)] text-[var(--bg)] lg:bg-transparent lg:text-fg' : 'bg-surface-2 text-muted hover:text-fg lg:bg-transparent'
                }`}
              >
                <span className="flex items-baseline gap-3">
                  <span className={`text-[20px] font-bold tracking-[-0.03em] tnum transition-all lg:text-[34px] ${on ? '' : 'lg:opacity-40'}`}>
                    {s.time}
                  </span>
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em] opacity-60 max-lg:hidden">{s.period}</span>
                  <span className={`ml-auto text-[17px] font-semibold tracking-[-0.01em] max-lg:hidden ${on ? '' : 'opacity-40'}`}>
                    {s.title}
                  </span>
                </span>
                <span
                  className={`grid transition-all duration-500 max-lg:hidden ${on ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <span className="overflow-hidden">
                    <span className="block max-w-md text-[15.5px] leading-relaxed text-muted">{s.text}</span>
                    <span className="mt-5 block h-[3px] overflow-hidden rounded-full bg-line">
                      <span
                        key={`${active}-${paused}-${seen}`}
                        className="block h-full rounded-full bg-[var(--accent)]"
                        style={{
                          width: '100%',
                          transformOrigin: 'left',
                          animation: on && seen && !paused ? `tour-progress ${DURATION}ms linear forwards` : 'none',
                          transform: on && seen && !paused ? undefined : 'scaleX(0)',
                        }}
                      />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Screen */}
      <div className="flex flex-col gap-5">
        <div className="lg:hidden">
          <h3 className="text-[24px] font-bold tracking-[-0.03em]">{stop.title}</h3>
          <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{stop.text}</p>
        </div>
        <div aria-hidden="true" className="dusk grain relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[32px] px-5 py-12 sm:px-12">
          <span className="absolute left-6 top-5 z-[1] text-[12px] font-medium uppercase tracking-[0.16em] text-white/60">
            {stop.time} {stop.period}
          </span>
          <div key={active} className="relative z-[1] w-full max-w-[440px]" style={{ animation: 'tour-in 520ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {stop.screen}
          </div>
        </div>
      </div>
    </div>
  );
}
