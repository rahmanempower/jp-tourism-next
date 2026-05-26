"use client";
/**
 * Agency Marketplace — browse & search approved service listings.
 * Loaded client-side so the filter/search panel is interactive.
 */
import { useState, useEffect, useCallback } from "react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Paginator } from "primereact/paginator";
import { ProgressSpinner } from "primereact/progressspinner";

const SERVICE_TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Visa", value: "VISA" },
  { label: "Tour", value: "TOUR" },
  { label: "Hotel", value: "HOTEL" },
  { label: "Flight", value: "FLIGHT" },
  { label: "Transfer", value: "TRANSFER" },
  { label: "Insurance", value: "INSURANCE" },
  { label: "Other", value: "OTHER" },
];

const DESTINATION_OPTIONS = [
  { label: "All Destinations", value: "" },
  { label: "Japan", value: "Japan" },
  { label: "UAE", value: "UAE" },
  { label: "India", value: "India" },
  { label: "USA", value: "USA" },
  { label: "UK", value: "UK" },
  { label: "Schengen", value: "Schengen" },
];

function ListingCard({ listing, onEnquire }) {
  return (
    <div
      style={{
        background: "#1a1f2e",
        border: "1px solid #2a3050",
        borderRadius: "14px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#2a3050"}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
          {listing.title}
        </h3>
        <Tag
          value={listing.serviceType}
          style={{ background: "#6366f122", color: "#a5b4fc", border: "1px solid #6366f133", flexShrink: 0, fontSize: "0.72rem" }}
        />
      </div>

      {/* Vendor */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <i className="pi pi-building" style={{ marginRight: "0.4rem" }} />
        {listing.vendor?.businessName ?? "—"}
      </div>

      {/* Destination / duration */}
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
        {listing.destination && (
          <span><i className="pi pi-map-marker" style={{ marginRight: "0.35rem" }} />{listing.destination}</span>
        )}
        {listing.durationDays && (
          <span><i className="pi pi-clock" style={{ marginRight: "0.35rem" }} />{listing.durationDays} days</span>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {listing.description}
        </p>
      )}

      {/* Price + CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid #2a3050" }}>
        <div>
          <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#6366f1" }}>
            ${listing.vendorPrice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>/ person</span>
        </div>
        <Button
          label="Add to Enquiry"
          icon="pi pi-plus"
          size="small"
          style={{ background: "#6366f1", border: "none", borderRadius: "8px", fontSize: "0.8rem" }}
          onClick={() => onEnquire(listing)}
        />
      </div>
    </div>
  );
}

export default function AgencyMarketplacePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [destination, setDestination] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 12;

  const fetchListings = useCallback(async (overridePage = page) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: overridePage + 1,
      limit: LIMIT,
      status: "APPROVED",
    });
    if (search.trim())  params.set("search", search.trim());
    if (serviceType)    params.set("serviceType", serviceType);
    if (destination)    params.set("destination", destination);

    try {
      const res  = await fetch(`/api/listings?${params}`);
      const json = await res.json();
      if (json.success) {
        setListings(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, serviceType, destination, page]);

  useEffect(() => { fetchListings(page); }, [page]);

  function handleSearch() {
    setPage(0);
    fetchListings(0);
  }

  function handleEnquire(listing) {
    // Redirect to enquiries/new with pre-filled listingId
    window.location.href = `/agency/enquiries/new?listingId=${listing.id}&listingTitle=${encodeURIComponent(listing.title)}`;
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Marketplace
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Browse approved services and add them to customer enquiries.
        </p>
      </div>

      {/* Filter bar */}
      <div
        style={{
          background: "#1a1f2e",
          border: "1px solid #2a3050",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ flex: "1 1 220px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Search</label>
          <InputText
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Service name, keyword…"
            style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050", color: "var(--text-primary)" }}
          />
        </div>
        <div style={{ flex: "0 1 180px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Service Type</label>
          <Dropdown
            value={serviceType}
            options={SERVICE_TYPE_OPTIONS}
            onChange={e => setServiceType(e.value)}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050" }}
          />
        </div>
        <div style={{ flex: "0 1 180px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Destination</label>
          <Dropdown
            value={destination}
            options={DESTINATION_OPTIONS}
            onChange={e => setDestination(e.value)}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #2a3050" }}
          />
        </div>
        <Button
          label="Search"
          icon="pi pi-search"
          onClick={handleSearch}
          style={{ background: "#6366f1", border: "none", borderRadius: "8px" }}
        />
      </div>

      {/* Results count */}
      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        {loading ? "Loading…" : `${total} listing${total !== 1 ? "s" : ""} found`}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <ProgressSpinner style={{ width: 40, height: 40 }} />
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <i className="pi pi-inbox" style={{ fontSize: "2.5rem", marginBottom: "1rem", display: "block" }} />
          No listings match your filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {listings.map(l => (
            <ListingCard key={l.id} listing={l} onEnquire={handleEnquire} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ marginTop: "1.5rem" }}>
          <Paginator
            first={page * LIMIT}
            rows={LIMIT}
            totalRecords={total}
            onPageChange={e => setPage(e.page)}
            style={{ background: "transparent", border: "none" }}
          />
        </div>
      )}
    </div>
  );
}
