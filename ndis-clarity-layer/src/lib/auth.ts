import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./db";

const COOKIE_NAME = "ndis_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set (>= 24 chars) in production");
    }
    return new TextEncoder().encode(
      "dev-only-insecure-secret-please-change-me-1234567890",
    );
  }
  return new TextEncoder().encode(s);
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organisationId: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function issueSession(user: SessionUser) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    org: user.organisationId,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      fullName: String(payload.name ?? ""),
      role: payload.role as Role,
      organisationId: String(payload.org),
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await readSession();
  if (!u) throw new HttpError(401, "Authentication required");
  return u;
}

export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!allowed.includes(u.role)) {
    throw new HttpError(403, "You don't have permission to do that");
  }
  return u;
}

/** Loads the freshest user row, ensuring the account is still active. */
export async function loadActiveUser(session: SessionUser) {
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "Account is inactive");
  }
  return user;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
