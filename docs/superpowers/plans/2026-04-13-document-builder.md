# Document Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sample that demonstrates the Document Authoring SDK's programmatic `transaction()` API by constructing a business report from form data with a live editor preview.

**Architecture:** Split-pane page — form panel (left, ~38%) drives document construction via debounced `transaction()` calls that rebuild the document inside a `DocAuthEditor` (right, ~62%). No templates or DocJSON files — the document is built entirely through the `Programmatic` API.

**Tech Stack:** Next.js (existing app), Document Authoring SDK via CDN (`window.DocAuth`), React state + hooks, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-13-document-builder-design.md`

---

## File Structure

```
app/document-authoring-sdk/document-builder/
├── page.tsx                          # Entry point: SDK init, layout, error suppression
├── components/
│   ├── report-form.tsx               # Left pane: form fields for report data
│   ├── document-preview.tsx          # Right pane: mounts DocAuthEditor
│   └── export-bar.tsx                # PDF/DOCX/DocJSON download buttons
└── hooks/
    └── use-document-builder.ts       # Core: transaction() logic + debounce
```

Also modified:
- `app/document-authoring-sdk/page.tsx` — add sample listing entry
- `app/document-authoring-sdk/types/index.ts` — extend types for `transaction()` and `createDocumentFromPlaintext()`

---

### Task 1: Extend SDK types for the `transaction()` and `createDocumentFromPlaintext()` APIs

**Files:**
- Modify: `app/document-authoring-sdk/types/index.ts`

- [ ] **Step 1: Add types for the Programmatic API, transaction, and createDocumentFromPlaintext**

Add the following to `app/document-authoring-sdk/types/index.ts`. The `DocAuthSystem` interface needs `createDocumentFromPlaintext`. The `DocAuthDocument` interface needs `transaction` and `saveDocumentJSONString`. Add a `Programmatic` namespace with the types observed in the AI editing sample.

```typescript
// Add to DocAuthSystem interface:
  createDocumentFromPlaintext: (text: string) => Promise<DocAuthDocument>;

// Add to DocAuthDocument interface:
  transaction: <T = void>(
    callback: (draft: ProgrammaticDocument) => Promise<T> | T,
  ) => Promise<T>;
  saveDocumentJSONString: () => Promise<string>;

// Add these new interfaces after the existing types, before the Global declarations:

// Programmatic API types (used inside transaction() callbacks)
export interface ProgrammaticDocument {
  body: () => ProgrammaticBody;
}

export interface ProgrammaticBody {
  sections: () => ProgrammaticSection[];
  addSection: (index: number) => ProgrammaticSection;
}

export interface ProgrammaticSection {
  content: () => ProgrammaticSectionContent;
}

export interface ProgrammaticSectionContent {
  blocklevels: () => ProgrammaticBlockLevel[];
  addParagraph: (index: number) => ProgrammaticParagraph;
  addTable: (index: number) => ProgrammaticTable;
  removeElement: (index: number) => void;
}

export interface ProgrammaticTextView {
  getPlainText: () => string;
  setText: (text: string) => ProgrammaticRange;
  setFormatting: (
    style: Partial<ProgrammaticFormatting>,
    range?: ProgrammaticRange,
  ) => void;
}

export interface ProgrammaticRange {
  start: number;
  end: number;
}

export interface ProgrammaticFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeout: boolean;
  color: string;
  highlight: string;
  font: string;
  fontSize: number;
}

export type ProgrammaticBlockLevel = ProgrammaticParagraph | ProgrammaticTable;

export interface ProgrammaticParagraph {
  type: "paragraph";
  asTextView: () => ProgrammaticTextView;
}

export interface ProgrammaticTable {
  type: "table";
  rows: () => ProgrammaticTableRow[];
  addRow: () => ProgrammaticTableRow;
  removeRow: (index: number) => void;
}

export interface ProgrammaticTableRow {
  cells: () => ProgrammaticTableCell[];
  addCell: () => ProgrammaticTableCell;
  removeCell: (index: number) => void;
}

export interface ProgrammaticTableCell {
  blocklevels: () => ProgrammaticBlockLevel[];
  addParagraph: (index: number) => ProgrammaticParagraph;
  removeElement: (index: number) => void;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing code should still compile).

- [ ] **Step 3: Commit**

