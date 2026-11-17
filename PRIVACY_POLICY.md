# Privacy Policy — Nadi Clinic Management Software

**Effective Date:** 1 November 2026  
**Last Updated:** 18 November 2026  
**Operated by:** Nadi (a SaaS product — operator details available on request)  
**Contact:** WhatsApp Support — reach us via the in-app support link or the contact number listed on our website.

---

> **Plain-language commitment:** Nadi is a tool built for doctors and clinics. We hold patient data as a sacred trust. We will never sell it, advertise with it, or share it with anyone who doesn't need it to run this software. This policy explains exactly what we collect, where it goes, and how we protect it.

---

## 1. Who This Policy Applies To

This Privacy Policy applies to:

- **Clinic Operators / Doctors** — healthcare professionals and practice owners who register for and use Nadi ("Practitioners").
- **Patients** — individuals whose health records are created and managed inside Nadi by their clinic ("Patients").
- **Visitors** — anyone who visits our marketing website or landing pages.

Nadi is a **Business-to-Business (B2B) SaaS product**. Patients do not register directly with Nadi — their data is entered by the Practitioners who provide their care. Practitioners are the **Data Fiduciaries** (responsible parties) for their patients' data. Nadi acts as a **Data Processor** on their behalf.

---

## 2. Governing Law

Nadi operates in accordance with:

- **Information Technology Act, 2000** (India)
- **IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011** ("SPDI Rules")
- **Digital Personal Data Protection Act, 2023** ("DPDPA 2023") — provisions applicable as notified by the Government of India
- General principles of data minimisation, purpose limitation, and storage limitation

Medical records (diagnoses, prescriptions, clinical notes, lab results) qualify as **Sensitive Personal Data or Information (SPDI)** under the SPDI Rules and receive the highest level of protection we provide.

---

## 3. Data We Collect and Why

### 3.1 Practitioner / Clinic Account Data

When a clinic registers, we collect:

| Data Element | Purpose |
|---|---|
| Full name (doctor/owner) | Account identification, displayed on booking pages |
| Email address | Login, password reset, billing communications |
| Phone number | Support contact, WhatsApp integration |
| Clinic name | Displayed to patients on booking pages |
| Medical speciality | Displayed on booking pages |
| Clinic address / city | Displayed to patients |
| UPI ID | Configured by the practitioner for receiving patient payments (we do not process payments — this is displayed to patients only) |
| GSTIN | For invoice generation on paid plans (optional) |
| Consultation fee | Displayed to patients on booking pages |
| Plan tier (Solo Pro / Clinic Core / Growth / Enterprise) | Access control and billing |
| Subscription billing cycle | Plan management |

**We do not store payment card numbers.** Subscription payments are handled via our payment processor (details in Section 5).

### 3.2 Patient Health Records

Patient data is entered by Practitioners during clinical care. We store:

| Data Element | Sensitivity |
|---|---|
| Full name | Personal |
| Age / Date of birth | Personal |
| Gender | Personal |
| Phone number | Personal |
| Place / City of residence | Personal |
| Chief complaint | **Medical (SPDI)** |
| Diagnosis | **Medical (SPDI)** |
| Prescription details (medicines, dosage, duration) | **Medical (SPDI)** |
| Clinical notes / doctor's remarks | **Medical (SPDI)** |
| Vitals — Blood pressure, temperature, pulse, weight, SpO₂ | **Medical (SPDI)** |
| Allergies | **Medical (SPDI)** |
| Follow-up dates | Medical |
| Uploaded documents — lab reports, X-rays, paper prescriptions (images/PDFs) | **Medical (SPDI)** |
| Visit history (dates, timestamps) | Medical |

**Purpose:** This data is collected solely to enable the Practitioner to provide healthcare. Nadi does not read, analyse, or use this data for any purpose other than storing it and making it accessible to the Practitioner who entered it.

### 3.3 Technical / Session Data

| Data Element | Purpose |
|---|---|
| Session cookie (`__Host-clinic_session`) | Keeps you logged in securely (14-day session, HTTPS-only, signed JWT) |
| IP address | Security, abuse prevention (server logs, short-term retention) |
| Browser / device type | Rendering compatibility (not stored in database) |
| Feature usage counts (appointments created, patients added, prescriptions scanned) | Enforcing plan limits (quota tracking) |

