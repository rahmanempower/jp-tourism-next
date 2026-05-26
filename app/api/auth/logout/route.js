// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth.js";

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
