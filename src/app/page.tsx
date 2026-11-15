import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME, BRAND_TAGLINE, BrandLogo, BrandMark } from '@/components/Brand';
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconFile,
  IconFollowUp,
  IconLock,
  IconMessage,
  IconSearch,
  IconShield,
} from '@/components/Icons';
import { Av, Panel, PhoneChart, QR_ROWS } from '@/components/landing/Mocks';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { PaletteSwitcher } from '@/components/landing/PaletteSwitcher';
import { DayTour } from '@/components/landing/DayTour';
import { Heroes, PulseLine } from '@/components/landing/Heroes';
import { PricingTable } from '@/components/landing/PricingTable';

export const metadata: Metadata = {
  title: { absolute: `${BRAND_NAME} — ${BRAND_TAGLINE}` },
  description:
    'Nadi is clinic software for Indian doctors: patient history, prescriptions, report scans, token queue, online booking and OPD fee collection — on phone and computer.',
};


const SPECIALTIES = [
  'General medicine',
  'Paediatrics',
  'Diabetology',
  'Gynaecology',
  'Dermatology',
  'ENT',
  'Orthopaedics',
  'Dental',
  'Cardiology',
  'Physiotherapy',
  'Ophthalmology',
  'Psychiatry',
];

const FAQ = [
  ['Do I need new hardware?', 'No. Nadi runs in the browser on any phone, tablet or computer. Any TV with a browser works as the waiting-room display.'],
  [
    'Can I keep writing prescriptions by hand?',
    'Yes! That’s our signature feature: Snap a photo of your paper slip with "Scan Rx (AI Beta)", and Gemini AI instantly extracts diagnosis, medicines, and dosage straight into the chart without manual typing. Or just keep the photo on file.',
  ],
  [
    'What is "Scan Rx (AI)" and is it free?',
    'Scan Rx is our unique signature AI digitizer (currently in free Beta for all plans). It reads doctor handwriting from prescription slips or hospital discharge summaries and populates medicines, timing, and dosages in seconds. Doctors review and print in one click.',
  ],
  ['Who owns the patient data?', 'You do. Download a complete backup of your clinic from Settings at any time — no request, no fee.'],
  ['How long is the free trial?', 'Every plan comes with 14 days free — all features of that plan, no card needed to start.'],
  ['What happens when the trial ends?', 'Pick the plan that fits and carry on. Nothing is deleted, and you can change plans whenever you like.'],
  ['Does it work with a front desk and several doctors?', 'Yes. Each doctor gets their own token queue, and front-desk staff get their own logins with limited access.'],
  ['Is there a setup fee?', 'No. No setup, training or per-appointment fees. You pay the plan price and nothing else.'],
];

