"use client";
// app/admin/agencies/NewAgencyButton.js
// Admin "+ New Agency" button — polished dialog form, posts to /api/agencies.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";

const EMPTY = {
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  licenseNumber: "",
  creditLimit: 0,
  marginPercent: 2,
  isActive: true,
  createOwner: true,
  ownerEmail: "",
  ownerPassword: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerPhone: "",
};

export default function NewAgencyButton() {
  const router = useRouter();
  const toast = useRef(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const setText = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.value ?? 0 }));

  function close() {
    if (submitting) return;
    setOpen(false);
    setForm(EMPTY);
  }

  async function submit() {
    if (!form.businessName || !form.contactEmail || !form.contactPhone) {
      toast.current?.show({ severity: "warn", summary: "Business name, contact email and phone are required." });
      return;
    }

    if (form.createOwner) {
      if (!form.ownerEmail || !form.ownerPassword || !form.ownerFirstName || !form.ownerLastName) {
        toast.current?.show({ severity: "warn", summary: "Owner email, password, first and last name are required." });
        return;
      }

      if (form.ownerPassword.length < 8) {
        toast.current?.show({ severity: "warn", summary: "Owner password must be at least 8 characters." });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        businessName: form.businessName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        licenseNumber: form.licenseNumber.trim() || null,
        creditLimit: Number(form.creditLimit) || 0,
        marginPercent: Number(form.marginPercent) || 0,
        isActive: form.isActive,
      };

      if (form.createOwner) {
        payload.owner = {
          email: form.ownerEmail.trim(),
          password: form.ownerPassword,
          firstName: form.ownerFirstName.trim(),
          lastName: form.ownerLastName.trim(),
          phone: form.ownerPhone.trim() || null,
        };
      }

      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.current?.show({ severity: "error", summary: json.error ?? "Failed to create agency." });
        return;
      }

      toast.current?.show({ severity: "success", summary: "Agency created.", life: 2500 });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    } catch {
      toast.current?.show({ severity: "error", summary: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = { display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: 0 };
  const labelStyle = { fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.9rem",
  };
  const sectionStyle = {
    background: "var(--surface-soft)",
    border: "1px solid var(--surface-border)",
    borderRadius: 12,
    padding: "1rem",
  };
  const sectionTitleStyle = {
    fontSize: "0.83rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.8rem",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  };

  return (
    <>
      <Toast ref={toast} position="top-right" />

      <Button
        label="New Agency"
        icon="pi pi-plus"
        onClick={() => setOpen(true)}
        style={{
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          borderRadius: 10,
          padding: "0.62rem 0.95rem",
          boxShadow: "0 8px 22px rgba(79, 70, 229, 0.28)",
          fontWeight: 600,
        }}
      />

      <Dialog
        header="Create Agency"
        visible={open}
        onHide={close}
        style={{ width: "min(700px, 96vw)" }}
        breakpoints={{ "960px": "94vw", "640px": "98vw" }}
        contentStyle={{ overflowX: "hidden", padding: "1rem 1.1rem 1.2rem" }}
        modal
        dismissableMask={!submitting}
        closable={!submitting}
      >
        <div className="p-fluid">
          <div style={{ ...sectionStyle, marginBottom: "0.95rem" }}>
            <div style={sectionTitleStyle}>Agency Details</div>
            <div style={gridStyle}>
              <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Business Name *</label>
                <InputText value={form.businessName} onChange={setText("businessName")} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Contact Email *</label>
                <InputText type="email" value={form.contactEmail} onChange={setText("contactEmail")} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Contact Phone *</label>
                <InputText value={form.contactPhone} onChange={setText("contactPhone")} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>License Number</label>
                <InputText value={form.licenseNumber} onChange={setText("licenseNumber")} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Credit Limit</label>
                <InputNumber
                  value={form.creditLimit}
                  onValueChange={setNum("creditLimit")}
                  mode="currency"
                  currency="USD"
                  inputStyle={{ width: "100%" }}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Margin %</label>
                <InputNumber
                  value={form.marginPercent}
                  onValueChange={setNum("marginPercent")}
                  suffix=" %"
                  minFractionDigits={0}
                  maxFractionDigits={2}
                  inputStyle={{ width: "100%" }}
                />
              </div>

              <div style={{ ...fieldStyle, justifyContent: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", paddingTop: "0.45rem" }}>
                  <Checkbox
                    inputId="agencyActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.checked }))}
                  />
                  <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>Active Agency</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ ...sectionStyle, marginBottom: form.createOwner ? "0.95rem" : 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
              <Checkbox
                inputId="createAgencyOwner"
                checked={form.createOwner}
                onChange={(e) => setForm((prev) => ({ ...prev, createOwner: e.checked }))}
              />
              <span style={{ fontSize: "0.86rem", color: "var(--text-primary)", fontWeight: 600 }}>Create agency owner login</span>
            </label>
          </div>

          {form.createOwner && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Owner Account</div>
              <div style={gridStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>First Name *</label>
                  <InputText value={form.ownerFirstName} onChange={setText("ownerFirstName")} />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Last Name *</label>
                  <InputText value={form.ownerLastName} onChange={setText("ownerLastName")} />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Owner Email *</label>
                  <InputText type="email" value={form.ownerEmail} onChange={setText("ownerEmail")} />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Owner Phone</label>
                  <InputText value={form.ownerPhone} onChange={setText("ownerPhone")} />
                </div>

                <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Password * (min 8 chars)</label>
                  <Password
                    value={form.ownerPassword}
                    onChange={setText("ownerPassword")}
                    feedback={false}
                    toggleMask
                    inputStyle={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.55rem",
              marginTop: "1.15rem",
              paddingTop: "0.9rem",
              borderTop: "1px solid var(--card-border)",
              flexWrap: "wrap",
            }}
          >
            <Button label="Cancel" outlined onClick={close} disabled={submitting} style={{ minWidth: 120 }} />
            <Button
              label={submitting ? "Creating…" : "Create Agency"}
              icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={submit}
              disabled={submitting}
              style={{
                background: "#22c55e",
                border: "none",
                minWidth: 160,
                fontWeight: 600,
              }}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
