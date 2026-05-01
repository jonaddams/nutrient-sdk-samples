# Nutrient SDK Samples — Sitemap

Live site: https://nutrient-sdk-samples.vercel.app/
Repo root: `app/` (Next.js App Router)

This is a hand-off document for design work. It enumerates every user-facing page, groups them by section, and notes the recurring page archetypes a design system needs to cover.

---

## Page archetypes

Three layouts repeat across the site. A design system only needs to nail these three plus the existing tokens page.

1. **Site landing** — one page (`/`). Marketing-style hero + 8 SDK cards in a 2-col grid.
2. **SDK index** — one per SDK (8 total). Page header, optional category filter chips, sample cards. Web SDK also exposes a category dropdown because it has 33 samples.
3. **Sample page** — ~55 leaf pages. Sample header (title, description, back link, source link), then a viewer/demo region. Some samples have side panels, sidebars, or sub-pages.

Existing scaffolding worth knowing about:
- `app/_components/PageHeader.tsx` — shared page header
- `app/web-sdk/_components/SampleHeader.tsx` — sample header for Web SDK
- `app/{python,java,dotnet}-sdk/_components/*SampleHeader.tsx` + `*SampleLayout.tsx` — server-SDK sample shells
- `app/nutrient-design-system/page.tsx` — existing token reference (colors, typography, buttons, spacing, radius, lists, tables, badges, tags, alerts, code)

---

## Top-level

| Path | Type | Title |
|---|---|---|
| `/` | Site landing | Nutrient SDK Samples |
| `/nutrient-design-system` | Reference | Nutrient Design System (tokens, components) |

The landing page links to 8 sections:

- Web SDK → `/web-sdk`
- Document Engine → `/document-engine`
- AI Document Processing → `/ai-document-processing`
- Java SDK → `/java-sdk`
- Python SDK → `/python-sdk`
- .NET SDK → `/dotnet-sdk`
- Nutrient DWS API → `/api`
- Document Authoring SDK → `/document-authoring-sdk`

A `/workflow` placeholder also exists but is not linked from the landing page.

---

## Web SDK (`/web-sdk`) — 33 samples

Filter chips: All, User Interface, Annotations, Forms, Signatures, Document Editor, Content Editor, Redaction, Document Comparison, Document Conversion.

### Annotations
- `/web-sdk/annotation-permissions` — **Annotation Permissions** — Role-based annotation permissions with a teacher/student classroom model — toggle visibility per student
- `/web-sdk/annotation-presets` — **Annotation Presets** — Customize default properties for annotation tools (colors, sizes, fonts, line styles) with live preview
- `/web-sdk/annotation-state` — **Annotation State Management** — Save and restore annotation states locally with version-control-like semantics
- `/web-sdk/collaboration-comments` — **Collaboration Comments** — Threaded comment replies with author tracking, @mentions, and configurable display modes
- `/web-sdk/counting-annotations` — **Counting Annotations** — Click to place numbered markers using custom-rendered annotations with a sidebar tracker
- `/web-sdk/custom-renderers` — **Custom Renderers** — Creative custom annotation renderers showcasing visual effects, animations, and interactive widgets
- `/web-sdk/keyword-highlight` — **Keyword Highlight** — Search and highlight configurable keywords with color-coded annotations
- `/web-sdk/numbered-callouts` — **Numbered Callouts** — Bluebeam/Procore-style numbered bubble + leader arrows for construction punch lists, with a live legend sidebar

### User Interface
- `/web-sdk/bookmark-navigation` — **Bookmark & Outline Navigation** — Browse the document's table of contents and bookmarks in a custom sidebar
- `/web-sdk/brightness-contrast` — **Brightness & Contrast** — Bidirectional slider to brighten dark/scanned documents or enable night mode
- `/web-sdk/custom-menu` — **Custom Menu Interface** — A fully custom menu, toolbar, annotation tools, comparison, and measurement
- `/web-sdk/document-loading` — **Document Loading Methods** — URL, ArrayBuffer, Blob, and Base64 loading with file upload + method picker
- `/web-sdk/search` — **Document Search** — Context-aware search results with instant highlighting and auto-navigation
- `/web-sdk/layer-management` — **Layer Management** — Toggle PDF layer groups (OCGs) on a construction floor plan with quick presets
- `/web-sdk/multi-document-tabs` — **Multi-Document Tabs** — Tabbed interface with page-position memory, closeable tabs, and file upload
- `/web-sdk/night-mode` — **Night Mode** — Toggle night mode via custom toolbar button using CSS filter inversion
- `/web-sdk/qa-checklist-sidebar` — **Slot UI Customization** — Custom sidebar, comment badges, and interactive slot actions
- `/web-sdk/zoom-level-display` — **Zoom Level Display** — Show current zoom as a percentage in a custom toolbar button (click-to-reset)

