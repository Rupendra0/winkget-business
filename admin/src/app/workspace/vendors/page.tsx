"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import { fetchVendors, toErrorMessage, updateVendorStatus, type VendorRecord, type VendorStatus } from "@/lib/adminClient";
import {
  buildDocumentFileName,
  downloadDocument,
  getDocumentKind,
  getDocumentTypeLabel,
  openDocumentInNewTab,
  requestFullscreen,
} from "@/lib/documentPreview";
import { formatDate, getDisplayName } from "@/lib/adminUi";

const STATUS_BADGES: Record<VendorStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

type PreviewDocument = {
  title: string;
  dataUrl: string;
  fileName: string;
};

export default function VendorsWorkspacePage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeVendor, setActiveVendor] = useState<VendorRecord | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState<"all" | VendorStatus>("all");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | VendorStatus>("all");

  const [busyVendors, setBusyVendors] = useState<Record<string, boolean>>({});
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
  const [activeDocument, setActiveDocument] = useState<PreviewDocument | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const activeDocumentKind = useMemo(() => {
    if (!activeDocument) return "other";
    return getDocumentKind(activeDocument.dataUrl);
  }, [activeDocument]);

  const canInlinePreview = activeDocumentKind === "image" || activeDocumentKind === "pdf";

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
      setActiveVendor((current) => {
        if (!current || current.id !== vendor.id) return current;
        return { ...current, vendorStatus: status, vendorReviewNote: vendorNotes[vendor.id] || current.vendorReviewNote };
      });
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Failed to update vendor status"));
    } finally {
      setBusyVendors((prev) => ({ ...prev, [vendor.id]: false }));
    }
  };

  const openDocumentPreview = (title: string, dataUrl: string, fileName: string) => {
    if (!dataUrl) return;
    setActiveDocument({ title, dataUrl, fileName });
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
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGES[vendor.vendorStatus]}`}
                      >
                        {vendor.vendorStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveVendor(vendor)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        View details
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1 text-xs text-slate-600">
                    <p>Personal email: {vendor.email || "-"}</p>
                    <p>Personal phone: {vendor.phone || "-"}</p>
                    <p>Business email: {vendor.businessEmail || "-"}</p>
                    <p>Business phone: {vendor.businessPhone || "-"}</p>
                    <p>Category: {vendor.businessCategory?.name || "-"}</p>
                    <p>Subcategory: {vendor.businessSubcategory?.name || "-"}</p>
                    <p>Established: {vendor.establishmentYear || "-"}</p>
                    <p>Service tags: {vendor.serviceTags?.length ? vendor.serviceTags.join(", ") : "-"}</p>
                    <p>Proof: {vendor.idProofType || "-"} / {vendor.idProofNumber || "-"}</p>
                    <p>Registered: {formatDate(vendor.createdAt)}</p>

                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-700">ID proof document</p>
                        {vendor.idProofDocument ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {getDocumentTypeLabel(vendor.idProofDocument)}
                          </span>
                        ) : null}
                      </div>
                      {vendor.idProofDocument ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDocumentPreview(
                                "ID proof document",
                                vendor.idProofDocument || "",
                                buildDocumentFileName(`${vendor.businessName || vendor.id}-id-proof`, vendor.idProofDocument || "")
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadDocument(
                                vendor.idProofDocument || "",
                                buildDocumentFileName(`${vendor.businessName || vendor.id}-id-proof`, vendor.idProofDocument || "")
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Download
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">Not uploaded</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-700">GST document</p>
                        {vendor.gstDocument ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {getDocumentTypeLabel(vendor.gstDocument)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">GSTIN: {vendor.gstNumber || "-"}</p>
                      {vendor.gstDocument ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDocumentPreview(
                                "GST document",
                                vendor.gstDocument || "",
                                buildDocumentFileName(`${vendor.businessName || vendor.id}-gst`, vendor.gstDocument || "")
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadDocument(
                                vendor.gstDocument || "",
                                buildDocumentFileName(`${vendor.businessName || vendor.id}-gst`, vendor.gstDocument || "")
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Download
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">Not uploaded</p>
                      )}
                    </div>
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

      <Modal
        open={Boolean(activeDocument)}
        title={activeDocument ? `${activeDocument.title} preview` : "Document preview"}
        onClose={() => setActiveDocument(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                void requestFullscreen(previewRef.current);
              }}
              disabled={!canInlinePreview}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              Full Screen
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeDocument) return;
                openDocumentInNewTab(activeDocument.dataUrl);
              }}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeDocument) return;
                downloadDocument(activeDocument.dataUrl, activeDocument.fileName);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Download
            </button>
          </>
        }
      >
        {activeDocument ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700">
                {getDocumentTypeLabel(activeDocument.dataUrl)}
              </span>
              <span className="truncate">{activeDocument.fileName}</span>
            </div>

            <div ref={previewRef} className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {activeDocumentKind === "image" ? (
                <img src={activeDocument.dataUrl} alt={activeDocument.title} className="mx-auto max-h-[64vh] w-auto rounded-md" />
              ) : null}

              {activeDocumentKind === "pdf" ? (
                <iframe title={activeDocument.title} src={activeDocument.dataUrl} className="h-[64vh] w-full rounded-md bg-white" />
              ) : null}

              {activeDocumentKind === "word" ? (
                <p className="px-2 py-10 text-center text-sm text-slate-600">
                  Preview is not available for Word files. Use Open to view or Download to save.
                </p>
              ) : null}

              {activeDocumentKind === "other" ? (
                <p className="px-2 py-10 text-center text-sm text-slate-600">
                  Preview is not available for this file type. Use Open or Download.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(activeVendor)}
        title={activeVendor?.businessName ? `${activeVendor.businessName} details` : "Vendor details"}
        onClose={() => setActiveVendor(null)}
        panelClassName="max-w-[88vw] xl:max-w-[1280px] 2xl:max-w-[1480px]"
        footer={
          activeVendor ? (
            <>
              <button
                type="button"
                disabled={Boolean(busyVendors[activeVendor.id])}
                onClick={() => void handleVendorStatus(activeVendor, "approved")}
                className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
              >
                {busyVendors[activeVendor.id] ? "Working..." : "Approve"}
              </button>
              <button
                type="button"
                disabled={Boolean(busyVendors[activeVendor.id])}
                onClick={() => void handleVendorStatus(activeVendor, "rejected")}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-70"
              >
                {busyVendors[activeVendor.id] ? "Working..." : "Reject"}
              </button>
              <button
                type="button"
                onClick={() => setActiveVendor(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </>
          ) : null
        }
      >
        {activeVendor ? (
          <section className="space-y-2 break-words rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[13px] text-slate-700">
            <div className="grid gap-x-4 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
              <p><span className="font-semibold text-slate-900">Owner Name:</span> {getDisplayName(activeVendor)}</p>
              <p><span className="font-semibold text-slate-900">Vendor Status:</span> {activeVendor.vendorStatus}</p>
              <p><span className="font-semibold text-slate-900">Personal Email:</span> {activeVendor.email || "-"}</p>
              <p><span className="font-semibold text-slate-900">Personal Phone:</span> {activeVendor.phone || "-"}</p>
              <p><span className="font-semibold text-slate-900">Business Name:</span> {activeVendor.businessName || "-"}</p>
              <p><span className="font-semibold text-slate-900">Business Email:</span> {activeVendor.businessEmail || "-"}</p>
              <p><span className="font-semibold text-slate-900">Business Phone:</span> {activeVendor.businessPhone || "-"}</p>
              <p><span className="font-semibold text-slate-900">Category:</span> {activeVendor.businessCategory?.name || "-"}</p>
              <p><span className="font-semibold text-slate-900">Subcategory:</span> {activeVendor.businessSubcategory?.name || "-"}</p>
              <p className="xl:col-span-4"><span className="font-semibold text-slate-900">Business Address:</span> {activeVendor.businessAddress || "-"}</p>
              <p><span className="font-semibold text-slate-900">City:</span> {activeVendor.city || "-"}</p>
              <p><span className="font-semibold text-slate-900">State:</span> {activeVendor.state || "-"}</p>
              <p><span className="font-semibold text-slate-900">Postal Code:</span> {activeVendor.postalCode || "-"}</p>
              <p><span className="font-semibold text-slate-900">Establishment Year:</span> {activeVendor.establishmentYear || "-"}</p>
              <p><span className="font-semibold text-slate-900">Website:</span> {activeVendor.website || "-"}</p>
              <p><span className="font-semibold text-slate-900">ID Proof Type:</span> {activeVendor.idProofType || "-"}</p>
              <p><span className="font-semibold text-slate-900">ID Proof Number:</span> {activeVendor.idProofNumber || "-"}</p>
              <p><span className="font-semibold text-slate-900">Marketing Opt-in:</span> {activeVendor.marketingOptIn ? "Yes" : "No"}</p>
              <p className="xl:col-span-4"><span className="font-semibold text-slate-900">Services/Tags:</span> {activeVendor.serviceTags?.length ? activeVendor.serviceTags.join(", ") : "-"}</p>
              <p className="xl:col-span-4"><span className="font-semibold text-slate-900">Business Description:</span> {activeVendor.businessDescription || "-"}</p>
              <p><span className="font-semibold text-slate-900">Registered On:</span> {formatDate(activeVendor.createdAt)}</p>
              <p><span className="font-semibold text-slate-900">Updated On:</span> {formatDate(activeVendor.updatedAt)}</p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">ID Proof Document:</span>
                {activeVendor.idProofDocument ? (
                  <>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {getDocumentTypeLabel(activeVendor.idProofDocument)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openDocumentPreview(
                          "ID proof document",
                          activeVendor.idProofDocument || "",
                          buildDocumentFileName(`${activeVendor.businessName || activeVendor.id}-id-proof`, activeVendor.idProofDocument || "")
                        )
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700"
                    >
                      View Document
                    </button>
                  </>
                ) : (
                  <span>-</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">GST Document:</span>
                {activeVendor.gstDocument ? (
                  <>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {getDocumentTypeLabel(activeVendor.gstDocument)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openDocumentPreview(
                          "GST document",
                          activeVendor.gstDocument || "",
                          buildDocumentFileName(`${activeVendor.businessName || activeVendor.id}-gst`, activeVendor.gstDocument || "")
                        )
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700"
                    >
                      View Document
                    </button>
                  </>
                ) : (
                  <span>-</span>
                )}
              </div>
              <p className="text-sm text-slate-600">GSTIN: {activeVendor.gstNumber || "-"}</p>
            </div>

            <label className="block space-y-1 text-sm text-slate-700">
              Review note
              <input
                value={vendorNotes[activeVendor.id] || ""}
                onChange={(event) => handleVendorNoteChange(activeVendor.id, event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500"
                placeholder="Optional note for vendor approval review"
              />
            </label>
          </section>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
