import test from 'node:test';
import assert from 'node:assert';
import { decodeJwt } from 'jose';
import {
  createPasswordResetToken,
  verifyResetTokenSignature,
} from '../src/lib/password-reset';

test('Password Reset Token: generates valid 15-minute expiring JWT', async () => {
  const dummyUser = {
    id: 'user_test_123',
    email: 'doctor@keralaclinic.in',
    passwordHash: 'salt_abc:hash_xyz',
  };

  const token = await createPasswordResetToken(dummyUser);
  assert.ok(token);
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.split('.').length, 3);

  const decoded = decodeJwt(token);
  assert.strictEqual(decoded.sub, dummyUser.id);
  assert.strictEqual(decoded.email, dummyUser.email);
  assert.strictEqual(decoded.purpose, 'password_reset');

  // Verify expiry is ~15 minutes (900 seconds) from issued time
  assert.ok(decoded.exp && decoded.iat);
  const diffSec = decoded.exp - decoded.iat;
  assert.strictEqual(diffSec, 900);
});

test('Password Reset Token: verifies successfully with matching password hash', async () => {
  const dummyUser = {
    id: 'user_test_456',
    email: 'dr.arun@solo.in',
    passwordHash: 'salt_123:hash_789',
  };

  const token = await createPasswordResetToken(dummyUser);
  const result = await verifyResetTokenSignature(token, dummyUser.passwordHash);

  assert.ok(result);
  assert.strictEqual(result.userId, dummyUser.id);
  assert.strictEqual(result.email, dummyUser.email);
});

test('Password Reset Token: self-invalidates immediately when password hash changes', async () => {
  const dummyUser = {
    id: 'user_test_789',
    email: 'owner@malabarclinic.in',
    passwordHash: 'initial_salt:initial_hash',
  };

  const token = await createPasswordResetToken(dummyUser);

  // Verification succeeds with original password hash
  const initialVerify = await verifyResetTokenSignature(token, dummyUser.passwordHash);
  assert.ok(initialVerify);

  // Simulate password update: passwordHash in database is now updated
  const newPasswordHash = 'new_salt:new_hash_after_reset';
  const updatedVerify = await verifyResetTokenSignature(token, newPasswordHash);

  // The token MUST fail verification because secret depends on passwordHash
  assert.strictEqual(updatedVerify, null);
});

test('Password Reset Token: rejects tampered or invalid tokens', async () => {
  const dummyUser = {
    id: 'user_tamper_001',
    email: 'hacker@test.com',
    passwordHash: 'salt_tamper:hash_tamper',
  };

  const token = await createPasswordResetToken(dummyUser);
  const tamperedToken = token.slice(0, -6) + 'abcdef';

  const result = await verifyResetTokenSignature(tamperedToken, dummyUser.passwordHash);
  assert.strictEqual(result, null);

  const completelyBogus = await verifyResetTokenSignature('not.a.valid.jwt', dummyUser.passwordHash);
  assert.strictEqual(completelyBogus, null);
});
