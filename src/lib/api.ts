import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import type { UserRole } from '@prisma/client';
import { getSessionUser, type SessionUser } from './auth';
import { RateLimitError } from './rate-limit';
import {
  getPlanFeatures,
  getTierRequiredForFeature,
  isSubscriptionActive,
  type PlanFeatureKey,
} from './plans';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function requireApiUser(options?: {
  roles?: UserRole[];
  requireActiveSub?: boolean;
}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, 'Authentication required.', 'UNAUTHORIZED');
  }

  if (options?.roles && !options.roles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission for this action.', 'FORBIDDEN');
  }

  if (
    options?.requireActiveSub &&
    !isSubscriptionActive(user.clinic.subscriptionStatus, user.clinic.trialEndsAt)
  ) {
    throw new ApiError(
      402,
      'Clinic subscription or trial has expired. Please upgrade or contact support.',
      'SUBSCRIPTION_SUSPENDED'
    );
  }

  return user;
}

export function requirePlanFeature(user: SessionUser, feature: PlanFeatureKey): void {
  const features = getPlanFeatures(user.clinic.planTier);
  if (!features[feature]) {
    const requiredTier = getTierRequiredForFeature(feature);
    throw new ApiError(
      403,
      `This feature requires the ${requiredTier.label} plan (₹${requiredTier.monthlyPriceInr}/mo). You can switch tiers in Settings -> Plan & Tiers.`,
      'PLAN_UPGRADE_REQUIRED'
    );
  }
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON request body.', 'INVALID_JSON');
  }
  return schema.parse(raw);
}

export function handleApiError(error: unknown): NextResponse {
  unstable_rethrow(error);
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      {
        status: error.status,
        headers: error.retryAfterSeconds
          ? { 'Retry-After': String(error.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue ? `${firstIssue.path.join('.') || 'field'}: ${firstIssue.message}` : 'Validation failed.',
        code: 'VALIDATION_ERROR',
        issues: error.issues,
      },
      { status: 400 }
    );
  }

  console.error('[API_ERROR]', error);
  return NextResponse.json(
    { error: 'An unexpected server error occurred.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
