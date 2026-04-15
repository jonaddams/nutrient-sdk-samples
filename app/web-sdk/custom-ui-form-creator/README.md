# Custom UI Form Creator

Build a custom form builder UI on top of Nutrient Web SDK's form field engine.

## The Core Idea

Nutrient Web SDK ships with a powerful, full-featured form creator — toolbars, property popovers, and field type selectors. But for many applications, this default UI exposes too much complexity. Your end users don't need 30 options when they only use 5.

**The solution: hide the SDK's built-in UI with CSS and replace it with your own.**

This is a first-class pattern, not a hack. The SDK's `styleSheets` configuration option lets you inject custom CSS at load time. Three CSS rules hide the default toolbars and popovers. Then you build exactly the interface your users need — a clean sidebar, a simple palette, a focused properties panel — while the SDK's full form field engine handles everything underneath.

```css
/* These three rules are all it takes to hide the SDK's form creator UI */
.PSPDFKit-Form-Creator-Toolbar { display: none !important; }
.PSPDFKit-Form-Creator-Popover { display: none !important; }
.PSPDFKit-Toolbar { display: none !important; }
```

```typescript
// Inject the CSS at load time
NutrientViewer.load({
  container,
  document: "/documents/your-document.pdf",
  styleSheets: ["/form-field-annotations.css"],
  customRenderers: {
    Annotation: renderFieldOverlay, // Your custom field rendering
  },
});
```

You still get all of the SDK's capabilities — coordinate transformation, form field creation, validation, interaction modes, permissions — but your users see only what they need.

## What This Sample Demonstrates

### 1. Custom Field Palette (replacing the SDK toolbar)

Instead of the SDK's built-in form creator toolbar, this sample provides a sidebar with a curated list of draggable field types:

- **Text field** — Single-line text input
- **Checkbox** — Boolean toggle
- **Radio button** — Single selection from a group
- **Signature** — Signature capture field
- **Date** — Date input with automatic formatting

Users drag a field type from the palette onto the PDF. The SDK's `transformContentClientToPageSpace()` API converts the drop coordinates into PDF page coordinates, and `instance.create()` places the field.

### 2. Custom Properties Panel (replacing the SDK popover)

When you click a placed field, the SDK normally shows its own properties popover with dozens of options. This sample hides that popover and shows a focused properties panel in the sidebar with just:

- **Field name** — What the field is called in form data
- **Required** — Whether the field must be filled
- **Role assignment** — Which role this field belongs to
- **Delete** — Remove the field

All property changes are written back to the annotation's `customData` via `instance.update()`.

### 3. Role-Based Field Assignment

Fields are assigned to one of three roles, each with a distinct color:

| Role | Color | Meaning |
|------|-------|---------|
| Provider | Blue | Only editable by the provider |
| Patient | Pink | Only editable by the patient |
| Either | Purple | Editable by both roles |

The role switcher in the sidebar lets you switch between Editor mode (place and configure fields) and role-specific views (Provider or Patient). When viewing as a role:

- Fields assigned to your role or "Either" remain editable with full color
- Fields assigned to the other role become read-only and dimmed

This uses the SDK's `readOnly` property on form fields and `InteractionMode.FORM_CREATOR` for editor mode.

### 4. Custom Field Rendering (customRenderers)

The SDK's `customRenderers.Annotation()` callback lets you overlay custom DOM elements on any annotation. This sample uses it to render:

- A colored border matching the field's assigned role
- A small role badge (e.g., "Provider", "Patient") inside each field
- The field name for quick identification

This makes the role assignment immediately visible on the document without any SDK UI.

## How It Works

### Architecture

```
viewer.tsx          — All UI rendering and SDK interaction
_lib/types.ts       — TypeScript interfaces (Role, FieldType, FieldCustomData)
_lib/roles.ts       — Role definitions with colors
_lib/fields.ts      — Pure functions that create [WidgetAnnotation, FormField] pairs
```

The `viewer.tsx` component handles everything: sidebar rendering, drag-and-drop event handling, SDK initialization, field selection, and property editing. The `_lib/` helpers are pure functions with no React or SDK dependencies — they take parameters and return SDK objects, making them easy to understand and reuse.

### Data Flow

1. **Drag** a field type from the sidebar palette
2. **Drop** onto the PDF — coordinates are converted via `transformContentClientToPageSpace()`
3. A **helper function** in `_lib/fields.ts` creates the `WidgetAnnotation` + `FormField` pair with `customData` containing the field type, role, name, and required flag
4. **`instance.create()`** places the field on the document
5. **`customRenderers.Annotation()`** reads `customData.roleId` and renders the colored overlay

### Field Metadata

All field metadata lives in the annotation's `customData` property:

```typescript
{
  fieldType: "text",       // What kind of field
  roleId: "provider",      // Who can edit it
  fieldName: "patientName", // The field's name in form data
  required: true           // Whether it must be filled
}
```

This is the SDK's built-in mechanism for attaching arbitrary data to annotations. It persists with the document and is available whenever you read the annotation back.

### Role Switching

When the user switches roles, the sample loops through all form fields and sets `readOnly` based on whether the field's `roleId` matches the selected role:

```typescript
// Pseudocode for role switching
for (const field of allFormFields) {
  const widget = getWidgetAnnotation(field);
  const roleId = widget.customData.roleId;
  const isEditable = roleId === selectedRole || roleId === "either";
  await instance.update(field.set("readOnly", !isEditable));
}
```

## Adapting This Sample

This sample uses healthcare roles (Provider/Patient) as a concrete example, but the pattern applies to any domain:

- **Legal:** Attorney / Client / Shared
- **Real estate:** Agent / Buyer / Seller
- **HR:** Manager / Employee / Shared
- **Education:** Teacher / Student / Either

To adapt: update the role definitions in `_lib/roles.ts`, change the colors, and the rest works as-is.

To add more field types: add a new entry to the field palette configuration and a corresponding creation helper in `_lib/fields.ts`. The drag-and-drop and properties panel handle new types automatically.

## Key SDK APIs Used

| API | Purpose |
|-----|---------|
| `NutrientViewer.load({ styleSheets })` | Inject CSS to hide default UI |
| `customRenderers.Annotation()` | Render custom overlays on fields |
| `InteractionMode.FORM_CREATOR` | Enable field placement and editing |
| `transformContentClientToPageSpace()` | Convert drag coordinates to PDF space |
| `instance.create([widget, formField])` | Place a new form field |
| `instance.update(annotation)` | Update field properties and customData |
| `instance.delete(annotationOrFormField)` | Remove a field |
| `instance.getFormFields()` | List all form fields for permission updates |
| `annotation.customData` | Store role, type, name metadata |
| `formField.set("readOnly", boolean)` | Control per-field editability |

## Documentation References

- [Form Creator Mode](https://www.nutrient.io/guides/web/forms/form-creation/)
- [Custom Renderers](https://www.nutrient.io/guides/web/customizing-the-interface/custom-renderers/)
- [Interaction Modes](https://www.nutrient.io/guides/web/customizing-the-interface/interaction-modes/)
- [Form Fields API](https://www.nutrient.io/api/web/classes/NutrientViewer.FormFields.TextFormField.html)
- [Widget Annotations](https://www.nutrient.io/api/web/classes/NutrientViewer.Annotations.WidgetAnnotation.html)
- [StyleSheets Configuration](https://www.nutrient.io/api/web/types/NutrientViewer.Configuration.html)
