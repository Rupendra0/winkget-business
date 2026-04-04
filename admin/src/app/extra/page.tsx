"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageLayout from "@/components/admin/PageLayout";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createCity,
  createCityLocality,
  fetchCities,
  toErrorMessage,
  updateCity,
  updateCityLocality,
  type AdminCity,
} from "@/lib/adminClient";

export default function ExtraPage() {
  const searchParams = useSearchParams();
  const activeItem = findSidebarItem(searchParams.get("view"));

  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [cityName, setCityName] = useState("");
  const [cityState, setCityState] = useState("");
  const [citySortOrder, setCitySortOrder] = useState("0");
  const [cityActive, setCityActive] = useState(true);
  const [localityNameByCity, setLocalityNameByCity] = useState<Record<string, string>>({});

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

  const sortedCities = useMemo(
    () =>
      [...cities].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.name.localeCompare(right.name);
      }),
    [cities]
  );

  const handleCreateCity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const name = cityName.trim();
    if (!name) {
      setError("City name is required");
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
        state: cityState.trim() || undefined,
        sortOrder,
        isActive: cityActive,
      });
      setMessage(`City \"${created.name}\" created`);
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

  const handleToggleCity = async (city: AdminCity) => {
    setError(null);
    setMessage(null);
    try {
      await updateCity(city.id, { isActive: !city.isActive });
      setMessage(`City \"${city.name}\" updated`);
      await loadCities();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Unable to update city"));
    }
  };

  const handleCreateLocality = async (city: AdminCity) => {
    const nextName = String(localityNameByCity[city.id] || "").trim();
    if (!nextName) {
      setError("Locality name is required");
      return;
    }

    setError(null);
    setMessage(null);
    try {
      await createCityLocality(city.id, { name: nextName, isActive: true, sortOrder: 0 });
      setMessage(`Locality \"${nextName}\" added to ${city.name}`);
      setLocalityNameByCity((current) => ({ ...current, [city.id]: "" }));
      await loadCities();
    } catch (createError) {
      setError(toErrorMessage(createError, "Unable to add locality"));
    }
  };

  const handleToggleLocality = async (city: AdminCity, localityId: string, nextValue: boolean) => {
    setError(null);
    setMessage(null);
    try {
      await updateCityLocality(city.id, localityId, { isActive: nextValue });
      setMessage("Locality status updated");
      await loadCities();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Unable to update locality"));
    }
  };

  return (
    <AdminShell title="Extra" subtitle="Manage cities and their localities for location-aware catalog filtering.">
      <PageLayout
        title={activeItem?.label || "Manage Cities"}
        subtitle="These cities and localities power navbar location, vendor registration, and category-level filtering."
      >
        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
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
            <input
              value={cityState}
              onChange={(event) => setCityState(event.target.value)}
              placeholder="State (optional)"
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
            />
            <input
              type="number"
              value={citySortOrder}
              onChange={(event) => setCitySortOrder(event.target.value)}
              placeholder="Sort order"
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

        <section className="grid gap-3">
          {loading ? (
            <p className="rounded-xl border border-(--border) bg-(--surface) px-3 py-4 text-sm text-(--text-soft)">Loading cities...</p>
          ) : sortedCities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-3 py-4 text-sm text-(--text-soft)">
              No cities configured yet.
            </p>
          ) : (
            sortedCities.map((city) => (
              <article key={city.id} className="rounded-xl border border-(--border) bg-(--surface) p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-(--text-strong)">{city.name}</p>
                    <p className="text-xs text-(--text-soft)">
                      {city.state || "No state"} | Sort {city.sortOrder} | {city.localities.length} localities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleCity(city)}
                    className="rounded-full border border-(--border) bg-(--surface-muted) px-3 py-1 text-xs font-semibold text-(--text-soft)"
                  >
                    {city.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={localityNameByCity[city.id] || ""}
                    onChange={(event) =>
                      setLocalityNameByCity((current) => ({
                        ...current,
                        [city.id]: event.target.value,
                      }))
                    }
                    placeholder={`Add locality in ${city.name}`}
                    className="min-w-[220px] flex-1 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateLocality(city)}
                    className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm font-semibold text-(--text-soft)"
                  >
                    Add Locality
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {city.localities.length === 0 ? (
                    <span className="text-xs text-(--text-soft)">No localities yet.</span>
                  ) : (
                    city.localities.map((locality) => (
                      <button
                        key={locality.id}
                        type="button"
                        onClick={() =>
                          void handleToggleLocality(city, locality.id, !locality.isActive)
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          locality.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-100 text-slate-600"
                        }`}
                        title={locality.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        {locality.name}
                      </button>
                    ))
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </PageLayout>
    </AdminShell>
  );
}
