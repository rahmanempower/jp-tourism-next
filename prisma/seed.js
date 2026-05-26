/**
 * prisma/seed.js — Database seeder
 * Run: npx tsx prisma/seed.js
 *
 * Creates:
 *  • Super Admin user
 *  • Admin user
 *  • Demo Vendor + Vendor user
 *  • Demo Agency + Agency Owner user
 *  • Two approved service listings
 */

import { PrismaClient } from "../app/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ["warn", "error"] });

// ── Credentials ───────────────────────────────────────────────────────
const USERS = [
  {
    email: "superadmin@jptourism.com",
    password: "SuperAdmin@2026",
    role: "SUPER_ADMIN",
    firstName: "Super",
    lastName: "Admin",
    phone: "+971500000001",
  },
  {
    email: "admin@jptourism.com",
    password: "Admin@2026",
    role: "ADMIN",
    firstName: "Platform",
    lastName: "Admin",
    phone: "+971500000002",
  },
  {
    email: "vendor@demo.com",
    password: "Vendor@2026",
    role: "VENDOR",
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    phone: "+971500000003",
    vendor: {
      businessName: "Gulf Visa Services",
      contactPhone: "+971500000003",
      category: ["VISA", "ATTESTATION"],
    },
  },
  {
    email: "agency@demo.com",
    password: "Agency@2026",
    role: "AGENCY_OWNER",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "+971500000004",
    agency: {
      businessName: "Horizon Travel Agency",
      contactPhone: "+971500000004",
      walletBalance: 5000,
    },
  },
];

async function main() {
  console.log("🌱  Seeding database …\n");

  let vendorId = null;
  let agencyId = null;

  for (const u of USERS) {
    // Skip if already exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⏭  ${u.role} (${u.email}) already exists — skipping`);
      if (u.role === "VENDOR") vendorId = existing.vendorId;
      if (u.role === "AGENCY_OWNER") agencyId = existing.agencyId;
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 12);

    if (u.vendor) {
      const slug = u.vendor.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const vendor = await prisma.vendor.create({
        data: {
          businessName: u.vendor.businessName,
          slug,
          contactEmail: u.email,
          contactPhone: u.vendor.contactPhone,
          category: u.vendor.category,
          kycDocuments: [],
          kycStatus: "APPROVED",
          isActive: true,
          rating: 4.5,
        },
      });
      vendorId = vendor.id;

      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          isActive: true,
          isEmailVerified: true,
          vendorId: vendor.id,
        },
      });
    } else if (u.agency) {
      const slug = u.agency.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const agency = await prisma.agency.create({
        data: {
          businessName: u.agency.businessName,
          slug,
          contactEmail: u.email,
          contactPhone: u.agency.contactPhone,
          walletBalance: u.agency.walletBalance ?? 0,
          creditLimit: 10000,
          marginPercent: 2,
          isActive: true,
        },
      });
      agencyId = agency.id;

      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          isActive: true,
          isEmailVerified: true,
          agencyId: agency.id,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          isActive: true,
          isEmailVerified: true,
        },
      });
    }

    console.log(`  ✅  Created ${u.role.padEnd(14)} → ${u.email}  /  ${u.password}`);
  }

  // ── Demo service listings ──────────────────────────────────────────
  if (vendorId) {
    const listingsExist = await prisma.serviceListing.count({ where: { vendorId } });

    if (listingsExist === 0) {
      await prisma.serviceListing.createMany({
        data: [
          {
            vendorId,
            category: "VISA",
            title: "UAE Tourist Visa (30 Days)",
            description: "Standard 30-day single-entry UAE tourist visa processed within 3 working days.",
            destinationCountry: "AE",
            inclusions: ["Visa stamping", "E-visa delivery", "Application support"],
            requiredDocuments: [
              { name: "Passport Copy", mandatory: true, description: "Valid for 6+ months" },
              { name: "Passport Photo", mandatory: true, description: "White background, 35×45mm" },
              { name: "Bank Statement", mandatory: false, description: "Last 3 months" },
            ],
            basePrice: 120,
            refundablePercent: 0,
            currency: "USD",
            slaDays: 3,
            status: "APPROVED",
            tags: ["tourist", "uae", "30-day"],
          },
          {
            vendorId,
            category: "ATTESTATION",
            title: "Educational Certificate Attestation",
            description: "Full attestation chain for educational certificates — MOFA, Embassy, and HRD.",
            destinationCountry: "AE",
            inclusions: ["Document collection", "MOFA attestation", "Embassy attestation", "HRD attestation", "Courier return"],
            requiredDocuments: [
              { name: "Original Certificate", mandatory: true, description: "Degree or diploma certificate" },
              { name: "Passport Copy", mandatory: true, description: "Clear scan both sides" },
            ],
            basePrice: 350,
            refundablePercent: 20,
            currency: "USD",
            slaDays: 10,
            status: "APPROVED",
            tags: ["attestation", "education", "mofa"],
          },
        ],
      });
      console.log("\n  ✅  Created 2 demo service listings");
    } else {
      console.log("\n  ⏭  Service listings already exist — skipping");
    }
  }

  console.log("\n✨  Seed complete.\n");
  console.log("─────────────────────────────────────────────");
  console.log("  CREDENTIAL SUMMARY");
  console.log("─────────────────────────────────────────────");
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(16)} ${u.email.padEnd(30)} ${u.password}`);
  }
  console.log("─────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
