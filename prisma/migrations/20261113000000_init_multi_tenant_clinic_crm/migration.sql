-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'SOLO', 'CLINIC', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingTiming" AS ENUM ('PRE_CONSULT', 'POST_CONSULT', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER_DOCTOR', 'DOCTOR', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'REMINDED', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PAPER_SLIP', 'BLOOD_REPORT', 'IMAGING_SCAN', 'ECG', 'DISCHARGE_SUMMARY', 'EXTERNAL_RX', 'OTHER');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LAB_TEST', 'DISPENSARY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'READY', 'DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'PHARMACY_STOCK', 'OTHER');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "upiId" TEXT,
    "gstin" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0f766e',
    "themePreset" TEXT NOT NULL DEFAULT 'teal',
    "colorMode" TEXT NOT NULL DEFAULT 'light',
    "uiDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "cardRadius" TEXT NOT NULL DEFAULT 'rounded',
    "sidebarTone" TEXT NOT NULL DEFAULT 'light',
    "printPaperSize" TEXT NOT NULL DEFAULT 'A4',
    "rxFooterNote" TEXT,
    "rxWatermark" TEXT,
    "hidePoweredBy" BOOLEAN NOT NULL DEFAULT false,
    "whatsappLang" TEXT NOT NULL DEFAULT 'en',
    "workingHours" TEXT NOT NULL DEFAULT '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM',
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "enablePublicBooking" BOOLEAN NOT NULL DEFAULT true,
    "enableBilling" BOOLEAN NOT NULL DEFAULT true,
    "enableFollowUps" BOOLEAN NOT NULL DEFAULT true,
    "enableVitals" BOOLEAN NOT NULL DEFAULT true,
    "enableAppointments" BOOLEAN NOT NULL DEFAULT true,
    "enableOrders" BOOLEAN NOT NULL DEFAULT false,
    "planTier" "PlanTier" NOT NULL DEFAULT 'SOLO',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "maxDoctors" INTEGER NOT NULL DEFAULT 1,
    "maxStaff" INTEGER NOT NULL DEFAULT 0,
    "maxPatients" INTEGER,
    "maxStorageMb" INTEGER NOT NULL DEFAULT 10240,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "billingTiming" "BillingTiming" NOT NULL DEFAULT 'FLEXIBLE',
    "defaultConsultFee" INTEGER NOT NULL DEFAULT 200,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "activeBranchId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "specialty" TEXT,
    "registrationNo" TEXT,
    "consultationFee" INTEGER,
    "defaultCaptureMode" TEXT NOT NULL DEFAULT 'HYBRID',
    "preferredWhatsappLang" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ageYears" INTEGER,
    "gender" "Gender",
    "place" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "vitals" JSONB,
    "diagnosis" TEXT,
    "clinicalNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpReason" TEXT,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "timing" TEXT,
    "durationDays" INTEGER,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicMedicinePreset" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT,
    "medicineName" TEXT NOT NULL,
    "defaultDosage" TEXT,
    "defaultTiming" TEXT,
    "defaultDuration" INTEGER,
    "instructions" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicMedicinePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT,
    "name" TEXT NOT NULL,
    "diagnosis" TEXT,
    "clinicalNotes" TEXT,
    "followUpDays" INTEGER,
    "medicines" JSONB NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL DEFAULT 'BLOOD_REPORT',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageProvider" TEXT NOT NULL DEFAULT 'b2',
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT,
    "queueDay" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "vitals" JSONB,
    "notes" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "queueEntryId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "reason" TEXT,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalOrder" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "doctorId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "itemName" TEXT NOT NULL,
    "instructions" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'ORDERED',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "visitId" TEXT,
    "queueEntryId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "amount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "gstRatePercent" INTEGER NOT NULL DEFAULT 0,
    "gstAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "lineItems" JSONB,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMode" "PaymentMode",
    "notes" TEXT,
    "collectedByUserId" TEXT,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT,
    "recordedById" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "spentOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");

-- CreateIndex
CREATE INDEX "Branch_clinicId_isActive_idx" ON "Branch"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_clinicId_code_key" ON "Branch"("clinicId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clinicId_role_idx" ON "User"("clinicId", "role");

-- CreateIndex
CREATE INDEX "Patient_clinicId_phone_idx" ON "Patient"("clinicId", "phone");

-- CreateIndex
CREATE INDEX "Patient_clinicId_name_idx" ON "Patient"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_patientCode_key" ON "Patient"("clinicId", "patientCode");

-- CreateIndex
CREATE INDEX "Visit_clinicId_visitedAt_idx" ON "Visit"("clinicId", "visitedAt");

-- CreateIndex
CREATE INDEX "Visit_clinicId_patientId_visitedAt_idx" ON "Visit"("clinicId", "patientId", "visitedAt");

-- CreateIndex
CREATE INDEX "Visit_clinicId_followUpDate_followUpStatus_idx" ON "Visit"("clinicId", "followUpDate", "followUpStatus");

-- CreateIndex
CREATE INDEX "PrescriptionItem_visitId_idx" ON "PrescriptionItem"("visitId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_clinicId_idx" ON "PrescriptionItem"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicMedicinePreset_clinicId_medicineName_idx" ON "ClinicMedicinePreset"("clinicId", "medicineName");

-- CreateIndex
CREATE INDEX "ConditionTemplate_clinicId_name_idx" ON "ConditionTemplate"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PatientDocument_storageKey_key" ON "PatientDocument"("storageKey");

-- CreateIndex
CREATE INDEX "PatientDocument_clinicId_patientId_reportDate_idx" ON "PatientDocument"("clinicId", "patientId", "reportDate");

-- CreateIndex
CREATE INDEX "PatientDocument_visitId_idx" ON "PatientDocument"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_visitId_key" ON "QueueEntry"("visitId");

-- CreateIndex
CREATE INDEX "QueueEntry_clinicId_queueDay_status_idx" ON "QueueEntry"("clinicId", "queueDay", "status");

-- CreateIndex
CREATE INDEX "QueueEntry_clinicId_doctorId_queueDay_idx" ON "QueueEntry"("clinicId", "doctorId", "queueDay");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_clinicId_doctorId_queueDay_tokenNumber_key" ON "QueueEntry"("clinicId", "doctorId", "queueDay", "tokenNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_queueEntryId_key" ON "Appointment"("queueEntryId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_scheduledAt_idx" ON "Appointment"("clinicId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_doctorId_scheduledAt_idx" ON "Appointment"("clinicId", "doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ClinicalOrder_clinicId_patientId_createdAt_idx" ON "ClinicalOrder"("clinicId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalOrder_clinicId_status_idx" ON "ClinicalOrder"("clinicId", "status");

-- CreateIndex
CREATE INDEX "BillingRecord_clinicId_createdAt_idx" ON "BillingRecord"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRecord_clinicId_doctorId_paymentStatus_idx" ON "BillingRecord"("clinicId", "doctorId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Expense_clinicId_spentOn_idx" ON "Expense"("clinicId", "spentOn");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_createdAt_idx" ON "AuditLog"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicMedicinePreset" ADD CONSTRAINT "ClinicMedicinePreset_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicMedicinePreset" ADD CONSTRAINT "ClinicMedicinePreset_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionTemplate" ADD CONSTRAINT "ConditionTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionTemplate" ADD CONSTRAINT "ConditionTemplate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
