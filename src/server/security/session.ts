import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'bb_admin';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

const ISSUER = 'sr-burguer';
const AUDIENCE = 'srburguer-admin';

const encoder = new TextEncoder();

export interface AdminSession {
  sub: string;
  issuedAt: number;
}

export async function createSessionToken(secret: string, subject: string): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encoder.encode(secret));
}

export async function verifySessionToken(secret: string, token: string | undefined | null): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, issuedAt: (payload.iat ?? 0) * 1000 };
  } catch {
    return null;
  }
}
