# Simple Signing Demo - Implementation Plan

## Current Status (as of 2026-01-09)

### ✅ Completed
1. **Custom Menu Interface** - Fully working at `/web-sdk/custom-menu`
   - Custom vertical toolbar with annotation tools
   - Document comparison and measurement features
   - Properly styled with Nutrient brand guidelines
   - Successfully deployed to Vercel

2. **Simple Signing Demo - Foundation** at `/web-sdk/simple-signing-demo`
   - Basic page.tsx with SampleHeader
   - Minimal viewer.tsx loading blank.pdf
   - Basic styles.css
   - Clean architecture following standard sample patterns
   - Listed in Web SDK samples page (Signatures category)

### 🚧 Remaining Work

The Simple Signing Demo needs these features added to match the original:

## Phase 1: Core Layout & Sidebar (Priority: HIGH)

### Files to Create/Modify
- `app/web-sdk/simple-signing-demo/viewer.tsx` - Main viewer with sidebar
- `app/web-sdk/simple-signing-demo/styles.css` - Add sidebar and component styles
- `app/web-sdk/simple-signing-demo/_lib/types.ts` - TypeScript interfaces

### Requirements
1. **Two-column layout**:
   ```
   ┌─────────────┬────────────────────┐
   │  Sidebar    │   PDF Viewer       │
   │  (256px)    │   (flex: 1)        │
   │             │                    │
   │  - User     │                    │
   │  - Signers  │                    │
   │  - Fields   │                    │
   │  - Sign Btn │                    │
   └─────────────┴────────────────────┘
   ```

2. **User Selector Component**
   - Dropdown with Admin + 2 default signers
   - Changes current user role
   - Shows/hides editor UI based on role

3. **Signers List Component**
   - Display list of signers with color indicators
   - "+ Add New" button to prompt for name/email
   - Delete button (X) for each signer
   - Highlight selected signer for field assignment

### Implementation Notes
- Use `display: flex` with `flex-direction: row` for main container
- Sidebar: `width: 256px; flex-shrink: 0; overflow-y: auto;`
- Viewer: `flex: 1; min-height: 600px;`
- Add wrapper div with `style={{ height: "100%" }}` to ensure dimensions

### Reference Code Locations
- Original sidebar: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/app/signingDemo.tsx` lines 737-982
- User management: lines 302-400
- Layout structure: lines 909-1065 (from old attempt, but layout was problematic)

## Phase 2: Drag-and-Drop Form Fields (Priority: HIGH)

### Files to Create/Modify
- `app/web-sdk/simple-signing-demo/viewer.tsx` - Add drag handlers
- `app/web-sdk/simple-signing-demo/_lib/helpers.ts` - Drag/drop utilities

### Requirements
1. **Draggable Field Types**:
   - Name (text annotation)
   - Signature (widget + signature form field)
   - Initial (widget + signature form field)
   - Date (text annotation with current date)
   - Digital Signature (widget for DWS signing)

2. **Drag Implementation**:
   - `onDragStart`: Encode signer info + field type in dataTransfer
   - `onDragEnd`: Reset opacity
   - `handleDrop` on viewer:
     - Parse drag data
     - Transform client coords to page coords using `instance.transformContentClientToPageSpace()`
     - Create annotation with customData (signerID, signerEmail, type, color)
     - Apply permissions (readOnly based on current user)

3. **Field Rendering**:
   - Color-coded background based on assigned signer
   - Custom labels ("Sign", "Initial", "Date")
   - Icon indicators for field types

### Reference Code Locations
- Original drag/drop: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/app/signingDemo.tsx` lines 89-265
- Form-designer sample: `/app/web-sdk/form-designer/viewer.tsx` lines 150-250
- Custom renderers: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/utils/helpers.tsx`

### Key Patterns
```typescript
// Drag data format: "name%email%instantId%type"
const data = `${signer.name}%${signer.email}%${id}%${type}`;
event.dataTransfer.setData("text", data);

// Drop handler
const [name, email, instantId, type] = event.dataTransfer.getData("text").split("%");
const coords = instance.transformContentClientToPageSpace({...});