```bash
git add app/document-authoring-sdk/types/index.ts
git commit -m "feat(document-builder): extend SDK types for transaction() and Programmatic API"
```

---

### Task 2: Add sample listing entry

**Files:**
- Modify: `app/document-authoring-sdk/page.tsx`

- [ ] **Step 1: Add Document Builder to the samples array**

In `app/document-authoring-sdk/page.tsx`, add a new entry to the `samples` array after the existing Document Generator entry:

```typescript
  {
    name: "Document Builder",
    category: "Programmatic API",
    description:
      "Build documents programmatically from form data using the transaction() API with live preview",
    path: "/document-authoring-sdk/document-builder",
  },
```

- [ ] **Step 2: Commit**

```bash
git add app/document-authoring-sdk/page.tsx
git commit -m "feat(document-builder): add sample listing entry"
```

---

### Task 3: Create the `use-document-builder` hook

This is the core of the sample — the `transaction()` logic that builds a document from form data.

**Files:**
- Create: `app/document-authoring-sdk/document-builder/hooks/use-document-builder.ts`

- [ ] **Step 1: Create the hook file**

Create `app/document-authoring-sdk/document-builder/hooks/use-document-builder.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  DocAuthDocument,
  ProgrammaticFormatting,
  ProgrammaticSectionContent,
} from "../../types";

export interface ReportSection {
  heading: string;
  body: string;
}

export interface MetricRow {
  metric: string;
  value: string;
}

export interface ReportFormState {
  title: string;
  author: string;
  executiveSummary: string;
  sections: ReportSection[];
  metrics: MetricRow[];
  conclusion: string;
}

export const DEFAULT_FORM_STATE: ReportFormState = {
  title: "Q4 2025 Performance Review",
  author: "Sarah Chen",
  executiveSummary:
    "This report summarizes the key performance metrics and strategic outcomes for Q4 2025. Overall, the quarter exceeded expectations with strong revenue growth and improved customer retention across all segments.",
  sections: [
    {
      heading: "Revenue Analysis",
      body: "Revenue reached $2.4M in Q4, representing an 18% increase over the previous quarter. Growth was driven primarily by enterprise client expansion and the successful launch of the premium tier in October.",
    },
    {
      heading: "Customer Growth",
      body: "Net new customers increased by 340 in Q4, bringing the total active customer base to 2,847. The customer acquisition cost decreased by 12% due to improved referral programs and organic growth channels.",
    },
  ],
  metrics: [
    { metric: "Revenue", value: "$2.4M" },
    { metric: "Growth Rate", value: "+18%" },
    { metric: "Customer Retention", value: "94%" },
  ],
  conclusion:
    "Q4 2025 demonstrated strong execution across all key metrics. The team is well-positioned entering 2026, with a robust pipeline and improving unit economics.",
};

const HEADING_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 14,
  color: "#1F4E79",
};

const TITLE_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 24,
  color: "#1a1a2e",
};

const SUBTITLE_STYLE: Partial<ProgrammaticFormatting> = {
  italic: true,
  fontSize: 11,
  color: "#666666",
};

const TABLE_HEADER_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 11,
};

function addStyledParagraph(
  content: ProgrammaticSectionContent,
  index: number,
  text: string,
  style: Partial<ProgrammaticFormatting>,
): void {
  const paragraph = content.addParagraph(index);
  const textView = paragraph.asTextView();
  const range = textView.setText(text);
  textView.setFormatting(style, range);
}

function addPlainParagraph(
  content: ProgrammaticSectionContent,
  index: number,
  text: string,
): void {
  const paragraph = content.addParagraph(index);
  paragraph.asTextView().setText(text);
}

function addEmptyParagraph(
  content: ProgrammaticSectionContent,
  index: number,
): void {
  const paragraph = content.addParagraph(index);
  paragraph.asTextView().setText("");
}

export function useDocumentBuilder(
  document: DocAuthDocument | null,
  formState: ReportFormState,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBuilding = useRef(false);

  const buildDocument = useCallback(
    async (state: ReportFormState) => {
      if (!document || isBuilding.current) return;
      isBuilding.current = true;

      try {
        await document.transaction((draft) => {
          const section = draft.body().sections()[0];
          if (!section) return;
          const content = section.content();

          // Clear all existing content
          const blocks = content.blocklevels();
          for (let i = blocks.length - 1; i >= 0; i--) {
            content.removeElement(i);
          }

          let idx = 0;

          // Title
          addStyledParagraph(content, idx++, state.title, TITLE_STYLE);

          // Author and date
          const today = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          addStyledParagraph(
            content,
            idx++,
            `Prepared by ${state.author} \u2022 ${today}`,
            SUBTITLE_STYLE,
          );

          // Spacer
          addEmptyParagraph(content, idx++);

          // Executive Summary
          if (state.executiveSummary) {
            addStyledParagraph(
              content,
              idx++,
              "Executive Summary",
              HEADING_STYLE,
            );
            addPlainParagraph(content, idx++, state.executiveSummary);
            addEmptyParagraph(content, idx++);
          }

          // Dynamic sections
          for (const sec of state.sections) {
            if (sec.heading) {
              addStyledParagraph(content, idx++, sec.heading, HEADING_STYLE);
            }
            if (sec.body) {
              addPlainParagraph(content, idx++, sec.body);
            }
            addEmptyParagraph(content, idx++);
          }

          // Key Metrics table
          if (state.metrics.length > 0) {
            addStyledParagraph(content, idx++, "Key Metrics", HEADING_STYLE);

            const table = content.addTable(idx++);
            // Header row (already exists as first row)
            const headerRow = table.rows()[0] ?? table.addRow();
            const headerCell0 = headerRow.cells()[0] ?? headerRow.addCell();
            const headerCell1 = headerRow.cells()[1] ?? headerRow.addCell();

            const h0 = headerCell0.blocklevels()[0];
            if (h0 && h0.type === "paragraph") {
              const range = h0.asTextView().setText("Metric");
              h0.asTextView().setFormatting(TABLE_HEADER_STYLE, range);
            }
            const h1 = headerCell1.blocklevels()[0];
            if (h1 && h1.type === "paragraph") {
              const range = h1.asTextView().setText("Value");
              h1.asTextView().setFormatting(TABLE_HEADER_STYLE, range);
            }

            // Data rows
            for (const row of state.metrics) {
              const tableRow = table.addRow();
              const cell0 = tableRow.cells()[0] ?? tableRow.addCell();
              const cell1 = tableRow.cells()[1] ?? tableRow.addCell();

              const p0 = cell0.blocklevels()[0];
              if (p0 && p0.type === "paragraph") {
                p0.asTextView().setText(row.metric);
              }
              const p1 = cell1.blocklevels()[0];
              if (p1 && p1.type === "paragraph") {
                p1.asTextView().setText(row.value);
              }
            }

            addEmptyParagraph(content, idx++);
          }

          // Conclusion
          if (state.conclusion) {
            addStyledParagraph(content, idx++, "Conclusion", HEADING_STYLE);
            addPlainParagraph(content, idx++, state.conclusion);
          }
        });
      } catch (error) {
        console.error("❌ Error building document:", error);
      } finally {
        isBuilding.current = false;
      }
    },
    [document],
  );

  // Debounced rebuild on form state changes
  useEffect(() => {
    if (!document) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      buildDocument(formState);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [document, formState, buildDocument]);

  return { buildDocument };
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/document-authoring-sdk/document-builder/hooks/use-document-builder.ts
git commit -m "feat(document-builder): add core use-document-builder hook with transaction() logic"
```

