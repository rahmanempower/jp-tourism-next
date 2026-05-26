// app/api/auth/forgot-password/route.js
// POST /api/auth/forgot-password
// Generates a short-lived reset token and stores it in the DB.
// In production, send the token via email. Here we return it in the
// response body only in development, so the client can deep-link.

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma.js";

const TOKEN_TTL_MINUTES = 30;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration (OWASP A01)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Invalidate any previous unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // TODO: In production, send token via email provider (e.g. Resend / SES)
    // The reset URL format: /reset-password?token=<token>

    const response = {
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    };

    // Expose token only in non-production for development/testing
    if (process.env.NODE_ENV !== "production") {
      response._devToken = token;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
