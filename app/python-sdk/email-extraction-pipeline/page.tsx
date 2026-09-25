"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
import { ExtractionDetail } from "./_components/ExtractionDetail";
import type { ExtractionListItem } from "./_lib/types";
// Global CSS, deliberately scoped under .ep — see styles.css.
import "./styles.css";

// Most visitors cannot replicate "mail arrives at my inbound address" — that
// needs their own Resend domain and DNS. Replaying a stored fixture is how this
// pipeline is actually experienced, so it is a control on the page rather than a
// script in the repo.
// `outcome` is what the fixture TYPICALLY lands on, taken from real replays
// rather than assumed. It is a hint, not a promise: citation coverage varies
// run to run, so clean-invoice occasionally lands needs_review instead of
// processed — which is exactly the behaviour the README documents. The badge
// exists so you can tell before clicking which button demonstrates the
// review path.
const FIXTURES = [
  {
    id: "fixture-clean-invoice",
    label: "Invoice with a PDF attachment",
    outcome: "processed",
  },
  {
    id: "fixture-scanned-invoice",
    label: "Scanned invoice (no text layer)",
    outcome: "needs_review",
  },
  {
    id: "fixture-body-only",
    label: "No attachment — extract from the body",
    outcome: "needs_review",
  },
  {
    id: "fixture-untrusted-sender",
    label: "Sender outside the allowlist",
    outcome: "needs_review",
  },
];

// The design's CSS uses four modifiers; the app has five statuses. "received"
// is visually "in flight" like processing, and the app's snake_case
// needs_review is the design's `review`.
const STATUS_CLASS: Record<string, string> = {
  received: "processing",
  processing: "processing",
  processed: "processed",
  needs_review: "review",
  failed: "failed",
};
const statusClass = (s: string) => STATUS_CLASS[s] ?? "processing";

const MONEY = (minor: unknown, currency = "USD") =>
  typeof minor === "number"
    ? (minor / 100).toLocaleString("en-US", { style: "currency", currency })
    : null;

// Rows arrive newest-first, so grouping consecutive runs of the same day needs
// no sort — just a walk. "Today"/"Yesterday" are resolved against the viewer's
// clock, which is the only clock that matters for a relative label.
function dayLabel(at: string | null): [string, string] {
  if (!at) return ["Unknown date", ""];
  const d = new Date(at);
  const midnight = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((midnight(d) - midnight(new Date())) / 864e5);
  const full = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (diff === 0) return ["Today", full];
  if (diff === -1) return ["Yesterday", full];
  return [full, ""];
}

