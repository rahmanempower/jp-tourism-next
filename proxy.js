/**
 * proxy.js — JWT verification + RBAC route protection (Next.js 16)
 * Named export `proxy` replaces the deprecated `middleware` convention.
 * Runs on Node.js runtime (default in Next.js 16).
 */
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE = "jp_session";

const ROUTE_ROLE_MAP = {
  "/super-admin": ["SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN", "ADMIN"],
  "/vendor": ["VENDOR"],
  "/agency": ["AGENCY_OWNER", "AGENCY_STAFF"],
};

function roleRedirect(role) {
  const map = {
    SUPER_ADMIN: "/super-admin/dashboard",
    ADMIN: "/admin/dashboard",
    VENDOR: "/vendor/dashboard",
    AGENCY_OWNER: "/agency/dashboard",
    AGENCY_STAFF: "/agency/dashboard",
  };
  return map[role] ?? "/login";
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;

  // Which portal prefix does this path belong to?
  const portalPrefix = Object.keys(ROUTE_ROLE_MAP).find((p) =>
    pathname.startsWith(p)
  );

  // Not a protected route — pass through
  if (!portalPrefix) return NextResponse.next();

  // No token → redirect to login with return URL
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let payload;
  try {
    ({ payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] }));
  } catch {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role check — wrong portal → redirect to correct one
  const allowed = ROUTE_ROLE_MAP[portalPrefix];
  if (!allowed.includes(payload.role)) {
    return NextResponse.redirect(
      new URL(roleRedirect(payload.role), request.url)
    );
  }

  // Forward minimal user context to Server Components via request headers
  const res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-user-id": payload.id ?? "",
        "x-user-role": payload.role ?? "",
        "x-user-name": `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
      }),
    },
  });
  return res;
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/vendor/:path*",
    "/agency/:path*",
  ],
};
