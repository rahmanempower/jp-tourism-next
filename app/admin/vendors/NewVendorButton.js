"use client";
// app/admin/vendors/NewVendorButton.js
// Admin "+ New Vendor" button — opens a dialog form, posts to /api/vendors.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { MultiSelect } from "primereact/multiselect";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";

const CATEGORIES = [
    { label: "Umrah", value: "UMRAH" },
    { label: "Visa", value: "VISA" },
    { label: "Attestation", value: "ATTESTATION" },
    { label: "Hotel", value: "HOTEL" },
    { label: "Transport", value: "TRANSPORT" },
];

const EMPTY = {
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    category: [],
    createOwner: true,
    ownerEmail: "",
    ownerPassword: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhone: "",
};

export default function NewVendorButton() {
    const router = useRouter();
    const toast = useRef(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);

    const set = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e?.value ?? e }));

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
                category: form.category,
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

            const res = await fetch("/api/vendors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !json.success) {
                toast.current?.show({ severity: "error", summary: json.error ?? "Failed to create vendor." });
                return;
            }

            toast.current?.show({ severity: "success", summary: "Vendor created.", life: 2500 });
            setOpen(false);
            setForm(EMPTY);
            router.refresh();
        } catch {
            toast.current?.show({ severity: "error", summary: "Network error." });
        } finally {
            setSubmitting(false);
        }
    }

    const fieldStyle = { display: "flex", flexDirection: "column", gap: "0.35rem" };
    const labelStyle = { fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 };

    return (
        <>
            <Toast ref={toast} position="top-right" />
            <Button
                label="New Vendor"
                icon="pi pi-plus"
                onClick={() => setOpen(true)}
                style={{ background: "#6366f1", border: "none", borderRadius: 8 }}
            />

            <Dialog
                header="Create Vendor"
                visible={open}
                onHide={close}
                style={{ width: "min(640px, 95vw)" }}
                modal
                dismissableMask={!submitting}
                closable={!submitting}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Business Name *</label>
                        <InputText value={form.businessName} onChange={set("businessName")} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Contact Email *</label>
                        <InputText type="email" value={form.contactEmail} onChange={set("contactEmail")} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Contact Phone *</label>
                        <InputText value={form.contactPhone} onChange={set("contactPhone")} />
                    </div>
                    <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Categories</label>
                        <MultiSelect
                            value={form.category}
                            options={CATEGORIES}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.value }))}
                            placeholder="Select categories"
                            display="chip"
                        />
                    </div>
                </div>

                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--card-border)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
                        <Checkbox
                            inputId="createOwner"
                            checked={form.createOwner}
                            onChange={(e) => setForm((f) => ({ ...f, createOwner: e.checked }))}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Also create vendor owner login</span>
                    </label>
                </div>

                {form.createOwner && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>First Name *</label>
                            <InputText value={form.ownerFirstName} onChange={set("ownerFirstName")} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Last Name *</label>
                            <InputText value={form.ownerLastName} onChange={set("ownerLastName")} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Owner Email *</label>
                            <InputText type="email" value={form.ownerEmail} onChange={set("ownerEmail")} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Owner Phone</label>
                            <InputText value={form.ownerPhone} onChange={set("ownerPhone")} />
                        </div>
                        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Password * (min 8 chars)</label>
                            <Password
                                value={form.ownerPassword}
                                onChange={set("ownerPassword")}
                                feedback={false}
                                toggleMask
                            />
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
                    <Button label="Cancel" outlined onClick={close} disabled={submitting} />
                    <Button
                        label={submitting ? "Creating…" : "Create Vendor"}
                        icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        onClick={submit}
                        disabled={submitting}
                        style={{ background: "#22c55e", border: "none" }}
                    />
                </div>
            </Dialog>
        </>
    );
}
