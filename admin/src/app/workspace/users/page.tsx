"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchAdminUsers, toErrorMessage, type AdminDirectoryUser } from "@/lib/adminClient";
import { formatDate, getDisplayName } from "@/lib/adminUi";

type RoleFilter = "all" | "admin" | "customer" | "vendor";

export default function UsersWorkspacePage() {
  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [roleInput, setRoleInput] = useState<RoleFilter>("all");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeRole, setActiveRole] = useState<RoleFilter>("all");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await fetchAdminUsers({
        role: activeRole,
        search: activeSearch || undefined,
      });
      setUsers(list);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Unable to load users workspace"));
    } finally {
      setLoading(false);
    }
  }, [activeRole, activeSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const applyFilters = () => {
    setActiveRole(roleInput);
    setActiveSearch(searchInput.trim());
  };

  return (
    <AdminShell
      title="Users Workspace"
      subtitle="User records are handled on a dedicated page for better readability and faster filtering."
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, phone"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:col-span-2"
          />

          <select
            value={roleInput}
            onChange={(event) => setRoleInput(event.target.value as RoleFilter)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
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

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No users found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Business</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="px-2 py-2.5 font-semibold text-slate-800">{getDisplayName(user)}</td>
                    <td className="px-2 py-2.5 text-xs uppercase text-slate-600">{user.role}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-600">{user.email || "-"}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-600">{user.phone || "-"}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-600">{user.businessName || "-"}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-500">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
