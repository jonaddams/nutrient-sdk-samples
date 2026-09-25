"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ExtractionDetail } from "../_lib/types";
import { CitationViewer } from "./CitationViewer";

const BASE = "/python-sdk/email-extraction-pipeline";

const STATUS_CLASS: Record<string, string> = {
  received: "processing",
  processing: "processing",
  processed: "processed",
  needs_review: "review",
  failed: "failed",
};
const statusClass = (s: string) => STATUS_CLASS[s] ?? "processing";
const statusLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const MONEY = (minor: unknown, currency = "USD") =>
  typeof minor === "number"
    ? (minor / 100).toLocaleString("en-US", { style: "currency", currency })
    : null;

// Money is stored in minor units, so a bare number would read as cents. Only
// the *_minor fields get formatted; everything else is shown as it arrived.
function formatValue(
  key: string,
  value: unknown,
  data: Record<string, unknown>,
) {
  if (value == null) return "—";
  if (key.endsWith("_minor")) {
    const cur = typeof data.currency === "string" ? data.currency : "USD";
    return MONEY(value, cur) ?? String(value);
  }
  return String(value);
}

type Tab = "fields" | "lines" | "run" | "json";

export function DetailWorkspace({ id }: { id: string }) {
  const [detail, setDetail] = useState<ExtractionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [activePath, setActivePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/extractions/${id}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (!cancelled) setDetail(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Escape returns to the list. The detail is a route now, so this is the
  // keyboard equivalent of the back button rather than closing a panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea/i.test(el.tagName)) return;
      if (e.key === "Escape") window.location.assign(BASE);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error)
    return (
      <main className="ep ep-d mx-auto px-6 py-8">
        <p className="ep-err mono">{error}</p>
        <Link href={BASE} className="ep-link">
          Back to extractions
        </Link>
      </main>
    );
  if (!detail)
    return (
      <main className="ep ep-d mx-auto px-6 py-8">
        <p className="text-sm">Loading…</p>
      </main>
    );

  const citations = detail.field_citations ?? {};
  const data = detail.extracted_data ?? {};
  const scalars = Object.entries(data).filter(([k]) => k !== "line_items");
  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];
  const grounded = scalars.filter(([k]) => citations[k]).length;
  const attachment = detail.attachment_meta as
    | { filename?: string }
    | null
    | undefined;
  const subject = detail.subject ?? "(no subject)";
  const isReplay = subject.startsWith("Replay: ");

  return (
    <main className="ep ep-d mx-auto px-6">
      <div className="ep-dhead">
        <nav className="breadcrumb">
          <Link href="/">Index</Link>
          <span>/</span>
          <Link href="/python-sdk">Python SDK</Link>
          <span>/</span>
          <Link href={BASE}>Email Extraction Pipeline</Link>
          <span>/</span>
          <span className="mono">{detail.email_id.slice(0, 14)}</span>
        </nav>

        <div className="ep-dhead-row">
          <div>
            <h1 className="ep-dtitle">
              <Link href={BASE} className="ep-back" aria-label="Back to list">
                ←
              </Link>
              {isReplay && <span className="tag">Replay</span>}
              <span className="mono">{subject.replace("Replay: ", "")}</span>
            </h1>
            <div className="ep-dmeta">
              <span className={`ep-status ${statusClass(detail.status)}`}>
                <i />
                {statusLabel(detail.status)}
              </span>
              <span>{detail.from_address ?? "—"}</span>
              {detail.received_at && (
                <span>{new Date(detail.received_at).toLocaleString()}</span>
              )}
              {attachment?.filename && (
                <span className="ep-att mono">{attachment.filename}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ep-work">
        <aside className="ep-panel">
          <div className="ep-tabs" role="tablist">
            {(
              [
                ["fields", "Fields", `${grounded}/${scalars.length}`],
                ["lines", "Line items", String(lineItems.length)],
                ["run", "Run", null],
                ["json", "JSON", null],
              ] as const
            ).map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k as Tab)}
              >
                {label}
                {n != null && <span className="count">{n}</span>}
              </button>
            ))}
          </div>

          <div className="ep-panel-body">
            {tab === "fields" && (
              <div className="ep-fields">
                {scalars.length === 0 && (
                  <div className="ep-panel-empty">
                    Nothing was extracted from this email. See Run for where it
                    stopped.
                  </div>
                )}
                {scalars.map(([key, value]) => {
                  const cite = citations[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`ep-f ${activePath === key ? "on" : ""}`}
                      disabled={!cite}
                      onClick={() =>
                        setActivePath(activePath === key ? null : key)
                      }
                    >
                      <span className="k mono">{key}</span>
                      <span className="v mono">
                        {formatValue(key, value, data)}
                      </span>
                      <span className="p mono">
                        {cite ? `p${cite.page + 1}` : "no source"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "lines" && (
              <div className="ep-fields">
                {lineItems.length === 0 && (
                  <div className="ep-panel-empty">No line items.</div>
                )}
                {lineItems.map((li, i) => {
                  const item = li as Record<string, unknown>;
                  const path = `line_items[${i}]`;
                  return (
                    <button
                      key={path}
                      type="button"
                      className={`ep-f ${activePath === path ? "on" : ""}`}
                      disabled={!citations[path]}
                      onClick={() =>
                        setActivePath(activePath === path ? null : path)
                      }
                    >
                      <span className="k">
                        {String(item.description ?? "—")}
                      </span>
                      <span className="v mono">
                        {MONEY(item.amount_minor) ?? "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "run" && (
              <div className="ep-run mono">
                <div>status: {detail.status}</div>
                <div>attempts: {detail.attempt_count ?? "—"}</div>
                <div>
                  review_flags: {detail.review_flags.join(", ") || "none"}
                </div>
                <div>
                  context_flags: {detail.context_flags.join(", ") || "none"}
                </div>
                <div>error: {detail.error_reason ?? "none"}</div>
                <div>sha256: {detail.content_sha256 ?? "—"}</div>
              </div>
            )}

            {tab === "json" && (
              <pre className="ep-json mono">
                {JSON.stringify(detail.extracted_data ?? {}, null, 2)}
              </pre>
            )}
          </div>
        </aside>

        <section className="ep-viewer">
          {detail.has_attachment ? (
            <CitationViewer
              documentUrl={`${BASE}/api/extractions/${id}/attachment`}
              citations={citations}
              activePath={activePath}
              onCitationPress={setActivePath}
            />
          ) : (
            <div className="ep-nodoc">
              <p>No document on this email.</p>
              <pre className="ep-json mono">
                {detail.raw_body ?? "(no body)"}
              </pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