### Forms
- `/web-sdk/custom-ui-form-creator` — **Custom UI Form Creator** — Hide SDK defaults and replace with custom form builder UI
- `/web-sdk/form-prefill` — **Form Data Pre-Fill** — Populate form fields from JSON presets with editable values + apply/clear controls
- `/web-sdk/form-designer` — **Form Designer** — Drag-and-drop fields in a creator mode for building interactive forms
- `/web-sdk/form-validation` — **Form Validation** — Client-side validation rules with visual feedback via a declarative rule engine
- `/web-sdk/grouped-form-fields` — **Grouped Form Fields** — Drag/drop grouped fields with image backgrounds; moves and deletes affect the whole group
- `/web-sdk/patient-intake` — **Patient Intake Forms** — Digital check-in with smart pre-population and progressive form completion
  - `/web-sdk/patient-intake/patient-portal` — patient sub-flow
  - `/web-sdk/patient-intake/patient-portal/completed` — completion confirmation

### Signatures
- `/web-sdk/simple-signing-demo` — **Simple Signing Demo** — Drag-and-drop field placement, e-signatures, role-based permissions, flattening, DWS digital signatures

### Document Editor
- `/web-sdk/document-assembly` — **Document Assembly** *(WIP)* — Drag pages between two panels with multi-select, reorder, rotate, duplicate, delete, upload, export
- `/web-sdk/watermark` — **Watermark** — Configurable text watermarks with text, font size, color, opacity, rotation

### Content Editor
- `/web-sdk/content-edit-api` — **Content Editing API** — Text detection, find & replace, AI text generation

### Redaction
- `/web-sdk/search-and-redact` — **Search & Redact** — Permanent redaction via PII presets (SSN, card, email, phone), custom terms, or regex

### Document Comparison
- `/web-sdk/text-comparison-cross-page` — **Cross-Page Text Comparison** — Diff full document text across page boundaries with change navigation
- `/web-sdk/text-comparison` — **Text Comparison** — Side-by-side PDF comparison with synchronized scrolling and change tracking

### Document Conversion
- `/web-sdk/document-markup` — **Document Markup Modes** — Word documents with tracked changes in no/original/simple/all markup modes

### Content
- `/web-sdk/text-extraction` — **Text Extraction** — Current-page or full-document extraction with copy and download

---

## Nutrient DWS API (`/api`) — 5 samples

Flat list under "Available Samples" plus a "Standalone Demo App" link.

- `/api/sign-document-web-sdk-dws` — **Web SDK Digital Signature (DWS)** — In-browser DWS signing inside the Web SDK viewer
- `/api/sign-document-dws` — **DWS Document Signing** — Server-side signing via DWS Processor API (visible or invisible)
- `/api/markdown-comparison` — **Markdown Comparison** *(WIP)* — Compare PDFs as Markdown for accurate cross-page comparison
- `/api/html-comparison` — **HTML Comparison** *(WIP)* — Compare PDFs as HTML for accurate cross-page comparison
- `/api/text-viewer` — **Text File Viewer** — View .txt, .csv, .xml in the Nutrient viewer (HTML → PDF via DWS)