---

### Task 4: Create the `export-bar` component

**Files:**
- Create: `app/document-authoring-sdk/document-builder/components/export-bar.tsx`

- [ ] **Step 1: Create the export bar component**

Create `app/document-authoring-sdk/document-builder/components/export-bar.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { DocAuthDocument } from "../../types";

interface ExportBarProps {
  document: DocAuthDocument | null;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default function ExportBar({ document: doc }: ExportBarProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportPDF = async () => {
    if (!doc) return;
    setExporting("pdf");
    try {
      const buffer = await doc.exportPDF();
      triggerDownload(new Blob([buffer], { type: "application/pdf" }), "report.pdf");
    } catch (error) {
      console.error("❌ PDF export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDOCX = async () => {
    if (!doc) return;
    setExporting("docx");
    try {
      const buffer = await doc.exportDOCX();
      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        "report.docx",
      );
    } catch (error) {
      console.error("❌ DOCX export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocJSON = async () => {
    if (!doc) return;
    setExporting("json");
    try {
      const jsonString = await doc.saveDocumentJSONString();
      triggerDownload(
        new Blob([jsonString], { type: "application/json" }),
        "report.json",
      );
    } catch (error) {
      console.error("❌ DocJSON export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const buttonBase =
    "px-3 py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const buttonStyle =
    "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600";

  return (
    <div className="flex gap-2 pt-4 border-t border-gray-700">
      <button
        type="button"
        onClick={handleExportPDF}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "pdf" ? "Exporting..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={handleExportDOCX}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "docx" ? "Exporting..." : "Download DOCX"}
      </button>
      <button
        type="button"
        onClick={handleExportDocJSON}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "json" ? "Exporting..." : "Download DocJSON"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/document-authoring-sdk/document-builder/components/export-bar.tsx
git commit -m "feat(document-builder): add export bar with PDF/DOCX/DocJSON download"
```

