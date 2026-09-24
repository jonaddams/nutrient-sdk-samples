"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
import { ExtractionDetail } from "./_components/ExtractionDetail";
import { StatusBadge } from "./_components/StatusBadge";
import type { ExtractionListItem } from "./_lib/types";

// Most visitors cannot replicate "mail arrives at my inbound address" — that
// needs their own Resend domain and DNS. Replaying a stored fixture is how this
// pipeline is actually experienced, so it is a control on the page rather than a
// script in the repo.
const FIXTURES = [
  { id: "fixture-clean-invoice", label: "Invoice with a PDF attachment" },
  { id: "fixture-scanned-invoice", label: "Scanned invoice (no text layer)" },
  { id: "fixture-body-only", label: "No attachment — extract from the body" },
  { id: "fixture-untrusted-sender", label: "Sender outside the allowlist" },
];

// "needs_review" -> "Needs review". The status values are snake_case in the
// database and on the wire; only the chip label is humanised, so filtering
// still compares the raw value.
function statusLabel(status: string) {
  if (status === "All") return "All";
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function EmailExtractionPipelinePage() {
  const [items, setItems] = useState<ExtractionListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  // Chips are driven by `counts` (the server's totals across ALL rows), not by
  // what is currently loaded — so a count never changes just because a filter
  // is applied. "All" is derived by summing rather than using items.length,
  // which would only ever describe the current page.
  const chips = useMemo(() => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const byStatus = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    return [["All", total] as const, ...byStatus];
  }, [counts]);

  const visible = useMemo(
    () =>
      statusFilter === "All"
        ? items
        : items.filter((row) => row.status === statusFilter),
    [items, statusFilter],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        "/python-sdk/email-extraction-pipeline/api/extractions",
      );
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setItems(body.extractions ?? []);
      setCounts(body.counts ?? {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const replay = useCallback(
    async (fixture: string) => {
      setReplaying(fixture);
      setReplayError(null);
      try {
        const res = await fetch(
          "/python-sdk/email-extraction-pipeline/api/replay",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            // `fresh` so clicking twice produces two rows rather than a
            // duplicate — replaying the same id is a separate thing to demo.
            body: JSON.stringify({ fixture, fresh: true }),
          },
        );
        const body = await res.json();
        if (!res.ok)
          throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
        await load();
      } catch (err) {
        setReplayError(err instanceof Error ? err.message : String(err));
      } finally {
        setReplaying(null);
      }
    },
    [load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[var(--bg-elev)]">
      <PythonSampleHeader
        title="Email Extraction Pipeline"
        description="Inbound email becomes a validated, structured row with a bounding box for every extracted field."
      />

      {/* 1800px, matching web-sdk/indexed-search. The site shell is 1200px, but a
          sample whose point is a document beside its extracted values needs the
          room — at 1024px the viewer was narrower than the field table. */}
      <main className="mx-auto max-w-[1800px] px-6 py-8">
        <section className="mb-8 rounded-3xl border border-[var(--line)] p-6">
          <h2 className="font-semi-mono mb-1 text-xs uppercase tracking-[0.24px]">
            Replay a sample email
          </h2>
          <p className="mb-4 text-sm text-[var(--ink-3)]">
            The inbound address is restricted, so replay a stored{" "}
            <code>email.received</code> payload instead — signed exactly as
            Resend signs it, through the same webhook route.
          </p>
          <div className="flex flex-wrap gap-2">
            {FIXTURES.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={replaying !== null}
                onClick={() => replay(f.id)}
                className="chip disabled:opacity-50"
              >
                {replaying === f.id ? "Replaying…" : f.label}
              </button>
            ))}
          </div>
          {replayError && (
            <p className="mt-3 font-mono text-xs text-[var(--danger, #e5484d)]">
              {replayError}
            </p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-medium tracking-[-0.48px]">
            Extractions
          </h2>
        </div>

        {/* Same .filter-bar/.chip/.count markup the Web SDK sample index uses,
            so the two filters look and behave identically and this one inherits
            the theme-aware chip styling for free. */}
        <div className="filter-bar">
          {chips.map(([status, n]) => (
            <button
              key={status}
              type="button"
              className="chip"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {statusLabel(status)}
              <span className="count">{n}</span>
            </button>
          ))}
        </div>

        {loading && <p className="text-sm">Loading…</p>}

        {error && (
          <div className="rounded-2xl border border-[var(--danger, #e5484d)] p-4 text-sm">
            <p className="mb-1 font-medium">
              Could not read the extractions table.
            </p>
            <p className="font-mono text-xs">{error}</p>
            <p className="mt-2 text-[var(--ink-3)]">
              This sample uses its own Neon database via{" "}
              <code>EXTRACTIONS_DATABASE_URL</code> — separate from{" "}
              <code>DATABASE_URL</code>, which is the search index. Run{" "}
              <code>migrations/extractions/001_init.sql</code> against it.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && visible.length === 0 && (
          <p className="text-sm text-[var(--ink-3)]">
            No extractions with status “{statusLabel(statusFilter)}” on this
            page.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setStatusFilter("All")}
            >
              Show all
            </button>
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-[var(--ink-3)]">
            No extractions yet. Replay a sample email to see one appear.
          </p>
        )}

        {visible.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="font-semi-mono text-left text-xs uppercase tracking-[0.24px]">
                <th className="py-2">From</th>
                <th className="py-2">Subject</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Received</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  className={`cursor-pointer border-t border-[var(--line)] ${
                    openId === row.id ? "bg-[var(--accent-tint)]" : ""
                  }`}
                >
                  <td className="py-3">{row.from_address ?? "—"}</td>
                  <td className="py-3">{row.subject ?? "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-3 text-right font-mono text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {openId && (
          <ExtractionDetail id={openId} onClose={() => setOpenId(null)} />
        )}
      </main>
    </div>
  );
}
