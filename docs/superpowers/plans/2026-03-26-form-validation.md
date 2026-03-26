# Form Validation Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web SDK sample demonstrating client-side form validation with visual feedback (colored field backgrounds) on a purpose-built Account Registration PDF containing every SDK form field type.

**Architecture:** Declarative validation rule map keyed by field name, hybrid validation timing (real-time for single-field rules, "Validate All" for cross-field and signature checks), sidebar panel with error/valid lists and click-to-navigate, PDF field backgrounds colored via `annotation.set("backgroundColor")`.

**Tech Stack:** Next.js App Router, Nutrient Web SDK (`@nutrient-sdk/viewer`), TypeScript, CSS

---

## File Structure

```
app/web-sdk/form-validation/
├── page.tsx        # Layout: SampleHeader + sidebar (validation status, errors, valid list, buttons) + dynamic viewer import
├── viewer.tsx      # SDK init, validation rule map, validation engine, field background coloring, event listeners
└── styles.css      # Sidebar validation panel styles (status counters, error cards, valid rows, buttons)

public/documents/account-registration-form.pdf  # Purpose-built PDF with all field types (created in Task 1)

app/web-sdk/page.tsx  # Modified: add "Form Validation" entry to Forms category
```

**Responsibilities:**
- **page.tsx** owns the sidebar UI and receives validation state from viewer.tsx via `onValidationChange` callback. No SDK logic here.
- **viewer.tsx** owns the SDK instance, validation rules, validation engine, field coloring, and all event listeners. Exposes `validateAllRef` and `resetRef` for the sidebar buttons to call.
- **styles.css** handles all sidebar styling with dark mode support via `prefers-color-scheme` media queries, following the stamp-annotations pattern.

---

### Task 1: Create the Account Registration PDF

This task creates the PDF asset programmatically using the Nutrient Web SDK's form field creation APIs via a Node.js script. The script will be run once to generate the PDF, then the PDF is committed as a static asset and the script is deleted.

**Files:**
- Create: `scripts/create-account-registration-pdf.mjs` (temporary, deleted after use)
- Create: `public/documents/account-registration-form.pdf` (committed asset)

- [ ] **Step 1: Write the PDF generation script**

Create `scripts/create-account-registration-pdf.mjs`. This script uses the Nutrient Web SDK running in a headless browser (Puppeteer) to create a blank PDF and add all form fields. However, since the Web SDK requires a browser, a simpler approach is to create a temporary Next.js API route or page that generates the PDF.

Instead, we'll create this PDF using a simpler approach: create a bare-bones HTML page that loads the SDK, creates a blank document, adds all form fields, and exports it. We run it locally and save the resulting PDF.

Create `scripts/create-account-registration-pdf.mjs`:

```js
/**
 * This script creates the account-registration-form.pdf by:
 * 1. Starting the Next.js dev server
 * 2. Opening a temporary page that uses the SDK to create form fields on a blank PDF
 * 3. Exporting the PDF to public/documents/
 *
 * Usage: node scripts/create-account-registration-pdf.mjs
 *
 * NOTE: This is a one-time script. Delete after the PDF is committed.
 */
console.log("PDF creation script placeholder");
console.log("The recommended approach is to create the PDF manually using the form-designer sample:");
console.log("1. Start dev server: npm run dev");
console.log("2. Open http://localhost:3000/web-sdk/form-designer");
console.log("3. Use blank.pdf as the base document");
console.log("4. Add all required form fields");
console.log("5. Export and save as public/documents/account-registration-form.pdf");
console.log("");
console.log("Alternatively, create a temporary viewer page that programmatically adds fields.");
```

**IMPORTANT — Creating the PDF:** The most reliable approach is to create a temporary page at `app/web-sdk/form-validation/create-pdf/page.tsx` that:
1. Loads `blank.pdf` in the SDK
2. Programmatically creates all 15 form fields with correct types, positions, and names
3. Exports the PDF via `instance.exportPDF()`
4. Provides a download link

Here is that temporary page:

