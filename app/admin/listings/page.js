// app/admin/listings/page.js — Listing Approval Queue (Server Component)
import { getSession } from "@/lib/auth.js";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma.js";
import ListingApprovalsClient from "./ListingApprovalsClient.js";

export const metadata = { title: "Listing Approvals · Admin · JP Tourism" };

async function getPendingListings() {
  return prisma.serviceListing.findMany({
    where: { status: { in: ["PENDING_APPROVAL"] } },
    include: {
      vendor: { select: { id: true, businessName: true, kycStatus: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export default async function AdminListingsPage() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/login");

  const listings = await getPendingListings();
  return <ListingApprovalsClient listings={listings} />;
}
