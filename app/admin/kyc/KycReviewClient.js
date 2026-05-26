"use client";
/**
 * Admin KYC Review — interactive queue with approve/reject dialogs.
 */
import { useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";

const KYC_COLORS = {
  PENDING:      { bg: "#f59e0b22", color: "#fde68a", border: "#f59e0b33" },
  UNDER_REVIEW: { bg: "#6366f122", color: "#a5b4fc", border: "#6366f133" },
  APPROVED:     { bg: "#22c55e22", color: "#86efac", border: "#22c55e33" },
  REJECTED:     { bg: "#ef444422", color: "#fca5a5", border: "#ef444433" },
};

export default function KycReviewClient({ queue: initialQueue }) {
  const toast       = useRef(null);
  const [queue, setQueue]   = useState(initialQueue);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: "approve"|"reject", vendor }
  const [note, setNote]     = useState("");
  const [loading, setLoading] = useState(false);

  async function submitDecision(type) {
    setLoading(true);
    try {
      const body = type === "approve"
        ? { status: "APPROVED" }
        : { status: "REJECTED", reason: note };

      const res  = await fetch(`/api/vendors/${dialog.vendor.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setQueue(prev => prev.filter(v => v.id !== dialog.vendor.id));
        toast.current.show({
          severity: type === "approve" ? "success" : "warn",
          summary: `Vendor ${type === "approve" ? "approved" : "rejected"}.`,
          life: 3000,
        });
        setDialog(null);
        setNote("");
      } else {
        toast.current.show({ severity: "error", summary: json.error ?? "Failed", life: 4000 });
      }
    } catch {
      toast.current.show({ severity: "error", summary: "Network error", life: 3000 });
    } finally {
      setLoading(false);
    }
  }

  const statusBody = (row) => {
    const c = KYC_COLORS[row.kycStatus] ?? {};
    return (
      <Tag
        value={row.kycStatus?.replace("_", " ")}
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: "0.75rem" }}
      />
    );
  };

  const vendorBody = (row) => (
    <div>
      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{row.businessName}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{row.users?.[0]?.email}</div>
    </div>
  );

  const submittedBody = (row) =>
    row.updatedAt
      ? new Date(row.updatedAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  const actionsBody = (row) => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Button
        label="Approve"
        icon="pi pi-check"
        size="small"
        severity="success"
        outlined
        style={{ borderRadius: "8px", fontSize: "0.78rem" }}
        onClick={() => { setDialog({ type: "approve", vendor: row }); setNote(""); }}
      />
      <Button
        label="Reject"
        icon="pi pi-times"
        size="small"
        severity="danger"
        outlined
        style={{ borderRadius: "8px", fontSize: "0.78rem" }}
        onClick={() => { setDialog({ type: "reject", vendor: row }); setNote(""); }}
      />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          KYC Review Queue
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {queue.length} vendor{queue.length !== 1 ? "s" : ""} awaiting review.
        </p>
      </div>

      <DataTable
        value={queue}
        emptyMessage="No pending KYC submissions."
        style={{ fontSize: "0.88rem" }}
        rowHover
        stripedRows
      >
        <Column header="Vendor" body={vendorBody} />
        <Column header="Country" field="country" style={{ width: 120 }} />
        <Column header="Status" body={statusBody} style={{ width: 140 }} />
        <Column header="Submitted" body={submittedBody} style={{ width: 140 }} />
        <Column header="Listings" field="_count.listings" style={{ width: 90 }} />
        <Column header="Actions" body={actionsBody} style={{ width: 220 }} />
      </DataTable>

      {/* Approve / Reject dialog */}
      <Dialog
        visible={!!dialog}
        onHide={() => { setDialog(null); setNote(""); }}
        header={dialog?.type === "approve" ? "Approve Vendor" : "Reject Vendor"}
        style={{ width: 440, background: "#1a1f2e", border: "1px solid #2a3050" }}
        modal
      >
        {dialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              {dialog.type === "approve"
                ? `Approve KYC for ${dialog.vendor.businessName}? This will allow them to list services.`
                : `Reject KYC for ${dialog.vendor.businessName}?`}
            </p>

            {dialog.type === "reject" && (
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Rejection reason *
                </label>
                <InputTextarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050", color: "var(--text-primary)" }}
                  placeholder="Explain why the KYC is rejected…"
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <Button
                label="Cancel"
                outlined
                onClick={() => { setDialog(null); setNote(""); }}
                style={{ borderColor: "#2a3050", color: "var(--text-secondary)" }}
              />
              <Button
                label={loading ? "Processing…" : (dialog.type === "approve" ? "Approve" : "Reject")}
                icon={loading ? "pi pi-spin pi-spinner" : (dialog.type === "approve" ? "pi pi-check" : "pi pi-times")}
                severity={dialog.type === "approve" ? "success" : "danger"}
                disabled={loading || (dialog.type === "reject" && !note.trim())}
                onClick={() => submitDecision(dialog.type)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
