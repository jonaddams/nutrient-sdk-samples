# Email Extraction Pipeline

Inbound email → validated structured data, with a bounding box for every
extracted field.

Not the same as the [AI Document Processing → Invoices](../../ai-document-processing/invoices)
sample. That one extracts from a batch of files you upload, using XtractFlow
template definitions. **This one ingests email as it arrives and returns grounded
citations from the Nutrient Python SDK** — each value carries the rectangle on the
page it was read from.

## Status

Build steps 1–6 of 14. The webhook, the durable workflow and the read API are
in; the extraction call is not.

| Done | Next |
|---|---|
| Schema, migration, dedicated pool | Extraction service (step 7) |
| Svix verification + 14 tests | Extraction step + metadata walk (step 8) |
| `POST /api/inbound` with the claim query | Confidence rules |
| Durable workflow: fetch, hash, store | Citation overlay |
| Sweeper, allowlist, replay UI | |

Replayed rows currently park at `processing` — that is honest, not broken: the
extraction step is build step 8.

## Setup

This sample needs **its own Neon database** — not `DATABASE_URL`, which in this
repo is the search index. Two unrelated systems on one migration track is how a
search-index rebuild ends up dropping invoice rows.

```bash
# 1. Provision a second Neon database via the Vercel Marketplace, then rename its
#    injected vars in the integration settings (not in code — a later integration
#    writing DATABASE_URL would clobber the search database's).
EXTRACTIONS_DATABASE_URL=...
EXTRACTIONS_DATABASE_URL_UNPOOLED=...

# 2. Apply the schema
psql "$EXTRACTIONS_DATABASE_URL_UNPOOLED" -f migrations/extractions/001_init.sql

# 3. Seed, so the dashboard renders every status
pnpm tsx scripts/email-extraction-pipeline/seed.ts
```

### Credentials

| Variable | Enables | Without it |
|---|---|---|
| `EXTRACTIONS_DATABASE_URL` | Everything | The page shows a setup error |
| `RESEND_WEBHOOK_SECRET` | `POST /api/inbound` | Route returns 500 |
| `INBOUND_RECIPIENT` | Claiming only this sample's mail | **Ingests every inbound message** — see below |
| `INBOUND_SENDER_ALLOWLIST` | Restricting who can trigger work | Open inbox |
| `DASHBOARD_TOKEN` | Auth on the read API | API is open |
| `NUTRIENT_LICENSE_KEY` | Extraction (on the Python service) | Not needed until step 7 |
| `EXTRACTION_SERVICE_URL` | The Python service | Defaults to `http://localhost:8080` |

Vercel Blob is created **as a private store**. The access mode cannot be changed
after creation, and these are invoices.

### Choosing an inbound address

**Use a Resend managed address** — `something@<id>.resend.app`. It needs no DNS at
all, which is the right trade for a sample: nothing to add to a domain you use for
anything else, and nothing to unpick when you tear it down.

Find yours under **Emails → Receiving → ⋯ → Receiving address**, then set it as
`INBOUND_RECIPIENT` in `.env.local`. It is intentionally not committed: a live
inbound address in a public repo only invites noise.

**You receive mail for every username at that subdomain.** There is no alias to
create or reserve — you pick one and use it. That is exactly why
`INBOUND_RECIPIENT` matters: a second sample using `intake@<id>.resend.app` shares
the same inbox with you.

A domain address works too (`invoices@inbound.yourdomain.com`, one MX record on the
`inbound` host at priority 10). Worth knowing if you already send mail from that
domain: **inbound and outbound verify independently**, and the MX goes on the
`inbound` subdomain, so receiving here does not disturb sending from the apex.

### Wiring the webhook

**Webhooks → Add Webhook**, endpoint:

```
https://<your-deployment>/python-sdk/email-extraction-pipeline/api/inbound
```

Select `email.received`, add it, then copy the `whsec_` signing secret from the
webhook's page into `RESEND_WEBHOOK_SECRET`.

Resend has to reach the endpoint, so local testing needs a tunnel — or just use the
Replay buttons, which drive the same route with a locally signed payload.

### Two different filters, for two different problems

**`INBOUND_RECIPIENT` — is this message mine?**

Resend fans every inbound message for a domain out to **every** webhook endpoint
subscribed to `email.received`. Add a second sample that receives email and, without
this check, each one ingests the other's mail. A message addressed elsewhere is
acknowledged with **no row at all** — writing one would be claiming another
consumer's mail.

Matched against the envelope recipient (`received_for`) as well as `to` and `cc`,
because a message can legitimately arrive via bcc, a forward, or a list where no
visible header names you.

**`INBOUND_SENDER_ALLOWLIST` — should this sender be able to spend money?**

Anyone who learns the address can otherwise make you run a model and consume
licensed SDK work. A disallowed sender **does** get a row, `status = failed` with
`sender_not_allowed`, so the dashboard shows it happened — but with no attachment
fetch, no extraction, and no spend.

