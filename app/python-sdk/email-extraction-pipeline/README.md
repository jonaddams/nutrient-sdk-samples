# Email Extraction Pipeline

Inbound email → validated structured data, with a bounding box for every
extracted field.

Not the same as the [AI Document Processing → Invoices](../../ai-document-processing/invoices)
sample. That one extracts from a batch of files you upload, using XtractFlow
template definitions. **This one ingests email as it arrives and returns grounded
citations from the Nutrient Python SDK** — each value carries the rectangle on the
page it was read from.

## Status

Complete and running in production. The whole path works on live inbound email:
webhook → durable workflow → extraction → confidence rules → a dashboard that draws
the rectangle each value was read from.

Measured on a real message: a 36 KB invoice arrived, extracted in about 40 seconds,
and landed `processed` with **17 grounded fields** — including a bounding box on
`line_items[0].description`, a field nested inside an array — and both arithmetic
cross-checks closing.

The one thing deliberately left out is an emailed confirmation reply. It is a
`resend.emails.send` call and it teaches nothing the rest of this does not, so it
would be plumbing in front of the lesson.

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
| `NUTRIENT_LICENSE_KEY` | Extraction (on the Python service) | Rows reach `processing` and stop |
| `EXTRACTION_SERVICE_URL` | The Python service | Defaults to `http://localhost:8080` |
| `EXTRACTION_SERVICE_TOKEN` | Shared secret sent to that service | Sent as no header — fine locally, **wrong for a deployed service** |
| `MAX_ATTACHMENT_BYTES` | Rejecting oversized attachments early | Defaults to 20 MB, which is larger than a serverless request body can be — see below |

**If you deploy the Python service, give it a token.** It holds your Nutrient
licence and your model provider's API key and spends both on request, so an
internet-reachable instance with no caller check is an uncapped bill for whoever
finds the URL. The sample sends `Authorization: Bearer $EXTRACTION_SERVICE_TOKEN`
when the variable is set; the service must be configured to require it. Verify with
an unauthenticated request — it should come back **401**, not a validation error.

**Set `MAX_ATTACHMENT_BYTES` below your platform's request-body limit.** On Vercel
that is 4.5 MB, so this sample runs with 4 MB. The limit is checked against the
attachment *metadata* before anything is downloaded, so an oversized file fails as
`oversized` on the dashboard instead of dying partway through the workflow with an
opaque platform 413. A 5 MB invoice arrived on the first day of real use, so this is
not hypothetical.

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

For reference, this is what Resend actually delivers — note the authserv-id is
`amazonses.com`, not a Resend domain, because Resend receives on SES:

```
amazonses.com; spf=pass (spfCheck: domain of example.com designates
  198.51.100.10 as permitted sender) client-ip=198.51.100.10;
  envelope-from=someone@example.com; helo=mail-lf2-f12.google.com;
  dkim=pass header.i=@example.com; dmarc=pass header.from=example.com;
```

`_lib/auth-results.ts` parses that correctly and returns `verified: true`, so a
well-formed message does not pick up `sender_unverified`. If you adapt this for a
different provider, that authserv-id token is the thing most likely to differ.

**`MAX_EXTRACTIONS_PER_HOUR`.** The ceiling if something slips through — a spoof
that fails open, or a mailing list pointed at the address by accident. Over the cap
the row is still written (`hourly_cap_reached`) but no workflow starts, so nothing
is lost and nothing is spent. Resend retains the mail, so it can be replayed after
the window.

### Attachments are untrusted files served from your own origin

Two rules, and the second is the one that is easy to get wrong:

**Only inert types are ingested.** An allowlist, not `image/*` — that also admits
`image/svg+xml`, which is not a scan format but a document that can carry script.

**The sender's declared content type is never echoed back.** It is untrusted
input; serving a stored file as whatever its sender claimed is how stored files
become stored XSS. Unrecognised types are served as `application/octet-stream`,
alongside `nosniff`, `Content-Disposition: attachment`, and a
`default-src 'none'; sandbox` CSP. The citation viewer is unaffected because it
*fetches* the document rather than navigating to it.

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
- **The values are stable across runs; the citations are not.** The same invoice
  replayed minutes apart returned byte-identical numbers — same total, same nine
  line items, sums matching — but a different number of grounded fields (25 or 26,
  and on one run a field that could not be located at all). So the same document
  can land `processed` on one run and `needs_review` with `ungrounded_field` on the
  next. That is correct behaviour, not a bug, but expect it when demonstrating.
  It is also why no accuracy claim here is stated as a single number.

### The durable workflow earns its keep

This is the part that is easy to take on faith, so it was measured. Six runs were
started 25 seconds apart and a **new production deployment was shipped while three
of them were mid-extraction** — one 54 seconds in, one 28, one 2.

All six finished `processed`, with identical values and `attempt_count` of 1. The
extraction service — the expensive, slow step — was called **exactly six times for
six runs**. The three interrupted runs did not redo the work they had already
completed; their recorded step output survived the deployment that replaced the
code executing them, and each resumed after it.

Interrupted and uninterrupted runs were indistinguishable in the output. That is
the whole argument for putting a durable workflow behind a webhook rather than
doing the work inline: a deploy in the middle of someone's invoice is a normal
Tuesday, and nobody has to think about it.
