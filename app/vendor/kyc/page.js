"use client";
/**
 * Vendor KYC Wizard — multi-step onboarding stepper.
 * Steps: 1. Business Info  2. Documents  3. Review & Submit
 */
import { useState, useRef } from "react";
import { Steps } from "primereact/steps";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { FileUpload } from "primereact/fileupload";
import { Tag } from "primereact/tag";
import { ProgressSpinner } from "primereact/progressspinner";

const STEPS = [
  { label: "Business Info" },
  { label: "Documents" },
  { label: "Review & Submit" },
];

const DOC_TYPES = [
  { label: "Trade License", value: "TRADE_LICENSE" },
  { label: "Passport Copy", value: "PASSPORT" },
  { label: "VAT Certificate", value: "VAT_CERT" },
  { label: "Bank Statement", value: "BANK_STATEMENT" },
  { label: "Other", value: "OTHER" },
];

const COUNTRY_OPTIONS = [
  "UAE", "India", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman",
  "UK", "USA", "Singapore", "Malaysia",
].map(c => ({ label: c, value: c }));

function StepBusinessInfo({ data, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
      {[
        { key: "businessName", label: "Business Name *", placeholder: "Gulf Visa Services LLC" },
        { key: "contactName",  label: "Contact Person *",  placeholder: "Full name" },
        { key: "email",        label: "Email *",           placeholder: "ops@example.com" },
        { key: "phone",        label: "Phone *",           placeholder: "+971 50 123 4567" },
        { key: "registrationNumber", label: "Registration Number", placeholder: "CN-12345" },
        { key: "vatNumber",    label: "VAT Number",        placeholder: "Optional" },
      ].map(f => (
        <div key={f.key}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{f.label}</label>
          <InputText
            value={data[f.key] ?? ""}
            onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050", color: "var(--text-primary)" }}
          />
        </div>
      ))}
      <div>
        <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Country *</label>
        <Dropdown
          value={data.country ?? ""}
          options={COUNTRY_OPTIONS}
          onChange={e => onChange("country", e.value)}
          placeholder="Select country"
          style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050" }}
        />
      </div>
    </div>
  );
}

