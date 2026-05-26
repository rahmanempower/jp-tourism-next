// app/agency/layout.js
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";
import AppShell from "@/components/layout/AppShell";

export const metadata = { title: "Agency · JP Tourism" };

export default async function AgencyLayout({ children }) {
  const session = await getSession();
  const allowed = ["AGENCY_OWNER", "AGENCY_STAFF"];
  if (!session || !allowed.includes(session.role)) redirect("/login");

  const user = {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    agencyId: session.agencyId ?? null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
