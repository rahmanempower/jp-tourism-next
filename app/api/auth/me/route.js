// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth.js";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}
