# Document Editor Sample - Progress Notes

**Last Updated:** January 8, 2026
**Status:** Phase 3 Complete - Ready for Phase 4 (Apply Operations)
**Meeting:** Next week with customer

---

## ✅ What's Been Completed

### Phase 1: Basic Infrastructure ✅
- [x] Created file structure under `app/web-sdk/document-editor/`
- [x] Implemented headless document loading with `NutrientViewer.load()`
- [x] Generated high-quality thumbnails using `renderPageAsImageURL()` (800px width)
- [x] Side-by-side layout: Source (left) and Target (right) documents
- [x] Each side has thumbnail list + large preview pane
- [x] Integrated Nutrient brand resources CSS (`nutrient-brand.css`)
- [x] Centered layout with 1600px max width
- [x] Loading states and error handling
- [x] License key integration (no watermarks)

**Files Created:**
- `app/web-sdk/document-editor/page.tsx`
- `app/web-sdk/document-editor/viewer.tsx`
- `app/web-sdk/document-editor/_components/PageContextMenu.tsx`
- `app/web-sdk/document-editor/_components/OperationQueue.tsx`

### Phase 2: Operation Queue & Context Menu ✅
- [x] Right-click context menu on target thumbnails
- [x] Three-dot menu button (shows on hover)
- [x] Context menu operations:
  - Move to Top / Move to Bottom
  - Rotate Clockwise / Rotate Counterclockwise
  - Duplicate
  - Delete
- [x] Operation queue panel at bottom
- [x] Queue displays operation descriptions
- [x] Remove individual operations
- [x] Clear all operations button
- [x] Smart menu positioning (opens above when near bottom)

**Design Decision:** Source document is read-only (no context menu on source thumbnails)

### Phase 3: Optimistic UI Updates ✅
- [x] **Delete**: Page removed from list immediately, pages reindexed
- [x] **Rotate**: Pages rotate with CSS transform, smooth 0.3s animation
- [x] **Duplicate**: New page appears immediately with unique key
- [x] **Move**: Pages jump to new position instantly
- [x] All operations update UI immediately while queuing for later application

### Phase 3: Drag & Drop ✅
- [x] Source thumbnails are draggable (cursor: grab)
- [x] Drop zones between each target thumbnail
- [x] Drop zone at end of target list
- [x] Empty state drop zone when target has no pages
- [x] Visual feedback:
  - Dragged item becomes 50% opacity
  - Drop zones turn green (8px tall bar) on drag over
  - Smooth transitions
- [x] **Source → Target**: Moves page (adds to target, removes from source)
  - Queues 2 operations: "Insert to target" + "Remove from source"
- [x] **Target → Target**: Reorders pages within target
- [x] Optimistic updates on drop

---

## 🚧 What's Left to Implement

### Phase 4: Apply Operations (NEXT)
**Priority:** HIGH - Core functionality