Create `app/web-sdk/form-validation/create-pdf/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Instance } from "@nutrient-sdk/viewer";

export default function CreatePDFPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading SDK...");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: "/blank.pdf",
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then(async (instance: Instance) => {
      setStatus("Creating form fields...");

      const List = NutrientViewer.Immutable.List as unknown as new (
        items: string[],
      ) => any;

      // Helper to create a widget + form field pair
      const createTextField = async (
        name: string,
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.TextFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createDateField = async (
        name: string,
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.TextFormField({
          name,
          annotationIds: new List([id]),
          additionalActions: {
            onFormat: new NutrientViewer.Actions.JavaScriptAction({
              script: 'AFDate_FormatEx("mm/dd/yyyy")',
            }),
          },
        });
        await instance.create([widget, formField]);
      };

      const createCheckbox = async (
        name: string,
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.CheckBoxFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createRadioGroup = async (
        name: string,
        options: string[],
        pageIndex: number,
        startLeft: number,
        top: number,
        spacing: number,
      ) => {
        const ids: string[] = [];
        const widgets: any[] = [];
        for (let i = 0; i < options.length; i++) {
          const id = NutrientViewer.generateInstantId();
          ids.push(id);
          widgets.push(
            new NutrientViewer.Annotations.WidgetAnnotation({
              id,
              pageIndex,
              boundingBox: new NutrientViewer.Geometry.Rect({
                left: startLeft + i * spacing,
                top,
                width: 15,
                height: 15,
              }),
              formFieldName: name,
            }),
          );
        }
        const formField = new NutrientViewer.FormFields.RadioButtonFormField({
          name,
          annotationIds: new List(ids),
          options: new List(options),
        });
        await instance.create([...widgets, formField]);
      };

      const createComboBox = async (
        name: string,
        options: string[],
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ComboBoxFormField({
          name,
          annotationIds: new List([id]),
          options: new List(
            options.map(
              (o) => new NutrientViewer.FormOption({ label: o, value: o }),
            ),
          ),
        });
        await instance.create([widget, formField]);
      };

      const createListBox = async (
        name: string,
        options: string[],
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ListBoxFormField({
          name,
          annotationIds: new List([id]),
          options: new List(
            options.map(
              (o) => new NutrientViewer.FormOption({ label: o, value: o }),
            ),
          ),
        });
        await instance.create([widget, formField]);
      };

      const createSignature = async (
        name: string,
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.SignatureFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createButton = async (
        name: string,
        label: string,
        pageIndex: number,
        boundingBox: { left: number; top: number; width: number; height: number },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ButtonFormField({
          name,
          annotationIds: new List([id]),
          buttonLabel: label,
        });
        await instance.create([widget, formField]);
      };

      // --- Page layout: fields positioned on a US Letter page (612 x 792 points) ---
      const pageIndex = 0;
      const leftCol = 50;
      const rightCol = 320;
      const fieldW = 230;
      const fieldH = 22;
      let y = 80; // starting y, below a title area
      const rowGap = 40;

      // Row 1: full_name, email
      await createTextField("full_name", pageIndex, { left: leftCol, top: y, width: fieldW, height: fieldH });
      await createTextField("email", pageIndex, { left: rightCol, top: y, width: fieldW, height: fieldH });
      y += rowGap;

      // Row 2: phone, date_of_birth
      await createTextField("phone", pageIndex, { left: leftCol, top: y, width: fieldW, height: fieldH });
      await createDateField("date_of_birth", pageIndex, { left: rightCol, top: y, width: fieldW, height: fieldH });
      y += rowGap;

      // Row 3: username, password
      await createTextField("username", pageIndex, { left: leftCol, top: y, width: fieldW, height: fieldH });
      await createTextField("password", pageIndex, { left: rightCol, top: y, width: fieldW, height: fieldH });
      y += rowGap;

      // Row 4: confirm_password, account_type (radio)
      await createTextField("confirm_password", pageIndex, { left: leftCol, top: y, width: fieldW, height: fieldH });
      await createRadioGroup("account_type", ["Personal", "Business", "Enterprise"], pageIndex, rightCol, y, 80);
      y += rowGap;

      // Row 5: company_name, country (combo)
      await createTextField("company_name", pageIndex, { left: leftCol, top: y, width: fieldW, height: fieldH });
      await createComboBox("country", [
        "United States", "Canada", "United Kingdom", "Germany", "France",
        "Australia", "Japan", "Brazil", "India", "Other",
      ], pageIndex, { left: rightCol, top: y, width: fieldW, height: fieldH });
      y += rowGap;

      // Row 6: interests (listbox, taller)
      await createListBox("interests", [
        "Technology", "Science", "Finance", "Healthcare", "Education",
        "Entertainment", "Sports", "Travel", "Food", "Art",
      ], pageIndex, { left: leftCol, top: y, width: fieldW, height: 80 });
      y += 50; // offset for the taller listbox

      // Row 6 right: checkboxes
      await createCheckbox("terms_agree", pageIndex, { left: rightCol, top: y - 10, width: 15, height: 15 });
      await createCheckbox("newsletter", pageIndex, { left: rightCol, top: y + 20, width: 15, height: 15 });
      y += 60;

      // Row 7: signature
      await createSignature("signature", pageIndex, { left: leftCol, top: y, width: 200, height: 60 });

      // Row 7 right: submit button
      await createButton("submit", "Validate & Submit", pageIndex, { left: rightCol, top: y + 15, width: 150, height: 35 });

      setStatus("Form fields created! Exporting PDF...");

      // Export
      const pdfBytes = await instance.exportPDF();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "account-registration-form.pdf";
      a.click();
      URL.revokeObjectURL(url);

      setStatus("PDF downloaded! Save it to public/documents/account-registration-form.pdf");
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Account Registration PDF Creator</h1>
      <p>{status}</p>
      <div ref={containerRef} style={{ height: 600, border: "1px solid #ccc" }} />
    </div>
  );
}
```