We do **not** use third-party analytics trackers (no Google Analytics, Facebook Pixel, Mixpanel, Hotjar, or similar services) on the application.

### 3.4 AI-Processed Data (Prescription Scan / OCR)

When a Practitioner uses the **"Scan Prescription"** feature, the uploaded image is sent to **Google's Gemini AI API** for Optical Character Recognition (OCR) to extract medicine names and dosage text.

**What this means:**
- The image is transmitted to Google's servers momentarily for processing.
- Google's API terms prohibit using submitted data to train their models (for API calls via their standard API terms).
- The extracted text is returned to Nadi and stored in the patient record. The image itself is stored in our file storage (Backblaze B2 — see Section 5).
- Practitioners should not scan documents containing highly sensitive information beyond the prescription itself.

This feature is **opt-in** — it is only triggered when a Practitioner explicitly clicks "Scan."

---

## 4. How We Store and Protect Data

### 4.1 Database (Supabase PostgreSQL)

All structured data (patient records, clinic accounts, appointments) is stored in a **PostgreSQL database** hosted on **Supabase** (a managed database platform). Key protections:

- **Encryption at rest:** Supabase encrypts all data at rest using AES-256.
- **Encryption in transit:** All connections use TLS/SSL.
- **Connection pooling:** Database connections are pooled via PgBouncer — no direct public database access.
- **Multi-tenant isolation:** Every single database query is filtered by `clinicId`. It is architecturally impossible for one clinic to access another clinic's patient data.

### 4.2 File / Document Storage (Backblaze B2)

Medical documents (uploaded lab reports, X-rays, prescription scans) are stored in **Backblaze B2** cloud storage.

- **Encryption at rest:** AES-256 encryption.
- **Access control:** Files are private. Access requires a time-limited signed URL that expires in **5 minutes**. After expiry, the URL is dead — the file cannot be accessed without generating a new signed URL through the authenticated application.
- **Clinic-scoped paths:** Files are stored under paths that include the clinic identifier — preventing accidental cross-clinic access at the storage layer too.

### 4.3 Password Security

- Passwords are **never stored in plain text**.
- All passwords are hashed using **bcrypt** with a per-user cryptographic salt before storage.
- Even Nadi's own team cannot see your password.

### 4.4 Session Security

- Sessions use **signed JWTs** (JSON Web Tokens) stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- The `__Host-` cookie prefix ensures it is only sent over HTTPS and cannot be overridden by subdomains.
- Sessions expire automatically after **14 days** of inactivity.

### 4.5 Booking Link Privacy

Each clinic's public booking page uses an **encrypted slug** (a randomly generated identifier — not the clinic name or doctor name). This means:

- Knowing one clinic's booking link does **not** let you guess another clinic's link.
- Changing a doctor's display name does **not** change the booking link.
- Patients who have an old link can still access the same clinic — but no information about the clinic's identity is embedded in the URL itself.

---

## 5. Third-Party Data Processors

We use a small, carefully selected set of infrastructure providers. We do not sell data to any of them.

