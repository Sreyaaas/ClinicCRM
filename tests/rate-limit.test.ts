import test from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, getClientIp, assertRateLimit, RateLimitError } from '../src/lib/rate-limit';

test('Rate Limiter: allows requests within threshold and blocks excess', () => {
  const testKey = `test-limit-${Date.now()}`;
  const limit = 3;
  const windowMs = 5000;

  // First 3 requests allowed
  const r1 = checkRateLimit(testKey, limit, windowMs);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r1.remaining, 2);

  const r2 = checkRateLimit(testKey, limit, windowMs);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r2.remaining, 1);

  const r3 = checkRateLimit(testKey, limit, windowMs);
  assert.strictEqual(r3.allowed, true);
  assert.strictEqual(r3.remaining, 0);

  // 4th request blocked
  const r4 = checkRateLimit(testKey, limit, windowMs);
  assert.strictEqual(r4.allowed, false);
  assert.strictEqual(r4.remaining, 0);
  assert.ok(r4.retryAfterSeconds > 0);
});

test('Rate Limiter: extracts client IP correctly from x-forwarded-for header', () => {
  const req1 = new Request('https://nadi.in/api/test', {
    headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
  });
  assert.strictEqual(getClientIp(req1), '203.0.113.195');

  const req2 = new Request('https://nadi.in/api/test', {
    headers: { 'x-real-ip': '198.51.100.4' },
  });
  assert.strictEqual(getClientIp(req2), '198.51.100.4');

  const reqDefault = new Request('https://nadi.in/api/test');
  assert.strictEqual(getClientIp(reqDefault), '127.0.0.1');
});

test('Rate Limiter: assertRateLimit throws RateLimitError when limit is exceeded', () => {
  const req = new Request('https://nadi.in/api/test', {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });

  const opts = { action: 'test-action', limit: 2, windowMs: 10000 };

  // First 2 calls should succeed
  assert.doesNotThrow(() => assertRateLimit(req, opts));
  assert.doesNotThrow(() => assertRateLimit(req, opts));

  // 3rd call must throw RateLimitError with status 429
  assert.throws(
    () => assertRateLimit(req, opts),
    (err: unknown) => {
      assert.ok(err instanceof RateLimitError);
      assert.strictEqual(err.status, 429);
      assert.strictEqual(err.code, 'RATE_LIMITED');
      assert.ok(err.retryAfterSeconds > 0);
      return true;
    }
  );
});
