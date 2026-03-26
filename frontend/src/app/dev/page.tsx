"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bug, RefreshCw } from "lucide-react";

type DevLog = {
  _id: string;
  source: string;
  type: "failure" | "warning";
  message: string;
  role?: "admin" | "vendor" | "customer";
  createdAt: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function DeveloperPanelPage() {
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/dev-logs`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Unable to load logs");
      }

      setLogs(payload.logs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load logs";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-300">Developer Panel</div>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">Failure Logs Monitor</h1>
            </div>
            <button
              type="button"
              onClick={loadLogs}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold border border-white/20 hover:bg-white/25 btn-hover"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl bg-white/80 border border-white/80 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="text-sm font-semibold text-slate-800">Recent Logs ({logs.length})</div>
            {loading ? <div className="text-xs text-slate-500">Loading...</div> : null}
          </div>

          {logs.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">No failure logs yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <article key={log._id} className="p-4 sm:p-5 hover:bg-slate-50/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {log.type === "failure" ? (
                        <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                      ) : (
                        <Bug size={16} className="text-amber-500 mt-0.5" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{log.message}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Source: {log.source}
                          {log.role ? ` | Role: ${log.role}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