External: **DWS CRUD** standalone demo (https://dws-crud.vercel.app/)

---

## Document Authoring SDK (`/document-authoring-sdk`) — 3 samples

Inline categories: Templates, Programmatic API.

### Templates
- `/document-authoring-sdk/document-generator` — **Document Generator** — Wizard-style template selection, visual customization, data integration
- `/document-authoring-sdk/template-variables` — **Template Variables** — Browsable sidebar for inserting variables (search, categories, sample data preview)

### Programmatic API
- `/document-authoring-sdk/document-builder` — **Document Builder** — Build documents from form data via the `transaction()` API with live preview

---

## AI Document Processing (`/ai-document-processing`) — 1 sample

Index page also surfaces three info cards (Classification, Extraction, Validation) — non-clickable.

- `/ai-document-processing/invoices` — **Invoice Management** — Classify and extract data from invoices, receipts, and POs with validation
  - `/ai-document-processing/invoices/preview` — invoice preview sub-page
  - `/ai-document-processing/invoices/results` — extraction results sub-page

---

## Java SDK (`/java-sdk`) — 5 samples

Filter chips: All, Conversion, Signatures.

### Conversion
- `/java-sdk/office-to-pdf` — **Office to PDF** — Convert Word, Excel, PowerPoint to PDF
- `/java-sdk/md-to-pdf` — **Markdown to PDF** — Convert Markdown to PDF
- `/java-sdk/pdf-to-html` — **PDF to HTML** — Convert PDF to HTML for web display
- `/java-sdk/pdf-to-office` — **PDF to Office** — Convert PDF to Word and Excel

### Signatures
- `/java-sdk/digital-signature` — **Digital Signature** — Apply digital signatures with certificates

> Pages exist in the codebase but are hidden from the index (pending SDK fixes/releases): `html-to-pdf`, `ocr-extraction`, `icr-extraction`, `docx-to-pdf`, `pdf-to-docx`, `pdf-to-xlsx`, `pptx-to-pdf`, `xlsx-to-pdf`.

---

## Python SDK (`/python-sdk`) — 7 samples

Filter chips: All, Conversion, Editor, Signatures, Forms, Templates.

### Conversion
- `/python-sdk/office-to-pdf` — **Office to PDF**
- `/python-sdk/md-to-pdf` — **Markdown to PDF**
- `/python-sdk/pdf-to-html` — **PDF to HTML**
- `/python-sdk/pdf-to-office` — **PDF to Office**

### Editor
- `/python-sdk/redaction` — **PDF Redaction** — Permanently remove sensitive content

### Signatures
- `/python-sdk/digital-signature` — **Digital Signature**

### Forms
- `/python-sdk/form-fill` — **PDF Form Fill** — Programmatically fill form fields from data

### Templates
- `/python-sdk/word-template` — **Word Template Generation** — PDFs from Word templates populated with JSON data
- `/python-sdk/vlm-extraction` — **VLM Extraction** *(in repo, may not appear on index)*

---

## .NET SDK (`/dotnet-sdk`) — 3 samples

Filter chips: All, File Optimization, Text Extraction.

### File Optimization
- `/dotnet-sdk/linearize` — **Linearize** — Optimize PDFs for fast web view (first page renders before full download)
- `/dotnet-sdk/optimize` — **Optimize** — Reduce file size via MRC compression (great for scanned/image-heavy docs)

### Text Extraction
- `/dotnet-sdk/ocr` — **OCR** — Recognize text in scanned PDFs/images. Output a searchable PDF or extracted plain text.

---

## Placeholders (no samples yet)

- `/document-engine` — Coming Soon. Links to external **DE CRUD** repo (https://github.com/jonaddams/decrud).
- `/workflow` — Coming Soon. Not linked from landing page.

---

## API routes (no UI — for completeness)

These are server endpoints called by the sample pages above; design does not need to address them, but they shape some sample interactions (upload, processing, result display).

- `/ai-document-processing/invoices/api/invoices`
- `/ai-document-processing/invoices/api/process-invoices`
- `/api/dotnet-sdk/{linearize,ocr,optimize}`
- `/api/html-comparison/api/convert`
- `/api/markdown-comparison/api/convert`
- `/api/sign-document-dws/api/{certificates,sign}`
- `/api/sign-document-web-sdk-dws/api/{certificates,token}`
- `/api/text-viewer/api/convert`

---

## Recurring UI primitives a designer should solve for

Pulled from observation across the sample set — these are the patterns the design system needs concrete components for:

- **Sample shell**: title + 1-line description + "Back to {SDK}" link + GitHub source link + viewer region
- **Side panel / sidebar**: legend, sample picker, file controls, settings, comment tracker (used in counting-annotations, layer-management, qa-checklist, patient-intake, etc.)
- **Toolbar buttons**: custom toolbar items (zoom, night mode, layer toggle, watermark)
- **Form controls**: sliders, color pickers, number inputs, JSON editor (CodeMirror), preset pickers
- **File upload + sample picker**: switching between bundled samples and user uploads (server-SDK samples)
- **Status / progress**: loading spinners, processing states, WIP badges, "Coming Soon" placeholders
- **Result display**: extracted text panel, before/after diff, downloadable artifact, side-by-side comparison
- **Card grid**: SDK cards on landing, sample cards on indexes (with category filter chips)
- **Tabs / dropdowns**: multi-document tabs; Web SDK index uses a category dropdown due to volume

Tokens to keep aligned with: see `/nutrient-design-system` and CSS variables in `app/globals.css` (`--digital-pollen`, `--warm-gray-*`, `--disc-pink`, etc.).
