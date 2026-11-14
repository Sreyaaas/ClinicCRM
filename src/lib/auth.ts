import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import type { BillingTiming, PlanTier, SubscriptionStatus, UserRole } from '@prisma/client';
import { prisma } from './prisma';

const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export function getSessionCookieConfig() {
  const isHttpsProd =
    process.env.NODE_ENV === 'production' && process.env.ALLOW_HTTP_SESSION !== 'true';
  return {
    name: isHttpsProd ? '__Host-clinic_session' : 'clinic_session',
    secure: isHttpsProd,
  };
}

export function getJwtSecretBytes(): Uint8Array {
  const rawSecret = process.env.SESSION_SECRET;
  if (!rawSecret || rawSecret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set to at least 16 characters in production.');
    }
    return new TextEncoder().encode('dev-only-clinic-crm-secret-change-in-prod');
  }
  return new TextEncoder().encode(rawSecret);
}

export interface SessionUser {
  id: string;
  clinicId: string;
  activeBranchId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  specialty: string | null;
  registrationNo: string | null;
  consultationFee: number | null;
  defaultCaptureMode: string;
  preferredWhatsappLang: string | null;
  clinic: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    upiId: string | null;
    gstin: string | null;
    brandColor: string;
    themePreset: string;
    colorMode: string;
    uiDensity: string;
    cardRadius: string;
    sidebarTone: string;
    printPaperSize: string;
    rxFooterNote: string | null;
    rxWatermark: string | null;
    hidePoweredBy: boolean;
    whatsappLang: string;
    workingHours: string;
    slotDurationMin: number;
    enablePublicBooking: boolean;
    enableBilling: boolean;
    enableFollowUps: boolean;
    enableVitals: boolean;
    enableAppointments: boolean;
    enableOrders: boolean;
    planTier: PlanTier;
    subscriptionStatus: SubscriptionStatus;
    maxDoctors: number;
    maxStaff: number;
    maxPatients: number | null;
    maxStorageMb: number;
    maxBranches: number;
    billingTiming: BillingTiming;
    defaultConsultFee: number;
    trialEndsAt: string | null;
    trialDaysLeft: number | null;
  };
}

interface SessionJwtPayload {
  sub: string;
  clinicId: string;
}

export async function signSessionToken(payload: SessionJwtPayload): Promise<string> {
  return new SignJWT({ clinicId: payload.clinicId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(getJwtSecretBytes());
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.clinicId !== 'string') {
      return null;
    }
    return { sub: payload.sub, clinicId: payload.clinicId };
  } catch {
    return null;
  }
}

export async function createUserSession(userId: string, clinicId: string): Promise<void> {
  const token = await signSessionToken({ sub: userId, clinicId });
  const cookieStore = await cookies();
  const { name, secure } = getSessionCookieConfig();
  cookieStore.set(name, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const { name, secure } = getSessionCookieConfig();
  // RFC 6265bis strictly requires Path=/ and Secure for __Host- prefixed cookies
  cookieStore.set(name, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  cookieStore.set('clinic_session', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  cookieStore.delete(name);
  cookieStore.delete('clinic_session');
}

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const { name } = getSessionCookieConfig();
  const rawToken = cookieStore.get(name)?.value ?? cookieStore.get('clinic_session')?.value;
  if (!rawToken) return null;

  const verified = await verifySessionToken(rawToken);
  if (!verified) return null;

  const user = await prisma.user.findUnique({
    where: { id: verified.sub },
    select: {
      id: true,
      clinicId: true,
      activeBranchId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      registrationNo: true,
      consultationFee: true,
      defaultCaptureMode: true,
      preferredWhatsappLang: true,
      isActive: true,
      clinic: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          address: true,
          upiId: true,
          gstin: true,
          brandColor: true,
          themePreset: true,
          colorMode: true,
          uiDensity: true,
          cardRadius: true,
          sidebarTone: true,
          printPaperSize: true,
          rxFooterNote: true,
          rxWatermark: true,
          hidePoweredBy: true,
          whatsappLang: true,
          workingHours: true,
          slotDurationMin: true,
          enablePublicBooking: true,
          enableBilling: true,
          enableFollowUps: true,
          enableVitals: true,
          enableAppointments: true,
          enableOrders: true,
          planTier: true,
          subscriptionStatus: true,
          maxDoctors: true,
          maxStaff: true,
          maxPatients: true,
          maxStorageMb: true,
          maxBranches: true,
          billingTiming: true,
          defaultConsultFee: true,
          trialEndsAt: true,
        },
      },
    },
  });

  if (!user || !user.isActive || user.clinicId !== verified.clinicId) {
    return null;
  }

  return {
    id: user.id,
    clinicId: user.clinicId,
    activeBranchId: user.activeBranchId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    specialty: user.specialty,
    registrationNo: user.registrationNo,
    consultationFee: user.consultationFee,
    defaultCaptureMode: user.defaultCaptureMode,
    preferredWhatsappLang: user.preferredWhatsappLang,
    clinic: {
      ...user.clinic,
      trialEndsAt: user.clinic.trialEndsAt ? user.clinic.trialEndsAt.toISOString() : null,
      trialDaysLeft: user.clinic.trialEndsAt
        ? Math.max(0, Math.ceil((user.clinic.trialEndsAt.getTime() - Date.now()) / 86400000))
        : null,
    },
  };
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
