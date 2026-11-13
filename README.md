# ClinicCRM — Pilot Functional Skeleton

Mobile-first cloud clinic memory, prescription history, scanned blood reports, multi-doctor queue/token management, and follow-up CRM. Built for **both** target Kerala pilots on one multi-tenant architecture:

1. **Solo Doctor Plan (`SOLO`)** — 1 doctor, mobile-first, zero staff clutter, fast patient search, past Rx memory, paper-slip photo capture, and compressed lab report scanning.
2. **Multi-Doctor Clinic Plan (`CLINIC`)** — up to 5 doctors + reception/front-desk staff, per-doctor tokens & live queue, pre/post-consult billing, staff pre-scanning, and daily doctor-wise EOD tally.

---

## Architecture Highlights (Zero Vendor Lock-In)

- **Database (`Supabase PostgreSQL` via Prisma):** Uses only standard `public` tables and UUIDs with our own `users` table and `clinicId` tenant scoping—easy to `pg_dump` / `pg_restore` to any Postgres server later.
- **File Storage (`Backblaze B2` + `local` dev router):** Stores only `storageProvider` (`"b2"` | `"local"`) + `storageKey` (`clinics/<clinicId>/patients/<patientId>/...`), never raw cloud URLs. Switching to Cloudflare R2 or AWS S3 later works with zero broken links.
- **Browser Compression:** Phone camera shots of blood reports and paper slips are resized & compressed in the browser (`src/lib/client-image.ts`) before upload to save mobile data and stretch Backblaze B2's 10 GB free tier.

---

## Preview Locally Without Cloud Accounts

You can run the full PostgreSQL + local file storage preview on your laptop before creating Supabase or Backblaze B2 accounts:

1. Ensure `.env` points to local PGlite (`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1"`) and `ACTIVE_STORAGE_PROVIDER="local"`.
2. Terminal 1 — start local PostgreSQL:
   ```powershell
   npm run db:local
   ```
3. Terminal 2 — push schema, seed demo clinics, and start Next.js:
   ```powershell
   npm run db:push
   npm run db:seed
   npm run dev
   ```

---

## Quick Start (Connect Supabase + Backblaze B2)

### 1. Create Environment File

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Fill in:
- `DATABASE_URL`: Your **Supabase PostgreSQL** connection string (pick **Mumbai `ap-south-1`** or Singapore region; Session Pooler port `5432` works cleanly with Prisma).
- `SESSION_SECRET`: Any random 32+ character string.
- `ACTIVE_STORAGE_PROVIDER`: `"local"` to save scans in `./.local-storage/` right now, OR `"b2"` once your Backblaze B2 bucket is configured below.

### 2. Configure Backblaze B2 (No Credit Card Required for 10 GB Free Tier)

1. Sign up on Backblaze B2 and create a **Private** bucket (recommended region: `eu-central-003`).
2. Create an Application Key scoped to that bucket (`Read and Write`).
3. Set `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, and `B2_APP_KEY` in `.env`.
4. Add a CORS rule to your B2 bucket (needed so mobile/web browsers can upload directly via presigned `PUT` URLs):

```json
[
  {
    "corsRuleName": "clinic-crm-uploads",
    "allowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "allowedMethods": ["s3_put", "s3_get", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

*(You can apply B2 S3 CORS via the Backblaze B2 CLI `b2 update-bucket` or Bucket Settings.)*

### 3. Push Schema, Seed Pilot Data, and Run

```powershell
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

### Seeded Pilot Accounts (Password: `pilot123`)

- **Solo Pilot (`SOLO`):** `dr.arun@solo.in` — Dr. Arun Evening Clinic (Edappally)
- **5-Doctor Clinic Owner (`CLINIC`):** `owner@malabarclinic.in` — Dr. Menon (Malabar Polyclinic)
- **5-Doctor Clinic Doctor (`CLINIC`):** `dr.fathima@malabarclinic.in` — Dr. Fathima (Pediatrics)
- **5-Doctor Clinic Front Desk (`CLINIC`):** `staff@malabarclinic.in` — Anitha (Reception Staff)