---

### Task 5: Create the `report-form` component

**Files:**
- Create: `app/document-authoring-sdk/document-builder/components/report-form.tsx`

- [ ] **Step 1: Create the report form component**

Create `app/document-authoring-sdk/document-builder/components/report-form.tsx`:

```typescript
"use client";

import type { DocAuthDocument } from "../../types";
import type { ReportFormState, ReportSection, MetricRow } from "../hooks/use-document-builder";
import ExportBar from "./export-bar";

interface ReportFormProps {
  formState: ReportFormState;
  onChange: (state: ReportFormState) => void;
  document: DocAuthDocument | null;
}

export default function ReportForm({
  formState,
  onChange,
  document,
}: ReportFormProps) {
  const updateField = <K extends keyof ReportFormState>(
    key: K,
    value: ReportFormState[K],
  ) => {
    onChange({ ...formState, [key]: value });
  };

  const updateSection = (index: number, updates: Partial<ReportSection>) => {
    const next = formState.sections.map((s, i) =>
      i === index ? { ...s, ...updates } : s,
    );
    updateField("sections", next);
  };

  const addSection = () => {
    updateField("sections", [
      ...formState.sections,
      { heading: "", body: "" },
    ]);
  };

  const removeSection = (index: number) => {
    updateField(
      "sections",
      formState.sections.filter((_, i) => i !== index),
    );
  };

  const updateMetric = (index: number, updates: Partial<MetricRow>) => {
    const next = formState.metrics.map((m, i) =>
      i === index ? { ...m, ...updates } : m,
    );
    updateField("metrics", next);
  };

  const addMetric = () => {
    updateField("metrics", [
      ...formState.metrics,
      { metric: "", value: "" },
    ]);
  };

  const removeMetric = (index: number) => {
    updateField(
      "metrics",
      formState.metrics.filter((_, i) => i !== index),
    );
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const textareaClass = `${inputClass} resize-none`;
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";
  const sectionTitleClass =
    "text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3";

  return (
    <div className="h-full flex flex-col overflow-y-auto p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-100 mb-1">
          Report Builder
        </h2>
        <p className="text-xs text-gray-400">
          Edit fields below to build your report. Changes update the document
          live.
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Basic Information</div>
        <div>
          <label htmlFor="report-title" className={labelClass}>
            Report Title
          </label>
          <input
            id="report-title"
            type="text"
            value={formState.title}
            onChange={(e) => updateField("title", e.target.value)}
            className={inputClass}
            placeholder="Enter report title"
          />
        </div>
        <div>
          <label htmlFor="report-author" className={labelClass}>
            Author
          </label>
          <input
            id="report-author"
            type="text"
            value={formState.author}
            onChange={(e) => updateField("author", e.target.value)}
            className={inputClass}
            placeholder="Enter author name"
          />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Executive Summary</div>
        <div>
          <label htmlFor="report-summary" className={labelClass}>
            Summary
          </label>
          <textarea
            id="report-summary"
            value={formState.executiveSummary}
            onChange={(e) => updateField("executiveSummary", e.target.value)}
            className={textareaClass}
            rows={4}
            placeholder="Enter executive summary"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={sectionTitleClass}>Sections</div>
          <button
            type="button"
            onClick={addSection}
            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            + Add Section
          </button>
        </div>
        {formState.sections.map((section, index) => (
          <div
            key={`section-${index}`}
            className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Section {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeSection(index)}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={section.heading}
              onChange={(e) =>
                updateSection(index, { heading: e.target.value })
              }
              className={inputClass}
              placeholder="Section heading"
            />
            <textarea
              value={section.body}
              onChange={(e) =>
                updateSection(index, { body: e.target.value })
              }
              className={textareaClass}
              rows={3}
              placeholder="Section content"
            />
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={sectionTitleClass}>Key Metrics</div>
          <button
            type="button"
            onClick={addMetric}
            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            + Add Row
          </button>
        </div>
        {formState.metrics.map((row, index) => (
          <div
            key={`metric-${index}`}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={row.metric}
              onChange={(e) =>
                updateMetric(index, { metric: e.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Metric name"
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) =>
                updateMetric(index, { value: e.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Value"
            />
            <button
              type="button"
              onClick={() => removeMetric(index)}
              className="text-xs text-red-400 hover:text-red-300 flex-shrink-0 cursor-pointer"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Conclusion</div>
        <div>
          <label htmlFor="report-conclusion" className={labelClass}>
            Conclusion
          </label>
          <textarea
            id="report-conclusion"
            value={formState.conclusion}
            onChange={(e) => updateField("conclusion", e.target.value)}
            className={textareaClass}
            rows={3}
            placeholder="Enter conclusion"
          />
        </div>
      </div>

      {/* Export */}
      <ExportBar document={document} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/document-authoring-sdk/document-builder/components/report-form.tsx
git commit -m "feat(document-builder): add report form component with all field types"
```