// Create widget annotation
const annotation = new NutrientViewer.Annotations.WidgetAnnotation({
  pageIndex,
  boundingBox: new NutrientViewer.Geometry.Rect({...}),
  formFieldName: instantId,
  customData: { signerID, signerEmail, type, signerColor },
});

// Create form field
const field = new NutrientViewer.FormFields.SignatureFormField({
  name: instantId,
  annotationIds: new NutrientViewer.Immutable.List([instantId]),
});
```

## Phase 3: Annotation Permissions (Priority: MEDIUM)

### Files to Modify
- `app/web-sdk/simple-signing-demo/viewer.tsx` - User change logic

### Requirements
1. **Permission Logic**:
   - When user changes, fetch all form fields
   - Set `readOnly: true` for fields NOT assigned to current user
   - Set `readOnly: false` for fields assigned to current user
   - Check customData.signerID to determine ownership

2. **Role-Based Behavior**:
   - **Editor (Admin)**: Can place fields, see sidebar, use FORM_CREATOR mode
   - **Signer**: Can only sign their fields, sidebar hidden, PAN mode only

### Reference Code
- User switching: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/app/signingDemo.tsx` lines 351-400
- Permission docs: https://www.nutrient.io/guides/web/annotations/create-edit-and-remove/permissions/

### Key Pattern
```typescript
const userChange = async (user: User) => {
  const formFields = await instance.getFormFields();

  for (const field of formFields) {
    const widgets = await instance.getAnnotations(0); // check all pages
    const widget = widgets.find(w => w.formFieldName === field.name);

    const isUserField = widget?.customData?.signerID === user.id;
    const updated = field.set("readOnly", !isUserField);
    await instance.update(updated);
  }

  // Update interaction mode
  if (user.role === "Editor") {
    instance.setViewState(vs => vs.set("interactionMode", FORM_CREATOR));
  } else {
    instance.setViewState(vs => vs.set("interactionMode", PAN));
  }
};
```

## Phase 4: Digital Signing Integration (Priority: MEDIUM)

### Files to Modify
- `app/web-sdk/simple-signing-demo/viewer.tsx` - Add sign button handler

### Requirements
1. **Button in Sidebar**: "Apply Digital Signature"
2. **Signing Flow**:
   - Export current PDF: `instance.exportPDF()`
   - Fetch signature logo image
   - Create FormData with PDF + image
   - POST to `/api/sign-document-web-sdk-dws/api/token` for JWT
   - Call `instance.signDocument()` with token
   - Show loading state during signing
   - Display success/error message

### Reference Code
- Original: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/app/signingDemo.tsx` lines 694-728
- Existing sample: `/app/api/sign-document-web-sdk-dws/viewer.tsx` lines 100-200

### API Endpoints (Already Exist)
- Token: `/api/sign-document-web-sdk-dws/api/token` (POST)
- Certificates: `/api/sign-document-web-sdk-dws/api/certificates` (GET)

## Phase 5: Custom Annotation Rendering (Priority: LOW)

### Files to Create
- `app/web-sdk/simple-signing-demo/_lib/helpers.ts` - Custom renderers

### Requirements
1. **Before Signing**: Show colored box with label and icon
2. **After Signing**: Show signature with "By Nutrient" label and ID
3. **Custom CSS**: Corner brackets, labels, styling

### Reference
- `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/utils/helpers.tsx`
- `/Users/jonaddamsnutrient/SE/code/signing-demo-lite/public/viewer.css`

## Critical Implementation Guidelines

### ✅ DO
- Use Tailwind classes for layout (`flex`, `w-64`, `flex-1`, etc.)
- Keep viewer.tsx under 400 lines - extract components as needed
- Test incrementally after each feature addition
- Use existing DWS API endpoints (don't create new ones)
- Follow patterns from `custom-menu` and `form-designer` samples
- Add TypeScript types for everything (no `any`)
- Use Nutrient brand CSS variables

### ❌ DON'T
- Port all 1000+ lines at once
- Use Baseline UI components
- Use inline styles - use CSS classes
- Use `position: fixed` or `position: absolute` for layout
- Create nested buttons
- Skip TypeScript typing

## File Structure

```
app/web-sdk/simple-signing-demo/
├── page.tsx                    ✅ Done
├── viewer.tsx                  🚧 Needs sidebar + features
├── styles.css                  🚧 Needs component styles
├── README.md                   ✅ Done
├── IMPLEMENTATION_PLAN.md      ✅ This file
├── _lib/
│   ├── types.ts               ✅ Done (basic)
│   └── helpers.ts             ⬜ To create
└── _components/
    ├── Sidebar.tsx            ⬜ To create
    ├── UserSelector.tsx       ⬜ To create
    ├── SignersList.tsx        ⬜ To create
    └── DraggableFields.tsx    ⬜ To create
