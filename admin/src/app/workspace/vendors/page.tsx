"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchVendors, toErrorMessage, updateVendorStatus, type VendorRecord, type VendorStatus } from "@/lib/adminClient";
import { formatDate, getDisplayName } from "@/lib/adminUi";

const STATUS_BADGES: Record<VendorStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function VendorsWorkspacePage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState<"all" | VendorStatus>("all");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | VendorStatus>("all");

  const [busyVendors, setBusyVendors] = useState<Record<string, boolean>>({});
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await fetchVendors({
        status: activeStatus,
        search: activeSearch || undefined,
      });
      setVendors(list);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Unable to load vendors workspace"));
    } finally {
      setLoading(false);
    }
  }, [activeSearch, activeStatus]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const applyFilters = () => {
    setActiveSearch(searchInput.trim());
    setActiveStatus(statusInput);
  };

  const handleVendorNoteChange = (vendorId: string, note: string) => {
    setVendorNotes((prev) => ({ ...prev, [vendorId]: note }));
  };

  const handleVendorStatus = async (vendor: VendorRecord, status: VendorStatus) => {
    setError(null);
    setMessage(null);
    setBusyVendors((prev) => ({ ...prev, [vendor.id]: true }));

    try {
      await updateVendorStatus(vendor.id, status, vendorNotes[vendor.id]);
      setMessage(`${vendor.businessName || getDisplayName(vendor)} marked as ${status}`);
      await loadVendors();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Failed to update vendor status"));
    } finally {
      setBusyVendors((prev) => ({ ...prev, [vendor.id]: false }));
    }
  };

  return (
    <AdminShell
      title="Vendors Workspace"
      subtitle="Vendor approvals and review actions now run in a separate focused page."
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by business, owner, email, phone"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:col-span-2"
          />

          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value as "all" | VendorStatus)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Apply Filters
          </button>
        </div>
      </section>

      <section className="mt-5">
        {loading ? (
          <p className="text-sm text-slate-500">Loading vendors...</p>
        ) : vendors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No vendors found for selected filters.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {vendors.map((vendor) => {
              const busy = Boolean(busyVendors[vendor.id]);
              return (
                <article key={vendor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{vendor.businessName || "Unnamed business"}</p>
                      <p className="text-sm text-slate-600">Owner: {getDisplayName(vendor)}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGES[vendor.vendorStatus]}`}
                    >
                      {vendor.vendorStatus}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-xs text-slate-600">
                    <p>Personal email: {vendor.email || "-"}</p>
                    <p>Personal phone: {vendor.phone || "-"}</p>
                    <p>Personal alternate: {vendor.alternatePhone || "-"}</p>
                    <p>Business email: {vendor.businessEmail || "-"}</p>
                    <p>Business phone: {vendor.businessPhone || "-"}</p>
                    <p>Business alternate: {vendor.businessAlternatePhone || "-"}</p>
                    <p>Category: {vendor.businessCategory?.name || "-"}</p>
                    <p>Subcategory: {vendor.businessSubcategory?.name || "-"}</p>
                    <p>Proof: {vendor.idProofType || "-"} / {vendor.idProofNumber || "-"}</p>
                    <p>Registered: {formatDate(vendor.createdAt)}</p>
                    {vendor.idProofDocument ? (
                      <a
                        href={vendor.idProofDocument}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex w-fit rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-100"
                      >
                        View Proof Document
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    <input
                      value={vendorNotes[vendor.id] || ""}
                      onChange={(event) => handleVendorNoteChange(vendor.id, event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                      placeholder="Optional review note"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleVendorStatus(vendor, "approved")}
                        className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busy ? "Please wait..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleVendorStatus(vendor, "rejected")}
                        className="w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busy ? "Please wait..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