- [ ] **Step 2: Run the script to generate the PDF**

```bash
# Start the dev server if not running
npm run dev

# Open the temporary page in your browser
open http://localhost:3000/web-sdk/form-validation/create-pdf
```

The page will automatically create all form fields and trigger a download of `account-registration-form.pdf`. Save it to `public/documents/account-registration-form.pdf`.

**Verify:** Open the downloaded PDF in the form-prefill sample or any PDF viewer and confirm all 15 fields are present with correct names and types.

- [ ] **Step 3: Inspect the generated PDF and adjust field positions if needed**

Open the PDF in the SDK viewer and check:
- All fields are visible and don't overlap
- Text fields are large enough for input
- Radio buttons are spaced correctly
- The listbox shows multiple options
- The signature field is large enough
- The submit button is visible

If positions need adjusting, edit the coordinates in the create-pdf page and re-export.

- [ ] **Step 4: Commit the PDF asset and delete the temporary creator page**

```bash
# Move PDF to correct location if needed
mv ~/Downloads/account-registration-form.pdf public/documents/account-registration-form.pdf

# Delete the temporary creator page
rm -rf app/web-sdk/form-validation/create-pdf

# Commit
git add public/documents/account-registration-form.pdf
git commit -m "feat: add account registration form PDF for validation sample"
```

---

### Task 2: Create styles.css for the validation sidebar

**Files:**
- Create: `app/web-sdk/form-validation/styles.css`

- [ ] **Step 1: Create the stylesheet**

Create `app/web-sdk/form-validation/styles.css`:

```css
/* Form Validation Styles */

.validation-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 0;
}

/* Sidebar */
.validation-sidebar {
  width: 300px;
  flex-shrink: 0;
  background-color: var(--warm-gray-100);
  border-right: 1px solid var(--warm-gray-400);
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

@media (prefers-color-scheme: dark) {
  .validation-sidebar {
    background-color: var(--warm-gray-950);
    border-right-color: var(--warm-gray-800);
  }
}

/* Header */
.validation-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--warm-gray-300);
}

@media (prefers-color-scheme: dark) {
  .validation-header {
    border-bottom-color: var(--warm-gray-800);
  }
}

.validation-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--black);
}

@media (prefers-color-scheme: dark) {
  .validation-title {
    color: var(--warm-gray-200);
  }
}

.validation-subtitle {
  font-size: 11px;
  color: var(--warm-gray-700);
  margin-top: 4px;
}

@media (prefers-color-scheme: dark) {
  .validation-subtitle {
    color: var(--warm-gray-500);
  }
}

/* Status counters */
.validation-counters {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
}

.validation-counter {
  flex: 1;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid;
}

.validation-counter-value {
  font-size: 20px;
  font-weight: 700;
}

.validation-counter-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.validation-counter--valid {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.validation-counter--valid .validation-counter-value {
  color: #16a34a;
}

.validation-counter--valid .validation-counter-label {
  color: #22c55e;
}

.validation-counter--errors {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.validation-counter--errors .validation-counter-value {
  color: #dc2626;
}

.validation-counter--errors .validation-counter-label {
  color: #ef4444;
}

.validation-counter--pending {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.validation-counter--pending .validation-counter-value {
  color: #64748b;
}

.validation-counter--pending .validation-counter-label {
  color: #94a3b8;
}

@media (prefers-color-scheme: dark) {
  .validation-counter--valid {
    background-color: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.3);
  }

  .validation-counter--errors {
    background-color: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.3);
  }

  .validation-counter--pending {
    background-color: rgba(100, 116, 139, 0.1);
    border-color: rgba(100, 116, 139, 0.3);
  }
}

/* Section labels */
.validation-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 20px;
}

.validation-section-label--errors {
  color: #ef4444;
}

.validation-section-label--valid {
  color: #22c55e;
}

/* Scrollable content */
.validation-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Error cards */
.validation-error-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 20px;
}

.validation-error-card {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.validation-error-card:hover {
  background-color: #fee2e2;
}

@media (prefers-color-scheme: dark) {
  .validation-error-card {
    background-color: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.3);
  }

  .validation-error-card:hover {
    background-color: rgba(220, 38, 38, 0.15);
  }
}

.validation-error-field {
  font-weight: 600;
  font-size: 12px;
  color: #b91c1c;
}

@media (prefers-color-scheme: dark) {
  .validation-error-field {
    color: #fca5a5;
  }
}

.validation-error-message {
  font-size: 11px;
  color: #dc2626;
  margin-top: 2px;
}

@media (prefers-color-scheme: dark) {
  .validation-error-message {
    color: #f87171;
  }
}

/* Valid field rows */
.validation-valid-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 20px;
}

.validation-valid-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .validation-valid-row {
    background-color: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.3);
  }
}

.validation-valid-check {
  color: #22c55e;
  font-size: 14px;
}

.validation-valid-name {
  font-size: 12px;
  color: #16a34a;
}

@media (prefers-color-scheme: dark) {
  .validation-valid-name {
    color: #86efac;
  }
}

/* Action buttons */
.validation-actions {
  padding: 12px 20px;
  border-top: 1px solid var(--warm-gray-300);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (prefers-color-scheme: dark) {
  .validation-actions {
    border-top-color: var(--warm-gray-800);
  }
}

.validation-btn-primary {
  background: var(--digital-pollen);
  color: var(--black);
  border: none;
  border-radius: 6px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.validation-btn-primary:hover {
  opacity: 0.9;
}

.validation-btn-secondary {
  background: transparent;
  color: var(--warm-gray-700);
  border: 1px solid var(--warm-gray-400);
  border-radius: 6px;
  padding: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.validation-btn-secondary:hover {
  border-color: var(--warm-gray-600);
  color: var(--black);
}

@media (prefers-color-scheme: dark) {
  .validation-btn-secondary {
    color: var(--warm-gray-400);
    border-color: var(--warm-gray-700);
  }

  .validation-btn-secondary:hover {
    border-color: var(--warm-gray-500);
    color: var(--warm-gray-200);
  }
}

/* Empty state */
.validation-empty {
  font-size: 13px;
  color: var(--warm-gray-700);
  text-align: center;
  padding: 16px 20px;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .validation-empty {
    color: var(--warm-gray-500);
  }
}

/* Viewer */
.validation-viewer-container {
  flex: 1;
  height: 100%;
  min-height: 600px;
}

.validation-viewer {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/form-validation/styles.css
git commit -m "feat: add form validation sidebar styles"
```

