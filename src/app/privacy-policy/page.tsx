import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME, BrandLogo, BrandMark } from '@/components/Brand';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description: 'How Nadi handles clinic data, patient records, and security. Plain, minimal, and transparent.',
};

export default function PrivacyPolicyPage() {
  return (
    <div
      data-landing
      style={DEFAULT_PALETTE.vars as React.CSSProperties}
      className="theme-light min-h-dvh bg-[var(--bg)] text-[var(--fg)]"
    >
      {/* ───── Nav ───── */}
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <BrandLogo />
          <nav aria-label="Primary" className="flex items-center gap-2">
            <Link href="/" className="btn btn-ghost font-medium text-fg text-[14px]">
              Home
            </Link>
            <Link href="/#pricing" className="btn btn-ghost font-medium text-fg text-[14px] max-md:hidden">
              Pricing
            </Link>
            <Link href="/login" className="btn btn-ghost font-medium text-fg text-[14px]">
              Sign in
            </Link>
            <Link
              href="/register?tier=SOLO"
              className="btn bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 text-[13.5px] font-semibold"
            >
              Free trial
            </Link>
          </nav>
        </div>
      </header>

      {/* ───── Header ───── */}
      <main className="mx-auto max-w-[820px] px-5 py-20 sm:py-28">
        <header className="border-b border-line pb-14">
          <p className="text-[14px] font-medium text-muted">Legal &amp; Privacy</p>
          <h1 className="mt-3 text-[42px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[64px]">
            Privacy.
            <br />
            <span className="text-[var(--ghost)]">Plain and simple.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
            Software for doctors should feel like medical equipment: reliable, quiet, and strictly between you and your patient. We don&apos;t sell ads, we don&apos;t mine health records, and we don&apos;t take cuts from your patients. Here is how your clinic&apos;s data is handled.
          </p>
          <p className="mt-4 text-[13px] text-muted">
            Last updated: November 2026 · Governed under the IT Act 2000, SPDI Rules 2011 &amp; DPDPA 2023 (India)
          </p>
        </header>

        {/* ───── Content ───── */}
        <div className="divide-y divide-line text-[15.5px] leading-relaxed text-fg">

          {/* Section 1 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              1. What you put into {BRAND_NAME}
            </h2>
            <p className="mt-4 text-muted">
              You only enter the information needed to run your OPD:
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-fg">Clinic &amp; Doctor Information</h3>
                <p className="mt-1 text-muted text-[15px]">
                  Your name, medical specialty, phone number, email, clinic address, and optional UPI ID (for patients paying consultation fees directly to you).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-fg">Patient Health Records</h3>
                <p className="mt-1 text-muted text-[15px]">
                  Patient names, phone numbers, visit dates, chief complaints, vitals, clinical diagnoses, handwritten prescription slip photos, and prescribed medications. You enter this data to provide clinical care. Under Indian law, you are the Data Fiduciary and {BRAND_NAME} acts as your Data Processor.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-fg">Session &amp; Security Data</h3>
                <p className="mt-1 text-muted text-[15px]">
                  Secure login cookies (<code className="text-[13px] bg-surface-2 px-1.5 py-0.5 rounded">__Host-clinic_session</code>) to keep you signed in safely. We do not use third-party advertising trackers or marketing cookies.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              2. How patient records are protected
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-fg">Strict Clinic Isolation</h3>
                <p className="text-[14.5px] text-muted">
                  Every query in {BRAND_NAME} is strictly locked to your unique clinic ID. It is architecturally impossible for another doctor or clinic to search, view, or touch your patient records.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-fg">5-Minute Signed Medical Files</h3>
                <p className="text-[14.5px] text-muted">
                  Uploaded lab reports, X-rays, and prescription photos are stored in encrypted cloud storage (Backblaze B2). Files are never public — viewing a file generates a secure link that expires automatically in 5 minutes.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-fg">Bcrypt Passwords &amp; JWTs</h3>
                <p className="text-[14.5px] text-muted">
                  Your password is salted and hashed with bcrypt before it ever touches the database. Sessions are cryptographically signed and sent strictly over encrypted HTTPS connections.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-fg">Private Booking Links</h3>
                <p className="text-[14.5px] text-muted">
                  Your public patient booking link uses a randomized, encrypted key. Other clinics cannot guess, crawl, or harvest your clinic&apos;s appointments or doctor schedule.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              3. The prescription scanner
            </h2>
            <p className="mt-4 text-muted">
              When you snap a photo of a handwritten paper slip using &ldquo;Scan prescription&rdquo;, the image is processed by Google&apos;s Gemini API to extract medicine names, timing, and dosages so you don&apos;t have to type them by hand.
            </p>
            <p className="mt-3 text-muted">
              This process is transient: the image is sent momentarily to extract text for you to review and approve. Under enterprise API terms, data sent via API calls is not retained or used by Google to train public AI models.
            </p>
          </section>

          {/* Section 4 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              4. Infrastructure we work with
            </h2>
            <p className="mt-4 text-muted">
              We do not sell data to anyone. We rely on a small number of infrastructure providers to host and secure the application:
            </p>
            <ul className="mt-6 space-y-3.5 text-[15px]">
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="font-semibold text-fg sm:w-36 shrink-0">Supabase</span>
                <span className="text-muted">Encrypted PostgreSQL database hosting with AES-256 at rest and connection pooling.</span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="font-semibold text-fg sm:w-36 shrink-0">Backblaze B2</span>
                <span className="text-muted">Encrypted object storage for private medical documents and prescription slips.</span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="font-semibold text-fg sm:w-36 shrink-0">Google Gemini</span>
                <span className="text-muted">Transient OCR text extraction when you choose to scan a paper prescription slip.</span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="font-semibold text-fg sm:w-36 shrink-0">Resend</span>
                <span className="text-muted">Transactional delivery for secure 15-minute password reset links.</span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="font-semibold text-fg sm:w-36 shrink-0">Vercel</span>
                <span className="text-muted">Global edge hosting and application compute with DDoS mitigation.</span>
              </li>
            </ul>
            <p className="mt-6 text-[14.5px] text-muted">
              <strong>WhatsApp Note:</strong> Tapping any WhatsApp button inside {BRAND_NAME} opens the official WhatsApp app directly on your phone or computer. Medical records are never routed through third-party SMS marketing gateways; messages are sent with WhatsApp&apos;s end-to-end encryption.
            </p>
          </section>

          {/* Section 5 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              5. What we will never do
            </h2>
            <div className="mt-6 space-y-3 text-[15px] text-muted">
              <p>• We will never sell, rent, or trade your patient lists or clinical records.</p>
              <p>• We will never advertise pharmaceuticals or competing clinics to your patients.</p>
              <p>• We will never track your doctors or patients with advertising pixels (no Meta Pixel, no ad trackers).</p>
              <p>• We will never pool or share patient charts across different clinics.</p>
              <p>• We will never take commissions or cuts from your patient OPD fees.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              6. You own your clinic&apos;s data
            </h2>
            <p className="mt-4 text-muted">
              You can download a complete backup of your entire clinic — patients, visits, diagnoses, prescriptions, bills, and appointment history — directly from Settings at any time in structured JSON format. No requests, no waiting, no fees.
            </p>
            <p className="mt-3 text-muted">
              If you ever close your clinic account, you can request full deletion and all associated database records and cloud files will be permanently purged within 30 days.
            </p>
          </section>

          {/* Section 7 */}
          <section className="py-12 sm:py-16">
            <h2 className="text-[24px] font-bold tracking-[-0.03em] text-fg">
              7. Questions &amp; Support
            </h2>
            <p className="mt-4 text-muted">
              If you have any questions about how your clinic&apos;s data is secured, or need assistance with data export or account closure, reach out to us directly through the WhatsApp support link in your dashboard, or via our homepage.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/login" className="btn btn-ghost font-medium text-fg">
                Sign in to Clinic →
              </Link>
              <Link href="/" className="btn btn-ghost font-medium text-muted hover:text-fg">
                Back to Homepage
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 text-[14px] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={24} />
            <span className="font-bold">{BRAND_NAME}</span>
            <span className="text-muted">· Made in Kerala</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
            <Link href="/" className="hover:text-fg">Product</Link>
            <Link href="/#pricing" className="hover:text-fg">Pricing</Link>
            <Link href="/#faq" className="hover:text-fg">FAQ</Link>
            <Link href="/privacy-policy" className="hover:text-fg text-fg font-medium">Privacy Policy</Link>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
            <Link href="/register" className="hover:text-fg">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
