import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME, BrandLogo, BrandMark } from '@/components/Brand';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { IconArrowRight, IconLock, IconShield, IconCheck } from '@/components/Icons';

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description:
    'Privacy policy, data protection architecture, and Indian regulatory compliance for Nadi Clinic Management Software.',
};

export default function PrivacyPolicyPage() {
  return (
    <div
      data-landing
      style={DEFAULT_PALETTE.vars as React.CSSProperties}
      className="theme-light min-h-dvh bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white"
    >
      {/* ───── Top Nav ───── */}
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-5">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Link href="/" className="btn btn-ghost text-[14px] font-medium text-fg">
              ← Back to Home
            </Link>
            <Link href="/login" className="btn btn-ghost text-[14px] font-medium text-fg max-sm:hidden">
              Sign in
            </Link>
            <Link
              href="/register?tier=SOLO"
              className="btn bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 text-[13.5px] font-semibold"
            >
              Free trial
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Hero Header ───── */}
      <section className="border-b border-line bg-surface-2/60 py-12 sm:py-16">
        <div className="mx-auto max-w-[900px] px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-muted">
            <IconShield className="h-3.5 w-3.5 text-brand" />
            <span>DPDPA &amp; SPDI Compliant Architecture</span>
          </div>
          <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] sm:text-[46px] leading-[1.08]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            Effective Date: 1 November 2026 &nbsp;·&nbsp; Last Updated: 18 November 2026
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5 sm:p-6">
            <p className="text-[14px] font-semibold text-brand">Plain-language commitment</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg">
              {BRAND_NAME} is a clinic management tool built for doctors and OPDs. We hold patient medical
              data as a sacred trust. <strong>We will never sell it, advertise with it, or share it with anyone who does not strictly need it to run this software.</strong> This policy explains exactly what data we collect, where it is stored, and how it is secured.
            </p>
          </div>
        </div>
      </section>

      {/* ───── Body Content ───── */}
      <main className="mx-auto max-w-[900px] px-5 py-12 sm:py-16">
        <div className="space-y-14 text-[15px] leading-relaxed text-[var(--fg)]">

          {/* Section 1 */}
          <section id="who" className="space-y-4">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">1.</span> Who This Policy Applies To
            </h2>
            <p className="text-muted">
              This Privacy Policy applies to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted">
              <li>
                <strong className="text-fg">Clinic Operators &amp; Doctors:</strong> Healthcare professionals, clinic owners, and authorized staff who register for and use {BRAND_NAME} (&ldquo;Practitioners&rdquo;).
              </li>
              <li>
                <strong className="text-fg">Patients:</strong> Individuals whose consultations, medical records, or appointments are created and managed inside {BRAND_NAME} by their clinic (&ldquo;Patients&rdquo;).
              </li>
              <li>
                <strong className="text-fg">Visitors:</strong> Anyone accessing our marketing site, public clinic booking links, or waiting-room token displays.
              </li>
            </ul>
            <div className="rounded-xl border border-line bg-surface p-4 text-[13.5px] text-muted">
              <p>
                <strong>B2B Role Designation:</strong> Patients do not register directly with {BRAND_NAME}. Their health data is entered by the Practitioner providing clinical care. Under applicable Indian privacy laws, Practitioners act as the <strong className="text-fg">Data Fiduciaries</strong> (responsible parties), and {BRAND_NAME} acts strictly as the <strong className="text-fg">Data Processor</strong> on their behalf.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="governing-law" className="space-y-4">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">2.</span> Indian Legal &amp; Regulatory Framework
            </h2>
            <p className="text-muted">
              {BRAND_NAME} operates in compliance with Indian healthcare information and electronic data laws:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted">
              <li><strong>Information Technology Act, 2000</strong> (IT Act)</li>
              <li><strong>IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> (&ldquo;SPDI Rules&rdquo;)</li>
              <li><strong>Digital Personal Data Protection Act, 2023</strong> (&ldquo;DPDPA 2023&rdquo;) — provisions in force and rules as notified</li>
              <li>Recognized principles of data minimisation, explicit purpose limitation, and storage limitation</li>
            </ul>
            <p className="text-muted text-[14px]">
              Medical records (diagnoses, prescription details, clinical notes, and diagnostic reports) qualify as <strong>Sensitive Personal Data or Information (SPDI)</strong> under Indian law and receive our highest standard of technical and organizational security.
            </p>
          </section>

          {/* Section 3 */}
          <section id="data-collected" className="space-y-6">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">3.</span> Data We Collect &amp; Purpose
            </h2>

            <div className="space-y-3">
              <h3 className="text-[17px] font-semibold text-fg">3.1 Practitioner &amp; Clinic Account Data</h3>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="border-b border-line bg-surface-2 font-semibold text-fg">
                    <tr>
                      <th className="p-3.5">Data Element</th>
                      <th className="p-3.5">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-muted">
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Full Name &amp; Doctor Specialty</td>
                      <td className="p-3.5">Account identification, doctor profiles, and public booking page</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Email Address &amp; Mobile Number</td>
                      <td className="p-3.5">Sign-in, password reset, security alerts, and direct support concierge</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Clinic Name &amp; Address / City</td>
                      <td className="p-3.5">Prescription headers, patient receipts, and clinic booking page</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">UPI ID (Optional)</td>
                      <td className="p-3.5">Displayed to patients for direct OPD fee transfer (we do not touch or take cuts from patient fee transfers)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">GSTIN (Optional)</td>
                      <td className="p-3.5">For B2B tax invoice generation on paid subscription tiers</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[17px] font-semibold text-fg">3.2 Patient Health Records (SPDI)</h3>
              <p className="text-muted text-[14px]">
                Entered directly by Practitioners or front-desk staff during clinical consultations:
              </p>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="border-b border-line bg-surface-2 font-semibold text-fg">
                    <tr>
                      <th className="p-3.5">Field Category</th>
                      <th className="p-3.5">Data Stored</th>
                      <th className="p-3.5">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-muted">
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Demographics</td>
                      <td className="p-3.5">Name, Age / Date of birth, Gender, Phone number, Place / City</td>
                      <td className="p-3.5 text-fg font-medium">Personal Data</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Clinical Notes</td>
                      <td className="p-3.5">Chief complaints, diagnoses, physical examination notes, doctor remarks</td>
                      <td className="p-3.5 text-brand font-semibold">Sensitive (SPDI)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Prescriptions</td>
                      <td className="p-3.5">Medications, dosages, timing, frequency, duration, special instructions</td>
                      <td className="p-3.5 text-brand font-semibold">Sensitive (SPDI)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Vitals &amp; Allergies</td>
                      <td className="p-3.5">Blood Pressure, Pulse, SpO₂, Temperature, Weight, Known drug allergies</td>
                      <td className="p-3.5 text-brand font-semibold">Sensitive (SPDI)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-fg">Medical Files</td>
                      <td className="p-3.5">Uploaded photos/PDFs of paper slips, lab tests, X-rays, discharge summaries</td>
                      <td className="p-3.5 text-brand font-semibold">Sensitive (SPDI)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[17px] font-semibold text-fg">3.3 Prescription AI OCR Scanning</h3>
              <div className="rounded-xl border border-line bg-surface p-4 text-[14px] text-muted space-y-2">
                <p>
                  When a doctor snaps a photo of a paper prescription or lab slip using the <strong>&ldquo;Scan prescription&rdquo;</strong> button:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The image is processed using <strong>Google Gemini AI API</strong> solely to extract medication names, timing, and dosages into structured fields for doctor review.</li>
                  <li>Processing is ephemeral and transient. Under enterprise API terms, data transmitted via API calls is not retained or used by Google to train public models.</li>
                  <li>Use of OCR is completely voluntary and opt-in per consultation.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="security" className="space-y-4">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">4.</span> Technical Security &amp; Storage Architecture
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-2 font-semibold text-fg text-[15px]">
                  <IconLock className="h-4 w-4 text-brand" />
                  <span>Multi-Tenant Database Isolation</span>
                </div>
                <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                  Every query executed by our backend application enforces a strict, indexed <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">clinicId</code> tenant scope. No clinic can ever query, inspect, or modify another clinic&apos;s patient data.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-2 font-semibold text-fg text-[15px]">
                  <IconShield className="h-4 w-4 text-brand" />
                  <span>5-Minute Signed Medical URLs</span>
                </div>
                <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                  Medical scans and reports stored in Backblaze B2 are completely private and never publicly accessible. Viewing a file generates a cryptographic time-limited signed URL that automatically expires in 5 minutes.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-2 font-semibold text-fg text-[15px]">
                  <IconLock className="h-4 w-4 text-brand" />
                  <span>Encrypted Booking Slugs</span>
                </div>
                <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                  Public clinic booking links use randomized, cryptographically safe identifiers. Doctor name edits never break links, and sequential slug harvesting is prevented to preserve practitioner privacy.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-2 font-semibold text-fg text-[15px]">
                  <IconShield className="h-4 w-4 text-brand" />
                  <span>Bcrypt &amp; Host-Bound Cookies</span>
                </div>
                <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                  Account passwords are salted and hashed with bcrypt. User sessions are secured with signed JWT tokens stored in <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">__Host-</code> prefixed, HttpOnly, SameSite=Lax HTTPS-only cookies.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="third-party" className="space-y-4">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">5.</span> Third-Party Infrastructure Processors
            </h2>
            <p className="text-muted text-[14px]">
              We do not sell data to any vendor. We only partner with enterprise-grade cloud infrastructure providers to operate the software:
            </p>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-line bg-surface-2 font-semibold text-fg">
                  <tr>
                    <th className="p-3.5">Provider</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Data Processed</th>
                    <th className="p-3.5">Security Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-muted">
                  <tr>
                    <td className="p-3.5 font-medium text-fg">Supabase Inc.</td>
                    <td className="p-3.5">Managed PostgreSQL database</td>
                    <td className="p-3.5">Encrypted structured patient &amp; clinic records</td>
                    <td className="p-3.5">AES-256 at rest, TLS 1.3, SOC2 Type II</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-fg">Backblaze Inc.</td>
                    <td className="p-3.5">Cloud object storage (B2)</td>
                    <td className="p-3.5">Encrypted medical images &amp; report documents</td>
                    <td className="p-3.5">Private buckets, 5-min signed URLs, AES-256</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-fg">Google LLC (Gemini)</td>
                    <td className="p-3.5">Prescription OCR AI</td>
                    <td className="p-3.5">Prescription slip photo (transiently on scan)</td>
                    <td className="p-3.5">Zero persistent retention for training</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-fg">Resend Inc.</td>
                    <td className="p-3.5">Transactional email delivery</td>
                    <td className="p-3.5">Doctor email &amp; 15-min password reset link</td>
                    <td className="p-3.5">TLS delivery, no patient health data sent</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-fg">Vercel Inc.</td>
                    <td className="p-3.5">Serverless compute &amp; hosting</td>
                    <td className="p-3.5">Ephemeral HTTP application execution</td>
                    <td className="p-3.5">Global edge firewall, DDoS mitigation</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-muted">
              <strong>WhatsApp Communication:</strong> When you tap any WhatsApp link inside {BRAND_NAME} (e.g. to chat with a patient or reach our support team), your device opens the official WhatsApp application directly. We do not pipe patient medical histories through WhatsApp servers; chats occur peer-to-peer with WhatsApp&apos;s end-to-end encryption.
            </p>
          </section>

          {/* Section 6 */}
          <section id="what-we-do-not-do" className="space-y-4">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">6.</span> Explicit Prohibitions &amp; Guarantees
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'We NEVER sell, rent, or trade patient health data or clinic contact lists.',
                'We NEVER use health records for advertisements, retargeting, or marketing.',
                'We NEVER run third-party advertising tracking pixels (no Facebook Pixel, no ad trackers).',
                'We NEVER share or pool clinical data between different clinic accounts.',
                'We NEVER train public AI foundation models on your clinical consultations.',
                'We NEVER charge hidden commission cuts on your patient OPD fees.',
              ].map((guarantee, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3.5 text-[13.5px]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-xs">
                    ✓
                  </span>
                  <span className="text-fg">{guarantee}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7 */}
          <section id="retention" className="space-y-3">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">7.</span> Data Retention &amp; Deletion
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted text-[14px]">
              <li>
                <strong className="text-fg">Active Clinics:</strong> Patient records and uploaded documents are retained as long as your clinic account remains active so you can maintain patient continuity of care.
              </li>
              <li>
                <strong className="text-fg">Data Export:</strong> Clinic owners can request or download a complete backup export of their clinic data at any time from Settings without additional fees.
              </li>
              <li>
                <strong className="text-fg">Account Deletion:</strong> Upon receiving a verified account deletion request from the clinic owner, all associated database records and cloud storage documents are permanently purged within 30 days.
              </li>
              <li>
                <strong className="text-fg">Security Tokens:</strong> Password reset tokens automatically expire after 15 minutes; inactive login sessions expire after 14 days.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="practitioner-rights" className="space-y-3">
            <h2 className="text-[22px] font-bold tracking-tight text-fg flex items-center gap-2">
              <span className="text-muted text-[17px] font-normal">8.</span> Your Rights &amp; Patient Inquiries
            </h2>
            <p className="text-muted text-[14px]">
              Practitioners maintain total control over their data, including the right to access, rectify, export, and erase their records.
            </p>
            <p className="text-muted text-[14px]">
              Because {BRAND_NAME} is a data processor to treating clinics, individual patients seeking copies or corrections of their medical charts should contact their treating doctor or clinic directly. If a patient contacts {BRAND_NAME} directly, we will promptly notify the registered clinic owner.
            </p>
          </section>

          {/* Section 9 */}
          <section id="contact" className="space-y-3 rounded-2xl border border-line bg-surface-2 p-6">
            <h2 className="text-[20px] font-bold tracking-tight text-fg">
              Questions &amp; Privacy Concierge
            </h2>
            <p className="text-muted text-[14px]">
              If you have any questions regarding this Privacy Policy, your clinical data protection, or wish to exercise data rights:
            </p>
            <div className="mt-4 flex flex-wrap gap-4 items-center">
              <Link
                href="/login"
                className="btn btn-primary text-[14px] font-semibold"
              >
                Sign in to Dashboard
                <IconArrowRight />
              </Link>
              <Link
                href="/"
                className="btn btn-ghost text-[14px] font-medium"
              >
                Back to Homepage
              </Link>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Direct assistance is also available via the WhatsApp support link located inside your dashboard.
            </p>
          </section>

        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-line bg-surface-2">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-10 text-[14px] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={22} />
            <span className="font-bold">{BRAND_NAME}</span>
            <span className="text-muted">· Made in Kerala</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
            <Link href="/" className="hover:text-fg">Home</Link>
            <Link href="/#pricing" className="hover:text-fg">Pricing</Link>
            <Link href="/#faq" className="hover:text-fg">FAQ</Link>
            <Link href="/privacy-policy" className="hover:text-fg text-fg font-semibold">Privacy Policy</Link>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
            <Link href="/register" className="hover:text-fg">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
