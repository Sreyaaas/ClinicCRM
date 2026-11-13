import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { getIstDayString } from '../src/lib/date';
import { PLAN_DEFAULTS } from '../src/lib/plans';

const prisma = new PrismaClient();

async function ensureStarterTemplatesAndBranch(clinicId: string, doctorId: string, branchName = 'Main Clinic') {
  const [branchCount, templateCount] = await Promise.all([
    prisma.branch.count({ where: { clinicId } }),
    prisma.conditionTemplate.count({ where: { clinicId } }),
  ]);

  if (branchCount === 0) {
    await prisma.branch.create({
      data: { clinicId, name: branchName, code: 'MAIN', isDefault: true, isActive: true },
    });
  }

  if (templateCount === 0) {
    await prisma.conditionTemplate.createMany({
      data: [
        {
          clinicId,
          doctorId,
          name: 'Viral Fever Pack',
          diagnosis: 'Acute Viral Fever',
          clinicalNotes: 'Hydration & rest. Review if fever persists beyond 3 days.',
          followUpDays: 3,
          usageCount: 12,
          medicines: [
            { medicineName: 'Tab. Paracetamol 650mg', dosage: '1-0-1', timing: 'After food', durationDays: 3 },
            { medicineName: 'Tab. Cetirizine 10mg', dosage: '0-0-1', timing: 'At bedtime', durationDays: 5 },
          ],
        },
        {
          clinicId,
          doctorId,
          name: 'DM + HTN 30D Review',
          diagnosis: 'Type 2 Diabetes & Essential Hypertension',
          clinicalNotes: 'Low salt diet, 30m daily walk. Bring FBS/PPBS on next visit.',
          followUpDays: 30,
          usageCount: 19,
          medicines: [
            { medicineName: 'Tab. Telmisartan 40mg', dosage: '1-0-0', timing: 'After breakfast', durationDays: 30 },
            { medicineName: 'Tab. Metformin 500mg SR', dosage: '1-0-1', timing: 'After food', durationDays: 30 },
          ],
        },
      ],
    });
  }
}

