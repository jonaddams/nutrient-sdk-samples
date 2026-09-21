/**
 * Seed the extractions table with representative rows.
 *
 * Exists so the dashboard can be built and reviewed before the workflow or the
 * extraction service exist — every status renders, including the two in-flight
 * ones that are hard to catch by hand.
 *
 *   pnpm tsx scripts/email-extraction-pipeline/seed.ts
 *   pnpm tsx scripts/email-extraction-pipeline/seed.ts --reset
 */

import { Pool } from "pg";

const ROWS = [
  {
    email_id: "seed-processed",
    from_address: "billing@atlasconstruction.example",
    subject: "Invoice AC-2025-1047",
    status: "processed",
    extracted_data: {
      vendor_name: "Atlas Construction LLC",
      invoice_number: "AC-2025-1047",
      total: {
        amount_minor: 34501500,
        currency: "USD",
        minor_unit_exponent: 2,
      },
      due_date: "2025-03-01",
    },
    review_flags: [],
    context_flags: [],
  },
  {
    email_id: "seed-needs-review",
    from_address: "ap@lumen.example",
    subject: "Invoice 616770524",
    status: "needs_review",
    extracted_data: {
      vendor_name: "Lumen",
      invoice_number: "616770524",
      total: { amount_minor: 8806, currency: null, minor_unit_exponent: 2 },
      due_date: null,
    },
    // The lumen document is the corpus trap: it prints both an invoice date and
    // a payment-due date, and every model tested picks the wrong one somewhere.
    review_flags: ["currency_unknown", "date_unparseable"],
    context_flags: [],
  },
  {
    email_id: "seed-body-only",
    from_address: "ops@vendor.example",
    subject: "Amount due — no attachment",
    status: "processed",
    extracted_data: {
      vendor_name: "Vendor Co",
      total: { amount_minor: 125000, currency: "USD", minor_unit_exponent: 2 },
    },
    review_flags: [],
    // Context, not a defect: a clean body-only extraction must NOT be sent for
    // human review just because there was no PDF.
    context_flags: ["no_attachment"],
  },
  {
    email_id: "seed-failed",
    from_address: "stranger@elsewhere.example",
    subject: "Please process this",
    status: "failed",
    extracted_data: null,
    review_flags: [],
    context_flags: [],
    error_reason: "sender_not_allowed",
  },
  {
    email_id: "seed-received",
    from_address: "billing@newvendor.example",
    subject: "March invoice",
    status: "received",
    extracted_data: null,
    review_flags: [],
    context_flags: [],
  },
  {
    email_id: "seed-processing",
    from_address: "accounts@acme.example",
    subject: "Statement 0042",
    status: "processing",
    extracted_data: null,
    review_flags: [],
    context_flags: [],
  },
];

async function main() {
  const url = process.env.EXTRACTIONS_DATABASE_URL;
  if (!url) {
    console.error(
      "EXTRACTIONS_DATABASE_URL is not set. This sample uses its own database, " +
        "separate from DATABASE_URL (the search index).",
    );
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });

  if (process.argv.includes("--reset")) {
    await pool.query("delete from extractions where email_id like 'seed-%'");
    console.log("cleared seed rows");
  }

  for (const row of ROWS) {
    await pool.query(
      `insert into extractions
         (email_id, from_address, subject, received_at, status,
          extracted_data, review_flags, context_flags, error_reason)
       values ($1, $2, $3, now(), $4::extraction_status, $5, $6, $7, $8)
       on conflict (email_id) do update set
         status = excluded.status,
         extracted_data = excluded.extracted_data,
         review_flags = excluded.review_flags,
         context_flags = excluded.context_flags,
         error_reason = excluded.error_reason`,
      [
        row.email_id,
        row.from_address,
        row.subject,
        row.status,
        row.extracted_data ? JSON.stringify(row.extracted_data) : null,
        row.review_flags,
        row.context_flags,
        ("error_reason" in row ? row.error_reason : null) ?? null,
      ],
    );
    console.log(`  ${row.status.padEnd(13)} ${row.email_id}`);
  }

  await pool.end();
  console.log(`\nseeded ${ROWS.length} rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
