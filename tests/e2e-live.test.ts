import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'https://nadi-blush.vercel.app';

let sessionCookie = '';
let testPatientId = '';
let testVisitId = '';
let testAppointmentId = '';
let doctorId = '';
let clinicSlug = '';

test('E2E: 1. Auth Login and Me', async () => {
  // Invalid login check
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.arun@solo.in', password: 'wrongpassword' }),
  });
  assert.strictEqual(badLogin.status, 401);

  // Valid login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.arun@solo.in', password: 'pilot123' }),
  });
  assert.strictEqual(loginRes.status, 200);

  const rawCookie = loginRes.headers.get('set-cookie');
  assert.ok(rawCookie, 'Expected Set-Cookie header');
  sessionCookie = rawCookie.split(';')[0];

  // Verify /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, 'dr.arun@solo.in');
  assert.strictEqual(meData.user.role, 'OWNER_DOCTOR');
  doctorId = meData.user.id;
  clinicSlug = meData.user.clinic.slug;
});

test('E2E: 2. Patients API - List, Create, and Search', async () => {
  // 1. List patients
  const listRes = await fetch(`${BASE_URL}/api/patients`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData.patients));

  // 2. Create patient
  const createRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      name: 'Automated Test Patient',
      phone: '9876543210',
      ageYears: 30,
      gender: 'FEMALE',
      place: 'Kochi',
      allergies: 'Penicillin',
      notes: 'Automated test suite creation',
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  assert.ok(createData.patient.id);
  assert.strictEqual(createData.patient.name, 'Automated Test Patient');
  assert.ok(createData.patient.patientCode.startsWith('PT-'));
  testPatientId = createData.patient.id;

  // 3. Search for created patient
  const searchRes = await fetch(`${BASE_URL}/api/patients?q=Automated`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  const found = searchData.patients.some((p: { id: string }) => p.id === testPatientId);
  assert.ok(found, 'Created patient should be found in search');
});

test('E2E: 3. Consultation Visits API - Create and Retrieve Visit', async () => {
  assert.ok(testPatientId, 'Need patient id from previous test');

  // Create visit with vitals & prescriptions
  const visitRes = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      patientId: testPatientId,
      chiefComplaint: 'Mild fever and sore throat for 2 days',
      diagnosis: 'Acute Viral Pharyngitis',
      clinicalNotes: 'Throat congestion noted. Vitals stable.',
      vitals: { bp: '120/80', temp: '99.2 F', pulse: '78', weight: '65 kg' },
      prescriptions: [
        {
          medicineName: 'Paracetamol 650mg',
          dosage: '1 tab',
          timing: '1-0-1 after food',
          durationDays: 3,
          instructions: 'Take if fever > 100 F',
        },
      ],
      feeAmount: 300,
      paymentStatus: 'PAID',
      paymentMode: 'UPI',
    }),
  });

  assert.strictEqual(visitRes.status, 201);
  const visitData = await visitRes.json();
  assert.ok(visitData.visit.id);
  assert.strictEqual(visitData.visit.diagnosis, 'Acute Viral Pharyngitis');
  assert.strictEqual(visitData.visit.prescriptions.length, 1);
  testVisitId = visitData.visit.id;

  // Check patient chart now contains this visit
  const chartRes = await fetch(`${BASE_URL}/api/patients/${testPatientId}`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(chartRes.status, 200);
  const chartData = await chartRes.json();
  assert.strictEqual(chartData.patient.visits.length, 1);
  assert.strictEqual(chartData.patient.visits[0].id, testVisitId);
});

test('E2E: 4. Appointments API - Schedule and List', async () => {
  assert.ok(testPatientId, 'Need patient id');
  assert.ok(doctorId, 'Need doctor id');

  // Dynamic slot to prevent collisions across repeated test runs
  const dayOffset = 30 + Math.floor(Math.random() * 60);
  const targetDate = new Date(Date.now() + dayOffset * 86400000);
  const day = targetDate.toISOString().slice(0, 10);
  const hour = 10 + Math.floor(Math.random() * 7);
  const min = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
  const time = `${String(hour).padStart(2, '0')}:${min}`;

  // Create appointment with dynamic day and time
  const apptRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      patientId: testPatientId,
      doctorId,
      day,
      time,
      reason: 'Routine Follow-up',
    }),
  });

  assert.strictEqual(apptRes.status, 201);
  const apptData = await apptRes.json();
  assert.ok(apptData.appointment.id);
  assert.strictEqual(apptData.appointment.reason, 'Routine Follow-up');
  testAppointmentId = apptData.appointment.id;
});

test('E2E: 5. Billing API - List and Verify Invoices', async () => {
  const billingRes = await fetch(`${BASE_URL}/api/billing`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(billingRes.status, 200);
  const billingData = await billingRes.json();
  assert.ok(Array.isArray(billingData.records));
});

test('E2E: 6. Public Booking & Web App Pages Load', async () => {
  // Public booking page using clinic's actual slug
  const bookRes = await fetch(`${BASE_URL}/book/${clinicSlug}`);
  assert.strictEqual(bookRes.status, 200);
  const bookHtml = await bookRes.text();
  assert.ok(bookHtml.includes('booking') || bookHtml.includes('Clinic') || bookHtml.includes('Doctor'));

  // Main app page
  const appRes = await fetch(`${BASE_URL}/app`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(appRes.status, 200);

  // Settings page
  const settingsRes = await fetch(`${BASE_URL}/app/settings`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(settingsRes.status, 200);
});

test('E2E: 7. Cleanup Test Data', async () => {
  if (testAppointmentId) {
    const cancelRes = await fetch(`${BASE_URL}/api/appointments/${testAppointmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.ok(cancelRes.status === 200 || cancelRes.status === 404);
  }

  if (testPatientId) {
    const deleteRes = await fetch(`${BASE_URL}/api/patients/${testPatientId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    // 200 once deployed, 405 if testing against older deployment
    assert.ok(deleteRes.status === 200 || deleteRes.status === 405);
  }
});
