import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { prisma } from './prisma';

function getResetSecret(passwordHash: string): Uint8Array {
  const base = process.env.SESSION_SECRET || 'dev-only-clinic-crm-secret-change-in-prod';
  return new TextEncoder().encode(`${base}:${passwordHash}`);
}

export async function createPasswordResetToken(user: {
  id: string;
  email: string;
  passwordHash: string;
}): Promise<string> {
  const secret = getResetSecret(user.passwordHash);
  return new SignJWT({
    email: user.email,
    purpose: 'password_reset',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function verifyResetTokenSignature(
  token: string,
  passwordHash: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const secret = getResetSecret(passwordHash);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub || payload.purpose !== 'password_reset' || typeof payload.email !== 'string') {
      return null;
    }

    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const claims = decodeJwt(token);
    if (!claims.sub || claims.purpose !== 'password_reset') return null;

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    return await verifyResetTokenSignature(token, user.passwordHash);
  } catch {
    return null;
  }
}