---

### Task 6: Create the `document-preview` component

**Files:**
- Create: `app/document-authoring-sdk/document-builder/components/document-preview.tsx`

- [ ] **Step 1: Create the document preview component**

Create `app/document-authoring-sdk/document-builder/components/document-preview.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import type { DocAuthDocument, DocAuthEditor, DocAuthSystem } from "../../types";

interface DocumentPreviewProps {
  docAuthSystem: DocAuthSystem | null;
  document: DocAuthDocument | null;
  onDocumentReady: (doc: DocAuthDocument) => void;
}

export default function DocumentPreview({
  docAuthSystem,
  document: doc,
  onDocumentReady,
}: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocAuthEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!docAuthSystem || !containerRef.current || isInitializing.current) {
      return;
    }

    const container = containerRef.current;

    const init = async () => {
      isInitializing.current = true;
      setIsLoading(true);

      try {
        // Create a blank document to seed the editor
        const blankDoc = await docAuthSystem.createDocumentFromPlaintext("");
        onDocumentReady(blankDoc);

        // Wait for DOM to settle
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Set explicit dimensions required by SDK
        container.style.position = "relative";
        container.style.overflow = "hidden";
        const rect = container.getBoundingClientRect();
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height || 600}px`;

        // Create editor
        const editor = await docAuthSystem.createEditor(container, {
          document: blankDoc,
        });
        editorRef.current = editor;
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error initializing document preview:", error);
        setIsLoading(false);
      } finally {
        isInitializing.current = false;
      }
    };

    init();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (e) {
          console.warn("⚠️ Editor cleanup failed:", e);
        }
        editorRef.current = null;
      }
    };
  }, [docAuthSystem, onDocumentReady]);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-200">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading editor...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        id="document-builder-editor"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/document-authoring-sdk/document-builder/components/document-preview.tsx
git commit -m "feat(document-builder): add document preview component with DocAuthEditor"
```

---

### Task 7: Create the main page

**Files:**
- Create: `app/document-authoring-sdk/document-builder/page.tsx`

- [ ] **Step 1: Create the page entry point**

Create `app/document-authoring-sdk/document-builder/page.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import type { DocAuthDocument, DocAuthSystem } from "../types";
import DocumentPreview from "./components/document-preview";
import ReportForm from "./components/report-form";
import {
  DEFAULT_FORM_STATE,
  type ReportFormState,
  useDocumentBuilder,
} from "./hooks/use-document-builder";