const clockTime = (at: string | null) =>
  at
    ? new Date(at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

// "needs_review" -> "Needs review". The status values are snake_case in the
// database and on the wire; only the chip label is humanised, so filtering
// still compares the raw value.
function statusLabel(status: string) {
  if (status === "All") return "All";
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ListRow({
  row,
  open,
  onOpen,
}: {
  row: ExtractionListItem;
  open: boolean;
  onOpen: () => void;
}) {
  const data = row.extracted_data ?? {};
  const vendor = data.vendor_name;
  const total = MONEY(data.total_minor);
  const inFlight = row.status === "processing" || row.status === "received";

  // The Extracted column is a preview, so it shows the two values a human
  // scanning the list actually recognises a document by. A row still running
  // gets a skeleton rather than an em dash, which would read as "nothing found".
  let extracted: React.ReactNode;
  if (inFlight) extracted = <span className="ep-skel" />;
  else if (row.error_reason)
    extracted = <span className="ep-err mono">{row.error_reason}</span>;
  else
    extracted = (
      <>
        <span className="ep-vendor">
          {typeof vendor === "string" ? vendor : "—"}
        </span>
        <span className="mono ep-amt">{total ?? "—"}</span>
      </>
    );

  const subject = row.subject ?? "—";
  const isReplay = subject.startsWith("Replay: ");

  return (
    // biome-ignore lint/a11y/useSemanticElements: CSS Grid layout
    <div
      className={`ep-tr ep-row ${open ? "fresh" : ""}`}
      role="row"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="c-status">
        <span className={`ep-status ${statusClass(row.status)}`}>
          <i />
          {statusLabel(row.status)}
        </span>
      </span>
      <span className="c-from">{row.from_address ?? "—"}</span>
      <span className="c-subj">
        <span className="ep-subj">
          {isReplay ? (
            <>
              <span className="tag">Replay</span>
              <span className="mono">{subject.replace("Replay: ", "")}</span>
            </>
          ) : (
            subject
          )}
        </span>
      </span>
      <span className="c-ext">{extracted}</span>
      <span
        className="c-time mono r"
        title={row.received_at ?? row.created_at ?? ""}
      >
        {clockTime(row.received_at ?? row.created_at)}
      </span>
      <span className="c-go" aria-hidden="true">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </div>
  );
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
  const [query, setQuery] = useState("");

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "All" && row.status !== statusFilter) return false;
      if (!q) return true;
      // Search the extracted values too, not just the envelope — finding an
      // invoice by its number or vendor is the reason you would search here.
      const haystack = [
        row.from_address,
        row.subject,
        ...Object.values(row.extracted_data ?? {}).map((v) =>
          typeof v === "object" ? "" : String(v ?? ""),
        ),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, statusFilter, query]);

  // Consecutive runs of the same day become one group. Rows are already
  // newest-first from the API, so this is a walk rather than a sort.
  const groups = useMemo(() => {
    const out: {
      key: string;
      label: string;
      sub: string;
      rows: typeof visible;
    }[] = [];
    for (const row of visible) {
      const [label, sub] = dayLabel(row.received_at ?? row.created_at);
      const key = label + sub;
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, label, sub, rows: [row] });
    }
    return out;
  }, [visible]);

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
      <main className="ep mx-auto max-w-[1800px] px-6 py-8">
        <div className="ep-replay">
          <div className="ep-replay-copy">
            <div className="eyebrow">Replay a sample email</div>
            <p>
              The inbound address is restricted, so replay a stored{" "}
              <code className="inline-code">email.received</code> payload
              instead. It is signed the same way Resend signs it and goes
              through the same webhook route.
            </p>
            {replayError && <p className="ep-err mono mt-2">{replayError}</p>}
          </div>
          <div className="ep-replay-list">
            {FIXTURES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="ep-replay-btn"
                disabled={replaying !== null}
                onClick={() => replay(f.id)}
              >
                <span className="ep-replay-ico" aria-hidden="true">
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 5v14l11-7z" />
                  </svg>
                </span>
                <span className="ep-replay-label">
                  {replaying === f.id ? "Replaying…" : f.label}
                </span>
                <span
                  className={`ep-replay-out ${statusClass(f.outcome)}`}
                  title="What this fixture usually lands on — grounding varies between runs"
                >
                  {statusLabel(f.outcome)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ep-toolbar">
          <div className="ep-chips">
            {chips.map(([status, n]) => (
              <button
                key={status}
                type="button"
                className="chip"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status !== "All" && (
                  <i className={`ep-dot ${statusClass(status)}`} />
                )}
                {statusLabel(status)}
                <span className="count">{n}</span>
              </button>
            ))}
          </div>
          <label className="ep-search">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search sender, subject, invoice…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
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

        {/* A filter or search that matches nothing is a different situation
            from having no extractions at all, and clearing both is one click. */}
        {!loading && !error && items.length > 0 && visible.length === 0 && (
          <div className="ep-empty">
            No extractions match.{" "}
            <button
              type="button"
              className="ep-link"
              onClick={() => {
                setStatusFilter("All");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-[var(--ink-3)]">
            No extractions yet. Replay a sample email to see one appear.
          </p>
        )}

        {visible.length > 0 && (
          // .ep-tr is display:grid with named column tracks, which a real
          // <table> cannot express. The ARIA roles carry the semantics instead.
          // biome-ignore lint/a11y/useSemanticElements: CSS Grid layout
          <div className="ep-table" role="table">
            {/* biome-ignore lint/a11y/useSemanticElements: CSS Grid layout */}
            {/* biome-ignore lint/a11y/useFocusableInteractive: column headers, not a target */}
            <div className="ep-tr ep-th" role="row">
              <span>Status</span>
              <span>From</span>
              <span>Subject</span>
              <span>Extracted</span>
              <span className="r">Received</span>
              <span />
            </div>
            {groups.map((g) => (
              <Fragment key={g.key}>
                <div className="ep-group">
                  <span>{g.label}</span>
                  {g.sub && <span className="muted">{g.sub}</span>}
                  <span className="ep-group-n">{g.rows.length}</span>
                </div>
                {g.rows.map((row) => (
                  <ListRow
                    key={row.id}
                    row={row}
                    open={openId === row.id}
                    onOpen={() => setOpenId(openId === row.id ? null : row.id)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {openId && (
          <ExtractionDetail id={openId} onClose={() => setOpenId(null)} />
        )}
      </main>
    </div>
  );
}