Entries are exact addresses or `@domain` for a whole domain. This sample uses
`@nutrient.io` so colleagues can demo it without a deploy each; the leading `@` is
what keeps the suffix match safe, so `@nutrient.io` will not match
`evilnutrient.io`. Subdomains are not matched — add `@mail.nutrient.io` explicitly
if you want one.

### The allowlist is not authentication on its own

`From` is trivially forgeable, so matching on it is a naming convention rather than
a control. Opening the allowlist to a whole domain makes that worth closing, and
two things do it:

**DMARC / SPF / DKIM.** The workflow reads `Authentication-Results` from the
received message and refuses a sender whose domain ownership the checks actively
disprove — **before** the attachment download and the extraction call, which are
what cost money. The row is still written, with `sender_not_authentic`, so the
refusal is visible rather than silent.

This deliberately **fails open** when the header is absent or shaped unexpectedly:
such a message is accepted and flagged `sender_unverified` rather than rejected,
because a demo that silently stops working the first time a header shape changes is
worse than one that over-accepts behind a cap. `fail` and `unknown` are different
things, and only `fail` is refused.

**`MAX_EXTRACTIONS_PER_HOUR`.** The ceiling if something slips through — a spoof
that fails open, or a mailing list pointed at the address by accident. Over the cap
the row is still written (`hourly_cap_reached`) but no workflow starts, so nothing
is lost and nothing is spent. Resend retains the mail, so it can be replayed after
the window.

### The privacy trade, stated plainly

Every extraction lands in one table and the dashboard shows the table. With a
company-wide allowlist that means a colleague's invoice is visible to anyone who
can open the dashboard. That is fine for shared demo documents and wrong for real
customer paperwork — so keep `DASHBOARD_TOKEN` set in any deployment, and tell
colleagues to send sample invoices rather than live ones.

## Trying it without email

**The replay buttons on the page need no credentials at all** beyond a webhook
secret — not Resend, not Blob, not a Nutrient licence. A fixture reads its PDF
from `public/` and is posted through the *real* webhook, so it exercises the same
signature check, idempotency claim and allowlist a live delivery would. A replay
that bypassed the webhook would be demonstrating a different system.

Replayed mail is addressed to `INBOUND_RECIPIENT` and sent from a derived address
(`@nutrient.io` → `replay@nutrient.io`), so it passes the same recipient filter and
sender allowlist a live delivery does. Turning the allowlist on therefore does not
break the buttons. Override with `REPLAY_FROM`.

For the failure paths, drive it from the command line:

```bash
# valid signature -> 200
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice

# body altered after signing -> 401
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice --tamper

# timestamp outside the 5-minute window -> 401
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice --stale

# webhook retry -> 200, then duplicate
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice --twice

# another consumer's mail on the same subdomain -> 200, no row written
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts wrong-recipient

# the fixtures carry realistic vendor senders, which a domain allowlist rejects.
# Pass --from when the point of the run is what happens AFTER the gate:
pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice --from you@nutrient.io
```

Any `whsec_`-prefixed base64 value works locally as long as the script and the
server agree.

## Running the tests

The signature tests need nothing. The idempotency tests run real SQL and skip
unless a database is pointed at — an in-memory fake would just agree with
whatever the code does.

```bash
docker run -d --name eep-postgres -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=extractions -p 55432:5432 postgres:16-alpine
export EXTRACTIONS_DATABASE_URL=postgres://postgres:dev@localhost:55432/extractions
psql "$EXTRACTIONS_DATABASE_URL" -f migrations/extractions/001_init.sql
pnpm vitest run app/python-sdk/email-extraction-pipeline
```

## Two things worth copying

**Verify the signature against the raw body.** `await req.text()`, then
`JSON.parse` that same string. Calling `await req.json()` and re-serialising
produces bytes that mean the same thing and hash differently — so the check either
fails every time, or, once someone "fixes" it leniently, passes everything.
`__tests__/svix.test.ts` has that case.

**A row existing is not evidence its work was scheduled.** The webhook inserts,
then *claims* with a separate conditional update. The obvious version — insert,
then short-circuit on "row already exists" — loses email permanently: if the
insert succeeds and `start()` then throws, the retry finds the row, returns 200,
and nothing ever notices. See the comments in `api/inbound/route.ts`.

## Measured notes

From the provider sweep (4 models × 4 invoices × 3 repeats, scored against the
human-verified key in `../extraction-studio/lib/verified.ts`):

- **Grounding was 100% on every provider**, including both open-weight models.
  Grounding comes from the SDK's text-layer matching, not the model — so model
  choice costs nothing in provenance.
- **Grounded ≠ correct.** Both open-weight models returned a confidently wrong
  total with a 0.95 grounding score. The arithmetic cross-checks — line items sum
  to *subtotal*, subtotal + tax + shipping − discount equals *total* — are the
  real accuracy signal.
- ~8% of values span more than one text block, so draw every `source_bbox` rather
  than the single merged `bbox`.
