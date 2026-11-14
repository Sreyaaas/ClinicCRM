export class RateLimitError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number;

  constructor(
    status: number,
    message: string,
    code: string = 'RATE_LIMITED',
    retryAfterSeconds: number = 60
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to avoid memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const expiry = now - windowMs;
  for (const [key, record] of store.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > expiry);
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  cleanupStaleEntries(windowMs);

  const now = Date.now();
  const threshold = now - windowMs;

  const record = store.get(key) ?? { timestamps: [] };
  const validTimestamps = record.timestamps.filter((ts) => ts > threshold);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  store.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

export function assertRateLimit(
  request: Request,
  options: {
    action: string;
    limit: number;
    windowMs: number;
    customKey?: string;
    message?: string;
  }
): void {
  const ip = getClientIp(request);
  const rateKey = `${options.action}:${options.customKey ?? ip}`;
  const result = checkRateLimit(rateKey, options.limit, options.windowMs);

  if (!result.allowed) {
    throw new RateLimitError(
      429,
      options.message ?? `Too many requests. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
      'RATE_LIMITED',
      result.retryAfterSeconds
    );
  }
}
