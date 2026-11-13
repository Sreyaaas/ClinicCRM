const fs = require('fs');
const path = require('path');
const { randomBytes, scryptSync } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const pwdHash = hashPassword('pilot123');

const sql = `
-- ====================================================================
-- SEED DATA: 5 CLINIC TIERS (STARTER, SOLO, CLINIC, GROWTH, ENTERPRISE)
-- ====================================================================

DO $$
DECLARE
  v_hash text := '${pwdHash}';
  v_starter_id text := '11111111-1111-4111-8111-111111111111';
  v_starter_doc text := '11111111-1111-4111-8111-111111111112';
  v_starter_br text := '11111111-1111-4111-8111-111111111113';

  v_solo_id text := '22222222-2222-4222-8222-222222222221';
  v_solo_doc text := '22222222-2222-4222-8222-222222222222';
  v_solo_br text := '22222222-2222-4222-8222-222222222223';
  v_solo_pt1 text := '22222222-2222-4222-8222-222222222224';
  v_solo_pt2 text := '22222222-2222-4222-8222-222222222225';

  v_clinic_id text := '33333333-3333-4333-8333-333333333331';
  v_clinic_doc1 text := '33333333-3333-4333-8333-333333333332';
  v_clinic_doc2 text := '33333333-3333-4333-8333-333333333333';
  v_clinic_staff text := '33333333-3333-4333-8333-333333333334';
  v_clinic_br text := '33333333-3333-4333-8333-333333333335';
  v_clinic_pt1 text := '33333333-3333-4333-8333-333333333336';
  v_clinic_pt2 text := '33333333-3333-4333-8333-333333333337';
  v_clinic_q1 text := '33333333-3333-4333-8333-333333333338';
  v_clinic_q2 text := '33333333-3333-4333-8333-333333333339';

  v_growth_id text := '44444444-4444-4444-8444-444444444441';
  v_growth_doc text := '44444444-4444-4444-8444-444444444442';
  v_growth_staff text := '44444444-4444-4444-8444-444444444443';
  v_growth_br text := '44444444-4444-4444-8444-444444444444';
  v_growth_pt text := '44444444-4444-4444-8444-444444444445';
  v_growth_v text := '44444444-4444-4444-8444-444444444446';

  v_ent_id text := '55555555-5555-4555-8555-555555555551';
  v_ent_doc text := '55555555-5555-4555-8555-555555555552';
  v_ent_br1 text := '55555555-5555-4555-8555-555555555553';
  v_ent_br2 text := '55555555-5555-4555-8555-555555555554';
  v_ent_pt text := '55555555-5555-4555-8555-555555555555';

BEGIN
  -- 1. STARTER TIER (Dr. Kavya Evening Practice)
  INSERT INTO "Clinic" (
    id, name, slug, phone, address, "brandColor", "themePreset", "colorMode", "uiDensity", "cardRadius",
    "sidebarTone", "printPaperSize", "whatsappLang", "workingHours", "slotDurationMin",
    "enablePublicBooking", "enableBilling", "enableFollowUps", "enableVitals", "enableAppointments", "enableOrders",
    "planTier", "subscriptionStatus", "maxDoctors", "maxStaff", "maxPatients", "maxStorageMb", "maxBranches",
    "billingTiming", "defaultConsultFee", "trialEndsAt", "createdAt", "updatedAt"
  ) VALUES (
    v_starter_id, 'Dr. Kavya Evening Practice', 'starter-evening', '9847001122', 'Palarivattom, Kochi', '#0f766e', 'teal', 'light', 'comfortable', 'rounded',
    'light', 'A4', 'en', '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM', 15,
    false, false, true, true, false, false,
    'STARTER', 'TRIAL', 1, 0, 100, 1024, 1,
    'FLEXIBLE', 150, NOW() + INTERVAL '60 days', NOW(), NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO "Branch" (id, "clinicId", name, code, "isDefault", "isActive", "createdAt", "updatedAt")
  VALUES (v_starter_br, v_starter_id, 'Palarivattom Main', 'MAIN', true, true, NOW(), NOW())
  ON CONFLICT ("clinicId", code) DO NOTHING;

  INSERT INTO "User" (
    id, "clinicId", name, email, phone, "passwordHash", role, specialty, "consultationFee",
    "defaultCaptureMode", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    v_starter_doc, v_starter_id, 'Dr. Kavya Menon', 'starter@pilot.in', '9847001122', v_hash, 'OWNER_DOCTOR', 'Family Medicine', 150,
    'HYBRID', true, NOW(), NOW()
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO "Patient" (
    id, "clinicId", "patientCode", name, phone, "ageYears", gender, place, "createdAt", "updatedAt"
  ) VALUES (
    '11111111-1111-4111-8111-111111111114', v_starter_id, 'PT-0001', 'Ramesh Pillai', '9847099881', 44, 'MALE', 'Palarivattom', NOW(), NOW()
  ) ON CONFLICT ("clinicId", "patientCode") DO NOTHING;


  -- 2. SOLO TIER (Dr. Arun Evening Clinic)
  INSERT INTO "Clinic" (
    id, name, slug, phone, address, "upiId", "brandColor", "themePreset", "colorMode", "uiDensity", "cardRadius",
    "sidebarTone", "printPaperSize", "whatsappLang", "workingHours", "slotDurationMin",
    "enablePublicBooking", "enableBilling", "enableFollowUps", "enableVitals", "enableAppointments", "enableOrders",
    "planTier", "subscriptionStatus", "maxDoctors", "maxStaff", "maxPatients", "maxStorageMb", "maxBranches",
    "billingTiming", "defaultConsultFee", "trialEndsAt", "createdAt", "updatedAt"
  ) VALUES (
    v_solo_id, 'Dr. Arun Evening Clinic (Edappally)', 'dr-arun-solo', '9847010001', 'Near Edappally Toll, Kochi, Kerala', 'drarun@okicici', '#0f766e', 'teal', 'light', 'comfortable', 'rounded',
    'light', 'A4', 'en', '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM', 15,
    true, true, true, true, true, false,
    'SOLO', 'TRIAL', 1, 0, NULL, 10240, 1,
    'FLEXIBLE', 200, NOW() + INTERVAL '60 days', NOW(), NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO "Branch" (id, "clinicId", name, code, "isDefault", "isActive", "createdAt", "updatedAt")
  VALUES (v_solo_br, v_solo_id, 'Edappally Main', 'MAIN', true, true, NOW(), NOW())
  ON CONFLICT ("clinicId", code) DO NOTHING;

  INSERT INTO "User" (
    id, "clinicId", name, email, phone, "passwordHash", role, specialty, "registrationNo", "consultationFee",
    "defaultCaptureMode", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    v_solo_doc, v_solo_id, 'Dr. Arun Kumar', 'dr.arun@solo.in', '9847010001', v_hash, 'OWNER_DOCTOR', 'General Practice', 'TCMC-44219', 200,
    'HYBRID', true, NOW(), NOW()
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO "Patient" (
    id, "clinicId", "patientCode", name, phone, "ageYears", gender, place, allergies, "chronicConditions", "createdAt", "updatedAt"
  ) VALUES
    (v_solo_pt1, v_solo_id, 'PT-0001', 'Suresh Nair', '9847011223', 58, 'MALE', 'Edappally', 'Sulfa drugs', 'Type 2 DM, Hypertension', NOW(), NOW()),
    (v_solo_pt2, v_solo_id, 'PT-0002', 'Meera Suresh', '9847011223', 52, 'FEMALE', 'Edappally', NULL, 'Hypothyroidism', NOW(), NOW())
  ON CONFLICT ("clinicId", "patientCode") DO NOTHING;

  INSERT INTO "ClinicMedicinePreset" (
    id, "clinicId", "doctorId", "medicineName", "defaultDosage", "defaultTiming", "defaultDuration", "usageCount", "createdAt", "updatedAt"
  ) VALUES
    (gen_random_uuid()::text, v_solo_id, v_solo_doc, 'Tab. Paracetamol 650mg', '1-0-1', 'After food', 3, 18, NOW(), NOW()),
    (gen_random_uuid()::text, v_solo_id, v_solo_doc, 'Tab. Telmisartan 40mg', '1-0-0', 'After breakfast', 30, 15, NOW(), NOW()),
    (gen_random_uuid()::text, v_solo_id, v_solo_doc, 'Tab. Metformin 500mg SR', '1-0-1', 'After food', 30, 14, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  INSERT INTO "Appointment" (
    id, "clinicId", "branchId", "patientId", "doctorId", "scheduledAt", "durationMinutes", reason, status, "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, v_solo_id, v_solo_br, v_solo_pt1, v_solo_doc, NOW() + INTERVAL '4 hours', 15, 'BP + HbA1c review slot', 'CONFIRMED', NOW(), NOW()
  ) ON CONFLICT DO NOTHING;


  -- 3. CLINIC CORE TIER (Malabar Polyclinic & Care)
  INSERT INTO "Clinic" (
    id, name, slug, phone, address, "upiId", "brandColor", "themePreset", "colorMode", "uiDensity", "cardRadius",
    "sidebarTone", "printPaperSize", "whatsappLang", "workingHours", "slotDurationMin",
    "enablePublicBooking", "enableBilling", "enableFollowUps", "enableVitals", "enableAppointments", "enableOrders",
    "planTier", "subscriptionStatus", "maxDoctors", "maxStaff", "maxPatients", "maxStorageMb", "maxBranches",
    "billingTiming", "defaultConsultFee", "trialEndsAt", "createdAt", "updatedAt"
  ) VALUES (
    v_clinic_id, 'Malabar Polyclinic & Care (Kozhikode)', 'malabar-polyclinic', '9447020001', 'Mavoor Road, Kozhikode, Kerala', 'malabarclinic@okaxis', '#0369a1', 'blue', 'light', 'comfortable', 'rounded',
    'light', 'A4', 'en', '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM', 15,
    true, true, true, true, true, false,
    'CLINIC', 'TRIAL', 5, 5, NULL, 51200, 1,
    'FLEXIBLE', 300, NOW() + INTERVAL '60 days', NOW(), NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO "Branch" (id, "clinicId", name, code, "isDefault", "isActive", "createdAt", "updatedAt")
  VALUES (v_clinic_br, v_clinic_id, 'Mavoor Road Main', 'MAIN', true, true, NOW(), NOW())
  ON CONFLICT ("clinicId", code) DO NOTHING;

  INSERT INTO "User" (
    id, "clinicId", name, email, phone, "passwordHash", role, specialty, "consultationFee",
    "defaultCaptureMode", "isActive", "createdAt", "updatedAt"
  ) VALUES
    (v_clinic_doc1, v_clinic_id, 'Dr. Menon', 'owner@malabarclinic.in', '9447020001', v_hash, 'OWNER_DOCTOR', 'General Medicine', 300, 'HYBRID', true, NOW(), NOW()),
    (v_clinic_doc2, v_clinic_id, 'Dr. Fathima', 'dr.fathima@malabarclinic.in', '9447020002', v_hash, 'DOCTOR', 'Pediatrics', 350, 'HYBRID', true, NOW(), NOW()),
    (v_clinic_staff, v_clinic_id, 'Anitha (Front Desk)', 'staff@malabarclinic.in', '9447020009', v_hash, 'STAFF', NULL, NULL, 'HYBRID', true, NOW(), NOW())
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO "Patient" (
    id, "clinicId", "patientCode", name, phone, "ageYears", gender, place, "chronicConditions", "createdAt", "updatedAt"
  ) VALUES
    (v_clinic_pt1, v_clinic_id, 'PT-0001', 'Abdul Rahman', '9895033445', 61, 'MALE', 'Nadakkavu', 'Coronary Artery Disease, DM', NOW(), NOW()),
    (v_clinic_pt2, v_clinic_id, 'PT-0002', 'Aarav Krishna', '9895077889', 6, 'MALE', 'Mavoor Road', NULL, NOW(), NOW())
  ON CONFLICT ("clinicId", "patientCode") DO NOTHING;

  INSERT INTO "QueueEntry" (
    id, "clinicId", "branchId", "patientId", "doctorId", "queueDay", "tokenNumber", status, vitals, notes, "checkedInAt"
  ) VALUES
    (v_clinic_q1, v_clinic_id, v_clinic_br, v_clinic_pt1, v_clinic_doc1, TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD'), 1, 'WAITING', '{"bp": "132/82", "pulse": "74"}'::jsonb, 'Brought fresh blood lipid report', NOW()),
    (v_clinic_q2, v_clinic_id, v_clinic_br, v_clinic_pt2, v_clinic_doc2, TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD'), 2, 'WAITING', '{"temp": "101.0F", "weight": "21kg"}'::jsonb, 'Fever since morning', NOW())
  ON CONFLICT ("clinicId", "doctorId", "queueDay", "tokenNumber") DO NOTHING;

  INSERT INTO "BillingRecord" (
    id, "clinicId", "branchId", "queueEntryId", "patientId", "doctorId", "invoiceNumber", amount, discount, "netAmount", "paymentStatus", "paymentMode", "collectedAt", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, v_clinic_id, v_clinic_br, v_clinic_q1, v_clinic_pt1, v_clinic_doc1, 'INV-2026-0001', 300, 0, 300, 'PAID', 'UPI', NOW(), NOW(), NOW()
  ) ON CONFLICT DO NOTHING;


  -- 4. GROWTH TIER (Kochi Diagnostic & Polyclinic)
  INSERT INTO "Clinic" (
    id, name, slug, phone, address, "upiId", gstin, "brandColor", "themePreset", "colorMode", "uiDensity", "cardRadius",
    "sidebarTone", "printPaperSize", "whatsappLang", "workingHours", "slotDurationMin",
    "enablePublicBooking", "enableBilling", "enableFollowUps", "enableVitals", "enableAppointments", "enableOrders",
    "planTier", "subscriptionStatus", "maxDoctors", "maxStaff", "maxPatients", "maxStorageMb", "maxBranches",
    "billingTiming", "defaultConsultFee", "createdAt", "updatedAt"
  ) VALUES (
    v_growth_id, 'Kochi Diagnostic & Polyclinic', 'kerala-growth-center', '9447110055', 'MG Road, Ernakulam, Kerala', 'kochiclinic@okhdfcbank', '32AABCK1234F1Z5', '#0f766e', 'teal', 'light', 'comfortable', 'rounded',
    'light', 'A4', 'en', '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM', 15,
    true, true, true, true, true, true,
    'GROWTH', 'ACTIVE', 10, 15, NULL, 153600, 3,
    'FLEXIBLE', 400, NOW(), NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO "Branch" (id, "clinicId", name, code, "isDefault", "isActive", "createdAt", "updatedAt")
  VALUES (v_growth_br, v_growth_id, 'MG Road Diagnostic', 'MAIN', true, true, NOW(), NOW())
  ON CONFLICT ("clinicId", code) DO NOTHING;

  INSERT INTO "User" (
    id, "clinicId", name, email, phone, "passwordHash", role, specialty, "registrationNo", "consultationFee",
    "defaultCaptureMode", "isActive", "createdAt", "updatedAt"
  ) VALUES
    (v_growth_doc, v_growth_id, 'Dr. Harish Nair', 'growth@keralacare.in', '9447110055', v_hash, 'OWNER_DOCTOR', 'Internal Medicine', 'TCMC-21904', 400, 'HYBRID', true, NOW(), NOW()),
    (v_growth_staff, v_growth_id, 'Deepa (Lab & Desk)', 'lab@keralacare.in', NULL, v_hash, 'STAFF', NULL, NULL, NULL, 'HYBRID', true, NOW(), NOW())
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO "Patient" (
    id, "clinicId", "patientCode", name, phone, "ageYears", gender, place, allergies, "chronicConditions", "createdAt", "updatedAt"
  ) VALUES (
    v_growth_pt, v_growth_id, 'PT-0001', 'Thomas Varghese', '9847221100', 54, 'MALE', 'Thevara', 'Penicillin', 'Dyslipidemia, Type 2 DM', NOW(), NOW()
  ) ON CONFLICT ("clinicId", "patientCode") DO NOTHING;

  INSERT INTO "Visit" (
    id, "clinicId", "branchId", "patientId", "doctorId", "visitedAt", "chiefComplaint", diagnosis, "followUpDate", "followUpReason", "followUpStatus", "createdAt", "updatedAt"
  ) VALUES (
    v_growth_v, v_growth_id, v_growth_br, v_growth_pt, v_growth_doc, NOW() - INTERVAL '1 day', 'Annual metabolic review', 'Type 2 DM - stable', NOW() + INTERVAL '14 days', 'Fasting lipid + HbA1c check', 'PENDING', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO "ClinicalOrder" (
    id, "clinicId", "patientId", "visitId", "doctorId", "orderType", "itemName", instructions, status, amount, "createdAt", "updatedAt"
  ) VALUES
    (gen_random_uuid()::text, v_growth_id, v_growth_pt, v_growth_v, v_growth_doc, 'LAB_TEST', 'HbA1c + Fasting Lipid Profile', 'Fasting morning sample', 'READY', 850, NOW(), NOW()),
    (gen_random_uuid()::text, v_growth_id, v_growth_pt, v_growth_v, v_growth_doc, 'DISPENSARY', 'Metformin 500 SR (60 tabs)', NULL, 'DISPENSED', 240, NOW(), NOW())
  ON CONFLICT DO NOTHING;


  -- 5. ENTERPRISE TIER (Aster Kerala PolyNetwork)
  INSERT INTO "Clinic" (
    id, name, slug, phone, address, "upiId", gstin, "brandColor", "themePreset", "colorMode", "uiDensity", "cardRadius",
    "sidebarTone", "printPaperSize", "rxWatermark", "whatsappLang", "workingHours", "slotDurationMin",
    "enablePublicBooking", "enableBilling", "enableFollowUps", "enableVitals", "enableAppointments", "enableOrders",
    "planTier", "subscriptionStatus", "maxDoctors", "maxStaff", "maxPatients", "maxStorageMb", "maxBranches",
    "billingTiming", "defaultConsultFee", "createdAt", "updatedAt"
  ) VALUES (
    v_ent_id, 'Aster Kerala PolyNetwork', 'malabar-enterprise-group', '0484-2201100', 'Bypass Road, Kochi & Swaraj Round, Thrissur', 'asterkerala@okicici', '32AADCA9988L1Z2', '#4338ca', 'indigo', 'light', 'comfortable', 'rounded',
    'dark', 'A4', 'ASTER KERALA NETWORK', 'en', '9:00 AM - 1:30 PM, 4:30 PM - 8:30 PM', 15,
    true, true, true, true, true, true,
    'ENTERPRISE', 'ACTIVE', 25, 50, NULL, 512000, 10,
    'FLEXIBLE', 500, NOW(), NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO "Branch" (id, "clinicId", name, code, address, "isDefault", "isActive", "createdAt", "updatedAt")
  VALUES
    (v_ent_br1, v_ent_id, 'Kochi Flagship Center', 'COK-01', 'NH Bypass, Kochi', true, true, NOW(), NOW()),
    (v_ent_br2, v_ent_id, 'Thrissur Annex', 'TCR-02', 'Swaraj Round West, Thrissur', false, true, NOW(), NOW())
  ON CONFLICT ("clinicId", code) DO NOTHING;

  INSERT INTO "User" (
    id, "clinicId", "activeBranchId", name, email, "passwordHash", role, specialty, "registrationNo", "consultationFee",
    "defaultCaptureMode", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    v_ent_doc, v_ent_id, v_ent_br1, 'Dr. Radhakrishnan (Director)', 'enterprise@keralacare.in', v_hash, 'OWNER_DOCTOR', 'Cardiology & Medicine', 'TCMC-10821', 500,
    'HYBRID', true, NOW(), NOW()
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO "Patient" (
    id, "clinicId", "patientCode", name, phone, "ageYears", gender, place, "chronicConditions", "createdAt", "updatedAt"
  ) VALUES (
    v_ent_pt, v_ent_id, 'PT-0001', 'Lakshmi Menon', '9447556677', 63, 'FEMALE', 'Thrissur', 'Atrial Fibrillation, Hypertension', NOW(), NOW()
  ) ON CONFLICT ("clinicId", "patientCode") DO NOTHING;

END $$;
`;

fs.writeFileSync(path.join(__dirname, '..', 'prisma', 'seed.sql'), sql, 'utf8');
console.log('Successfully generated prisma/seed.sql');
