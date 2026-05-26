// app/api/auth/refresh/route.js
// POST /api/auth/refresh — Refresh the session by re-issuing the JWT cookie
// using the existing valid cookie. Acts as a sliding-window refresh.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { getSession, createSession } from "@/lib/auth.js";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No valid session." },
        { status: 401 }
      );
    }

    // Re-read user from DB in case role/status changed
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        vendorId: true,
        agencyId: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Account is inactive." },
        { status: 401 }
      );
    }

    // Re-issue cookie
    await createSession(user);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[refresh]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
