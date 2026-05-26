/**
 * lib/apiAuth.js
 * Shared helper for API route authentication + role-based authorization.
 * Usage:
 *   const { session, error } = await requireAuth(request, ["ADMIN", "SUPER_ADMIN"]);
 *   if (error) return error;
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth.js";

/**
 * Reads the session from cookies and checks that the caller's role is
 * among the allowed roles. Returns { session } on success or
 * { error: NextResponse } on failure.
 *
 * @param {Request} _request — currently unused; kept for future header-based auth
 * @param {string[]} [allowedRoles] — omit to allow any authenticated user
 */
export async function requireAuth(_request, allowedRoles = null) {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthenticated." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Standard response envelope helpers
 */
export function ok(data, meta = undefined, status = 200) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function fail(error, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
