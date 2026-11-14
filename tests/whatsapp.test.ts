import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeIndianPhone,
  buildWhatsAppLink,
  buildFollowUpMessage,
  buildVisitSummaryMessage,
} from '../src/lib/whatsapp';

test('WhatsApp Phone Normalization: handles 10-digit, 0-prefix, and international format', () => {
  assert.strictEqual(normalizeIndianPhone('9876543210'), '919876543210');
  assert.strictEqual(normalizeIndianPhone('09876543210'), '919876543210');
  assert.strictEqual(normalizeIndianPhone('+91 98765 43210'), '919876543210');
  assert.strictEqual(normalizeIndianPhone('919876543210'), '919876543210');
});

test('WhatsApp Link Generation creates valid wa.me URI', () => {
  const link = buildWhatsAppLink('9876543210', 'Your appointment is confirmed');
  assert.ok(link.startsWith('https://wa.me/919876543210?text='));
  assert.ok(link.includes(encodeURIComponent('Your appointment is confirmed')));
});

test('WhatsApp Follow-up Message formats correctly in English and Malayalam', () => {
  const enMsg = buildFollowUpMessage({
    patientName: 'Rahul',
    clinicName: 'Nadi Health',
    doctorName: 'Dr. Arun',
    followUpDateText: '20 Nov 2026',
    reason: 'BP Review',
    lang: 'en',
  });
  assert.ok(enMsg.includes('Rahul'));
  assert.ok(enMsg.includes('Nadi Health'));
  assert.ok(enMsg.includes('20 Nov 2026'));
  assert.ok(enMsg.includes('BP Review'));

  const mlMsg = buildFollowUpMessage({
    patientName: 'Rahul',
    clinicName: 'Nadi Health',
    followUpDateText: '20 Nov 2026',
    lang: 'ml',
  });
  assert.ok(mlMsg.includes('നമസ്കാരം Rahul'));
  assert.ok(mlMsg.includes('20 Nov 2026'));
});

test('WhatsApp Prescription Visit Summary formatting', () => {
  const summary = buildVisitSummaryMessage({
    patientName: 'Amina',
    clinicName: 'City Clinic',
    doctorName: 'Dr. Arun',
    registrationNo: 'KMC 48291',
    visitDateText: '15 Nov 2026',
    items: [
      { medicineName: 'Paracetamol 650mg', dosage: '1 tab', timing: '1-0-1', durationDays: 3 },
    ],
    lang: 'en',
  });

  assert.ok(summary.includes('City Clinic'));
  assert.ok(summary.includes('Amina'));
  assert.ok(summary.includes('Dr. Arun (KMC 48291)'));
  assert.ok(summary.includes('Paracetamol 650mg'));
});
