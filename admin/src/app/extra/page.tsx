"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createCity,
  createCityLocality,
  deleteCity,
  deleteCityLocality,
  fetchCities,
  toErrorMessage,
  updateCity,
  updateCityLocality,
  type AdminCity,
} from "@/lib/adminClient";

const sortCities = (cities: AdminCity[]) =>
  [...cities].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.name.localeCompare(right.name);
  });

const sortLocalities = (city: AdminCity) =>
  [...(Array.isArray(city.localities) ? city.localities : [])].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.name.localeCompare(right.name);
  });

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export default function ExtraPage() {
  const searchParams = useSearchParams();
  const activeItem = findSidebarItem(searchParams.get("view"));

  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCityId, setBusyCityId] = useState<string | null>(null);
  const [busyLocalityId, setBusyLocalityId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [cityName, setCityName] = useState("");
  const [cityState, setCityState] = useState("");
  const [citySortOrder, setCitySortOrder] = useState("0");
  const [cityActive, setCityActive] = useState(true);

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [localityNameInput, setLocalityNameInput] = useState("");

  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [editCityState, setEditCityState] = useState("");
  const [editCitySortOrder, setEditCitySortOrder] = useState("0");
  const [editCityActive, setEditCityActive] = useState(true);
  const [savingCityEdit, setSavingCityEdit] = useState(false);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchCities({ includeInactive: true });
      setCities(payload);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Failed to load cities"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  const sortedCities = useMemo(() => sortCities(cities), [cities]);

  const selectedCity = useMemo(
    () => sortedCities.find((city) => city.id === selectedCityId) || null,
    [selectedCityId, sortedCities]
  );

  const editingCity = useMemo(
    () => sortedCities.find((city) => city.id === editingCityId) || null,
    [editingCityId, sortedCities]
  );

  useEffect(() => {
    if (!selectedCityId) return;
    const exists = cities.some((city) => city.id === selectedCityId);
    if (!exists) {
      setSelectedCityId(null);
      setLocalityNameInput("");
    }
  }, [cities, selectedCityId]);

  useEffect(() => {
    if (!editingCityId) return;
    const exists = cities.some((city) => city.id === editingCityId);
    if (!exists) {
      setEditingCityId(null);
      setEditCityName("");
      setEditCityState("");
      setEditCitySortOrder("0");
      setEditCityActive(true);
    }
  }, [cities, editingCityId]);

  const handleCreateCity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const name = cityName.trim();
    if (!name) {
      setError("City name is required");
      return;
    }

    const state = cityState.trim();
    if (!state) {
      setError("State is required");
      return;
    }

    const sortOrder = Number(citySortOrder || "0");
    if (!Number.isFinite(sortOrder)) {
      setError("City sort order must be numeric");
      return;
    }

    setSaving(true);
    try {
      const created = await createCity({
        name,
        state,
        sortOrder,
        isActive: cityActive,
      });

      setMessage(`City "${created.name}" created`);
      setCityName("");
      setCityState("");
      setCitySortOrder("0");
      setCityActive(true);
      await loadCities();
    } catch (createError) {
      setError(toErrorMessage(createError, "Unable to create city"));
    } finally {
      setSaving(false);
    }
  };

  const openEditCity = (city: AdminCity) => {
    setError(null);
    setMessage(null);
    setEditingCityId(city.id);
    setEditCityName(city.name);
    setEditCityState(String(city.state || "").trim());
    setEditCitySortOrder(String(city.sortOrder ?? 0));
    setEditCityActive(Boolean(city.isActive));
  };

  const closeEditCityModal = (force = false) => {
    if (savingCityEdit && !force) return;
    setEditingCityId(null);
    setEditCityName("");
    setEditCityState("");
    setEditCitySortOrder("0");
    setEditCityActive(true);
  };

  const handleEditCity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCity) return;

    setError(null);
    setMessage(null);

    const name = editCityName.trim();
    if (!name) {
      setError("City name is required");
      return;
    }

    const state = editCityState.trim();
    if (!state) {
      setError("State is required");
      return;
    }

    const sortOrder = Number(editCitySortOrder || "0");
    if (!Number.isFinite(sortOrder)) {
      setError("City sort order must be numeric");
      return;
    }

    setSavingCityEdit(true);
    setBusyCityId(editingCity.id);
    try {
      const updated = await updateCity(editingCity.id, {
        name,
        state,
        sortOrder,
        isActive: editCityActive,
      });

      setMessage(`City "${updated.name}" updated`);
      closeEditCityModal(true);
      await loadCities();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Unable to update city"));
    } finally {
      setSavingCityEdit(false);
      setBusyCityId((current) => (current === editingCity.id ? null : current));
    }
  };

  const handleToggleCity = async (city: AdminCity) => {
    setError(null);
    setMessage(null);
    setBusyCityId(city.id);

    try {
      await updateCity(city.id, { isActive: !city.isActive });
      setMessage(`City "${city.name}" updated`);
      await loadCities();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Unable to update city"));
    } finally {
      setBusyCityId((current) => (current === city.id ? null : current));
    }
  };

  const handleDeleteCity = async (city: AdminCity) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Delete city "${city.name}" and all localities?`);
      if (!confirmed) return;
    }

    setError(null);
    setMessage(null);
    setBusyCityId(city.id);

    try {
      await deleteCity(city.id);
      setMessage(`City "${city.name}" deleted`);
      await loadCities();
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, "Unable to delete city"));
    } finally {
      setBusyCityId((current) => (current === city.id ? null : current));
    }
  };

  const handleAddLocality = async () => {
    if (!selectedCity) return;

    const trimmed = localityNameInput.trim();
    if (!trimmed) {
      setError("Locality name is required");
      return;
    }

    setError(null);
    setMessage(null);
    setBusyCityId(selectedCity.id);

    try {
      await createCityLocality(selectedCity.id, {
        name: trimmed,
        sortOrder: 0,
        isActive: true,
      });
      setMessage(`Locality "${trimmed}" added to ${selectedCity.name}`);
      setLocalityNameInput("");
      await loadCities();
    } catch (createError) {
      setError(toErrorMessage(createError, "Unable to add locality"));
    } finally {
      setBusyCityId((current) => (current === selectedCity.id ? null : current));
    }
  };

  const handleToggleLocality = async (cityId: string, localityId: string, nextValue: boolean) => {
    setError(null);
    setMessage(null);
    setBusyLocalityId(localityId);

    try {
      await updateCityLocality(cityId, localityId, { isActive: nextValue });
      setMessage("Locality status updated");
      await loadCities();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Unable to update locality"));
    } finally {
      setBusyLocalityId((current) => (current === localityId ? null : current));
    }
  };

  const handleDeleteLocality = async (cityId: string, localityId: string, localityName: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Delete locality "${localityName}"?`);
      if (!confirmed) return;
    }

    setError(null);
    setMessage(null);
    setBusyLocalityId(localityId);

    try {
      await deleteCityLocality(cityId, localityId);
      setMessage(`Locality "${localityName}" deleted`);
      await loadCities();
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, "Unable to delete locality"));
    } finally {
      setBusyLocalityId((current) => (current === localityId ? null : current));
    }
  };

  return (
    <AdminShell title="Extra" subtitle="Manage cities and localities powering location-aware discovery and onboarding.">
      <PageLayout
        title={activeItem?.label || "Manage Cities"}
        subtitle="Compact city tiles with modal locality management and safe delete actions."
      >
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        <section className="rounded-xl border border-(--border) bg-(--surface) p-3">
          <h3 className="text-sm font-semibold text-(--text-strong)">Add City</h3>
          <form onSubmit={handleCreateCity} className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={cityName}
              onChange={(event) => setCityName(event.target.value)}
              placeholder="City name"
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
              required
            />
            <select
              value={cityState}
              onChange={(event) => setCityState(event.target.value)}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
              required
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={citySortOrder}
              onChange={(event) => setCitySortOrder(event.target.value)}
              placeholder="Sort order (0 = last)"
              step={1}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text-soft)">
              <input
                type="checkbox"
                checked={cityActive}
                onChange={(event) => setCityActive(event.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-70 sm:col-span-2 lg:col-span-1"
            >
              {saving ? "Saving..." : "Add City"}
            </button>
          </form>
        </section>

        {loading ? (
          <p className="rounded-xl border border-(--border) bg-(--surface) px-3 py-4 text-sm text-(--text-soft)">
            Loading cities...
          </p>
        ) : sortedCities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-3 py-4 text-sm text-(--text-soft)">
            No cities configured yet.
          </p>
        ) : (
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sortedCities.map((city) => {
              const cityBusy = busyCityId === city.id;
              return (
                <article
                  key={city.id}
                  className="group rounded-xl border border-(--border) bg-(--surface) p-3 transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCityId(city.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-(--text-strong)">{city.name}</p>
                        <p className="text-xs text-(--text-soft)">
                          {city.state || "No state"} | Sort {city.sortOrder}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          city.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {city.isActive ? "active" : "inactive"}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-(--text-soft)">
                      {city.localities.length} localities configured
                    </p>
                  </button>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditCity(city)}
                      disabled={cityBusy || savingCityEdit}
                      className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] font-semibold text-(--text-soft) disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleCity(city)}
                      disabled={cityBusy}
                      className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] font-semibold text-(--text-soft) disabled:opacity-60"
                    >
                      {cityBusy ? "..." : city.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCity(city)}
                      disabled={cityBusy}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <Modal
          open={Boolean(editingCity)}
          title={editingCity ? `Edit city: ${editingCity.name}` : "Edit city"}
          onClose={closeEditCityModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeEditCityModal}
                disabled={savingCityEdit}
                className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft) disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-city-form"
                disabled={savingCityEdit}
                className="rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
              >
                {savingCityEdit ? "Saving..." : "Save City"}
              </button>
            </>
          }
        >
          {editingCity ? (
            <form id="edit-city-form" onSubmit={handleEditCity} className="grid gap-2 sm:grid-cols-2">
              <label className="sm:col-span-2 block">
                <span className="mb-1 block text-xs font-semibold text-(--text-soft)">City name</span>
                <input
                  value={editCityName}
                  onChange={(event) => setEditCityName(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-(--text-soft)">State</span>
                <select
                  value={editCityState}
                  onChange={(event) => setEditCityState(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  required
                >
                  <option value="">Select state</option>
                  {editCityState && !INDIAN_STATES.some((stateName) => stateName === editCityState) ? (
                    <option value={editCityState}>{editCityState}</option>
                  ) : null}
                  {INDIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-(--text-soft)">Sort order</span>
                <input
                  type="number"
                  value={editCitySortOrder}
                  onChange={(event) => setEditCitySortOrder(event.target.value)}
                  placeholder="Sort order (0 = last)"
                  step={1}
                  className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                />
              </label>

              <label className="sm:col-span-2 inline-flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text-soft)">
                <input
                  type="checkbox"
                  checked={editCityActive}
                  onChange={(event) => setEditCityActive(event.target.checked)}
                  className="h-4 w-4"
                />
                Active
              </label>
            </form>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(selectedCity)}
          title={selectedCity ? `${selectedCity.name} localities` : "City details"}
          onClose={() => {
            setSelectedCityId(null);
            setLocalityNameInput("");
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedCityId(null);
                  setLocalityNameInput("");
                }}
                className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft)"
              >
                Close
              </button>
            </>
          }
        >
          {selectedCity ? (
            <section className="space-y-3">
              <div className="rounded-lg border border-(--border) bg-(--surface-muted) p-2 text-xs text-(--text-soft)">
                <p>
                  <span className="font-semibold text-(--text-strong)">State:</span> {selectedCity.state || "No state"}
                </p>
                <p>
                  <span className="font-semibold text-(--text-strong)">Status:</span> {selectedCity.isActive ? "Active" : "Inactive"}
                </p>
                <p>
                  <span className="font-semibold text-(--text-strong)">Sort order:</span> {selectedCity.sortOrder}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={localityNameInput}
                  onChange={(event) => setLocalityNameInput(event.target.value)}
                  placeholder={`Add locality in ${selectedCity.name}`}
                  className="min-w-[220px] flex-1 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                />
                <button
                  type="button"
                  onClick={() => void handleAddLocality()}
                  disabled={busyCityId === selectedCity.id}
                  className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm font-semibold text-(--text-soft) disabled:opacity-60"
                >
                  {busyCityId === selectedCity.id ? "Saving..." : "Add Locality"}
                </button>
              </div>

              <div className="space-y-1">
                {sortLocalities(selectedCity).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-(--border) bg-(--surface-muted) px-3 py-2 text-xs text-(--text-soft)">
                    No localities yet.
                  </p>
                ) : (
                  sortLocalities(selectedCity).map((locality) => {
                    const localityBusy = busyLocalityId === locality.id;
                    return (
                      <div
                        key={locality.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--surface) px-2.5 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-(--text-strong)">{locality.name}</p>
                          <p className="text-[11px] text-(--text-soft)">Sort {locality.sortOrder}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleLocality(selectedCity.id, locality.id, !locality.isActive)
                            }
                            disabled={localityBusy}
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold disabled:opacity-60 ${
                              locality.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {localityBusy ? "..." : locality.isActive ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteLocality(selectedCity.id, locality.id, locality.name)
                            }
                            disabled={localityBusy}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}
        </Modal>
      </PageLayout>
    </AdminShell>
  );
}