---

### Task 3: Create viewer.tsx with validation engine and field coloring

**Files:**
- Create: `app/web-sdk/form-validation/viewer.tsx`

- [ ] **Step 1: Create the viewer component**

Create `app/web-sdk/form-validation/viewer.tsx`:

```tsx
"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";

const DOCUMENT = "/documents/account-registration-form.pdf";

// --- Validation Rule Types ---

type ValidationRule =
  | { type: "required"; message?: string }
  | { type: "pattern"; regex: RegExp; message: string }
  | { type: "minLength"; value: number; message?: string }
  | { type: "maxLength"; value: number; message?: string }
  | { type: "matchField"; field: string; message?: string }
  | { type: "conditionalRequired"; when: { field: string; values: string[] }; message?: string }
  | { type: "minSelected"; value: number; message?: string }
  | { type: "checked"; message?: string }
  | { type: "dateFormat"; format: string; message?: string }
  | { type: "signed"; message?: string };

// Rules that can be evaluated on a single field's value in real-time
const REALTIME_RULE_TYPES = new Set(["required", "pattern", "minLength", "maxLength", "dateFormat", "checked"]);

const validationRules: Record<string, ValidationRule[]> = {
  full_name: [{ type: "required" }],
  email: [
    { type: "required" },
    { type: "pattern", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
  ],
  phone: [
    { type: "pattern", regex: /^\+?[\d\s\-()]{7,15}$/, message: "Invalid phone number" },
  ],
  date_of_birth: [
    { type: "required" },
    { type: "dateFormat", format: "mm/dd/yyyy", message: "Invalid date format (mm/dd/yyyy)" },
  ],
  username: [
    { type: "required" },
    { type: "maxLength", value: 20, message: "Username must be 20 characters or fewer" },
  ],
  password: [
    { type: "required" },
    { type: "minLength", value: 8, message: "Password must be at least 8 characters" },
  ],
  confirm_password: [
    { type: "required" },
    { type: "matchField", field: "password", message: "Passwords do not match" },
  ],
  company_name: [
    {
      type: "conditionalRequired",
      when: { field: "account_type", values: ["Business", "Enterprise"] },
    },
  ],
  country: [{ type: "required" }],
  interests: [{ type: "minSelected", value: 1, message: "Select at least one interest" }],
  terms_agree: [{ type: "checked", message: "You must agree to the terms" }],
  signature: [{ type: "signed", message: "Signature is required" }],
};

// --- Validation Engine (pure functions) ---

function validateRule(
  rule: ValidationRule,
  value: string | string[] | null,
  allValues: Record<string, string | string[] | null>,
): string | null {
  const strVal = typeof value === "string" ? value.trim() : "";
  const arrVal = Array.isArray(value) ? value : [];

  switch (rule.type) {
    case "required":
      if (!strVal && arrVal.length === 0) return rule.message ?? "This field is required";
      return null;

    case "pattern":
      if (strVal && !rule.regex.test(strVal)) return rule.message;
      return null;

    case "minLength":
      if (strVal && strVal.length < rule.value)
        return rule.message ?? `Minimum ${rule.value} characters required`;
      return null;

    case "maxLength":
      if (strVal && strVal.length > rule.value)
        return rule.message ?? `Maximum ${rule.value} characters allowed`;
      return null;

    case "matchField": {
      const otherVal = typeof allValues[rule.field] === "string"
        ? (allValues[rule.field] as string).trim()
        : "";
      if (strVal && otherVal && strVal !== otherVal)
        return rule.message ?? "Fields do not match";
      return null;
    }

    case "conditionalRequired": {
      const condVal = allValues[rule.when.field];
      const condStr = typeof condVal === "string" ? condVal : "";
      if (rule.when.values.includes(condStr) && !strVal)
        return rule.message ?? "This field is required";
      return null;
    }

    case "minSelected":
      if (arrVal.length < rule.value)
        return rule.message ?? `Select at least ${rule.value}`;
      return null;

    case "checked":
      // Checkbox value is ["Yes"] when checked, [] when unchecked
      if (arrVal.length === 0 || (arrVal.length === 1 && arrVal[0] === "Off"))
        return rule.message ?? "This must be checked";
      return null;

    case "dateFormat": {
      if (!strVal) return null; // Empty handled by "required" rule
      // Basic date validation for mm/dd/yyyy
      const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
      if (!dateRegex.test(strVal)) return rule.message ?? "Invalid date format";
      return null;
    }

    case "signed":
      // This is handled specially — can't check via values alone
      // Returns null here; actual check happens in validateSignature()
      return null;

    default:
      return null;
  }
}

function validateField(
  fieldName: string,
  allValues: Record<string, string | string[] | null>,
  realtimeOnly: boolean,
): string | null {
  const rules = validationRules[fieldName];
  if (!rules) return null;

  const value = allValues[fieldName] ?? null;

  for (const rule of rules) {
    if (realtimeOnly && !REALTIME_RULE_TYPES.has(rule.type)) continue;
    const error = validateRule(rule, value, allValues);
    if (error) return error;
  }
  return null;
}

function validateAll(
  allValues: Record<string, string | string[] | null>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const fieldName of Object.keys(validationRules)) {
    if (fieldName === "signature") continue; // Handled separately
    const error = validateField(fieldName, allValues, false);
    if (error) errors[fieldName] = error;
  }
  return errors;
}

// --- Exported types ---

export interface ValidationState {
  errors: Record<string, string>; // fieldName -> error message
  validatedFields: Set<string>; // fields that have been checked (valid or error)
}

export interface FormFieldMeta {
  name: string;
  type: string;
  annotationIds: string[];
  pageIndex: number;
}

interface FormValidationViewerProps {
  onValidationChange: (state: ValidationState) => void;
  validateAllRef: React.MutableRefObject<(() => Promise<void>) | null>;
  resetRef: React.MutableRefObject<(() => Promise<void>) | null>;
  navigateToFieldRef: React.MutableRefObject<((fieldName: string) => Promise<void>) | null>;
}

export default function FormValidationViewer({
  onValidationChange,
  validateAllRef,
  resetRef,
  navigateToFieldRef,
}: FormValidationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const fieldMetaRef = useRef<FormFieldMeta[]>([]);
  const validationStateRef = useRef<ValidationState>({
    errors: {},
    validatedFields: new Set(),
  });
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  // Update field background color in the PDF
  const updateFieldColor = useCallback(
    async (fieldName: string, isValid: boolean | null) => {
      const instance = instanceRef.current;
      const { NutrientViewer } = window;
      if (!instance || !NutrientViewer) return;

      const meta = fieldMetaRef.current.find((f) => f.name === fieldName);
      if (!meta) return;

      for (const annotationId of meta.annotationIds) {
        try {
          const annotation = await instance.getAnnotation(meta.pageIndex, annotationId);
          if (!annotation) continue;

          let color = null; // null = clear/default
          if (isValid === true) color = NutrientViewer.Color.GREEN;
          else if (isValid === false) color = NutrientViewer.Color.RED;

          await instance.update(annotation.set("backgroundColor", color));
        } catch {
          // Annotation may not support backgroundColor (e.g., button)
        }
      }
    },
    [],
  );

  // Emit state update
  const emitState = useCallback(() => {
    onValidationChangeRef.current({
      errors: { ...validationStateRef.current.errors },
      validatedFields: new Set(validationStateRef.current.validatedFields),
    });
  }, []);

  // Validate a single field and update state + colors
  const validateAndUpdateField = useCallback(
    async (fieldName: string, allValues: Record<string, string | string[] | null>, realtimeOnly: boolean) => {
      const error = validateField(fieldName, allValues, realtimeOnly);
      const state = validationStateRef.current;

      state.validatedFields.add(fieldName);
      if (error) {
        state.errors[fieldName] = error;
      } else {
        delete state.errors[fieldName];
      }

      await updateFieldColor(fieldName, error === null);
      emitState();
    },
    [updateFieldColor, emitState],
  );

  // Validate signature field (special case)
  const validateSignature = useCallback(async (): Promise<boolean> => {
    const instance = instanceRef.current;
    const { NutrientViewer } = window;
    if (!instance || !NutrientViewer) return false;

    const formFields = await instance.getFormFields();
    const sigField = (formFields as any[]).find(
      (f: any) => f instanceof NutrientViewer.FormFields.SignatureFormField && f.name === "signature",
    );
    if (!sigField) return true; // No signature field = skip

    const overlapping = await instance.getOverlappingAnnotations(sigField);
    const isSigned = overlapping.size > 0;

    const state = validationStateRef.current;
    state.validatedFields.add("signature");
    if (!isSigned) {
      state.errors["signature"] = "Signature is required";
    } else {
      delete state.errors["signature"];
    }

    await updateFieldColor("signature", isSigned);
    return isSigned;
  }, [updateFieldColor]);

  // Full validation
  const handleValidateAll = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance) return;

    const allValues = await instance.getFormFieldValues();
    const errors = validateAll(allValues as Record<string, string | string[] | null>);

    // Update all fields
    const state = validationStateRef.current;
    state.errors = { ...errors };
    state.validatedFields = new Set(Object.keys(validationRules));

    // Color all fields
    for (const fieldName of Object.keys(validationRules)) {
      if (fieldName === "signature") continue;
      await updateFieldColor(fieldName, !errors[fieldName]);
    }

    // Signature check
    await validateSignature();

    emitState();
  }, [updateFieldColor, validateSignature, emitState]);

  // Reset all validation
  const handleReset = useCallback(async () => {
    const state = validationStateRef.current;
    state.errors = {};
    state.validatedFields = new Set();

    // Clear all field colors
    for (const meta of fieldMetaRef.current) {
      await updateFieldColor(meta.name, null);
    }

    emitState();
  }, [updateFieldColor, emitState]);

  // Navigate to field
  const handleNavigateToField = useCallback(async (fieldName: string) => {
    const instance = instanceRef.current;
    if (!instance) return;

    const meta = fieldMetaRef.current.find((f) => f.name === fieldName);
    if (!meta || meta.annotationIds.length === 0) return;

    try {
      const annotation = await instance.getAnnotation(meta.pageIndex, meta.annotationIds[0]);
      if (annotation) {
        instance.jumpToRect(meta.pageIndex, annotation.boundingBox);
      }
    } catch {
      // Field may not be navigable
    }
  }, []);

  // Initialize SDK
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then(async (instance: Instance) => {
      instanceRef.current = instance;

      // Discover form fields and store metadata
      const formFields = await instance.getFormFields();
      const metas: FormFieldMeta[] = [];

      (formFields as any[]).forEach((field: any) => {
        let type = "unknown";
        if (field instanceof NutrientViewer.FormFields.TextFormField) type = "text";
        else if (field instanceof NutrientViewer.FormFields.CheckBoxFormField) type = "checkbox";
        else if (field instanceof NutrientViewer.FormFields.RadioButtonFormField) type = "radio";
        else if (field instanceof NutrientViewer.FormFields.ComboBoxFormField) type = "combobox";
        else if (field instanceof NutrientViewer.FormFields.ListBoxFormField) type = "listbox";
        else if (field instanceof NutrientViewer.FormFields.SignatureFormField) type = "signature";
        else if (field instanceof NutrientViewer.FormFields.ButtonFormField) type = "button";

        const annotationIds = field.annotationIds?.toArray?.() ?? [];
        metas.push({
          name: field.name,
          type,
          annotationIds,
          pageIndex: 0, // Single-page PDF
        });
      });

      fieldMetaRef.current = metas;

      // Wire up refs for parent component
      validateAllRef.current = handleValidateAll;
      resetRef.current = handleReset;
      navigateToFieldRef.current = handleNavigateToField;

      // Listen for real-time field value changes
      instance.addEventListener("formFieldValues.update", async (event: any) => {
        const allValues = await instance.getFormFieldValues();

        // Find which field changed — the event contains the field name
        const changedFieldName = event?.formFieldName ?? event?.name;
        if (changedFieldName && validationRules[changedFieldName]) {
          await validateAndUpdateField(
            changedFieldName,
            allValues as Record<string, string | string[] | null>,
            true, // realtime only
          );
        }
      });

      // Wire the submit button to Validate All
      instance.addEventListener("annotations.press", async (event: any) => {
        const meta = fieldMetaRef.current.find(
          (f) => f.type === "button" && f.annotationIds.includes(event?.annotationId),
        );
        if (meta?.name === "submit") {
          await handleValidateAll();
        }
      });
    });

    return () => {
      instanceRef.current = null;
      validateAllRef.current = null;
      resetRef.current = null;
      navigateToFieldRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [handleValidateAll, handleReset, handleNavigateToField, validateAndUpdateField]);

  return <div ref={containerRef} className="validation-viewer" />;
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit app/web-sdk/form-validation/viewer.tsx 2>&1 || true
```

