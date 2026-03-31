"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export type TableColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type TableProps<T> = {
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string;
  emptyText: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
};

export default function Table<T>({
  rows,
  columns,
  rowKey,
  emptyText,
  pageSizeOptions = [10, 20, 50],
  initialPageSize = 10,
}: TableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);

  const paginatedRows = useMemo(() => {
    const nextPage = Math.min(page, totalPages);
    const start = (nextPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows, totalPages]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-4 py-6 text-sm text-(--text-soft)">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-(--border)">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-(--border) bg-(--surface-muted) text-left text-[11px] uppercase tracking-[0.08em] text-(--text-soft)">
              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-2 font-medium ${column.className || ""}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-(--border) last:border-b-0">
                {columns.map((column) => (
                  <td key={`${rowKey(row)}-${column.key}`} className={`px-3 py-2 text-(--text-soft) ${column.className || ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-soft)">
        <p>
          Page {Math.min(page, totalPages)} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => {
              const value = Number(event.target.value);
              setPageSize(value);
              setPage(1);
            }}
            className="rounded-lg border border-(--border) bg-(--surface) px-2 py-1"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-lg border border-(--border) px-2 py-1 hover:bg-(--surface-hover)"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="rounded-lg border border-(--border) px-2 py-1 hover:bg-(--surface-hover)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
