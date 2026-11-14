'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_PALETTE, LANDING_PALETTES, type LandingPalette } from './palettes';

const KEY = 'nadi-landing-palette';
const HERO_KEY = 'nadi-landing-hero';

export const HERO_STYLES = [
  { id: 'editorial', name: 'Editorial' },
  { id: 'split', name: 'Split' },
  { id: 'centered', name: 'Centered' },
  { id: 'dusk', name: 'Dusk' },
] as const;

function root() {
  return document.querySelector<HTMLElement>('[data-landing]');
}

export function applyPalette(p: LandingPalette) {
  const el = root();
  if (!el) return;
  for (const [k, v] of Object.entries(p.vars)) el.style.setProperty(k, v);
}

function readSaved(key: string, param: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(param) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Design tool for dev preview: hidden on production by default, accessible via ?dev=true or Alt+D */
export function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(DEFAULT_PALETTE.id);
  const [hero, setHero] = useState<string>('centered');
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    let devRequested = false;
    try {
      const params = new URLSearchParams(window.location.search);
      devRequested =
        process.env.NODE_ENV === 'development' ||
        params.has('dev') ||
        params.has('preview') ||
        params.has('palette') ||
        params.has('hero') ||
        window.location.hash === '#dev';
    } catch {
      // ignore
    }

    // Toggle via Alt+D shortcut key
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.altKey && (e.key === 'd' || e.key === 'D')) || (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd'))) {
        setIsDev((prev) => !prev);
        setOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    const savedPalette = readSaved(KEY, 'palette');
    const savedHero = readSaved(HERO_KEY, 'hero');
    const p = LANDING_PALETTES.find((x) => x.id === savedPalette) ?? DEFAULT_PALETTE;
    const h = HERO_STYLES.find((x) => x.id === savedHero) ?? { id: 'centered', name: 'Centered' };

    if (p) applyPalette(p);
    const el = root();
    if (el) el.dataset.hero = h.id;

    queueMicrotask(() => {
      setIsDev(devRequested);
      if (p) setCurrent(p.id);
      if (h) setHero(h.id);
    });

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function choose(p: LandingPalette) {
    applyPalette(p);
    setCurrent(p.id);
    try {
      localStorage.setItem(KEY, p.id);
    } catch {
      // ignore
    }
  }

  function chooseHero(id: string) {
    const el = root();
    if (el) el.dataset.hero = id;
    setHero(id);
    try {
      localStorage.setItem(HERO_KEY, id);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!isDev) {
    return null;
  }

  const active = LANDING_PALETTES.find((p) => p.id === current) ?? DEFAULT_PALETTE;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open && (
        <div
          className="flex max-h-[min(78vh,640px)] w-[264px] flex-col rounded-2xl border border-black/10 bg-white/95 text-[#111] shadow-[0_20px_50px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl"
          style={{ animation: 'pop-in 160ms ease' }}
        >
          <div className="border-b border-black/[0.07] p-3">
            <p className="px-0.5 pb-2 text-[12px] font-medium text-[#666]">Hero style</p>
            <div role="radiogroup" aria-label="Hero style" className="grid grid-cols-2 gap-1.5">
              {HERO_STYLES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="radio"
                  aria-checked={hero === h.id}
                  onClick={() => chooseHero(h.id)}
                  className={`h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    hero === h.id ? 'bg-[#111] text-white' : 'bg-black/[0.05] hover:bg-black/[0.09]'
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-label="Colour palette" className="overflow-y-auto p-2">
            <p className="px-2.5 pb-1.5 pt-1 text-[12px] font-medium text-[#666]">Colours</p>
            {LANDING_PALETTES.map((p) => {
              const on = p.id === current;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(p)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                    on ? 'bg-black/[0.06] font-semibold' : 'hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="flex -space-x-1.5">
                    {p.swatch.map((c) => (
                      <span key={c} className="h-5 w-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.12)]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex-1">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2.5 rounded-full border border-black/10 bg-white/95 pl-2 pr-4 text-[13.5px] font-medium text-[#111] shadow-[0_12px_30px_-10px_rgb(0_0_0/0.35)] backdrop-blur-xl"
      >
        <span className="flex -space-x-1.5">
          {active.swatch.map((c) => (
            <span key={c} className="h-6 w-6 rounded-full border-2 border-white" style={{ background: c }} />
          ))}
        </span>
        {open ? 'Close' : 'Customize'}
      </button>
    </div>
  );
}
