// app/vendor/layout.js
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";
import AppShell from "@/components/layout/AppShell";

export const metadata = { title: "Vendor · JP Tourism" };

export default async function VendorLayout({ children }) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const user = {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    vendorId: session.vendorId ?? null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