export default function DocumentBuilderPage() {
  const [docAuthSystem, setDocAuthSystem] = useState<DocAuthSystem | null>(
    null,
  );
  const [document, setDocument] = useState<DocAuthDocument | null>(null);
  const [formState, setFormState] =
    useState<ReportFormState>(DEFAULT_FORM_STATE);
  const sdkInitialized = useRef(false);

  // Initialize DocAuthSystem
  useEffect(() => {
    if (sdkInitialized.current) return;

    const init = async () => {
      // Wait for SDK to load
      let attempts = 0;
      while (!window.DocAuth && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        attempts++;
      }

      if (!window.DocAuth) {
        console.error("❌ Document Authoring SDK not loaded");
        return;
      }

      try {
        const system = await window.DocAuth.createDocAuthSystem();
        setDocAuthSystem(system);
        sdkInitialized.current = true;
      } catch (error) {
        console.error("❌ Failed to create DocAuthSystem:", error);
      }
    };

    init();
  }, []);

  // SDK error suppression (same pattern as Document Generator)
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent): boolean | undefined => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";
      if (
        filename.includes("docauth-impl") ||
        filename.includes("document-authoring.cdn.nutrient.io") ||
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io") ||
        message.includes("IntersectionObserver")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    const handleSDKRejection = (
      event: PromiseRejectionEvent,
    ): boolean | undefined => {
      const stack = event.reason?.stack || "";
      if (
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io")
      ) {
        event.preventDefault();
        return false;
      }
      return true;
    };

    const OriginalIntersectionObserver = window.IntersectionObserver;
    if (OriginalIntersectionObserver) {
      window.IntersectionObserver = class extends OriginalIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          const safeCallback: IntersectionObserverCallback = (
            entries,
            observer,
          ) => {
            try {
              callback(entries, observer);
            } catch {
              return;
            }
          };
          super(safeCallback, options);
        }
      };
    }

    window.addEventListener("error", handleSDKError);
    window.addEventListener("unhandledrejection", handleSDKRejection);

    return () => {
      window.removeEventListener("error", handleSDKError);
      window.removeEventListener("unhandledrejection", handleSDKRejection);
      if (OriginalIntersectionObserver) {
        window.IntersectionObserver = OriginalIntersectionObserver;
      }
    };
  }, []);

  const handleDocumentReady = useCallback((doc: DocAuthDocument) => {
    setDocument(doc);
  }, []);

  // Hook that rebuilds the document on form state changes
  useDocumentBuilder(document, formState);

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <PageHeader
        title="Document Builder"
        description="Build documents programmatically using the transaction API"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Document Authoring SDK",
            href: "/document-authoring-sdk",
          },
        ]}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[38%_1fr]">
        {/* Left: Form Panel */}
        <div className="bg-gray-900 border-r border-gray-700 overflow-hidden">
          <ReportForm
            formState={formState}
            onChange={setFormState}
            document={document}
          />
        </div>

        {/* Right: Document Preview */}
        <div className="relative overflow-hidden">
          <DocumentPreview
            docAuthSystem={docAuthSystem}
            document={document}
            onDocumentReady={handleDocumentReady}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads in the browser**

Run: `npm run dev` (if not already running)
Navigate to: `http://localhost:3000/document-authoring-sdk/document-builder`
Expected: The page loads with the form on the left and the editor initializing on the right. The document should populate with the default form data after a brief delay.

- [ ] **Step 3: Commit**

```bash
git add app/document-authoring-sdk/document-builder/page.tsx
git commit -m "feat(document-builder): add main page with split-pane layout"
```

---

### Task 8: Manual testing and polish

- [ ] **Step 1: Test the full flow**

Open `http://localhost:3000/document-authoring-sdk/document-builder` and verify:

1. Page loads with pre-filled form and a populated document in the editor
2. Editing the title field updates the document title after ~400ms pause
3. Editing the author field updates the subtitle line
4. Editing the executive summary textarea updates the body paragraph
5. Clicking "Add Section" adds a new empty section pair in the document
6. Filling in the new section heading/body appears in the document
7. Clicking "Remove" on a section removes it from the document
8. Adding a metric row adds a row to the table in the document
9. Removing a metric row removes it from the table
10. "Download PDF" downloads a PDF file
11. "Download DOCX" downloads a DOCX file
12. "Download DocJSON" downloads a JSON file

- [ ] **Step 2: Fix any issues found during testing**

Address any layout, timing, or SDK interaction issues.

- [ ] **Step 3: Test the samples listing page**

Navigate to `http://localhost:3000/document-authoring-sdk` and verify the "Document Builder" entry appears in the table with the correct name, category, and description, and that clicking it navigates to the sample.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(document-builder): complete Document Builder sample with live transaction() preview"
```