**What needs to be done:**
1. Implement `handleApplyOperations()` function
2. Convert `QueuedOperation[]` to Nutrient `DocumentOperation[]` format
3. Sort operations properly:
   - Rotations first (don't affect indexes)
   - Deletes in reverse order (highest index first)
   - Moves/duplicates in order
4. Apply operations to actual documents using:
   ```typescript
   await instance.applyOperations([...documentOps]);
   ```
5. Handle both source and target documents
6. Reload thumbnails after operations applied
7. Clear operation queue on success
8. Error handling and user feedback

**Key APIs to use:**
- `instance.applyOperations(operations: DocumentOperationsUnion[])`
- Operation types:
  - `{ type: "removePages", pageIndexes: [...] }`
  - `{ type: "rotatePages", pageIndexes: [...], rotateBy: 90 }`
  - `{ type: "duplicatePages", pageIndexes: [...], afterPageIndex: N }`
  - `{ type: "movePagesAfter", pageIndexes: [...], afterPageIndex: N }`

**Challenges:**
- Need to load documents non-headless to apply operations
- Must track which operations belong to which document
- Index management: operations change page indexes as they're applied
- May need to export modified documents as ArrayBuffer then reload

### Phase 5: Export & Download
**Priority:** MEDIUM

**What needs to be done:**
1. Add "Export Target" button (source is unmodified so no export needed)
2. Use `instance.exportPDF()` to get ArrayBuffer
3. Create Blob and trigger download
4. Proper filename (e.g., "target-document-modified.pdf")
5. Export progress indicator

**Code pattern:**
```typescript
const arrayBuffer = await instance.exportPDF();
const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
// Trigger download with <a> element
```

### Phase 6: Polish & Enhancement (Optional)
**Priority:** LOW - Nice to have

- [ ] Undo/Redo functionality
- [ ] Keyboard shortcuts (Delete key, Ctrl+Z)
- [ ] Better empty state messaging
- [ ] Loading states during apply
- [ ] Success/error toast notifications
- [ ] Help tooltips
- [ ] Mobile responsive layout (stack vertically)
- [ ] Document selector dropdown (switch source/target documents)
- [ ] Preview zoom controls

---

## 📋 Current State Summary

**What Works:**
- ✅ Load two PDF documents (`text-comparison-a.pdf` and `text-comparison-b.pdf`)
- ✅ Display thumbnails in scrollable lists
- ✅ Click to select and preview pages
- ✅ Drag pages from source to target (moves page)
- ✅ Drag within target to reorder
- ✅ Context menu with all operations (target only)
- ✅ Optimistic UI updates (instant visual feedback)
- ✅ Operation queue displays all queued operations
- ✅ Remove/clear operations from queue
- ✅ Prominent green drop indicators

**What Doesn't Work Yet:**
- ❌ "Apply Operations" button (shows alert, doesn't actually apply)
- ❌ Operations don't modify the actual PDF documents
- ❌ Can't export/download modified documents
- ❌ Can't reset/reload documents

---

## 🎯 Technical Architecture

### Data Flow
```
User Action (drag/context menu)
  ↓
Operation Handler (handleDelete, handleRotate, etc.)
  ↓
Add to Queue + Optimistic UI Update
  ↓
Operations array state updated
  ↓
User clicks "Apply Operations"
  ↓
Convert to DocumentOperation format
  ↓
instance.applyOperations()
  ↓
Reload thumbnails from modified documents
  ↓
Clear queue
```

### Key State Variables
- `sourceDoc`: DocumentState - Source document pages and metadata
- `targetDoc`: DocumentState - Target document pages and metadata
- `operations`: QueuedOperation[] - Queue of pending operations
- `contextMenu`: ContextMenuState - Context menu visibility and position
- `draggedPage`: Drag source information
- `dropTarget`: Current drop zone index

### Important Design Decisions Made

1. **Source is read-only**: No operations on source, only preview and drag to target
2. **Optimistic UI**: All changes visible immediately, operations applied later
3. **Move not copy**: Dragging from source removes page from source
4. **Two operations per cross-document drag**: Insert + Delete queued separately
5. **Page reindexing**: UI maintains continuous page numbering after operations
6. **Unique keys**: Use timestamp + random for duplicated pages

---

## 🔧 Implementation Notes

### Thumbnail Generation
```typescript
const instance = await NutrientViewer.load({
  container: tempContainer,
  document: documentPath,
  headless: true,
  licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
});

const pageInfo = await instance.pageInfoForIndex(pageIndex);
const thumbnailWidth = Math.min(pageInfo.width, 800);
const thumbnailUrl = await instance.renderPageAsImageURL({ width: thumbnailWidth }, pageIndex);
```

### Drag & Drop Pattern
```typescript
// Source: draggable=true, onDragStart, onDragEnd
// Target: draggable=true (for reordering)
// Drop zones: onDragOver (preventDefault!), onDrop, onDragLeave
// Visual: dropTarget state controls green bar indicator
```

### CSS Transforms for Rotation
```typescript
style={{
  transform: `rotate(${page.rotation}deg)`,
  transition: "transform 0.3s ease",
}}
```

---

## 📝 Next Steps for Customer Meeting

### Before Meeting:
1. Review current implementation and test all features
2. Prepare questions about operation application approach
3. Consider whether to use Document Engine API vs Web SDK APIs

### Questions for Customer:
1. Should "Apply Operations" modify documents in place or create new documents?
2. Do we need ability to undo operations after applying?
3. Should we add ability to load custom PDFs (file picker)?
4. Is mobile/tablet support important?
5. Any specific error scenarios to handle?

### After Meeting - Implementation Plan:
1. Implement Phase 4 (Apply Operations)
2. Test with various PDF documents
3. Add export functionality
4. Polish and bug fixes
5. Add to main samples navigation

---

## 🐛 Known Issues / Limitations

1. **Linting warnings**: Some React hooks exhaustive-deps warnings (suppressible)
2. **Accessibility**: Drop zones have interactive handlers without full a11y support
3. **Empty target handling**: Need to test edge case when all pages deleted from target
4. **Operation sequencing**: Complex reorder logic for target→target drags may have bugs
5. **Memory**: Thumbnails kept in memory, could be optimized for large documents

---

## 📚 Key API References

- [Instance.applyOperations()](https://www.nutrient.io/api/web/classes/NutrientViewer.Instance.html#applyoperations)
- [DocumentOperationsUnion Types](https://www.nutrient.io/api/web/types/DocumentOperations.DocumentOperationsUnion.html)
- [Instance.pageInfoForIndex()](https://www.nutrient.io/api/web/classes/NutrientViewer.Instance.html#pageinfoforindex)
- [Instance.renderPageAsImageURL()](https://www.nutrient.io/api/web/)
- [Instance.exportPDF()](https://www.nutrient.io/guides/web/knowledge-base/download-exported-document/)

---

## 🎨 UI/UX Highlights

- **Nutrient Design System**: Using `--disc-pink`, `--data-green`, `--warm-gray-*` variables
- **Visual Consistency**: Source uses pink accents, Target uses green accents
- **Smooth Animations**: 0.3s rotation transitions, 0.2s drop zone transitions
- **Clear Feedback**:
  - 50% opacity on dragged items
  - 8px green bars for drop zones
  - Operation count badge on queue
  - Hover effects on thumbnails

---

## 📦 Git Status

**Committed:**
- ✅ Project rename: "actually-awesome" → "nutrient-sdk-samples"

**Uncommitted (WIP):**
- All document-editor sample files
- Ready to commit after Phase 4 is complete

---

## 🚀 Estimated Remaining Work

- **Phase 4 (Apply Operations)**: 2-3 hours
  - Operation conversion logic: 1 hour
  - Document manipulation & reload: 1-2 hours
  - Testing & debugging: 30 min

- **Phase 5 (Export)**: 30 min - 1 hour
  - Export button UI: 15 min
  - Export logic: 30 min
  - Testing: 15 min

- **Phase 6 (Polish)**: 1-2 hours (optional)
  - Depends on customer feedback

**Total remaining**: ~4-6 hours to completion

---

## 💡 Ideas for Future Enhancements

1. **Batch operations**: Select multiple pages, apply operation to all
2. **Page thumbnails refresh**: After applying, regenerate thumbs from modified doc
3. **Replace pages**: Swap one page for another
4. **Extract pages**: Export individual pages as separate PDFs
5. **Merge multiple documents**: Support 3+ source documents
6. **Page labels**: Custom page numbering (i, ii, iii, 1, 2, 3...)
7. **Crop pages**: Adjust page boundaries
8. **Add blank pages**: Insert empty pages at any position
9. **Split document**: Create multiple output documents from one source
10. **Operation history**: Visual timeline of all operations

---

## 📁 File Structure

```
app/web-sdk/document-editor/
├── page.tsx (25 lines)
│   └── Entry point, SampleHeader, dynamic Viewer import
│
├── viewer.tsx (491 lines) ⭐ MAIN COMPONENT
│   ├── Document loading & thumbnail generation
│   ├── State management (docs, operations, context menu, drag/drop)
│   ├── Operation handlers (delete, rotate, duplicate, move)
│   ├── Drag & drop handlers
│   └── UI rendering (2 panes, queue, context menu)
│
└── _components/
    ├── PageContextMenu.tsx (120 lines)
    │   └── Context menu with operations, keyboard/click-outside close
    │
    └── OperationQueue.tsx (80 lines)
        └── Bottom panel showing queued operations, apply/clear buttons
```

**Total LOC**: ~716 lines (excluding comments/whitespace)

---

## 🔑 Key Code Locations

### Thumbnail Generation
**File:** `viewer.tsx:82-130`
- Headless loading pattern
- `pageInfoForIndex()` for dimensions
- `renderPageAsImageURL()` at 800px width

### Optimistic Updates
**File:** `viewer.tsx:247-411`
- `handleDelete()` - Filters and reindexes
- `handleRotate*()` - Updates rotation state
- `handleDuplicate()` - Inserts with unique key
- `handleMove*()` - Reorders array

### Drag & Drop
**File:** `viewer.tsx:449-556`
- `handleDragStart/End()` - Manages drag state
- `handleDrop()` - Processes drop, updates both docs
- Source→Target: Insert + Delete operations
- Target→Target: Move operation

### Drop Zones
**File:** `viewer.tsx:728-820`
- Between each thumbnail
- After last thumbnail
- Empty state zone
- Green indicator on hover

---

## ⚠️ Important Notes for Implementation

### Operation Sorting
When implementing `applyOperations()`, remember to sort operations:
```typescript
const sorted = [
  ...operations.filter(op => op.type === 'rotate'),
  ...operations.filter(op => op.type === 'delete').reverse(),
  ...operations.filter(op => op.type === 'move' || op.type === 'duplicate'),
];
```

### Index Tracking
After each operation, indexes shift. Current approach tracks this with `originalIndex` and `index` fields. When applying, may need to recalculate based on operation sequence.

### Document Reload Strategy
After applying operations:
1. Get modified document as ArrayBuffer (or keep instance)
2. Generate new thumbnails from modified document
3. Update state with new page arrays
4. Reset selection to page 0
5. Clear operations queue

### Cross-Document Operations
Source→Target operations require:
- Loading source document to extract page
- Inserting into target document
- Removing from source document
- This might require `exportPDF()` → reload approach

---

## 🧪 Testing Checklist

**Manual Testing Completed:**
- [x] Load documents successfully
- [x] Generate thumbnails without watermarks
- [x] Click thumbnails to preview
- [x] Rotate pages (clockwise/counterclockwise)
- [x] Delete pages
- [x] Duplicate pages
- [x] Move to top/bottom
- [x] Drag source→target (moves page)
- [x] Drag within target (reorders)
- [x] Drop zone visual feedback
- [x] Context menu positioning (top/bottom)
- [x] Remove individual operations from queue
- [x] Clear all operations

**Not Yet Tested:**
- [ ] Apply operations button (placeholder only)
- [ ] Export PDF (not implemented)
- [ ] Large documents (50+ pages)
- [ ] Edge cases (delete all pages, etc.)
- [ ] Browser compatibility (Chrome only so far)
- [ ] Mobile/tablet drag-and-drop

---

## 📖 Customer Requirements Summary

From initial discussion:
1. ✅ Two side-by-side panes (Source + Target)
2. ✅ Thumbnail images for each page
3. ✅ Operations: Delete, Copy (Duplicate), Rotate
4. ✅ Reorder pages within document
5. ✅ Drag between documents
6. ✅ Operation queue with review before applying
7. ⏳ Apply operations using Web SDK APIs (not started)
8. ⏳ Download final modified PDF (not started)

**Customer Clarifications:**
- Use smaller sample documents (text-comparison PDFs) ✅
- Source is read-only, operations only on target ✅
- Drag from source should move (not copy) ✅
- Optimistic UI updates (apply immediately in UI) ✅

---

## 🎨 Design System Usage

**Colors:**
- Source accent: `--disc-pink` (hsla(317, 50%, 74%, 1))
- Target accent: `--data-green` (hsla(129, 32%, 57%, 1))
- Backgrounds: `--warm-gray-100`, `--warm-gray-200`
- Borders: `--warm-gray-400`, `--warm-gray-600`
- Text: `--foreground`, `--neutral`
- Error: `--code-coral`

**Components:**
- `.btn .btn-primary` - Apply button
- `.btn .btn-secondary` - Clear button
- Badge with operation count

---

## 🔮 Next Session Action Items

1. **Implement handleApplyOperations()** [viewer.tsx:421-425]
   - Create function to convert QueuedOperation → DocumentOperation
   - Group operations by source document
   - Load documents non-headless
   - Apply operations sequentially
   - Handle errors gracefully

2. **Reload thumbnails after apply**
   - Extract reload logic into separate function
   - Call after successful operation application
   - Show loading state during reload

3. **Add export functionality**
   - Button in OperationQueue component
   - Export target document only (source unchanged)
   - Download with proper filename

4. **Test complete workflow:**
   - Drag pages source→target
   - Rotate/duplicate/delete in target
   - Apply all operations
   - Export final PDF
   - Verify PDF contains all changes

5. **Customer demo prep:**
   - Clean up console logs
   - Remove alert() placeholder
   - Add helpful error messages
   - Test edge cases

---

## 📞 Questions to Ask Customer Next Week

1. **Operation Application:**
   - Should we support "undo" after applying operations?
   - What happens if an operation fails partway through?
   - Should applying operations be reversible?

2. **Use Case:**
   - Will users typically merge many documents or just 2?
   - Do we need to support very large documents (100+ pages)?
   - Should source document be reloadable after pages are moved?

3. **Features:**
   - Do we need ability to extract pages (export subset)?
   - Should we add page cropping/resizing?
   - Any need for annotations/comments on pages?

4. **Deployment:**
   - Will this be standalone or integrated into larger app?
   - Any specific browser/device requirements?
   - Performance targets?

---

## 🎓 Lessons Learned

1. **Optimistic updates improve UX**: Instant feedback is much better than waiting for server
2. **Unique keys are critical**: Duplicating pages requires careful key management
3. **Drop zone visibility matters**: Prominent indicators (8px green bars) are clearer than subtle hints
4. **Context menu positioning**: Must check viewport bounds to avoid clipping
5. **Read-only source simplifies UX**: Removing operations from source clarifies the workflow
6. **Drag-and-drop is finicky**: Need careful event handling (preventDefault, stopPropagation)
7. **Nutrient brand CSS**: Clean, professional look with minimal custom styling

---

## 📌 Remember for Next Session

- The source document should remain unchanged in the final PDF
- Target document is the output that gets all the modifications
- Operations queue is just for tracking - actual work happens on "Apply"
- Current UI state is optimistic - doesn't match actual document state until applied
- May need to refactor if applying operations requires different approach than expected

---

**Status:** Ready for Phase 4 implementation next week! 🚀
