"use client";

import { useState } from "react";

type SyncResponse = {
  ok: boolean;
  message: string;
};

export function AdminSyncPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState("");

  async function runRequest(url: string, fallbackMessage: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(url, { method: "POST" });
      const json = (await res.json()) as Partial<SyncResponse>;

      if (!res.ok) {
        throw new Error(json.message || fallbackMessage);
      }

      setResult({
        ok: Boolean(json.ok),
        message: json.message || "Request completed.",
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setLoading(false);
    }
  }

  function runSeed() {
    return runRequest("/api/seed", "Seed request failed.");
  }

  function runMockSync() {
    return runRequest("/api/openvi/sync/mock", "Mock sync request failed.");
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-xl font-semibold text-white">OPENVI Admin Sync</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">
        Use this panel to seed Firestore and test future source sync flows
        before wiring in live government ingestion.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runSeed}
          disabled={loading}
          className="rounded-xl border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-900/50 disabled:opacity-60"
        >
          {loading ? "Working..." : "Seed Firestore"}
        </button>

        <button
          type="button"
          onClick={runMockSync}
          disabled={loading}
          className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-900/40 disabled:opacity-60"
        >
          {loading ? "Working..." : "Run Mock Sync"}
        </button>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">
          {result.message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