async function main() {
  const passwordHash = hashPassword('pilot123');
  const todayIst = getIstDayString();
  const todayNoon = new Date(`${todayIst}T12:00:00.000+05:30`);
  const todayEvening = new Date(`${todayIst}T17:30:00.000+05:30`);
  const yesterday = new Date(todayNoon.getTime() - 24 * 60 * 60 * 1000);
  const lastMonth = new Date(todayNoon.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Starter Pilot (Free tier)
  const existingStarter = await prisma.clinic.findUnique({ where: { slug: 'starter-evening' } });
  if (!existingStarter) {
    const p = PLAN_DEFAULTS.STARTER;
    const clinic = await prisma.clinic.create({
      data: {
        name: 'Dr. Kavya Evening Practice',
        slug: 'starter-evening',
        phone: '9847001122',
        address: 'Palarivattom, Kochi',
        planTier: 'STARTER',
        subscriptionStatus: 'TRIAL',
        maxDoctors: p.maxDoctors,
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
        maxStorageMb: p.maxStorageMb,
        maxBranches: p.maxBranches,
        enableBilling: false,
        enableAppointments: false,
        enableOrders: false,
        trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });
    const doc = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name: 'Dr. Kavya Menon',
        email: 'starter@pilot.in',
        passwordHash,
        role: 'OWNER_DOCTOR',
        specialty: 'Family Medicine',
        consultationFee: 150,
      },
    });
    await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        patientCode: 'PT-0001',
        name: 'Ramesh Pillai',
        phone: '9847099881',
        ageYears: 44,
        gender: 'MALE',
        place: 'Palarivattom',
      },
    });
    await ensureStarterTemplatesAndBranch(clinic.id, doc.id);
  }

  // 2. Solo Pilot (Dr. Arun)
  let soloClinic = await prisma.clinic.findUnique({ where: { slug: 'dr-arun-solo' } });
  if (!soloClinic) {
    const p = PLAN_DEFAULTS.SOLO;
    soloClinic = await prisma.clinic.create({
      data: {
        name: 'Dr. Arun Evening Clinic (Edappally)',
        slug: 'dr-arun-solo',
        phone: '9847010001',
        address: 'Near Edappally Toll, Kochi, Kerala',
        upiId: 'drarun@okicici',
        planTier: 'SOLO',
        subscriptionStatus: 'TRIAL',
        maxDoctors: p.maxDoctors,
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
        maxStorageMb: p.maxStorageMb,
        maxBranches: p.maxBranches,
        billingTiming: 'FLEXIBLE',
        defaultConsultFee: 200,
        trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    const drArun = await prisma.user.create({
      data: {
        clinicId: soloClinic.id,
        name: 'Dr. Arun Kumar',
        email: 'dr.arun@solo.in',
        phone: '9847010001',
        passwordHash,
        role: 'OWNER_DOCTOR',
        specialty: 'General Practice',
        registrationNo: 'TCMC-44219',
        consultationFee: 200,
      },
    });

    await prisma.clinicMedicinePreset.createMany({
      data: [
        {
          clinicId: soloClinic.id,
          doctorId: drArun.id,
          medicineName: 'Tab. Paracetamol 650mg',
          defaultDosage: '1-0-1',
          defaultTiming: 'After food',
          defaultDuration: 3,
          usageCount: 18,
        },
        {
          clinicId: soloClinic.id,
          doctorId: drArun.id,
          medicineName: 'Tab. Telmisartan 40mg',
          defaultDosage: '1-0-0',
          defaultTiming: 'After breakfast',
          defaultDuration: 30,
          usageCount: 15,
        },
        {
          clinicId: soloClinic.id,
          doctorId: drArun.id,
          medicineName: 'Tab. Metformin 500mg SR',
          defaultDosage: '1-0-1',
          defaultTiming: 'After food',
          defaultDuration: 30,
          usageCount: 14,
        },
        {
          clinicId: soloClinic.id,
          doctorId: drArun.id,
          medicineName: 'Tab. Azithromycin 500mg',
          defaultDosage: '1-0-0',
          defaultTiming: '1 hr before food',
          defaultDuration: 3,
          usageCount: 10,
        },
      ],
    });

    const p1 = await prisma.patient.create({
      data: {
        clinicId: soloClinic.id,
        patientCode: 'PT-0001',
        name: 'Suresh Nair',
        phone: '9847011223',
        ageYears: 58,
        gender: 'MALE',
        place: 'Edappally',
        allergies: 'Sulfa drugs',
        chronicConditions: 'Type 2 DM, Hypertension',
      },
    });

    const p2 = await prisma.patient.create({
      data: {
        clinicId: soloClinic.id,
        patientCode: 'PT-0002',
        name: 'Meera Suresh',
        phone: '9847011223',
        ageYears: 52,
        gender: 'FEMALE',
        place: 'Edappally',
        chronicConditions: 'Hypothyroidism',
      },
    });

    await prisma.visit.create({
      data: {
        clinicId: soloClinic.id,
        patientId: p1.id,
        doctorId: drArun.id,
        visitedAt: lastMonth,
        chiefComplaint: 'Routine BP + Sugar review, mild fatigue',
        vitals: { bp: '142/88', weight: '74kg' },
        diagnosis: 'Essential Hypertension & Type 2 DM',
        clinicalNotes: 'Advised low salt diet + repeat FBS/HbA1c on next visit.',
        followUpDate: todayNoon,
        followUpReason: '30-day BP/Sugar review + lab check',
        followUpStatus: 'PENDING',
        prescriptions: {
          create: [
            {
              clinicId: soloClinic.id,
              medicineName: 'Tab. Telmisartan 40mg',
              dosage: '1-0-0',
              timing: 'After breakfast',
              durationDays: 30,
              sortOrder: 0,
            },
            {
              clinicId: soloClinic.id,
              medicineName: 'Tab. Metformin 500mg SR',
              dosage: '1-0-1',
              timing: 'After food',
              durationDays: 30,
              sortOrder: 1,
            },
          ],
        },
      },
    });

    await prisma.visit.create({
      data: {
        clinicId: soloClinic.id,
        patientId: p2.id,
        doctorId: drArun.id,
        visitedAt: yesterday,
        chiefComplaint: 'Sore throat and low-grade fever x 2 days',
        vitals: { temp: '100.2F', spo2: '99%' },
        diagnosis: 'Acute Pharyngitis',
        clinicalNotes: 'Warm saline gargles advised.',
        prescriptions: {
          create: [
            {
              clinicId: soloClinic.id,
              medicineName: 'Tab. Paracetamol 650mg',
              dosage: '1-0-1',
              timing: 'After food',
              durationDays: 3,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    await prisma.appointment.create({
      data: {
        clinicId: soloClinic.id,
        patientId: p1.id,
        doctorId: drArun.id,
        scheduledAt: todayEvening,
        reason: 'BP + HbA1c review slot',
        status: 'CONFIRMED',
      },
    });

    await ensureStarterTemplatesAndBranch(soloClinic.id, drArun.id, 'Edappally Main');
  } else {
    const arunUser = await prisma.user.findFirst({ where: { clinicId: soloClinic.id } });
    if (arunUser) {
      await ensureStarterTemplatesAndBranch(soloClinic.id, arunUser.id, 'Edappally Main');
      await prisma.clinic.update({
        where: { id: soloClinic.id },
        data: {
          planTier: 'SOLO',
          maxDoctors: PLAN_DEFAULTS.SOLO.maxDoctors,
          maxStaff: PLAN_DEFAULTS.SOLO.maxStaff,
          maxPatients: PLAN_DEFAULTS.SOLO.maxPatients,
          maxStorageMb: PLAN_DEFAULTS.SOLO.maxStorageMb,
          maxBranches: PLAN_DEFAULTS.SOLO.maxBranches,
          enableBilling: true,
          enableAppointments: true,
          enablePublicBooking: true,
          upiId: soloClinic.upiId ?? 'drarun@okicici',
        },
      });
      const apptCount = await prisma.appointment.count({ where: { clinicId: soloClinic.id } });
      const firstPt = await prisma.patient.findFirst({ where: { clinicId: soloClinic.id } });
      if (apptCount === 0 && firstPt) {
        await prisma.appointment.create({
          data: {
            clinicId: soloClinic.id,
            patientId: firstPt.id,
            doctorId: arunUser.id,
            scheduledAt: todayEvening,
            reason: 'Evening review slot',
            status: 'CONFIRMED',
          },
        });
      }
    }
  }

  // 3. Clinic Core Pilot (5-Doctor Polyclinic)
  let polyClinic = await prisma.clinic.findUnique({ where: { slug: 'malabar-polyclinic' } });
  if (!polyClinic) {
    const p = PLAN_DEFAULTS.CLINIC;
    polyClinic = await prisma.clinic.create({
      data: {
        name: 'Malabar Polyclinic & Care (Kozhikode)',
        slug: 'malabar-polyclinic',
        phone: '9447020001',
        address: 'Mavoor Road, Kozhikode, Kerala',
        upiId: 'malabarclinic@okaxis',
        planTier: 'CLINIC',
        subscriptionStatus: 'TRIAL',
        maxDoctors: p.maxDoctors,
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
        maxStorageMb: p.maxStorageMb,
        maxBranches: p.maxBranches,
        billingTiming: 'FLEXIBLE',
        defaultConsultFee: 300,
        trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    const drMenon = await prisma.user.create({
      data: {
        clinicId: polyClinic.id,
        name: 'Dr. Menon',
        email: 'owner@malabarclinic.in',
        phone: '9447020001',
        passwordHash,
        role: 'OWNER_DOCTOR',
        specialty: 'General Medicine',
        consultationFee: 300,
      },
    });

    const drFathima = await prisma.user.create({
      data: {
        clinicId: polyClinic.id,
        name: 'Dr. Fathima',
        email: 'dr.fathima@malabarclinic.in',
        phone: '9447020002',
        passwordHash,
        role: 'DOCTOR',
        specialty: 'Pediatrics',
        consultationFee: 350,
      },
    });

    await prisma.user.createMany({
      data: [
        {
          clinicId: polyClinic.id,
          name: 'Dr. Joseph',
          email: 'dr.joseph@malabarclinic.in',
          passwordHash,
          role: 'DOCTOR',
          specialty: 'Orthopedics',
          consultationFee: 400,
        },
        {
          clinicId: polyClinic.id,
          name: 'Dr. Lakshmi',
          email: 'dr.lakshmi@malabarclinic.in',
          passwordHash,
          role: 'DOCTOR',
          specialty: 'Dermatology',
          consultationFee: 350,
        },
        {
          clinicId: polyClinic.id,
          name: 'Dr. Rahul',
          email: 'dr.rahul@malabarclinic.in',
          passwordHash,
          role: 'DOCTOR',
          specialty: 'ENT',
          consultationFee: 300,
        },
        {
          clinicId: polyClinic.id,
          name: 'Anitha (Front Desk)',
          email: 'staff@malabarclinic.in',
          phone: '9447020009',
          passwordHash,
          role: 'STAFF',
        },
      ],
    });

    await prisma.clinicMedicinePreset.createMany({
      data: [
        {
          clinicId: polyClinic.id,
          medicineName: 'Tab. Paracetamol 650mg',
          defaultDosage: '1-0-1',
          defaultTiming: 'After food',
          defaultDuration: 3,
          usageCount: 25,
        },
        {
          clinicId: polyClinic.id,
          medicineName: 'Syp. Calpol 250mg/5ml',
          defaultDosage: '5 ml SOS',
          defaultTiming: 'After food',
          defaultDuration: 3,
          usageCount: 18,
        },
        {
          clinicId: polyClinic.id,
          medicineName: 'Tab. Pantoprazole 40mg',
          defaultDosage: '1-0-0',
          defaultTiming: 'Before breakfast',
          defaultDuration: 5,
          usageCount: 20,
        },
      ],
    });

    const cp1 = await prisma.patient.create({
      data: {
        clinicId: polyClinic.id,
        patientCode: 'PT-0001',
        name: 'Abdul Rahman',
        phone: '9895033445',
        ageYears: 61,
        gender: 'MALE',
        place: 'Nadakkavu',
        chronicConditions: 'Coronary Artery Disease, DM',
      },
    });

    const cp2 = await prisma.patient.create({
      data: {
        clinicId: polyClinic.id,
        patientCode: 'PT-0002',
        name: 'Aarav Krishna',
        phone: '9895077889',
        ageYears: 6,
        gender: 'MALE',
        place: 'Mavoor Road',
        allergies: 'None known',
      },
    });

    const q1 = await prisma.queueEntry.create({
      data: {
        clinicId: polyClinic.id,
        patientId: cp1.id,
        doctorId: drMenon.id,
        queueDay: todayIst,
        tokenNumber: 1,
        status: 'WAITING',
        vitals: { bp: '132/82', pulse: '74', spo2: '98%' },
        notes: 'Brought fresh blood lipid report for scan.',
      },
    });

    const q2 = await prisma.queueEntry.create({
      data: {
        clinicId: polyClinic.id,
        patientId: cp2.id,
        doctorId: drFathima.id,
        queueDay: todayIst,
        tokenNumber: 1,
        status: 'WAITING',
        vitals: { temp: '101.0F', weight: '21kg' },
        notes: 'Fever since morning',
      },
    });

    await prisma.billingRecord.createMany({
      data: [
        {
          clinicId: polyClinic.id,
          queueEntryId: q1.id,
          patientId: cp1.id,
          doctorId: drMenon.id,
          invoiceNumber: 'INV-2026-0001',
          amount: 300,
          discount: 0,
          netAmount: 300,
          paymentStatus: 'PAID',
          paymentMode: 'UPI',
          collectedAt: new Date(),
        },
        {
          clinicId: polyClinic.id,
          queueEntryId: q2.id,
          patientId: cp2.id,
          doctorId: drFathima.id,
          invoiceNumber: 'INV-2026-0002',
          amount: 350,
          discount: 0,
          netAmount: 350,
          paymentStatus: 'UNPAID',
        },
      ],
    });
    await ensureStarterTemplatesAndBranch(polyClinic.id, drMenon.id, 'Mavoor Road Main');
  } else {
    const owner = await prisma.user.findFirst({ where: { clinicId: polyClinic.id, role: 'OWNER_DOCTOR' } });
    if (owner) await ensureStarterTemplatesAndBranch(polyClinic.id, owner.id, 'Mavoor Road Main');
    const expCount = await prisma.expense.count({ where: { clinicId: polyClinic.id } });
    if (expCount === 0) {
      await prisma.expense.createMany({
        data: [
          {
            clinicId: polyClinic.id,
            category: 'SUPPLIES',
            title: 'Exam Gloves & Cotton Roll',
            amount: 280,
            paymentMode: 'CASH',
          },
          {
            clinicId: polyClinic.id,
            category: 'OTHER',
            title: 'Desk Stationery & Tea',
            amount: 120,
            paymentMode: 'CASH',
          },
        ],
      });
    }
    if (polyClinic.themePreset === 'teal') {
      await prisma.clinic.update({
        where: { id: polyClinic.id },
        data: { themePreset: 'blue', brandColor: '#0369a1' },
      });
    }
  }

  // 4. Growth Diagnostic Clinic Pilot (₹1,299 tier)
  const existingGrowth = await prisma.clinic.findUnique({ where: { slug: 'kerala-growth-center' } });
  if (!existingGrowth) {
    const p = PLAN_DEFAULTS.GROWTH;
    const gClinic = await prisma.clinic.create({
      data: {
        name: 'Kochi Diagnostic & Polyclinic',
        slug: 'kerala-growth-center',
        phone: '9447110055',
        address: 'MG Road, Ernakulam, Kerala',
        upiId: 'kochiclinic@okhdfcbank',
        gstin: '32AABCK1234F1Z5',
        planTier: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
        maxDoctors: p.maxDoctors,
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
        maxStorageMb: p.maxStorageMb,
        maxBranches: p.maxBranches,
        enableOrders: true,
        defaultConsultFee: 400,
      },
    });
    const drNair = await prisma.user.create({
      data: {
        clinicId: gClinic.id,
        name: 'Dr. Harish Nair',
        email: 'growth@keralacare.in',
        passwordHash,
        role: 'OWNER_DOCTOR',
        specialty: 'Internal Medicine',
        registrationNo: 'TCMC-21904',
        consultationFee: 400,
      },
    });
    const gStaff = await prisma.user.create({
      data: {
        clinicId: gClinic.id,
        name: 'Deepa (Lab & Desk)',
        email: 'lab@keralacare.in',
        passwordHash,
        role: 'STAFF',
      },
    });

    const pt1 = await prisma.patient.create({
      data: {
        clinicId: gClinic.id,
        patientCode: 'PT-0001',
        name: 'Thomas Varghese',
        phone: '9847221100',
        ageYears: 54,
        gender: 'MALE',
        place: 'Thevara',
        allergies: 'Penicillin',
        chronicConditions: 'Dyslipidemia, Type 2 DM',
      },
    });

    const v1 = await prisma.visit.create({
      data: {
        clinicId: gClinic.id,
        patientId: pt1.id,
        doctorId: drNair.id,
        visitedAt: yesterday,
        chiefComplaint: 'Annual metabolic review',
        diagnosis: 'Type 2 DM - stable',
        followUpDate: todayNoon,
        followUpReason: 'Fasting lipid + HbA1c report check',
        prescriptions: {
          create: [
            { clinicId: gClinic.id, medicineName: 'Tab. Metformin 500mg SR', dosage: '1-0-1', timing: 'After food', durationDays: 30 },
          ],
        },
      },
    });

    await prisma.clinicalOrder.createMany({
      data: [
        {
          clinicId: gClinic.id,
          patientId: pt1.id,
          visitId: v1.id,
          doctorId: drNair.id,
          orderType: 'LAB_TEST',
          itemName: 'HbA1c + Fasting Lipid Profile',
          instructions: 'Fasting morning sample',
          status: 'READY',
          amount: 850,
        },
        {
          clinicId: gClinic.id,
          patientId: pt1.id,
          visitId: v1.id,
          doctorId: drNair.id,
          orderType: 'DISPENSARY',
          itemName: 'Metformin 500 SR (60 tabs)',
          status: 'DISPENSED',
          amount: 240,
        },
      ],
    });

    await prisma.billingRecord.create({
      data: {
        clinicId: gClinic.id,
        visitId: v1.id,
        patientId: pt1.id,
        doctorId: drNair.id,
        invoiceNumber: 'INV-2026-0001',
        amount: 1490,
        discount: 90,
        gstRatePercent: 5,
        gstAmount: 70,
        netAmount: 1470,
        lineItems: [
          { label: 'OPD Consultation', category: 'CONSULTATION', qty: 1, unitPrice: 400, total: 400 },
          { label: 'HbA1c + Lipid Profile', category: 'LAB', qty: 1, unitPrice: 850, total: 850 },
          { label: 'Dispensary Meds', category: 'PHARMACY', qty: 1, unitPrice: 240, total: 240 },
        ],
        paymentStatus: 'PAID',
        paymentMode: 'UPI',
        collectedByUserId: gStaff.id,
        collectedAt: yesterday,
      },
    });

    await prisma.auditLog.create({
      data: {
        clinicId: gClinic.id,
        actorUserId: drNair.id,
        actorName: drNair.name,
        action: 'CLINIC_GROWTH_ACTIVE',
        entityType: 'Clinic',
        entityId: gClinic.id,
        summary: 'Initialized Kochi Diagnostic & Polyclinic with Lab/Dispensary & GST enabled.',
      },
    });

    await ensureStarterTemplatesAndBranch(gClinic.id, drNair.id, 'MG Road Diagnostic');
  } else {
    const expCount = await prisma.expense.count({ where: { clinicId: existingGrowth.id } });
    if (expCount === 0) {
      await prisma.expense.create({
        data: {
          clinicId: existingGrowth.id,
          category: 'UTILITIES',
          title: 'Lab Reagents & Electricity',
          amount: 450,
          paymentMode: 'UPI',
          spentOn: yesterday,
        },
      });
    }
  }

  // 5. Enterprise Multi-Branch Pilot (₹2,999 tier)
  const existingEnt = await prisma.clinic.findUnique({ where: { slug: 'malabar-enterprise-group' } });
  if (!existingEnt) {
    const p = PLAN_DEFAULTS.ENTERPRISE;
    const eClinic = await prisma.clinic.create({
      data: {
        name: 'Aster Kerala PolyNetwork',
        slug: 'malabar-enterprise-group',
        phone: '0484-2201100',
        address: 'Bypass Road, Kochi & Swaraj Round, Thrissur',
        upiId: 'asterkerala@okicici',
        gstin: '32AADCA9988L1Z2',
        brandColor: '#4338ca',
        themePreset: 'indigo',
        sidebarTone: 'dark',
        rxWatermark: 'ASTER KERALA NETWORK',
        planTier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        maxDoctors: p.maxDoctors,
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
        maxStorageMb: p.maxStorageMb,
        maxBranches: p.maxBranches,
        enableOrders: true,
        defaultConsultFee: 500,
      },
    });

    const br1 = await prisma.branch.create({
      data: {
        clinicId: eClinic.id,
        name: 'Kochi Flagship Center',
        code: 'COK-01',
        address: 'NH Bypass, Kochi',
        isDefault: true,
      },
    });
    await prisma.branch.create({
      data: {
        clinicId: eClinic.id,
        name: 'Thrissur Annex',
        code: 'TCR-02',
        address: 'Swaraj Round West, Thrissur',
        isDefault: false,
      },
    });

    const eOwner = await prisma.user.create({
      data: {
        clinicId: eClinic.id,
        activeBranchId: br1.id,
        name: 'Dr. Radhakrishnan (Director)',
        email: 'enterprise@keralacare.in',
        passwordHash,
        role: 'OWNER_DOCTOR',
        specialty: 'Cardiology & Medicine',
        registrationNo: 'TCMC-10821',
        consultationFee: 500,
      },
    });

    await prisma.patient.create({
      data: {
        clinicId: eClinic.id,
        patientCode: 'PT-0001',
        name: 'Lakshmi Menon',
        phone: '9447556677',
        ageYears: 63,
        gender: 'FEMALE',
        place: 'Thrissur',
        chronicConditions: 'Atrial Fibrillation, Hypertension',
      },
    });

    await ensureStarterTemplatesAndBranch(eClinic.id, eOwner.id, 'Kochi Flagship Center');
  } else {
    await prisma.clinic.update({
      where: { id: existingEnt.id },
      data: {
        brandColor: '#4338ca',
        themePreset: 'indigo',
        sidebarTone: 'dark',
        rxWatermark: 'ASTER KERALA NETWORK',
      },
    });
  }

  console.log('Seeded all 5 tiers (Starter, Solo, Clinic, Growth, Enterprise) successfully.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