Check for any TypeScript errors and fix them. Common issues:
- The `formFieldValues.update` event shape may differ — check the SDK docs for the exact event payload
- `annotationIds.toArray()` may need a different method to convert from Immutable.List to array
- The `annotations.press` event may have a different name — verify against the SDK API

- [ ] **Step 3: Commit**

```bash
git add app/web-sdk/form-validation/viewer.tsx
git commit -m "feat: add form validation viewer with rule engine and field coloring"
```

---

### Task 4: Create page.tsx with sidebar UI

**Files:**
- Create: `app/web-sdk/form-validation/page.tsx`

- [ ] **Step 1: Create the page component**

Create `app/web-sdk/form-validation/page.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useCallback } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { ValidationState } from "./viewer";
import "./styles.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

// Human-friendly labels for field names
const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  email: "Email Address",
  phone: "Phone Number",
  date_of_birth: "Date of Birth",
  username: "Username",
  password: "Password",
  confirm_password: "Confirm Password",
  account_type: "Account Type",
  company_name: "Company Name",
  country: "Country",
  interests: "Interests",
  terms_agree: "Terms & Conditions",
  newsletter: "Newsletter",
  signature: "Signature",
};

// Total number of fields with validation rules
const TOTAL_RULES = 12; // Excludes newsletter (no rules) and submit (button)

export default function FormValidationPage() {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    validatedFields: new Set(),
  });

  const validateAllRef = useRef<(() => Promise<void>) | null>(null);
  const resetRef = useRef<(() => Promise<void>) | null>(null);
  const navigateToFieldRef = useRef<((fieldName: string) => Promise<void>) | null>(null);

  const handleValidationChange = useCallback((state: ValidationState) => {
    setValidationState(state);
  }, []);

  const errorCount = Object.keys(validationState.errors).length;
  const validatedCount = validationState.validatedFields.size;
  const validCount = validatedCount - errorCount;
  const pendingCount = TOTAL_RULES - validatedCount;

  const errorEntries = Object.entries(validationState.errors);
  const validFields = Array.from(validationState.validatedFields).filter(
    (f) => !validationState.errors[f],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Form Validation"
        description="Client-side validation rules with visual feedback on PDF form fields. Edit fields to see real-time validation, or click Validate All for a full check."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="validation-wrapper">
            {/* Sidebar */}
            <div className="validation-sidebar">
              {/* Header */}
              <div className="validation-header">
                <div className="validation-title">Validation Rules</div>
                <div className="validation-subtitle">
                  {TOTAL_RULES} rules active · {errorCount} error{errorCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Status counters */}
              <div className="validation-counters">
                <div className="validation-counter validation-counter--valid">
                  <div className="validation-counter-value">{validCount}</div>
                  <div className="validation-counter-label">Valid</div>
                </div>
                <div className="validation-counter validation-counter--errors">
                  <div className="validation-counter-value">{errorCount}</div>
                  <div className="validation-counter-label">Errors</div>
                </div>
                <div className="validation-counter validation-counter--pending">
                  <div className="validation-counter-value">{pendingCount}</div>
                  <div className="validation-counter-label">Pending</div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="validation-content">
                {/* Errors section */}
                {errorEntries.length > 0 && (
                  <div>
                    <div className="validation-section-label validation-section-label--errors">
                      ✕ Errors
                    </div>
                    <div className="validation-error-list">
                      {errorEntries.map(([fieldName, message]) => (
                        <button
                          key={fieldName}
                          type="button"
                          className="validation-error-card"
                          onClick={() => navigateToFieldRef.current?.(fieldName)}
                        >
                          <div className="validation-error-field">
                            {FIELD_LABELS[fieldName] ?? fieldName}
                          </div>
                          <div className="validation-error-message">{message}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid section */}
                {validFields.length > 0 && (
                  <div>
                    <div className="validation-section-label validation-section-label--valid">
                      ✓ Valid
                    </div>
                    <div className="validation-valid-list">
                      {validFields.map((fieldName) => (
                        <div key={fieldName} className="validation-valid-row">
                          <span className="validation-valid-check">✓</span>
                          <span className="validation-valid-name">
                            {FIELD_LABELS[fieldName] ?? fieldName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {validatedCount === 0 && (
                  <div className="validation-empty">
                    Fill in form fields to see real-time validation, or click
                    &ldquo;Validate All&rdquo; to check all fields at once.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="validation-actions">
                <button
                  type="button"
                  className="validation-btn-primary"
                  onClick={() => validateAllRef.current?.()}
                >
                  Validate All
                </button>
                <button
                  type="button"
                  className="validation-btn-secondary"
                  onClick={() => resetRef.current?.()}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Viewer */}
            <div className="validation-viewer-container">
              <Viewer
                onValidationChange={handleValidationChange}
                validateAllRef={validateAllRef}
                resetRef={resetRef}
                navigateToFieldRef={navigateToFieldRef}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/form-validation/page.tsx
git commit -m "feat: add form validation page with sidebar UI"
```