function StepDocuments({ docs, onUpload, onRemove, uploading }) {
  const [docType, setDocType] = useState("TRADE_LICENSE");
  const fileRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.files?.[0];
    if (!file) return;
    await onUpload(file, docType);
    fileRef.current?.clear();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ background: "#1a1f2e", border: "1px solid #2a3050", borderRadius: "12px", padding: "1.25rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "1rem" }}>Upload KYC Document</h4>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "0 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Document Type</label>
            <Dropdown
              value={docType}
              options={DOC_TYPES}
              onChange={e => setDocType(e.value)}
              style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>File (PDF / JPG / PNG, max 20 MB)</label>
            <FileUpload
              ref={fileRef}
              mode="basic"
              accept=".pdf,.jpg,.jpeg,.png"
              maxFileSize={20000000}
              chooseLabel={uploading ? "Uploading…" : "Choose File"}
              onSelect={handleFileSelect}
              disabled={uploading}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        {uploading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <ProgressSpinner style={{ width: 20, height: 20 }} /> Uploading to storage…
          </div>
        )}
      </div>

      {/* Uploaded list */}
      {docs.length > 0 && (
        <div style={{ background: "#1a1f2e", border: "1px solid #2a3050", borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.75rem" }}>Uploaded ({docs.length})</h4>
          {docs.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: i < docs.length - 1 ? "1px solid #2a3050" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <i className="pi pi-file-pdf" style={{ color: "#6366f1" }} />
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{d.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{d.docType}</div>
                </div>
              </div>
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                size="small"
                onClick={() => onRemove(i)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepReview({ bizInfo, docs }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ background: "#1a1f2e", border: "1px solid #2a3050", borderRadius: "12px", padding: "1.25rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "1rem" }}>Business Information</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 1.5rem" }}>
          {Object.entries(bizInfo).filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                {k.replace(/([A-Z])/g, " $1")}
              </span>
              <div style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#1a1f2e", border: "1px solid #2a3050", borderRadius: "12px", padding: "1.25rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Documents ({docs.length})
        </h4>
        {docs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No documents uploaded.</p>
        ) : docs.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0" }}>
            <i className="pi pi-check-circle" style={{ color: "#22c55e" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{d.name}</span>
            <Tag value={d.docType} style={{ background: "#6366f122", color: "#a5b4fc", border: "1px solid #6366f133", fontSize: "0.7rem" }} />
          </div>
        ))}
      </div>

      <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: "10px", padding: "0.85rem 1rem", fontSize: "0.82rem", color: "#fde68a" }}>
        <i className="pi pi-info-circle" style={{ marginRight: "0.5rem" }} />
        Submitting will flag your vendor profile for admin review. You will be notified once approved.
      </div>
    </div>
  );
}

export default function VendorKycPage() {
  const toast = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [bizInfo, setBizInfo] = useState({});
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateBiz(key, val) { setBizInfo(prev => ({ ...prev, [key]: val })); }

  async function handleUpload(file, docType) {
    setUploading(true);
    try {
      // Get presigned URL for KYC vendor documents (reusing document presign endpoint conceptually)
      // For KYC, we store it locally until submit and then upload via vendor KYC endpoint
      const fakeUrl = URL.createObjectURL(file);
      setDocs(prev => [...prev, { name: file.name, docType, file, previewUrl: fakeUrl }]);
    } catch {
      toast.current.show({ severity: "error", summary: "Upload failed", life: 3000 });
    } finally {
      setUploading(false);
    }
  }

  function removeDoc(idx) { setDocs(prev => prev.filter((_, i) => i !== idx)); }

  function validateStep0() {
    const req = ["businessName", "contactName", "email", "phone", "country"];
    for (const k of req) {
      if (!bizInfo[k]?.trim()) {
        toast.current.show({ severity: "warn", summary: `${k} is required`, life: 3000 });
        return false;
      }
    }
    return true;
  }

  function next() {
    if (activeStep === 0 && !validateStep0()) return;
    setActiveStep(s => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("bizInfo", JSON.stringify(bizInfo));
      docs.forEach((d, i) => {
        formData.append(`doc_${i}_type`, d.docType);
        formData.append(`doc_${i}_file`, d.file);
      });

      const res  = await fetch("/api/vendors/kyc/submit", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        toast.current.show({ severity: "success", summary: "KYC submitted! Pending admin review.", life: 5000 });
        setTimeout(() => window.location.href = "/vendor/dashboard", 1500);
      } else {
        toast.current.show({ severity: "error", summary: json.error ?? "Submission failed", life: 4000 });
      }
    } catch {
      toast.current.show({ severity: "error", summary: "Network error", life: 3000 });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <Toast ref={toast} position="top-right" />

      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          KYC Onboarding
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Complete your verification to start listing services on the marketplace.
        </p>
      </div>

      <Steps
        model={STEPS}
        activeIndex={activeStep}
        readOnly
        style={{ marginBottom: "2rem" }}
      />

      <div
        style={{
          background: "#1a1f2e",
          border: "1px solid #2a3050",
          borderRadius: "16px",
          padding: "2rem",
          minHeight: 320,
        }}
      >
        {activeStep === 0 && <StepBusinessInfo data={bizInfo} onChange={updateBiz} />}
        {activeStep === 1 && <StepDocuments docs={docs} onUpload={handleUpload} onRemove={removeDoc} uploading={uploading} />}
        {activeStep === 2 && <StepReview bizInfo={bizInfo} docs={docs} />}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
        <Button
          label="Back"
          icon="pi pi-arrow-left"
          outlined
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
          style={{ borderColor: "#2a3050", color: "var(--text-secondary)" }}
        />
        {activeStep < 2 ? (
          <Button
            label="Next"
            icon="pi pi-arrow-right"
            iconPos="right"
            onClick={next}
            style={{ background: "#6366f1", border: "none", borderRadius: "8px" }}
          />
        ) : (
          <Button
            label={submitting ? "Submitting…" : "Submit for Review"}
            icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-send"}
            disabled={submitting}
            onClick={handleSubmit}
            style={{ background: "#22c55e", border: "none", borderRadius: "8px" }}
          />
        )}
      </div>
    </div>
  );
}