| Provider | What They Process | Data Sent | Their Privacy Policy |
|---|---|---|---|
| **Supabase, Inc.** (USA) | Database hosting | All structured app data | [supabase.com/privacy](https://supabase.com/privacy) |
| **Backblaze, Inc.** (USA) | File / document storage | Medical document files | [backblaze.com/company/privacy](https://www.backblaze.com/company/privacy.html) |
| **Google LLC** (USA) — Gemini API | AI OCR processing | Prescription images (transient, on scan) | [policies.google.com/privacy](https://policies.google.com/privacy) |
| **Resend, Inc.** (USA) | Transactional email | Doctor name, email, password reset link | [resend.com/privacy](https://resend.com/privacy) |
| **Vercel, Inc.** (USA) | Application hosting / compute | HTTP request data (IP, headers) | [vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy) |

**WhatsApp note:** When a Practitioner clicks a WhatsApp link (e.g., to contact a patient or reach our support), this opens the WhatsApp app on their own device. No patient data is transmitted to Meta/WhatsApp servers through our application — only the phone number in the URL is used to open the conversation. WhatsApp conversations are end-to-end encrypted on the users' devices.

We require all third-party processors to maintain industry-standard security and to use the data only as directed by us.

---

## 6. What We Do NOT Do

We want to be explicit:

- ❌ **We do not sell patient data** — ever, to anyone, under any circumstances.
- ❌ **We do not use patient health data for advertising**, targeting, or profiling.
- ❌ **We do not share data between clinics** — your patients' records are visible only within your clinic account.
- ❌ **We do not use patient data to train AI models** beyond the transient OCR call described in Section 3.4.
- ❌ **We do not use third-party advertising trackers** (Meta Pixel, Google Ads tags, etc.) inside the application.
- ❌ **We do not access Practitioner accounts or patient records** without explicit permission, except for maintenance/debugging purposes by authorised Nadi engineers under strict confidentiality.

---

## 7. Data Retention

| Data Type | Retention Period |
|---|---|
| Patient health records | Retained while the clinic subscription is active. Deleted within **30 days** of verified account closure on request. |
| Clinic / Practitioner account data | Retained while the account is active. Deleted within **30 days** of account deletion request. |
| Uploaded medical documents (B2) | Same as above — deleted along with the account. |
| Password reset tokens | Expire in **15 minutes**. Invalidated after first use. |
| Session cookies | Expire after **14 days** of inactivity. |
| Server / access logs | Retained for up to **90 days** for security and debugging. |

Practitioners may request data export or deletion at any time by contacting us (see Section 11).

---

## 8. Children's Data

Nadi may store health records for minor patients (children under 18) as entered by their treating Practitioner. This is a standard part of clinical operations. We do not knowingly allow minors to register as Practitioners. If you believe a minor has created an account directly, please contact us immediately.

---

## 9. Rights of Practitioners and Patients

### Practitioner Rights
As a Practitioner, you have the right to:
- **Access** all data stored under your clinic account.
- **Export** your clinic data (patient records, appointment history) — contact support to request a data export.
- **Correct** inaccurate account information via your Settings page.
- **Delete** your account and all associated data — contact support to initiate account closure.
- **Withdraw consent** for specific processing (e.g., disabling the AI OCR feature) by not using that feature.

### Patient Rights
Patients do not have a direct account with Nadi. Their rights to access, correct, or delete their health records should be exercised through their treating clinic/doctor, who is the Data Fiduciary. If a patient believes their data is being mishandled by a clinic using Nadi, they may contact us and we will investigate in accordance with applicable law.

---

## 10. Security Incident Response

In the event of a data breach affecting personal or sensitive data, we will:

1. Contain and investigate the breach within **72 hours** of discovery.
2. Notify affected Practitioners promptly with details of what was affected and what steps we have taken.
3. Report to relevant authorities as required under applicable Indian law.
4. Take corrective action to prevent recurrence.

---

## 11. Contact Us

For any privacy-related requests, questions, or concerns:

- **WhatsApp Support:** Use the support link in your Nadi dashboard, or contact us at the number listed on our website.
- **Email:** Contact information available on our website.

We aim to respond to all privacy-related requests within **7 business days**.

---

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. When we make significant changes, we will:
- Update the "Last Updated" date at the top of this document.
- Notify Practitioners via email or an in-app notification.

Continued use of Nadi after the effective date of a revised policy constitutes acceptance of the changes.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Data Fiduciary** | The entity that determines the purpose and means of processing personal data (under DPDPA 2023). For patient data, this is the clinic/Practitioner. |
| **Data Processor** | An entity that processes data on behalf of the Data Fiduciary. Nadi is the Data Processor for patient records. |
| **SPDI** | Sensitive Personal Data or Information — as defined under the IT (SPDI) Rules, 2011. Includes medical records, health conditions, and financial information. |
| **JWT** | JSON Web Token — a cryptographically signed token used for secure session management. |
| **Bcrypt** | A one-way password hashing algorithm — passwords hashed with bcrypt cannot be reversed. |
| **Signed URL** | A time-limited, cryptographically authenticated URL that provides temporary access to a private file. |

---

*This Privacy Policy is effective from the date listed above and supersedes all prior versions.*

*Nadi — Software built to serve clinics, not data brokers.*
