import test from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword } from '../src/lib/password';

test('Password hashing produces distinct salt and hash', () => {
  const hash1 = hashPassword('pilot123');
  const hash2 = hashPassword('pilot123');

  assert.ok(hash1.includes(':'));
  assert.ok(hash2.includes(':'));
  // Due to unique salts, two hashes of the same password must differ
  assert.notStrictEqual(hash1, hash2);
});

test('Password verification succeeds for correct password', () => {
  const password = 'SecuRe-Clinic-Pass@2026!';
  const hash = hashPassword(password);

  assert.strictEqual(verifyPassword(password, hash), true);
});

test('Password verification rejects wrong password and malformed hashes', () => {
  const hash = hashPassword('correctPassword');

  assert.strictEqual(verifyPassword('wrongPassword', hash), false);
  assert.strictEqual(verifyPassword('correctPassword', 'invalidhashstring'), false);
  assert.strictEqual(verifyPassword('correctPassword', ''), false);
  assert.strictEqual(verifyPassword('correctPassword', 'salt:short'), false);
});
