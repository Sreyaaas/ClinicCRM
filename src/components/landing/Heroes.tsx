import Link from 'next/link';
import { IconArrowRight, IconCheck, IconMessage } from '@/components/Icons';
import { DesktopShot, PhoneChart } from './Mocks';

/** The Nadi pulse — draws itself, then a bright beat sweeps along it like a monitor. */
export function PulseLine({ className = '', color = 'var(--accent)' }: { className?: string; color?: string }) {
  const d =
    'M0 50 H330 L352 50 L366 28 L382 50 L404 50 L420 6 L440 92 L458 50 L500 50 L516 38 L532 50 H860 L882 50 L896 30 L912 50 L930 50 L946 10 L964 88 L980 50 L1020 50 L1034 40 L1048 50 H1400';
  return (
    <svg aria-hidden="true" viewBox="0 0 1400 100" preserveAspectRatio="none" className={className}>
      <path d={d} pathLength={1000} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" vectorEffect="non-scaling-stroke" className="ecg-base" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} pathLength={1000} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" className="ecg-sweep" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
}

const SUB =
  'Patient history, prescriptions, reports, tokens and UPI — in one fast app your front desk learns in an afternoon and your doctors actually enjoy using.';
const POINTS = ['14-day free trial, no card', 'No setup or SMS fees', 'Live in your OPD on day one'];

function Eyebrow({ dark = false }: { dark?: boolean }) {
  return (
    <p
      className={`rise text-trim text-[14px] font-semibold tracking-[-0.005em] ${
        dark ? 'inline-flex rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-white/85 backdrop-blur-md' : 'text-[var(--accent)]'
      }`}
    >
      Made in Kannur, for clinics across India
    </p>
  );
}

function Ctas({ dark = false, center = false }: { dark?: boolean; center?: boolean }) {
  return (
    <div className={`rise mt-9 flex flex-col gap-3 sm:flex-row ${center ? 'justify-center' : ''}`} style={{ animationDelay: '420ms' }}>
      <Link href="/register?tier=SOLO" className="btn btn-primary h-[54px] px-7 text-[16px] font-semibold">
        Start 14-day free trial
        <IconArrowRight />
      </Link>
      <Link
        href="/login"
        className={`btn h-[54px] px-7 text-[16px] ${
          dark ? 'border border-white/20 bg-white/[0.08] text-white backdrop-blur-md hover:bg-white/[0.14]' : 'btn-secondary'
        }`}
      >
        Open the demo clinic
      </Link>
    </div>
  );
}

function Points({ dark = false, center = false }: { dark?: boolean; center?: boolean }) {
  return (
    <ul
      className={`rise mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[14px] ${center ? 'justify-center' : ''} ${dark ? 'text-white/60' : 'text-muted'}`}
      style={{ animationDelay: '520ms' }}
    >
      {POINTS.map((t) => (
        <li key={t} className="flex items-center gap-2">
          <IconCheck className={`h-4 w-4 ${dark ? 'text-[var(--dusk-pulse)]' : 'text-[var(--accent)]'}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}

function Headline({ size, ghost }: { size: string; ghost: string }) {
  return (
    <h1 className={`text-trim font-bold leading-[0.94] tracking-[-0.055em] ${size}`}>
      <span className="rise block" style={{ animationDelay: '80ms' }}>
        Run the clinic.
      </span>
      <span className={`rise block ${ghost}`} style={{ animationDelay: '200ms' }}>
        Not the paperwork.
      </span>
    </h1>
  );
}

/* 1 · Editorial — light, left-aligned, pulse line across the page */
function EditorialHero() {
  return (
    <section data-variant="editorial" className="hero-variant">
      <div className="mx-auto max-w-[1200px] px-5 pt-12 sm:pt-16">
        <Eyebrow />
        <div className="mt-6">
          <Headline size="text-[54px] sm:text-[92px] lg:text-[116px]" ghost="text-[var(--ghost)]" />
        </div>
      </div>
      <PulseLine className="mt-8 h-[70px] w-full sm:h-[100px]" />
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="mt-4 max-w-[580px]">
          <p className="rise text-[18px] leading-relaxed text-muted sm:text-[20px]" style={{ animationDelay: '320ms' }}>
            {SUB}
          </p>
          <Ctas />
          <Points />
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-[1240px] px-3 sm:mt-16 sm:px-5">
        <div className="dusk grain overflow-hidden rounded-[36px] px-4 pt-12 sm:px-12 sm:pt-20 lg:px-20">
          <p className="relative z-[1] mx-auto max-w-[980px] text-[13px] font-medium uppercase tracking-[0.18em] text-white/60">
            Kannur · 6:40 PM · Evening OPD · 14 waiting
          </p>
          <div className="relative z-[1] mx-auto mt-5 max-w-[980px]">
            <div className="-mb-24 sm:-mb-32">
              <DesktopShot />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 2 · Split — headline left, phone with floating live cards right */
function SplitHero() {
  return (
    <section data-variant="split" className="hero-variant hero-split-shell relative overflow-hidden">
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_65%)]" />
      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:py-8">
        <div>
          <Eyebrow />
          <div className="mt-6">
            <Headline size="text-[52px] sm:text-[80px] lg:text-[88px]" ghost="text-[var(--ghost)]" />
          </div>
          <p className="rise mt-7 max-w-[540px] text-[18px] leading-relaxed text-muted" style={{ animationDelay: '320ms' }}>
            {SUB}
          </p>
          <Ctas />
          <Points />
        </div>
        <div className="hero-split-phone relative flex justify-center py-2 lg:py-0">
          <div className="relative">
            <div className="absolute -inset-x-8 inset-y-9 rounded-[44px] bg-brand opacity-90 sm:-inset-x-12 sm:inset-y-10" />
            <div className="rise relative" style={{ animationDelay: '300ms' }}>
              <PhoneChart />
            </div>
          </div>
          <div
            className="rise absolute left-[2%] top-[20%] hidden sm:block"
            style={{ animationDelay: '700ms' }}
          >
            <div className="float-y flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-pop">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fg)] text-[14px] font-bold text-[var(--bg)] tnum">15</span>
              <div className="text-left">
                <p className="text-[13px] font-semibold">Token issued</p>
                <p className="text-[12px] text-muted">Rahul Nair · Dr. Menon</p>
              </div>
            </div>
          </div>
          <div className="rise absolute bottom-[14%] right-[4%] hidden sm:block" style={{ animationDelay: '900ms' }}>
            <div className="float-y flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-pop [animation-delay:-2s]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success">
                <IconCheck className="h-4 w-4" />
              </span>
              <div className="text-left">
                <p className="text-[13px] font-semibold tnum">₹500 paid via UPI</p>
                <p className="flex items-center gap-1 text-[12px] text-muted">
                  <IconMessage className="h-3 w-3" /> Rx sent on WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 3 · Centered — classic, big product below on a soft tint */
function CenteredHero() {
  return (
    <section data-variant="centered" className="hero-variant">
      <div className="mx-auto flex max-w-[1000px] flex-col items-center px-5 pt-12 text-center sm:pt-16">
        <Eyebrow />
        <div className="mt-7">
          <Headline size="text-[50px] sm:text-[84px] lg:text-[100px]" ghost="text-[var(--ghost)]" />
        </div>
        <p className="rise mt-7 max-w-[600px] text-[18px] leading-relaxed text-muted" style={{ animationDelay: '320ms' }}>
          {SUB}
        </p>
        <Ctas center />
        <Points center />
      </div>
      <div className="mx-auto mt-12 max-w-[1240px] px-3 sm:mt-16 sm:px-5">
        <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--brand)_14%,var(--bg)),var(--surface-2))] px-4 pt-12 sm:px-14 sm:pt-16">
          <div className="rise mx-auto -mb-24 max-w-[980px] sm:-mb-32" style={{ animationDelay: '600ms' }}>
            <DesktopShot />
          </div>
        </div>
      </div>
    </section>
  );
}

/* 4 · Dusk — dark sunset scene with the product rising from the horizon */
function DuskHero() {
  return (
    <section data-variant="dusk" className="hero-variant px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="dusk grain relative overflow-hidden rounded-[28px] text-white sm:rounded-[40px]">
        <div className="relative z-[1] mx-auto flex max-w-[1100px] flex-col items-center px-5 pt-12 text-center sm:pt-16">
          <Eyebrow dark />
          <div className="mt-7">
            <Headline size="text-[52px] sm:text-[96px] lg:text-[120px]" ghost="text-white/45" />
          </div>
          <p className="rise mt-7 max-w-[600px] text-[17px] leading-relaxed text-white/70 sm:text-[19px]" style={{ animationDelay: '320ms' }}>
            {SUB}
          </p>
          <Ctas dark center />
          <Points dark center />
        </div>
        <PulseLine className="relative z-[1] mt-10 h-[80px] w-full sm:h-[110px]" color="var(--dusk-pulse)" />
        <div className="relative z-[1] mx-auto -mt-6 max-w-[1040px] px-3 [perspective:1800px] sm:px-10">
          <div className="rise -mb-28 sm:-mb-40" style={{ animationDelay: '650ms' }}>
            <div className="origin-bottom" style={{ transform: 'rotateX(10deg)' }}>
              <DesktopShot />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Heroes() {
  return (
    <>
      <EditorialHero />
      <SplitHero />
      <CenteredHero />
      <DuskHero />
    </>
  );
}