---

### Task 5: Add sample to the Web SDK index

**Files:**
- Modify: `app/web-sdk/page.tsx` (around line 121, after "Grouped Form Stamps" entry)

- [ ] **Step 1: Add the Form Validation entry**

In `app/web-sdk/page.tsx`, add the following entry after the "Form Designer" entry (line ~113) and before "Grouped Form Stamps" (line ~115), to maintain alphabetical order within the Forms category:

```tsx
  {
    name: "Form Validation",
    category: "Forms",
    description:
      "Client-side validation rules with visual feedback on PDF form fields using a declarative rule engine",
    path: "/web-sdk/form-validation",
  },
```

The entry goes between "Form Designer" and "Grouped Form Stamps" alphabetically.

- [ ] **Step 2: Verify the index page renders**

```bash
# Dev server should already be running
# Open http://localhost:3000/web-sdk and verify "Form Validation" appears in the Forms category
```

- [ ] **Step 3: Commit**

```bash
git add app/web-sdk/page.tsx
git commit -m "feat: add Form Validation to Web SDK samples index"
```

---

### Task 6: Integration testing and polish

**Files:**
- Possibly modify: `app/web-sdk/form-validation/viewer.tsx` (event listener fixes)
- Possibly modify: `app/web-sdk/form-validation/page.tsx` (UI tweaks)

