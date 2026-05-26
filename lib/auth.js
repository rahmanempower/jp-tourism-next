/**
 * lib/auth.js
 * JWT helpers — sign, verify, cookie management.
 * Uses jose (Edge-compatible) as recommended by the Next.js auth guide.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "jp_session";
const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days ms

/** Sign a JWT with the minimal session payload */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

/** Verify and decode a JWT — returns payload or null */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/** Create a session cookie after successful login */
export async function createSession(user) {
  const expiresAt = new Date(Date.now() + EXPIRES_IN);
  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    vendorId: user.vendorId ?? null,
    agencyId: user.agencyId ?? null,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

/** Read and verify the current session from cookies */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Delete the session cookie (logout) */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Role → default redirect path */
export function getRoleRedirect(role) {
  const map = {
    SUPER_ADMIN: "/super-admin/dashboard",
    ADMIN: "/admin/dashboard",
    VENDOR: "/vendor/dashboard",
    AGENCY_OWNER: "/agency/dashboard",
    AGENCY_STAFF: "/agency/dashboard",
  };
  return map[role] ?? "/login";
}

/** Roles allowed to access a given route prefix */
export const ROUTE_ROLE_MAP = {
  "/super-admin": ["SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN", "ADMIN"],
  "/vendor": ["VENDOR"],
  "/agency": ["AGENCY_OWNER", "AGENCY_STAFF"],
};
