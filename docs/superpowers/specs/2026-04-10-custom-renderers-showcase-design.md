# Custom Renderers Showcase — Design Spec

**Date:** 2026-04-10
**Sample path:** `app/web-sdk/custom-renderers/`

## Purpose

Demonstrate the Nutrient Web SDK `customRenderers.Annotation` API with 16 creative, attention-getting renderer examples organized by category. Most customers don't know about custom renderers, and existing samples only cover the common case (signature overlays). This sample pushes boundaries to show that anything describable as a DOM node can be rendered as an annotation.

## File Structure

| File | Purpose |
|------|---------|
| `app/web-sdk/custom-renderers/page.tsx` | Standard page wrapper: `SampleHeader`, dynamic import, no SSR |
| `app/web-sdk/custom-renderers/viewer.tsx` | Main component: viewer init, sidebar, tab state, annotation lifecycle |
| `app/web-sdk/custom-renderers/renderers.ts` | 16 pure render functions, one per renderer type |
| `public/custom-renderers.css` | Keyframe animations and styles too complex for inline |

## Layout

Sidebar (left) + PDF viewer (right), consistent with form-designer and simple-signing-demo samples.

**Sidebar contents:**
- Brief intro text explaining the sample
- 4 category tabs, one active at a time (default: "Visual Effects")
- Each tab shows category name and renderer count (e.g. "Visual Effects (4)")
- Active tab is highlighted

**PDF viewer:** Loads an existing document (`annual-report.pdf`). Annotations for the active category are placed on page 0.

## Renderer Dispatch

The `customRenderers.Annotation` callback routes to the correct render function based on `annotation.customData.rendererType`:

```typescript
customRenderers: {
  Annotation: ({ annotation }) => {
    const rendererType = annotation.customData?.rendererType;
    if (!rendererType) return null;
    const renderFn = rendererMap[rendererType];
    return renderFn ? renderFn(annotation) : null;
  }
}
```

`rendererMap` is a `Record<string, RenderFunction>` imported from `renderers.ts`.

## Annotation Data Model

All custom annotations are created programmatically via `instance.create()` with this `customData` shape:

```typescript
customData: {
  rendererType: string;   // key into rendererMap
  category: string;       // tab grouping
  // ...renderer-specific props (text, color, values, etc.)
}
```

Annotation base type: `StampAnnotation` or `NoteAnnotation` — types with a visible bounding box region.

## Category Tabs & Annotation Lifecycle

When a tab is clicked:

1. Remove all existing annotations that have `rendererType` in `customData`
2. Create the set of annotations for the selected category, pre-positioned on page 0
3. `customRenderers.Annotation` callback renders them automatically

Only one category visible at a time. Native document annotations are never touched.

## Renderer Specifications

### Visual Effects

**Neon Signs**
- DOM: Glowing text with layered CSS `text-shadow` + flicker keyframe animation
- `append: true`
- `customData`: `{ text, color }`
- Dark background container

**Holographic Foil**
- DOM: Div with animated `linear-gradient` background (`background-size: 300%`) + shimmer keyframe
- `append: true`
- Checkmark + "VERIFIED AUTHENTIC" text
- Iridescent rainbow color shift

**Glassmorphism**
- DOM: Div with `backdrop-filter: blur()`, semi-transparent background, subtle border
- `append: true`
- `customData`: `{ text }` — displays as a frosted floating note
- Shows PDF content through the blur

**3D Transforms**
- DOM: `perspective` parent with `transform: rotateX/Y` child + CSS hover transition
- `append: true`
- "CONFIDENTIAL" stamp that tilts with depth
- Pure CSS, no JS event listeners

### Animated

**Attention Callouts**
- DOM: Pulsing ring via `box-shadow` keyframe + inner label text
- `append: true`
- `customData`: `{ text }` — "Sign Here", "Review", etc.
- Breathing glow effect

**Confetti**
- DOM: Container with ~15 absolutely-positioned spans, randomized `animation-delay`/`animation-duration` for falling + rotating
- `append: true`
- Milestone/celebration text in center

**Matrix Rain**
- DOM: Dark container with multiple character columns animating `translateY` with staggered delays
- `append: false` — replaces annotation, handles own pointer events
- "CLASSIFIED" / "DECRYPTING..." overlay text
- Pure CSS animation, no canvas

**Aquarium**
- DOM: Container with CSS-animated fish emoji, swaying seaweed divs, rising bubble divs
- `append: true`
- Purely decorative, calm animation speeds
- Ocean gradient background

### Data & Status

**Data Viz**
- DOM: Div-based bar chart or sparkline built from data array
- `append: true`
- `customData`: `{ values: number[], label: string }`
- Trend direction indicator

**Approval Badges**
- DOM: Flex row with initials avatar, name, status text, timestamp, colored status icon
- `append: true`
- `customData`: `{ name, status: "approved"|"pending"|"rejected", timestamp }`
- Green/yellow/red color coding

**Interactive Widgets**
- DOM: Star rating (clickable spans toggling fill) + countdown timer via `setInterval`
- `append: false` — needs pointer events for star clicks
- `customData`: `{ deadline: string, rating: number }`
- Clean up interval in `onDisappear` callback

**Retro Pixel**
- DOM: Grid of small divs forming pixel-art icon + chunky health-bar progress indicator
- `append: true`
- `customData`: `{ progress: number }`
- Monospace font, dark retro background

### Creative

**Comic Bubbles**
- DOM: Speech bubble with CSS triangle tail, bold outline, optional "POW!" burst
- `append: true`
- `customData`: `{ text }`
- Ben-Day dots via `radial-gradient` background

**Scratch-Off**
- DOM: Canvas element with silver gradient overlay. `pointermove` listener composites `destination-out` to erase foil
- `append: false` — needs pointer events for scratch interaction
- `customData`: `{ revealText }`
- Hidden text revealed as user scratches

**Rich Media**
- DOM: Fake video player — thumbnail area, play/pause button, progress bar, time display
- `append: false` — pointer events for play/pause toggle
- `customData`: `{ title }`
- Visual-only, no actual video playback

**Mini-Game**
- DOM: Canvas-based Breakout — paddle follows pointer, ball bounces, colored bricks
- `append: false` — full pointer control
- `requestAnimationFrame` game loop
- Clean up animation frame in `onDisappear`

## Cross-Cutting Patterns

- **`append: false` renderers** (Matrix, Interactive Widgets, Scratch-Off, Rich Media, Mini-Game): include `onDisappear` for cleanup and add `pointerdown` listener for annotation selection
- **CSS animations** live in `custom-renderers.css`, keeping render functions focused on DOM construction
- **Each render function** is 30-80 lines, self-contained, no shared state between renderers
- **DOM node uniqueness**: every call creates a fresh DOM node — never reuse across annotations

## Sample Registration

Add entry to the samples list in `app/web-sdk/page.tsx`:

```typescript
{
  name: "Custom Renderers",
  category: "Annotations",
  description: "Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more",
  path: "/web-sdk/custom-renderers",
}
```
