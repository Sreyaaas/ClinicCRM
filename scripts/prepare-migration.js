const fs = require('fs');
const path = require('path');

// Read raw buffer
const buf = fs.readFileSync(path.join(__dirname, '..', 'prisma_init.sql'));
let prismaSql;
// Check if UTF-16 LE BOM (0xFF 0xFE) or null bytes
if (buf[0] === 0xff && buf[1] === 0xfe) {
  prismaSql = buf.toString('utf16le', 2);
} else if (buf.indexOf(0x00) !== -1) {
  prismaSql = buf.toString('utf16le');
} else {
  prismaSql = buf.toString('utf8');
}

const scalingAndSecuritySql = `
-- ==========================================
-- Multi-Tenant Scaling Optimizations & Security
-- ==========================================

-- 1. Trigram Extension and Patient Fuzzy Search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS "Patient_name_trgm_idx" ON "Patient" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Patient_phone_trgm_idx" ON "Patient" USING gin ("phone" gin_trgm_ops);

-- 2. Foreign Key Indexes (Eliminate Sequential Table Scans on Joins & Deletes)
CREATE INDEX IF NOT EXISTS "Visit_branchId_idx" ON "Visit"("branchId");
CREATE INDEX IF NOT EXISTS "Visit_doctorId_idx" ON "Visit"("doctorId");

CREATE INDEX IF NOT EXISTS "QueueEntry_branchId_idx" ON "QueueEntry"("branchId");
CREATE INDEX IF NOT EXISTS "QueueEntry_patientId_idx" ON "QueueEntry"("patientId");
CREATE INDEX IF NOT EXISTS "QueueEntry_doctorId_idx" ON "QueueEntry"("doctorId");

CREATE INDEX IF NOT EXISTS "Appointment_branchId_idx" ON "Appointment"("branchId");
CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_idx" ON "Appointment"("doctorId");

CREATE INDEX IF NOT EXISTS "ClinicalOrder_patientId_idx" ON "ClinicalOrder"("patientId");
CREATE INDEX IF NOT EXISTS "ClinicalOrder_visitId_idx" ON "ClinicalOrder"("visitId");
CREATE INDEX IF NOT EXISTS "ClinicalOrder_doctorId_idx" ON "ClinicalOrder"("doctorId");

CREATE INDEX IF NOT EXISTS "BillingRecord_branchId_idx" ON "BillingRecord"("branchId");
CREATE INDEX IF NOT EXISTS "BillingRecord_visitId_idx" ON "BillingRecord"("visitId");
CREATE INDEX IF NOT EXISTS "BillingRecord_queueEntryId_idx" ON "BillingRecord"("queueEntryId");
CREATE INDEX IF NOT EXISTS "BillingRecord_patientId_idx" ON "BillingRecord"("patientId");
CREATE INDEX IF NOT EXISTS "BillingRecord_doctorId_idx" ON "BillingRecord"("doctorId");
CREATE INDEX IF NOT EXISTS "BillingRecord_collectedByUserId_idx" ON "BillingRecord"("collectedByUserId");

CREATE INDEX IF NOT EXISTS "Expense_branchId_idx" ON "Expense"("branchId");
CREATE INDEX IF NOT EXISTS "Expense_recordedById_idx" ON "Expense"("recordedById");

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "ClinicMedicinePreset_doctorId_idx" ON "ClinicMedicinePreset"("doctorId");
CREATE INDEX IF NOT EXISTS "ConditionTemplate_doctorId_idx" ON "ConditionTemplate"("doctorId");
CREATE INDEX IF NOT EXISTS "PatientDocument_uploadedByUserId_idx" ON "PatientDocument"("uploadedByUserId");

-- 3. Composite Tenant Scaling Indexes
CREATE INDEX IF NOT EXISTS "Visit_clinicId_branchId_idx" ON "Visit"("clinicId", "branchId");
CREATE INDEX IF NOT EXISTS "QueueEntry_clinicId_branchId_idx" ON "QueueEntry"("clinicId", "branchId");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_branchId_idx" ON "Appointment"("clinicId", "branchId");
CREATE INDEX IF NOT EXISTS "BillingRecord_clinicId_branchId_idx" ON "BillingRecord"("clinicId", "branchId");
CREATE INDEX IF NOT EXISTS "Expense_clinicId_branchId_idx" ON "Expense"("clinicId", "branchId");

-- 4. Enforce Row-Level Security on all 15 tables
ALTER TABLE "Clinic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClinicMedicinePreset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConditionTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PatientDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueueEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClinicalOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- 5. Remediate Supabase Security Linter Warnings (0028 & 0029)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
`;

const fullSql = prismaSql.trim() + '\n\n' + scalingAndSecuritySql.trim() + '\n';
const destPath = path.join(__dirname, '..', 'prisma', 'migrations', '20261113000000_init_multi_tenant_clinic_crm', 'migration.sql');
fs.writeFileSync(destPath, fullSql, { encoding: 'utf8' });
console.log('Successfully wrote UTF-8 migration file:', destPath, 'Length:', fullSql.length);