export default function HomePage() {
  return (
    <div
      data-landing
      data-hero="centered"
      style={DEFAULT_PALETTE.vars as React.CSSProperties}
      className="theme-light min-h-dvh overflow-x-clip"
    >
      <PaletteSwitcher />
      {/* ───── Nav ───── */}
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <BrandLogo />
          <nav aria-label="Primary" className="flex items-center gap-1">
            <a href="#day" className="btn btn-ghost font-medium text-fg max-md:hidden">Product</a>
            <a href="#pricing" className="btn btn-ghost font-medium text-fg max-md:hidden">Pricing</a>
            <a href="#faq" className="btn btn-ghost font-medium text-fg max-md:hidden">FAQ</a>
            <Link href="/login" className="btn btn-ghost font-medium text-fg">Sign in</Link>
            <Link href="/register?tier=SOLO" className="btn bg-[var(--fg)] text-[var(--bg)] hover:opacity-90">
              Free trial
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Heroes />

        {/* ───── Specialties marquee ───── */}
        <section aria-label="Specialties" className="border-b border-line py-10">
          <p className="mx-auto max-w-[1200px] px-5 text-[14px] font-medium text-muted">Built for every kind of OPD</p>
          <div className="mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max animate-[marquee_45s_linear_infinite] gap-10 pr-10">
              {[...SPECIALTIES, ...SPECIALTIES].map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="flex items-center gap-10 whitespace-nowrap text-[28px] font-bold tracking-[-0.03em] text-[var(--ghost-2)] sm:text-[36px]"
                >
                  {s}
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Statement ───── */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 sm:py-32">
          <p className="reveal max-w-[1000px] text-[32px] font-bold leading-[1.12] tracking-[-0.035em] sm:text-[52px]">
            Most clinics run on a register, a WhatsApp group and memory.{' '}
            <span className="text-[var(--ghost)]">
              {BRAND_NAME} keeps those simple habits — and never forgets a patient, a report or a payment.
            </span>
          </p>
        </section>

        {/* ───── A day ───── */}
        <section id="day" className="scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5">
            <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="max-w-2xl text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[64px]">
                One day.
                <br />
                One clinic.
              </h2>
              <p className="max-w-sm text-[16.5px] text-muted">
                Follow Malabar Polyclinic in Kannur from the first token to closing time — tap any moment.
              </p>
            </div>
            <div className="mt-14">
              <DayTour
                stops={[
                  {
                    time: '9:02',
                    period: 'AM',
                    title: 'The front desk opens.',
                    text: 'Anitha types the last four digits of a phone number, picks the right family member, records BP and issues a token. Under ten seconds.',
                    screen: (
                      <>
                        <Panel className="overflow-hidden">
                          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px]">
                            <IconSearch className="h-4 w-4 text-subtle" />
                            <span className="tnum">2345</span>
                          </div>
                          {(
                            [
                              ['RN', 'Rahul Nair', '98470 12345 · 52 yrs', 'blue'],
                              ['MN', 'Meera Nair', '98470 12345 · 47 yrs', 'violet'],
                            ] as const
                          ).map(([a, n, m, tone], i) => (
                            <div key={n} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'bg-surface-2' : ''}`}>
                              <Av i={a} tone={tone} />
                              <div className="flex-1">
                                <p className="text-[13.5px] font-medium">{n}</p>
                                <p className="text-[12px] text-muted">{m}</p>
                              </div>
                              {i === 0 && <span className="rounded-md bg-brand px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand-contrast)]">Token 15</span>}
                            </div>
                          ))}
                        </Panel>
                      </>
                    ),
                  },
                  {
                    time: '9:40',
                    period: 'AM',
                    title: 'The doctor sees the whole story.',
                    text: 'Last visit, current medicines, last month’s HbA1c. Start typing a medicine and Nadi flags an allergy before it becomes a problem.',
                    screen: (
                      <>
                        <Panel className="p-4">
                          <p className="text-[12px] text-muted">Prescription</p>
                          <div className="mt-2 flex justify-between rounded-lg border border-line px-3 py-2.5 text-[13.5px]">
                            Tab. Metformin 500 <span className="text-[12.5px] text-muted tnum">1-0-1</span>
                          </div>
                          <div className="mt-2 rounded-lg border-2 border-[var(--fg)] px-3 py-2 text-[13.5px]">Co-trimoxazole</div>
                          <div className="mt-3 flex gap-2.5 rounded-lg bg-[#fdecea] px-3 py-2.5 text-[13px] text-danger">
                            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              <span className="font-semibold">Sulfa allergy on record.</span> Co-trimoxazole contains a sulfonamide.
                            </span>
                          </div>
                        </Panel>
                      </>
                    ),
                  },
                  {
                    time: '9:48',
                    period: 'AM',
                    title: 'Paid before he reaches the door.',
                    text: 'The consultation fee is recorded. Cash, UPI or card confirmed — and his prescription arrives on WhatsApp in Malayalam.',
                    screen: (
                      <>
                        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                          <Panel className="p-3">
                            <svg viewBox="0 0 21 21" className="h-[108px] w-[108px]" shapeRendering="crispEdges">
                              {QR_ROWS.flatMap((row, y) =>
                                row.split('').map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" style={{ fill: 'var(--fg)' }} /> : null))
                              )}
                            </svg>
                          </Panel>
                          <div className="flex flex-col gap-2">
                            <Panel className="px-4 py-3">
                              <p className="text-[12px] text-muted">Consultation · Rahul Nair</p>
                              <p className="text-[26px] font-bold tracking-[-0.03em] tnum">₹500</p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium text-success">
                                <IconCheck className="h-3.5 w-3.5" /> Paid via UPI
                              </p>
                            </Panel>
                            <Panel className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-muted">
                              <IconMessage className="h-3.5 w-3.5" /> Rx sent on WhatsApp
                            </Panel>
                          </div>
                        </div>
                      </>
                    ),
                  },
                  {
                    time: '1:30',
                    period: 'PM',
                    title: 'Reports file themselves.',
                    text: 'A patient drops off a scan from the lab downstairs. One photo — sharpened, compressed and filed under the right patient and date.',
                    screen: (
                      <>
                        <Panel className="overflow-hidden">
                          {[
                            ['Lipid profile — City Lab', 'Lab report · 11 Nov · 212 KB'],
                            ['Chest X-ray, PA view', 'Scan · 9 Nov · 340 KB'],
                            ['Discharge summary', 'Hospital · 2 Oct · 188 KB'],
                          ].map(([t, m]) => (
                            <div key={t} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                                <IconFile className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-[13.5px] font-medium">{t}</p>
                                <p className="text-[12px] text-muted">{m}</p>
                              </div>
                            </div>
                          ))}
                        </Panel>
                      </>
                    ),
                  },
                  {
                    time: '8:45',
                    period: 'PM',
                    title: 'Closing takes two minutes.',
                    text: 'Collections by doctor and by UPI or cash, the day’s expenses, net cash in the drawer — and tomorrow’s follow-ups already reminded.',
                    screen: (
                      <>
                        <Panel className="p-5">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              ['Collected', '₹18,400'],
                              ['Expenses', '₹1,250'],
                              ['Net cash', '₹17,150'],
                            ].map(([l, v]) => (
                              <div key={l}>
                                <p className="text-[11.5px] text-muted">{l}</p>
                                <p className="text-[19px] font-bold tracking-[-0.03em] tnum">{v}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex h-2 gap-[2px]">
                            <span className="rounded-l-full bg-[var(--fg)]" style={{ width: '68%' }} />
                            <span className="bg-[var(--accent-2)]" style={{ width: '26%' }} />
                            <span className="rounded-r-full bg-[var(--ghost-2)]" style={{ width: '6%' }} />
                          </div>
                          <p className="mt-2 text-[12px] text-muted">UPI 68% · Cash 26% · Card 6%</p>
                          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[13px]">
                            <IconFollowUp className="h-4 w-4 text-muted" />
                            12 follow-ups tomorrow · reminders sent
                          </div>
                        </Panel>
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ───── Night band ───── */}
        <section className="relative overflow-hidden bg-[var(--night)] text-white">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(70%_100%_at_50%_100%,var(--night-glow),transparent_70%)]" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-24 sm:py-32">
            <h2 className="reveal max-w-3xl text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[64px]">
              Built for how India
              <br />
              <span className="text-[var(--night-accent)]">actually works.</span>
            </h2>
            <div className="mt-16 grid gap-12 md:grid-cols-3">
              {[
                ['Cash & UPI, reconciled.', 'Log payments by cash, UPI or card in seconds. Everything in one clean daily tally.'],
                ['WhatsApp, not SMS.', 'Prescriptions and follow-up reminders in English or Malayalam, at zero message cost.'],
                ['Your phone, not a server.', 'Nothing to install or maintain. Open a browser and your clinic is there.'],
              ].map(([t, d]) => (
                <div key={t} className="reveal border-t border-white/15 pt-6">
                  <p className="text-[24px] font-bold leading-tight tracking-[-0.03em]">{t}</p>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-white/60">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-20 grid gap-8 border-t border-white/15 pt-10 sm:grid-cols-3">
              {(
                [
                  [IconLock, 'Private by default', 'Each clinic’s records are isolated. Only your team can sign in.'],
                  [IconShield, 'Right access for each role', 'Doctors, owner and front desk each see what they need.'],
                  [IconDownload, 'Your data, always', 'Download a full backup of your clinic in one click.'],
                ] as const
              ).map(([Icon, t, d]) => (
                <div key={t} className="flex gap-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--night-accent)]" />
                  <div>
                    <p className="text-[15.5px] font-semibold">{t}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/55">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Phone ───── */}
        <section>
          <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-5 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-24">
            <div className="reveal">
              <p className="flex items-center gap-3 text-[40px] font-bold leading-none tracking-[-0.04em] tnum sm:text-[52px]">
                11:10 PM
                <span className="live-dot h-2.5 w-2.5 rounded-full bg-[var(--accent)] text-[var(--accent)]" />
              </p>
              <h2 className="mt-6 max-w-xl text-[36px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">
                A patient calls after hours. You already have the file.
              </h2>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
                {BRAND_NAME} was designed for the phone first, not squeezed onto it. Allergies, the last prescription and
                every report — one tap away, wherever you are.
              </p>
              <dl className="mt-10 grid max-w-lg gap-x-10 gap-y-6 sm:grid-cols-2">
                {[
                  ['No app to install', 'Works in the browser on Android and iPhone.'],
                  ['Easy on data', 'Photos are compressed before they upload.'],
                  ['Light and dark', 'Comfortable at 9 AM and at midnight.'],
                  ['One record', 'Doctor, desk and owner see the same chart.'],
                ].map(([t, d]) => (
                  <div key={t}>
                    <dt className="text-[16px] font-semibold">{t}</dt>
                    <dd className="mt-1 text-[14.5px] text-muted">{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative">
              <div className="dusk grain absolute inset-x-[-28px] bottom-[-36px] top-[70px] rounded-[40px] sm:inset-x-[-48px]" />
              <div className="relative">
                <PhoneChart />
              </div>
            </div>
          </div>
        </section>

        {/* ───── Pricing ───── */}
        <section id="pricing" className="scroll-mt-16 border-t border-line bg-surface-2">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:py-32">
            <h2 className="reveal max-w-3xl text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[64px]">
              Fair pricing.
              <br />
              <span className="text-[var(--ghost)]">No per-patient cuts.</span>
            </h2>
            <p className="mt-6 max-w-xl text-[17px] text-muted">
              One flat price per clinic — no setup fee, no booking commissions, no lock-in.
            </p>
            <div className="mt-12">
              <PricingTable />
            </div>
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section id="faq" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-24 sm:py-32 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
            <h2 className="text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[56px]">Questions.</h2>
            <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {FAQ.map(([q, a]) => (
                <div key={q} className="reveal">
                  <dt className="text-[17px] font-semibold tracking-[-0.01em]">{q}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-muted">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ───── Closing ───── */}
        <section className="px-3 pb-5 sm:px-5">
          <div className="dusk grain mx-auto max-w-[1240px] overflow-hidden rounded-[36px] text-white">
            <div className="relative z-[1] px-6 pb-0 pt-20 sm:px-14 sm:pt-28">
              <h2 className="max-w-4xl text-[44px] font-bold leading-[0.98] tracking-[-0.05em] sm:text-[84px]">
                Tomorrow’s OPD,
                <br />
                on {BRAND_NAME}.
              </h2>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link href="/register?tier=SOLO" className="btn btn-primary h-[54px] px-8 text-[16px] font-semibold shadow-lg">
                  Start 14-day free trial
                  <IconArrowRight />
                </Link>
                <Link href="/login" className="text-[14.5px] text-white/70 hover:text-white underline underline-offset-4">
                  Already have an account? Sign in →
                </Link>
              </div>
              <p className="mt-4 text-[13.5px] text-white/60">
                No credit card required · Setup in 2 minutes · Cancel anytime
              </p>
            </div>
            <PulseLine className="relative z-[1] mt-14 h-[90px] w-full" color="var(--dusk-pulse)" />
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 text-[14px] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={24} />
            <span className="font-bold">{BRAND_NAME}</span>
            <span className="text-muted">· Made in Kerala</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
            <a href="#day" className="hover:text-fg">Product</a>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
            <Link href="/register" className="hover:text-fg">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
