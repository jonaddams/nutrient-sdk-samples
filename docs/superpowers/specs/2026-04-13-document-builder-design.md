# Document Builder Sample — Design Spec

**Date:** 2026-04-13
**Status:** Draft
**Sample path:** `/document-authoring-sdk/document-builder`

## Purpose

A sample that demonstrates the Document Authoring SDK's programmatic `transaction()` API by building a business report document from structured form data. The user fills in form fields and watches the document update live in the editor — no templates, no raw JSON editing. The document is constructed entirely through the `Programmatic` API inside `transaction()` callbacks.

This complements the existing Document Generator sample (template-driven) by showing the code-driven approach: "describe your document in code, we build it from scratch."

## Architecture

Single-page split-pane layout. Narrow form panel (~38%) on the left, Document Authoring Editor (~62%) on the right. Form state changes trigger debounced `transaction()` calls that rebuild the document programmatically.

The sample reuses the existing SDK loading pattern: CDN scripts loaded in root layout, accessed via `window.DocAuth` global. No new npm dependencies.

## Component Structure

```
document-builder/
├── page.tsx                          # Entry point, SDK init, layout shell
├── components/
│   ├── report-form.tsx               # Left pane: all form fields
│   ├── document-preview.tsx          # Right pane: mounts DocAuthEditor
│   └── export-bar.tsx                # PDF/DOCX/DocJSON download buttons
└── hooks/
    └── use-document-builder.ts       # Core logic: transaction() calls
```

### page.tsx

Client component (`"use client"`). Responsibilities:

- Initialize `DocAuthSystem` via `window.DocAuth.createDocAuthSystem()`
- Create an initial blank document via `createDocumentFromPlaintext("")` to seed the editor, then immediately run `buildDocument()` with the default form data to populate it
- Mount the split-pane layout: `ReportForm` left, `DocumentPreview` right
- SDK error suppression (IntersectionObserver pattern from existing sample)
- Pass form state and document reference between children

### report-form.tsx

The left pane containing all form fields. Manages form state via `useState` at the page level (passed down as props + onChange callbacks). Fields organized in visual sections:

- **Report Title** — text input
- **Author** — text input
- **Executive Summary** — textarea
- **Sections** — repeatable group: heading (text input) + body (textarea). "Add Section" button appends a new empty group. Each group has a remove button.
- **Key Metrics Table** — repeatable rows: metric name (text input) + value (text input). "Add Row" button appends. Each row has a remove button.
- **Conclusion** — textarea

The export bar sits at the bottom of this panel.

Styled with Tailwind. Dark background to contrast with the white document preview. All inputs are plain HTML — no CodeMirror or rich editors.

### document-preview.tsx

The right pane. Mounts a `DocAuthEditor` instance into a container div using `docAuthSystem.createEditor(container, { document })`. Exposes the `DocAuthDocument` reference upward (via callback prop or ref) so the page can run transactions against it.

Handles container sizing (the editor needs explicit dimensions) and cleanup on unmount.

### export-bar.tsx

Three buttons in a row at the bottom of the form panel:

- **Download PDF** — calls `document.exportPDF()`, triggers browser download
- **Download DOCX** — calls `document.exportDOCX()`, triggers browser download
- **Download DocJSON** — calls `document.saveDocumentJSONString()`, triggers browser download

### use-document-builder.ts

The core hook that developers would study. Takes form state and the `DocAuthDocument` reference. Contains:

- `buildDocument(formState)` — the function that runs `document.transaction(draft => { ... })` to rebuild the document from form data
- Debounce logic (400ms) — triggers `buildDocument` after the user pauses typing
- The `useEffect` that watches form state and triggers debounced rebuilds

## The transaction() Flow

Inside `buildDocument()`, the document is rebuilt from scratch on each change:

```typescript
await document.transaction(async (draft) => {
  const section = draft.body().sections()[0];
  const content = section.content();

  // 1. Clear existing content
  while (content.blocklevels().length > 0) {
    content.removeElement(content.blocklevels().length - 1);
  }

  // 2. Title — bold, 24pt
  const title = content.addParagraph(0);
  title.asTextView().setText(formState.title);
  title.asTextView().setFormatting({ bold: true, fontSize: 24 });

  // 3. Author/date — italic, gray, 11pt
  const subtitle = content.addParagraph(1);
  subtitle.asTextView().setText(`Prepared by ${formState.author} • ${date}`);
  subtitle.asTextView().setFormatting({ italic: true, color: "#666666", fontSize: 11 });

  // 4. Executive Summary — heading + body
  // 5. Dynamic sections — loop, heading + body each
  // 6. Key Metrics table — addTable, header row, data rows
  // 7. Conclusion — heading + body
});
```

The rebuild-from-scratch approach is intentional — it's the clearest demonstration of the API. Each transaction is atomic, so the editor shows the complete updated document in one repaint.

## Form Default Data

The form ships pre-filled so the document looks compelling on first load:

- **Title:** "Q4 2025 Performance Review"
- **Author:** "Sarah Chen"
- **Executive Summary:** "This report summarizes the key performance metrics and strategic outcomes for Q4 2025. Overall, the quarter exceeded expectations with strong revenue growth and improved customer retention across all segments."
- **Sections (2):**
  - "Revenue Analysis" — "Revenue reached $2.4M in Q4, representing an 18% increase over the previous quarter. Growth was driven primarily by enterprise client expansion and the successful launch of the premium tier in October."
  - "Customer Growth" — "Net new customers increased by 340 in Q4, bringing the total active customer base to 2,847. The customer acquisition cost decreased by 12% due to improved referral programs and organic growth channels."
- **Key Metrics (3 rows):** Revenue / $2.4M, Growth Rate / +18%, Customer Retention / 94%
- **Conclusion:** "Q4 2025 demonstrated strong execution across all key metrics. The team is well-positioned entering 2026, with a robust pipeline and improving unit economics."

## Layout Details

- **Split pane:** CSS grid with `grid-template-columns: 38% 1fr`. Form panel scrolls independently (overflow-y: auto). Editor fills remaining height.
- **Full viewport height:** The split pane fills `calc(100vh - header height)`. No sticky PageHeader — standard flow.
- **Form panel:** Dark background (`dark:bg-[#1a1414]` or similar matching existing dark theme). Inputs with dark theme styling consistent with existing samples.
- **Editor panel:** White/light background — the SDK editor provides its own styling.
- **Responsive:** On mobile/small screens, stack vertically (form above, preview below). Not a primary concern for an SDK demo but should not break.

## Navigation

- **Breadcrumbs:** Home > Document Authoring SDK > Document Builder
- **PageHeader:** Standard `PageHeader` component with title "Document Builder" and description "Build documents programmatically using the transaction API"
- **Samples listing:** Add entry to `/document-authoring-sdk/page.tsx` samples array:
  - Name: "Document Builder"
  - Category: "Programmatic API"
  - Description: "Build documents programmatically from form data using the transaction() API with live preview"

## SDK Integration

- SDK version: Uses existing `NEXT_PUBLIC_DOCUMENT_AUTHORING_SDK_VERSION` env var (currently 1.10.0, which introduced `transaction()`)
- Loading: Via CDN script already in root layout
- Types: Extend `types/index.ts` if needed for `Programmatic` namespace types, or use `any` casts for the `transaction()` callback parameter since the SDK is loaded via CDN (not npm)
- Error handling: Reuse the IntersectionObserver suppression pattern from the Document Generator

## What This Sample Does NOT Do

- No wizard/multi-step flow (that's the Document Generator)
- No raw JSON/DocJSON editing (the form abstracts that away)
- No AI integration (that's the awesome-nutrient AI editing sample)
- No template loading or DOCX import — documents are built from scratch
- No server-side rendering — entirely client-side
