"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  createCategory,
  createSubcategory,
  fetchCategories,
  fetchSubcategories,
  toErrorMessage,
  updateCategory,
  updateSubcategory,
  type AdminCategory,
  type AdminSubcategory,
} from "@/lib/adminClient";

function isValidNumericInput(value: string) {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function getTimeRank(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CategoriesWorkspacePage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AdminSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySortOrder, setNewCategorySortOrder] = useState("0");
  const [newCategoryActive, setNewCategoryActive] = useState(true);

  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategorySortOrder, setNewSubcategorySortOrder] = useState("0");
  const [newSubcategoryActive, setNewSubcategoryActive] = useState(true);
  const [newSubcategoryCategoryId, setNewSubcategoryCategoryId] = useState("");

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [busyCategories, setBusyCategories] = useState<Record<string, boolean>>({});
  const [busySubcategories, setBusySubcategories] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [categoryList, subcategoryList] = await Promise.all([
        fetchCategories({ includeInactive: true }),
        fetchSubcategories({ includeInactive: true }),
      ]);

      setCategories(categoryList);
      setSubcategories(subcategoryList);
      setNewSubcategoryCategoryId((current) => current || categoryList[0]?.id || "");
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Unable to load categories workspace"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const name = newCategoryName.trim();
    if (!name) {
      setError("Category name is required");
      return;
    }

    if (!isValidNumericInput(newCategorySortOrder)) {
      setError("Category sort order must be numeric");
      return;
    }

    setSavingCategory(true);
    try {
      const created = await createCategory({
        name,
        sortOrder: Number(newCategorySortOrder || "0"),
        isActive: newCategoryActive,
      });

      setMessage(`Category \"${created.name}\" created`);
      setNewCategoryName("");
      setNewCategorySortOrder("0");
      setNewCategoryActive(true);
      await loadData();
    } catch (createError) {
      setError(toErrorMessage(createError, "Failed to create category"));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateSubcategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const name = newSubcategoryName.trim();
    if (!name) {
      setError("Subcategory name is required");
      return;
    }

    if (!newSubcategoryCategoryId) {
      setError("Select parent category");
      return;
    }

    if (!isValidNumericInput(newSubcategorySortOrder)) {
      setError("Subcategory sort order must be numeric");
      return;
    }

    setSavingSubcategory(true);
    try {
      const created = await createSubcategory({
        categoryId: newSubcategoryCategoryId,
        name,
        sortOrder: Number(newSubcategorySortOrder || "0"),
        isActive: newSubcategoryActive,
      });

      setMessage(`Subcategory \"${created.name}\" created`);
      setNewSubcategoryName("");
      setNewSubcategorySortOrder("0");
      setNewSubcategoryActive(true);
      await loadData();
    } catch (createError) {
      setError(toErrorMessage(createError, "Failed to create subcategory"));
    } finally {
      setSavingSubcategory(false);
    }
  };

  const handleToggleCategory = async (category: AdminCategory) => {
    setError(null);
    setMessage(null);
    setBusyCategories((prev) => ({ ...prev, [category.id]: true }));

    try {
      const updated = await updateCategory(category.id, { isActive: !category.isActive });
      setMessage(`Category \"${updated.name}\" is now ${updated.isActive ? "active" : "inactive"}`);
      await loadData();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Failed to update category"));
    } finally {
      setBusyCategories((prev) => ({ ...prev, [category.id]: false }));
    }
  };

  const handleToggleSubcategory = async (subcategory: AdminSubcategory) => {
    setError(null);
    setMessage(null);
    setBusySubcategories((prev) => ({ ...prev, [subcategory.id]: true }));

    try {
      const updated = await updateSubcategory(subcategory.id, { isActive: !subcategory.isActive });
      setMessage(`Subcategory \"${updated.name}\" is now ${updated.isActive ? "active" : "inactive"}`);
      await loadData();
    } catch (updateError) {
      setError(toErrorMessage(updateError, "Failed to update subcategory"));
    } finally {
      setBusySubcategories((prev) => ({ ...prev, [subcategory.id]: false }));
    }
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item) => map.set(item.id, item.name));
    return map;
  }, [categories]);

  const recentCategories = useMemo(() => {
    return [...categories]
      .sort((a, b) => getTimeRank(b.createdAt || b.updatedAt) - getTimeRank(a.createdAt || a.updatedAt))
      .slice(0, 8);
  }, [categories]);

  const summary = useMemo(
    () => ({
      totalCategories: categories.length,
      totalSubcategories: subcategories.length,
      activeCategories: categories.filter((item) => item.isActive).length,
      activeSubcategories: subcategories.filter((item) => item.isActive).length,
    }),
    [categories, subcategories]
  );

  return (
    <AdminShell
      title="Categories Workspace"
      subtitle="Compact and modern category studio for faster admin operations."
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</p>
      ) : null}

      <section className="stagger-grid mb-3 grid gap-3 rounded-2xl border border-slate-200 bg-linear-to-r from-orange-50/70 via-white to-cyan-50/70 p-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Categories</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary.totalCategories}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Subcategories</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary.totalSubcategories}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Active Categories</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary.activeCategories}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Active Subcategories</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary.activeSubcategories}</p>
        </article>
      </section>

      <section className="stagger-grid grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <div className="stagger-grid grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-3">
            <h3 className="text-base font-bold text-slate-900">Create Category</h3>
            <form onSubmit={handleCreateCategory} className="mt-2.5 space-y-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Category name</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. Home Services"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sort order</span>
                <input
                  type="number"
                  value={newCategorySortOrder}
                  onChange={(event) => setNewCategorySortOrder(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newCategoryActive}
                  onChange={(event) => setNewCategoryActive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mark active
              </label>

              <button
                type="submit"
                disabled={savingCategory}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingCategory ? "Saving..." : "Save Category"}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3">
            <h3 className="text-base font-bold text-slate-900">Create Subcategory</h3>
            <form onSubmit={handleCreateSubcategory} className="mt-2.5 space-y-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Parent category</span>
                <select
                  value={newSubcategoryCategoryId}
                  onChange={(event) => setNewSubcategoryCategoryId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Subcategory name</span>
                <input
                  value={newSubcategoryName}
                  onChange={(event) => setNewSubcategoryName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. AC Repair"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sort order</span>
                <input
                  type="number"
                  value={newSubcategorySortOrder}
                  onChange={(event) => setNewSubcategorySortOrder(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newSubcategoryActive}
                  onChange={(event) => setNewSubcategoryActive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mark active
              </label>

              <button
                type="submit"
                disabled={savingSubcategory}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingSubcategory ? "Saving..." : "Save Subcategory"}
              </button>
            </form>
          </article>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          <h3 className="text-base font-bold text-slate-900">Recently Added Categories</h3>
          <p className="mt-1 text-xs text-slate-500">Quick reference inspired by your previous admin layout.</p>

          {recentCategories.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No categories yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{category.name}</p>
                    <p className="text-[11px] text-slate-500">Sort: {category.sortOrder}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      category.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="stagger-grid mt-3 grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Categories</h3>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {categories.length} total
            </span>
          </div>

          {loading ? (
            <p className="mt-2 text-sm text-slate-500">Loading categories...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5">Sort</th>
                    <th className="px-2 py-1.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const busy = Boolean(busyCategories[category.id]);
                    return (
                      <tr key={category.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 text-sm font-semibold text-slate-800">{category.name}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              category.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-slate-600">{category.sortOrder}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleToggleCategory(category)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? "Updating..." : category.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Subcategories</h3>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {subcategories.length} total
            </span>
          </div>

          {loading ? (
            <p className="mt-2 text-sm text-slate-500">Loading subcategories...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Category</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map((subcategory) => {
                    const busy = Boolean(busySubcategories[subcategory.id]);
                    return (
                      <tr key={subcategory.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 text-sm font-semibold text-slate-800">{subcategory.name}</td>
                        <td className="px-2 py-2 text-xs text-slate-600">
                          {subcategory.category?.name || categoryNameById.get(subcategory.category?.id || "") || "-"}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              subcategory.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {subcategory.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleToggleSubcategory(subcategory)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? "Updating..." : subcategory.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </AdminShell>
  );
}
