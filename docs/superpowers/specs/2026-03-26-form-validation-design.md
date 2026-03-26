# Form Validation Sample — Design Spec

## Overview

A new Web SDK sample demonstrating client-side form validation with visual feedback on PDF form fields. Uses a purpose-built Account Registration PDF containing every form field type the Nutrient SDK supports. Validation rules are defined as a declarative rule map, with hybrid timing (real-time for individual field rules, full check on "Validate All").

## PDF Document

**File**: `public/documents/account-registration-form.pdf`

A single-page Account Registration form containing all SDK-supported field types:

| Field Name | SDK Type | Purpose |
|---|---|---|
| `full_name` | TextFormField | Full name (required) |
| `email` | TextFormField | Email address (required, format) |
| `phone` | TextFormField | Phone number (format) |
| `date_of_birth` | TextFormField + `AFDate_FormatEx` action | Date of birth with native date picker (required, format) |
| `username` | TextFormField | Username (required, max length) |
| `password` | TextFormField | Password (required, min length) |
| `confirm_password` | TextFormField | Confirm password (required, must match `password`) |
| `account_type` | RadioButtonFormField | Personal / Business / Enterprise |
| `company_name` | TextFormField | Company name (conditional: required when account_type is Business or Enterprise) |
| `country` | ComboBoxFormField | Country selection (required) |
| `interests` | ListBoxFormField | Multi-select interests (at least one required) |
| `terms_agree` | CheckBoxFormField | Agree to terms (required, must be checked) |
| `newsletter` | CheckBoxFormField | Subscribe to newsletter (optional, no validation) |
| `signature` | SignatureFormField | Applicant signature (required on Validate All) |
| `submit` | ButtonFormField | Triggers "Validate All" when clicked within the PDF |

This PDF will be created programmatically using the Nutrient Document Authoring SDK (or a script using the Web SDK's form field creation APIs) and committed as a static asset. Field names must match exactly for the rule map to work.

## File Structure

```
app/web-sdk/form-validation/
├── page.tsx        # Layout: sidebar + dynamic viewer import
├── viewer.tsx      # SDK init, validation engine, field styling
└── styles.css      # Sidebar and validation UI styles
```

Follows the standard sample pattern (page.tsx wraps viewer.tsx with `dynamic()` and `ssr: false`).

## Validation Rule Map

Declarative rules keyed by field name, defined in `viewer.tsx`:

```ts
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
    { type: "conditionalRequired", when: { field: "account_type", values: ["Business", "Enterprise"] } },
  ],
  country: [{ type: "required" }],
  interests: [{ type: "minSelected", value: 1, message: "Select at least one interest" }],
  terms_agree: [{ type: "checked", message: "You must agree to the terms" }],
  signature: [{ type: "signed", message: "Signature is required" }],
};
```

## Validation Engine

A `validateField(fieldName, allValues)` function that:

1. Looks up rules for the given field name
2. Iterates rules in order, returning the first failing rule's error message
3. Returns `null` if all rules pass

A `validateAll(allValues)` function that runs `validateField` for every key in the rule map.

Both are pure functions — no SDK dependency. They take a `Record<string, string | string[] | null>` (the shape returned by `instance.getFormFieldValues()`).

### Date field validation

The `date_of_birth` field is a TextFormField with an `AFDate_FormatEx("mm/dd/yyyy")` JavaScript action attached, which triggers the browser's native date picker. The `dateFormat` rule validates the resulting string matches the expected format pattern. Since the date picker itself enforces format when used, this rule primarily catches manually typed invalid dates.

### Button field (submit)

The `submit` ButtonFormField triggers "Validate All" from within the PDF. On load, we listen for the button's action event and wire it to the same validation logic as the sidebar "Validate All" button. ButtonFormField has no value — it's excluded from `getFormFieldValues()` and has no validation rules.

### Signature validation

The `signed` rule type is special — it can't be checked via `getFormFieldValues()`. Instead, it uses `instance.getFormFields()` to find the SignatureFormField, then `instance.getOverlappingAnnotations()` to check if an ink/image annotation exists on it. This check only runs during "Validate All", not real-time.

## Validation Timing (Hybrid)

### Real-time (on field change)

Listen to `instance.addEventListener("formFieldValues.update", callback)`. On each event:

1. Get current values via `instance.getFormFieldValues()`
2. Run `validateField()` for the changed field
3. Update sidebar and field background color

**Which rules fire real-time**: `required`, `pattern`, `minLength`, `maxLength`. These are self-contained checks on a single field's value.

### On "Validate All" button

1. Get all values via `instance.getFormFieldValues()`
2. Run `validateAll()` — this includes cross-field rules (`matchField`, `conditionalRequired`) and `signed`
3. Update all field background colors and full sidebar error list

The distinction: cross-field and signature rules only fire on explicit "Validate All" because they depend on other fields' states which may not be finalized yet during live editing.

## Visual Feedback — PDF Field Styling

Use the SDK's annotation update API to color form field widget annotations:

```ts
// Get widget annotations for a form field
const formField = formFields.find(f => f.name === fieldName);
const annotationIds = formField.annotationIds;

for (const annotationId of annotationIds) {
  const annotation = await instance.getAnnotation(pageIndex, annotationId);
  const color = isValid ? NutrientViewer.Color.GREEN : NutrientViewer.Color.RED;
  await instance.update(annotation.set("backgroundColor", color));
}
```

Three states:
- **No color** (default) — field not yet validated (pending)
- **Green background** — field passes all rules
- **Red background** — field has a validation error

The "Reset" button clears all background colors back to default (null/transparent) and clears the sidebar.

## Sidebar UI

### Structure (top to bottom)

1. **Header**: "Validation Rules" title, subtitle showing "N rules active · M errors"
2. **Status counters**: Three boxes — Valid (green), Errors (red), Pending (gray) with counts
3. **Error list**: Red-themed cards, each showing field name + error message. Clicking an error card scrolls the PDF viewer to that field and selects it using `instance.jumpToRect()` on the field's bounding box.
4. **Valid list**: Green-themed compact rows with checkmark + field name
5. **Action buttons** (pinned to bottom):
   - "Validate All" (primary, indigo) — runs full validation
   - "Reset" (secondary, outlined) — clears all validation state and field colors

### Click-to-navigate

When user clicks an error in the sidebar:

```ts
const annotation = await instance.getAnnotation(pageIndex, annotationId);
instance.jumpToRect(pageIndex, annotation.boundingBox);
```

This scrolls the PDF to show the invalid field.

## Samples Index Entry

Add to the "Forms" category in `app/web-sdk/page.tsx`:

```ts
{
  name: "Form Validation",
  category: "Forms",
  description: "Client-side validation rules with visual feedback on PDF form fields",
  path: "/web-sdk/form-validation",
}
```

Alphabetical placement within the Forms category.

## State Management

All state lives in the viewer component via React refs and state:

- `instanceRef` — SDK instance
- `validationErrors` state — `Record<string, string>` (field name → error message), lifted to page.tsx for sidebar rendering
- `validatedFields` state — `Set<string>` tracking which fields have been validated (to distinguish pending from valid)
- Form field metadata (names, types, annotation IDs) discovered on load

The page.tsx owns the sidebar UI and receives validation state from viewer.tsx via callbacks (`onValidationChange`).

## What This Sample Does NOT Do

- No server-side validation (this is a client-side PDF SDK sample)
- No form submission endpoint
- No persistence of validation state
- No custom validation rule UI (rules are hardcoded to match the PDF)
- No localization of error messages
