"use client";
/**
 * Admin Listing Approvals — review pending/under-review service listings.
 */
import { useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";

const STATUS_COLORS = {
  PENDING:      { bg: "#f59e0b22", color: "#fde68a", border: "#f59e0b33" },
  UNDER_REVIEW: { bg: "#6366f122", color: "#a5b4fc", border: "#6366f133" },
  APPROVED:     { bg: "#22c55e22", color: "#86efac", border: "#22c55e33" },
  REJECTED:     { bg: "#ef444422", color: "#fca5a5", border: "#ef444433" },
};

export default function ListingApprovalsClient({ listings: initial }) {
  const toast = useRef(null);
  const [listings, setListings] = useState(initial);
  const [dialog, setDialog]     = useState(null); // { type, listing }
  const [note, setNote]         = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading]   = useState(false);

  async function submitDecision(type) {
    setLoading(true);
    try {
      const url  = `/api/listings/${dialog.listing.id}/approve`;
      const body = type === "approve"
        ? { action: "approve" }
        : { action: "reject", reason: note };

      const res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setListings(prev => prev.filter(l => l.id !== dialog.listing.id));
        toast.current.show({
          severity: type === "approve" ? "success" : "warn",
          summary: `Listing ${type === "approve" ? "approved" : "rejected"}.`,
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

  const titleBody = (row) => (
    <div>
      <div
        style={{ fontWeight: 600, color: "#a5b4fc", fontSize: "0.9rem", cursor: "pointer" }}
        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
      >
        {row.title}
      </div>
      {expanded === row.id && row.description && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.35rem", lineHeight: 1.5 }}>
          {row.description}
        </p>
      )}
    </div>
  );

  const vendorBody = (row) => (
    <div>
      <div style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{row.vendor?.businessName}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.vendor?.kycStatus?.replace("_", " ")}</div>
    </div>
  );

  const statusBody = (row) => {
    const c = STATUS_COLORS[row.status] ?? {};
    return (
      <Tag
        value={row.status}
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: "0.75rem" }}
      />
    );
  };

  const priceBody  = (row) => `$${row.vendorPrice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const dateBody   = (row) => new Date(row.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

  const actionsBody = (row) => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Button
        label="Approve"
        icon="pi pi-check"
        size="small"
        severity="success"
        outlined
        style={{ borderRadius: "8px", fontSize: "0.78rem" }}
        onClick={() => { setDialog({ type: "approve", listing: row }); setNote(""); }}
      />
      <Button
        label="Reject"
        icon="pi pi-times"
        size="small"
        severity="danger"
        outlined
        style={{ borderRadius: "8px", fontSize: "0.78rem" }}
        onClick={() => { setDialog({ type: "reject", listing: row }); setNote(""); }}
      />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Listing Approvals
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {listings.length} listing{listings.length !== 1 ? "s" : ""} pending review.
        </p>
      </div>

      <DataTable
        value={listings}
        emptyMessage="No listings pending approval."
        style={{ fontSize: "0.88rem" }}
        rowHover
        stripedRows
      >
        <Column header="Title" body={titleBody} style={{ minWidth: 220 }} />
        <Column header="Vendor" body={vendorBody} style={{ width: 180 }} />
        <Column header="Type" field="serviceType" style={{ width: 110 }} />
        <Column header="Price" body={priceBody} style={{ width: 120 }} />
        <Column header="Status" body={statusBody} style={{ width: 130 }} />
        <Column header="Created" body={dateBody} style={{ width: 130 }} />
        <Column header="Actions" body={actionsBody} style={{ width: 200 }} />
      </DataTable>

      <Dialog
        visible={!!dialog}
        onHide={() => { setDialog(null); setNote(""); }}
        header={dialog?.type === "approve" ? "Approve Listing" : "Reject Listing"}
        style={{ width: 460, background: "#1a1f2e", border: "1px solid #2a3050" }}
        modal
      >
        {dialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              {dialog.type === "approve"
                ? `Approve "${dialog.listing.title}"? It will become visible to agencies on the marketplace.`
                : `Reject "${dialog.listing.title}"?`}
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
                  placeholder="Provide feedback for the vendor…"
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