- [ ] **Step 1: Test real-time validation**

Open `http://localhost:3000/web-sdk/form-validation` and test:

1. Type in the `email` field — sidebar should show "Invalid email format" error and field turns red
2. Type a valid email — error clears, field turns green
3. Type in `username` field with >20 chars — error appears
4. Leave `full_name` empty and tab away — "required" error appears

If `formFieldValues.update` event doesn't fire or has a different payload shape, check the SDK docs and adjust the event listener in viewer.tsx. The event may provide the field name differently (e.g., as `event.formFields` array or `event.name`).

- [ ] **Step 2: Test "Validate All"**

Click "Validate All" button:

1. All empty required fields should turn red
2. Cross-field rules should fire (password match, conditional company_name)
3. Signature field should show error if unsigned
4. Sidebar should show full error/valid lists
5. Status counters should update correctly

- [ ] **Step 3: Test click-to-navigate**

Click an error card in the sidebar. The PDF should scroll to show that field. Verify `jumpToRect` works correctly.

- [ ] **Step 4: Test reset**

Click "Reset":

1. All field colors should clear back to default
2. Sidebar should return to empty state
3. Status counters should reset to 0/0/12

- [ ] **Step 5: Test the submit button in PDF**

Click the "Validate & Submit" button rendered in the PDF. It should trigger the same "Validate All" behavior. If the `annotations.press` event doesn't exist, check the SDK API for the correct button action event name (it may be `formFieldValues.update` with a button-specific payload, or a different event entirely).

- [ ] **Step 6: Test dark mode**

Toggle system dark mode (or browser devtools) and verify:
- Sidebar background, text colors, and borders adapt
- Error cards and valid rows have appropriate dark theme colors
- Counters are readable in dark mode

- [ ] **Step 7: Fix any issues found and commit**

```bash
git add -A app/web-sdk/form-validation/
git commit -m "fix: polish form validation sample after integration testing"
```

---

### Task 7: Update memory index

**Files:**
- Modify: `/Users/jonaddamsnutrient/.claude/projects/-Users-jonaddamsnutrient-SE-code-nutrient-sdk-samples/memory/project_sample_ideas.md`

- [ ] **Step 1: Mark Form Validation as completed**

In the memory file, change:
```
- [ ] Form Validation — Client-side validation rules with visual feedback
```
to:
```
- [x] Form Validation — Client-side validation rules with visual feedback
```

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A
git commit -m "docs: mark Form Validation sample as completed in backlog"
```
