# Nutrient SDK Samples

A solutions-engineering showcase demonstrating Nutrient's document SDKs and APIs
across browser and server platforms. Each sample is self-contained — copy a
folder, swap the brand tokens, and ship.

Run the app and open [http://localhost:3000](http://localhost:3000); the home
page is the index of everything below.

## What's inside

The showcase groups demos by product area:

- **Web SDK** — in-browser PDF viewing, annotations, forms, e-signatures,
  redaction, content editing, search, document assembly, and document/text
  comparison. The largest collection, covering most viewer and headless
  workflows.
- **Python SDK** — server-side form-field detection and fill, digital signing,
  redaction, format conversion, template generation, and VLM-based extraction
  (via a separate FastAPI backend).
- **.NET SDK** — server-side MRC optimization, linearization, and OCR (via a
  hosted backend).
- **Java SDK** — server-side conversion, OCR, and digital signing for JVM
  workloads.
- **Nutrient DWS API** — signing, conversion, and comparison over REST.
- **AI Document Processing** — classify and extract structured data from
  invoices, receipts, and POs.
- **Document Authoring SDK** — programmatic document generation with templates,
  variables, and live preview.
- **Document Engine** — server-side processing (coming soon).

A standalone [**Sign**](https://sign-sage.vercel.app) reference application — a
full e-signing flow re-themed through the same tokens — is linked from the home
page.

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **UI**: React 19 with TypeScript (strict)
- **Document SDKs**: Nutrient Web SDK (client-side) plus Python, .NET, Java, and
  DWS API backends
- **Testing**: Vitest + Testing Library
- **Tooling**: Biome (lint + format), pnpm

## Getting Started

### Prerequisites

- Node.js 20.9+ (22 or 24 LTS recommended — required by Next.js 16)
- pnpm (or npm/yarn)
- A Nutrient SDK license key

### Installation

```bash
git clone <repository-url>
cd nutrient-sdk-samples
pnpm install
```

Set up environment variables:

```bash
cp env.sample .env.local
# then add your license key:
# NEXT_PUBLIC_NUTRIENT_LICENSE_KEY=your_license_key_here
```

`env.sample` is the canonical list of every variable the app reads, grouped by
sample area and annotated. Only the license key is required for the Web SDK
samples; the backend variables below are needed only for those sample groups.

Start the dev server:

```bash
pnpm dev
```

The Web SDK, AI Document Processing, DWS API, and Document Authoring samples run
against this front end directly. The Python and .NET samples additionally need
their backends running — see [Backends](#backends).

## Scripts

```bash
pnpm dev            # Start the dev server (Turbopack)
pnpm build          # Production build
pnpm start          # Start the production server
pnpm lint           # Biome lint
pnpm format         # Biome format
pnpm test           # Run tests (test:watch, test:ui, test:coverage also available)
pnpm index          # Build the indexed-search corpus
pnpm seed-search    # Seed search demo data
```

## Backends

A few sample groups call separate backend services.

### Python SDK

Backend source: https://github.com/jonaddams/python-fast-api

Runs locally on `localhost:8080` during development:

```bash
git clone https://github.com/jonaddams/python-fast-api.git
cd python-fast-api
python3.12 -m venv .venv
make install
cp .env.example .env   # add your NUTRIENT_LICENSE_KEY
make dev               # uvicorn on :8080 with --reload
```

Point this app at it in `.env.local`:

```
NEXT_PUBLIC_PYTHON_SDK_API_URL=http://localhost:8080
```

The backend's full endpoint list is at `http://localhost:8080/docs` once
`make dev` is running.

### Java SDK

Backend source: https://github.com/jonaddams/java-spring-boot — a Spring Boot
service wrapping the Nutrient Java SDK. Run it per that repo's README; it serves
on `localhost:8080` by default.

Point this app at it in `.env.local`:

```
NEXT_PUBLIC_JAVA_SDK_API_URL=http://localhost:8080
```

> The Python and Java backends both default to port `8080`. To run them at the
> same time, start one on a different port and update its URL var to match.

### .NET SDK

Backend source: https://github.com/jonaddams/nutrient-dotnet-api (deployed on
Railway).

Add to `.env.local`:

```
NEXT_PUBLIC_DOTNET_SDK_API_URL=https://nutrient-dotnet-api-production.up.railway.app
DOTNET_SDK_API_KEY=<the X-API-Key value set in Railway env vars>
```

`DOTNET_SDK_API_KEY` is a server-side secret — browser code never sees it. All
calls go through the `/app/api/dotnet-sdk/*` proxy routes, which add the header
before forwarding to the .NET API.

## Deployment

Deploys cleanly to Vercel (recommended): push to your Git host, import the
project, add the environment variables, and deploy. Any Next.js-compatible host
works via `pnpm build` && `pnpm start`.

## Theming

The full design vocabulary lives in CSS variables on `<html>`. Override
`data-palette`, `data-theme`, or the tokens directly to rebrand the whole app.

## Resources

- [Nutrient SDK Documentation](https://www.nutrient.io/guides/web/)
- [`@nutrient-sdk/viewer-mcp`](https://www.npmjs.com/package/@nutrient-sdk/viewer-mcp) — MCP server giving AI assistants live access to Web SDK docs, API, examples, and changelog
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)

## Contributing

1. Create a feature branch
2. Make your changes (add tests where it makes sense)
3. Run `pnpm lint` and `pnpm test`
4. Open a pull request

---

Built with Nutrient SDKs.
