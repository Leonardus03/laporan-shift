import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
const REMEMBER_DAYS = 7;
const SHORT_SESSION = "12h";

export type SessionPayload = {
  adminId: string;
  name: string;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET belum diisi di environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, remember: boolean) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? `${REMEMBER_DAYS}d` : SHORT_SESSION)
    .sign(getKey());
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.adminId !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return { adminId: payload.adminId, name: payload.name };
  } catch {
    return null;
  }
}

export async function createSession(
  payload: SessionPayload,
  remember: boolean,
) {
  const token = await encrypt(payload, remember);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Tanpa "expires" = cookie hilang saat browser ditutup.
    ...(remember
      ? { expires: new Date(Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000) }
      : {}),
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
