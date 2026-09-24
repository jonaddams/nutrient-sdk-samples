"use client";

import { useEffect, useState } from "react";
import type { FieldCitation } from "../_lib/types";
import { CitationViewer } from "./CitationViewer";
import { StatusBadge } from "./StatusBadge";

interface Detail {
  id: string;
  email_id: string;
  from_address: string | null;
  subject: string | null;
  status: "received" | "processing" | "processed" | "needs_review" | "failed";
  raw_body: string | null;
  extracted_data: Record<string, unknown> | null;
  field_citations: Record<string, FieldCitation> | null;
  review_flags: string[];
  context_flags: string[];
  error_reason: string | null;
  attachment_count: number;
  deduped_from: string | null;
  has_attachment: boolean;
}

/** Readable sentences, not enum strings. A reviewer should not decode jargon. */
const REVIEW_COPY: Record<string, string> = {
  missing_required: "A required field could not be read.",
  currency_unknown: "The currency is not stated on the document.",
  subtotal_mismatch: "Line items do not sum to the subtotal.",
  total_mismatch:
    "Subtotal + tax + shipping − discount does not equal the total.",
  date_unparseable: "The due date could not be parsed.",
  ungrounded_field: "A value could not be located on the page.",
  no_document_to_extract:
    "No document was attached, so there was nothing to ground against.",
};

const CONTEXT_COPY: Record<string, string> = {
  no_attachment: "Extracted from the email body — no attachment.",
  multiple_attachments:
    "More than one attachment; only the first was processed.",
  extraction_reused: "Result reused from an earlier identical document.",
};

const MONEY_FIELDS = new Set([
  "subtotal_minor",
  "tax_total_minor",
  "shipping_minor",
  "discount_minor",
  "total_minor",
]);

function formatValue(
  key: string,
  value: unknown,
  data: Record<string, unknown>,
) {
  if (value === null || value === undefined) return "—";
  if (MONEY_FIELDS.has(key) && typeof value === "number") {
    const exp =
      typeof data.minor_unit_exponent === "number"
        ? data.minor_unit_exponent
        : 2;
    const currency =
      typeof data.currency === "string" ? data.currency : undefined;
    const amount = value / 10 ** exp;
    return currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
        }).format(amount)
      : amount.toFixed(exp);
  }
  return String(value);
}

export function ExtractionDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/python-sdk/email-extraction-pipeline/api/extractions/${id}`,
        );
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

  if (error) return <p className="font-mono text-xs">{error}</p>;
  if (!detail) return <p className="text-sm">Loading…</p>;

  const citations = detail.field_citations ?? {};
  const data = detail.extracted_data ?? {};
  const scalars = Object.entries(data).filter(([k]) => k !== "line_items");
  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];

  return (
    <div className="mt-4 rounded-3xl border border-[var(--border-neutral-default-primary,#e5e5e5)] p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg tracking-[-0.48px]">
            {detail.subject ?? "(no subject)"}
          </h3>
          <p className="text-sm text-[var(--text-neutral-secondary,#666)]">
            {detail.from_address ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={detail.status} />
          <button type="button" onClick={onClose} className="text-sm underline">
            Close
          </button>
        </div>
      </div>

      {detail.review_flags.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-2xl bg-[var(--bg-state-warning,#fff3bf)] p-3 text-sm">
          {detail.review_flags.map((f) => (
            <li key={f}>{REVIEW_COPY[f] ?? f}</li>
          ))}
        </ul>
      )}

      {/* Context flags render quietly and separately. They are facts about the
          input, not defects, and making them look like problems is exactly the
          confusion the two-tier split exists to avoid. */}
      {detail.context_flags.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm text-[var(--text-neutral-secondary,#666)]">
          {detail.context_flags.map((f) => (
            <li key={f}>{CONTEXT_COPY[f] ?? f}</li>
          ))}
        </ul>
      )}

      {detail.deduped_from && (
        <p className="mb-3 text-sm">
          Extraction reused from an earlier email — these values were computed
          from a different message's context.
        </p>
      )}

      {/* Fields get a fixed column, the document gets the rest. A 50/50 split
          gave half the width to a table that never needs it and starved the
          thing the sample exists to show. Mirrors the design system's
          .sample-shell.left and indexed-search's 420px rail. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h4 className="font-semi-mono mb-2 text-xs uppercase tracking-[0.24px]">
            Extracted fields
          </h4>
          <table className="w-full text-sm">
            <tbody>
              {scalars.map(([key, value]) => {
                const citation = citations[key];
                const isActive = activePath === key;
                return (
                  <tr
                    key={key}
                    onClick={() =>
                      citation && setActivePath(isActive ? null : key)
                    }
                    className={`border-t border-[var(--border-neutral-default-secondary,#f0f0f0)] ${
                      citation ? "cursor-pointer" : ""
                    } ${isActive ? "bg-[var(--bg-state-neutral,#f0f0f0)]" : ""}`}
                  >
                    <td className="py-2 pr-3 text-[var(--text-neutral-secondary,#666)]">
                      {key}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatValue(key, value, data)}
                    </td>
                    <td className="w-16 py-2 pl-3 text-right text-xs">
                      {citation ? (
                        <span className="text-[var(--text-neutral-secondary,#666)]">
                          p.{citation.page + 1}
                        </span>
                      ) : (
                        <span className="opacity-40">no source</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {lineItems.length > 0 && (
            <>
              <h4 className="font-semi-mono mt-6 mb-2 text-xs uppercase tracking-[0.24px]">
                Line items ({lineItems.length})
              </h4>
              <table className="w-full text-sm">
                <tbody>
                  {lineItems.map((item, i) => {
                    const path = `line_items[${i}].amount_minor`;
                    const citation = citations[path];
                    const isActive = activePath === path;
                    const li = item as {
                      description?: string;
                      amount_minor?: number;
                    };
                    return (
                      <tr
                        key={path}
                        onClick={() =>
                          citation && setActivePath(isActive ? null : path)
                        }
                        className={`border-t border-[var(--border-neutral-default-secondary,#f0f0f0)] ${
                          citation ? "cursor-pointer" : ""
                        } ${isActive ? "bg-[var(--bg-state-neutral,#f0f0f0)]" : ""}`}
                      >
                        <td className="py-2 pr-3">{li.description}</td>
                        <td className="py-2 text-right font-mono">
                          {formatValue("total_minor", li.amount_minor, data)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div>
          <h4 className="font-semi-mono mb-2 text-xs uppercase tracking-[0.24px]">
            Source document
          </h4>
          {detail.has_attachment ? (
            <CitationViewer
              documentUrl={`/python-sdk/email-extraction-pipeline/api/extractions/${id}/attachment`}
              citations={citations}
              activePath={activePath}
              onCitationPress={setActivePath}
            />
          ) : (
            <pre className="h-[calc(100vh-12rem)] min-h-[560px] overflow-auto rounded-2xl border border-[var(--border-neutral-default-primary,#e5e5e5)] p-4 text-xs whitespace-pre-wrap">
              {detail.raw_body ?? "(no body)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
