// app/admin/kyc/page.js — Admin KYC Review Queue (Server Component)
import { getSession } from "@/lib/auth.js";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma.js";
import KycReviewClient from "./KycReviewClient.js";

export const metadata = { title: "KYC Review · Admin · JP Tourism" };

async function getKycQueue() {
  const vendors = await prisma.vendor.findMany({
    where: { kycStatus: { in: ["PENDING", "UNDER_REVIEW"] } },
    include: {
      users: { select: { id: true, firstName: true, lastName: true, email: true }, take: 1 },
      _count: { select: { listings: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
  return vendors;
}

export default async function AdminKycPage() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/login");

  const queue = await getKycQueue();
  return <KycReviewClient queue={queue} />;
}