```

## Testing Checklist

### Phase 1 Testing
- [ ] Sidebar appears on left (256px width)
- [ ] Viewer on right with PDF loaded
- [ ] User dropdown shows Admin + 2 signers
- [ ] Selecting user updates state
- [ ] Can add new signer via prompt
- [ ] Can delete signer (shows X on hover)

### Phase 2 Testing
- [ ] Can drag Name field onto PDF
- [ ] Can drag Signature field onto PDF
- [ ] Can drag Initial field onto PDF
- [ ] Can drag Date field onto PDF
- [ ] Fields show signer color
- [ ] Fields positioned correctly at drop location

### Phase 3 Testing
- [ ] Switch to Signer 1 - only their fields editable
- [ ] Switch to Signer 2 - only their fields editable
- [ ] Switch to Admin - can place new fields
- [ ] Other users' fields are read-only

### Phase 4 Testing
- [ ] "Apply Digital Signature" button visible
- [ ] Clicking button shows loading spinner
- [ ] JWT token fetched successfully
- [ ] Document signed via instance.signDocument()
- [ ] Signature validation banner appears

## Known Issues from Previous Attempt

### Layout Problems (FIXED in minimal version)
- ❌ Sidebar was expanding to full width
- ❌ Viewer appearing below sidebar instead of beside
- ❌ Draggable fields rendering as tiny green bars
- ✅ Solution: Started fresh with clean flex layout

### State Management Issues (AVOID)
- ❌ Using state before initialization
- ❌ Missing null checks on user objects
- ❌ useEffect dependency errors
- ✅ Solution: Initialize with defaults, proper null checks

## Quick Start for Next Session

1. **Pull latest**: `git pull origin main`
2. **Current commit**: `1d62969 Add README for simple-signing-demo`
3. **Start with**: Add Sidebar component to viewer.tsx
4. **Reference**: Screenshot at signing-demo-baseline-one.vercel.app
5. **Test URL**: http://localhost:3000/web-sdk/simple-signing-demo

## Resources

### Original Sample
- Path: `/Users/jonaddamsnutrient/SE/code/signing-demo-lite`
- Main component: `app/signingDemo.tsx` (1082 lines)
- Types: `utils/types.ts`
- Helpers: `utils/helpers.tsx`
- Styles: `public/viewer.css` + `app/globals.css`

### Existing Patterns
- Drag-drop: `/app/web-sdk/form-designer/viewer.tsx`
- Digital signing: `/app/api/sign-document-web-sdk-dws/viewer.tsx`
- Custom toolbar: `/app/web-sdk/custom-menu/viewer.tsx`

### Documentation
- Annotation permissions: https://www.nutrient.io/guides/web/annotations/create-edit-and-remove/permissions/
- Form fields: https://www.nutrient.io/guides/web/forms/form-fields/
- Digital signatures: https://www.nutrient.io/guides/web/features/digital-signatures/

## Environment
- Node.js with Next.js 16.1.1
- Nutrient Web SDK 1.10.0 (via CDN)
- TypeScript with strict mode
- Biome for linting
- Running on http://localhost:3000

## Notes
- The minimal viewer is working perfectly - no errors
- Build incrementally, test after each feature
- Commit frequently with descriptive messages
- Use the reference screenshot for UI guidance
