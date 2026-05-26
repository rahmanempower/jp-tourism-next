// app/api/auth/reset-password/route.js
// POST /api/auth/reset-password
// Validates the reset token and updates the user's password.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma.js";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "token and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.used) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { success: false, error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Mark token as used and update password in a transaction
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password has been reset. You can now log in.",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
