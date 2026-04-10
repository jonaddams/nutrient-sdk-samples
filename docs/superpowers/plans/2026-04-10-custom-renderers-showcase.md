# Custom Renderers Showcase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web SDK sample that demonstrates 16 creative custom annotation renderers organized in 4 category tabs, showcasing the full power of the `customRenderers.Annotation` API.

**Architecture:** Sidebar with category tabs controls which annotations are visible on a PDF. Each tab creates/removes `NoteAnnotation`s with `customData.rendererType`. A single `customRenderers.Annotation` callback dispatches to pure render functions in a separate file. All CSS animations live in a dedicated stylesheet.

**Tech Stack:** Next.js (App Router), React, Nutrient Web SDK (`@nutrient-sdk/viewer`), CSS animations/keyframes

---

## File Structure

| File | Responsibility |
|------|---------------|
| `app/web-sdk/custom-renderers/page.tsx` | Page wrapper — SampleHeader, dynamic import, no SSR |
| `app/web-sdk/custom-renderers/viewer.tsx` | Main component — viewer init, sidebar UI, tab state, annotation creation/removal |
| `app/web-sdk/custom-renderers/renderers.ts` | 16 pure render functions + `rendererMap` export + shared types |
| `public/custom-renderers.css` | All keyframe animations and complex styles |

---

### Task 1: Page wrapper and CSS scaffold

**Files:**
- Create: `app/web-sdk/custom-renderers/page.tsx`
- Create: `public/custom-renderers.css`

- [ ] **Step 1: Create `page.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const CustomRenderersViewer = dynamic(
  () => import("@/app/web-sdk/custom-renderers/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading custom renderers..." />,
  },
);

export default function CustomRenderersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Custom Renderers"
        description="Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more"
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <main className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <CustomRenderersViewer />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `public/custom-renderers.css` with all keyframe animations**

This file contains every keyframe animation used by the 16 renderers. Creating it upfront so renderers can reference these class names.

```css
/* =============================================
   Custom Renderers Showcase — Animations & Styles
   ============================================= */

/* --- Visual Effects --- */

/* Neon Signs: flickering glow */
@keyframes neon-flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
  20%, 24%, 55% { opacity: 0.5; }
}

.renderer-neon-sign {
  background: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.renderer-neon-sign span {
  font-family: cursive, sans-serif;
  font-weight: bold;
  animation: neon-flicker 3s infinite alternate;
}

/* Holographic Foil: rainbow shimmer */
@keyframes hologram-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.renderer-hologram {
  background: linear-gradient(
    135deg, #667eea, #764ba2, #f093fb, #4facfe, #43e97b, #fbc2eb, #667eea
  );
  background-size: 300% 300%;
  animation: hologram-shift 4s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.renderer-hologram span {
  color: white;
  font-weight: bold;
  font-size: 14px;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Glassmorphism: frosted glass */
.renderer-glass {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  color: #1e293b;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 3D Transforms: tilted stamp */
.renderer-3d-stamp-wrapper {
  perspective: 400px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.renderer-3d-stamp {
  padding: 10px 24px;
  background: linear-gradient(135deg, #dc2626, #991b1b);
  color: white;
  font-weight: bold;
  font-size: 16px;
  letter-spacing: 3px;
  border: 3px solid #7f1d1d;
  transform: rotateX(15deg) rotateY(-8deg);
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.25);
  transition: transform 0.3s ease;
}

/* --- Animated --- */

/* Attention Callouts: pulsing glow */
@keyframes attention-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50% { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
}

.renderer-callout {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #f59e0b;
  border-radius: 24px;
  animation: attention-pulse 1.8s ease-in-out infinite;
  background: rgba(245, 158, 11, 0.08);
}

.renderer-callout span {
  color: #d97706;
  font-weight: 600;
  font-size: 14px;
}

/* Confetti: falling particles */
@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
}

.renderer-confetti {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #faf5ff, #fdf2f8);
  border-radius: 8px;
}

.renderer-confetti .confetti-piece {
  position: absolute;
  top: -5px;
  animation: confetti-fall linear infinite;
}

.renderer-confetti .confetti-text {
  position: relative;
  z-index: 1;
  font-weight: bold;
  color: #6366f1;
  font-size: 14px;
}

/* Matrix Rain: falling characters */
@keyframes matrix-fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.renderer-matrix {
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
}

.renderer-matrix .matrix-column {
  position: absolute;
  top: 0;
  color: #00ff41;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  line-height: 1.2;
  writing-mode: vertical-lr;
  animation: matrix-fall linear infinite;
  opacity: 0.7;
}

.renderer-matrix .matrix-overlay {
  position: relative;
  z-index: 1;
  color: #00ff41;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 0 0 10px #00ff41;
  letter-spacing: 2px;
}

/* Aquarium: swaying seaweed, swimming fish, rising bubbles */
@keyframes seaweed-sway {
  from { transform: rotate(-5deg); }
  to { transform: rotate(5deg); }
}

@keyframes fish-swim {
  from { left: -40px; }
  to { left: calc(100% + 40px); }
}

@keyframes fish-swim-reverse {
  from { right: -40px; }
  to { right: calc(100% + 40px); }
}

@keyframes bubble-rise {
  0% { transform: translateY(0); opacity: 0.6; }
  100% { transform: translateY(-50px); opacity: 0; }
}

.renderer-aquarium {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1a4a6b, #0d2f4a, #0a1f30);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.renderer-aquarium .seaweed {
  position: absolute;
  bottom: 0;
  border-radius: 50% 50% 0 0;
  transform-origin: bottom;
  animation: seaweed-sway ease-in-out infinite alternate;
}

.renderer-aquarium .fish {
  position: absolute;
  font-size: 20px;
  animation: fish-swim linear infinite;
}

.renderer-aquarium .fish.reverse {
  animation-name: fish-swim-reverse;
  animation-direction: reverse;
}

.renderer-aquarium .bubble {
  position: absolute;
  bottom: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: bubble-rise ease-in infinite;
}

/* --- Data & Status --- */

/* Data Viz: bar chart */
.renderer-dataviz {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.renderer-dataviz .dataviz-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
}

.renderer-dataviz .dataviz-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  flex: 1;
}

.renderer-dataviz .dataviz-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 2px 2px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.renderer-dataviz .dataviz-bar.highlight {
  background: #10b981;
}

.renderer-dataviz .dataviz-trend {
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
  text-align: right;
}

/* Approval Badges */
.renderer-badge {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid;
}

.renderer-badge .badge-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
}

.renderer-badge .badge-info {
  flex: 1;
  min-width: 0;
}

.renderer-badge .badge-name {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
}

.renderer-badge .badge-meta {
  font-size: 11px;
  color: #64748b;
}

.renderer-badge .badge-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* Interactive Widgets: stars + timer */
.renderer-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  cursor: pointer;
}

.renderer-widget .widget-stars {
  display: flex;
  gap: 2px;
  font-size: 22px;
  cursor: pointer;
}

.renderer-widget .widget-stars .star {
  cursor: pointer;
  transition: color 0.15s;
  user-select: none;
}

.renderer-widget .widget-stars .star.filled {
  color: #facc15;
}

.renderer-widget .widget-stars .star.empty {
  color: #cbd5e1;
}

.renderer-widget .widget-timer {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 4px;
}

/* Retro Pixel Art */
.renderer-retro {
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  image-rendering: pixelated;
}

.renderer-retro .retro-icon {
  display: grid;
  gap: 1px;
}

.renderer-retro .retro-icon .pixel {
  width: 5px;
  height: 5px;
}

.renderer-retro .retro-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.renderer-retro .retro-text {
  color: #4ade80;
  font-size: 12px;
  font-weight: bold;
}

.renderer-retro .retro-bar {
  display: flex;
  gap: 2px;
}

.renderer-retro .retro-bar .bar-segment {
  width: 10px;
  height: 7px;
}

.renderer-retro .retro-bar .bar-segment.filled {
  background: #ef4444;
}

.renderer-retro .retro-bar .bar-segment.empty {
  background: #334155;
}

/* --- Creative --- */

/* Comic Bubbles: speech bubble + pop art */
.renderer-comic {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.renderer-comic .comic-bubble {
  position: relative;
  background: white;
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 8px 8px;
  border: 3px solid black;
  border-radius: 20px;
  padding: 8px 16px;
  font-family: 'Comic Sans MS', cursive, sans-serif;
  font-weight: bold;
  font-size: 14px;
  max-width: 90%;
}

.renderer-comic .comic-bubble .comic-tail {
  position: absolute;
  bottom: -12px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid black;
}

.renderer-comic .comic-bubble .comic-tail-inner {
  position: absolute;
  bottom: -8px;
  left: 22px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid white;
}

/* Scratch-Off */
.renderer-scratch {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
}

.renderer-scratch .scratch-reveal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fefce8;
  font-weight: bold;
  color: #854d0e;
  font-size: 16px;
  padding: 8px;
  text-align: center;
}

.renderer-scratch canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Rich Media: fake video player */
.renderer-media {
  width: 100%;
  height: 100%;
  background: #0f172a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}

.renderer-media .media-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #1e293b, #0f172a);
}

.renderer-media .media-play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.renderer-media .media-play-btn .play-triangle {
  width: 0;
  height: 0;
  border-left: 16px solid white;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  margin-left: 4px;
}

.renderer-media .media-controls {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: #1e293b;
}

.renderer-media .media-progress {
  flex: 1;
  height: 4px;
  background: #334155;
  border-radius: 2px;
  overflow: hidden;
}

.renderer-media .media-progress-fill {
  height: 100%;
  background: #8b5cf6;
  border-radius: 2px;
  width: 35%;
}

.renderer-media .media-time {
  color: #94a3b8;
  font-size: 10px;
  font-family: monospace;
}

/* Mini-Game: Breakout */
.renderer-game {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  cursor: none;
}

.renderer-game canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

- [ ] **Step 3: Verify the page loads**

Run: `cd /Users/jonaddamsnutrient/SE/code/nutrient-sdk-samples && npm run dev`

Navigate to `http://localhost:3000/web-sdk/custom-renderers` — should show the header and loading spinner (viewer.tsx doesn't exist yet so it will error after loading, but the page route works).

- [ ] **Step 4: Commit**

```bash
git add app/web-sdk/custom-renderers/page.tsx public/custom-renderers.css
git commit -m "feat(custom-renderers): add page wrapper and CSS animations scaffold"
```

---

### Task 2: Renderers — Visual Effects group (4 renderers)

**Files:**
- Create: `app/web-sdk/custom-renderers/renderers.ts`

- [ ] **Step 1: Create `renderers.ts` with types, rendererMap, and Visual Effects renderers**

```typescript
// Types
type RendererResult = {
  node: HTMLElement;
  append: boolean;
  onDisappear?: () => void;
};

type RenderFunction = (annotation: any) => RendererResult | null;

// --- Visual Effects ---

function renderNeonSign(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "APPROVED";
  const color = annotation.customData?.color || "#ff6ec7";

  const node = document.createElement("div");
  node.className = "renderer-neon-sign";
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText = `
    color: ${color};
    text-shadow: 0 0 7px ${color}, 0 0 20px ${color}, 0 0 42px ${color}, 0 0 82px ${color};
    font-size: 20px;
  `;
  node.appendChild(span);

  return { node, append: true };
}

function renderHologram(annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-hologram";
  const span = document.createElement("span");
  span.textContent = "\u2713 VERIFIED AUTHENTIC";
  node.appendChild(span);

  return { node, append: true };
}

function renderGlassmorphism(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "Review note";

  const node = document.createElement("div");
  node.className = "renderer-glass";
  node.textContent = "\uD83D\uDCAC " + text;

  return { node, append: true };
}

function render3DStamp(annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-3d-stamp-wrapper";
  const stamp = document.createElement("div");
  stamp.className = "renderer-3d-stamp";
  stamp.textContent = "CONFIDENTIAL";
  node.appendChild(stamp);

  return { node, append: true };
}

// --- Renderer Map (will grow in subsequent tasks) ---

export const rendererMap: Record<string, RenderFunction> = {
  "neon-sign": renderNeonSign,
  "hologram": renderHologram,
  "glassmorphism": renderGlassmorphism,
  "3d-stamp": render3DStamp,
};
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/custom-renderers/renderers.ts
git commit -m "feat(custom-renderers): add Visual Effects renderers (neon, hologram, glass, 3D)"
```

---

### Task 3: Renderers — Animated group (4 renderers)

**Files:**
- Modify: `app/web-sdk/custom-renderers/renderers.ts`

- [ ] **Step 1: Add Animated renderers to `renderers.ts`**

Add these functions above the `rendererMap` export, and add their entries to the map.

```typescript
// --- Animated ---

function renderCallout(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "Sign Here";

  const node = document.createElement("div");
  node.className = "renderer-callout";
  const span = document.createElement("span");
  span.textContent = "\u270E " + text;
  node.appendChild(span);

  return { node, append: true };
}

function renderConfetti(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "MILESTONE REACHED";
  const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6ec7", "#a78bfa"];
  const shapes = ["\u25A0", "\u25B2", "\u25CF", "\u2666", "\u2736"];

  const node = document.createElement("div");
  node.className = "renderer-confetti";

  // Create 15 confetti pieces with randomized properties
  for (let i = 0; i < 15; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.textContent = shapes[i % shapes.length];
    piece.style.cssText = `
      left: ${5 + Math.random() * 90}%;
      color: ${colors[i % colors.length]};
      font-size: ${8 + Math.random() * 8}px;
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 2}s;
    `;
    node.appendChild(piece);
  }

  const label = document.createElement("div");
  label.className = "confetti-text";
  label.textContent = "\uD83C\uDF89 " + text;
  node.appendChild(label);

  return { node, append: true };
}

function renderMatrix(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "CLASSIFIED";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*";

  const node = document.createElement("div");
  node.className = "renderer-matrix";

  // Create 12 falling character columns
  for (let i = 0; i < 12; i++) {
    const col = document.createElement("div");
    col.className = "matrix-column";
    col.style.cssText = `
      left: ${5 + i * 8}%;
      animation-duration: ${2 + Math.random() * 3}s;
      animation-delay: ${Math.random() * 2}s;
      font-size: ${8 + Math.random() * 4}px;
      opacity: ${0.3 + Math.random() * 0.5};
    `;
    // Random string of characters
    let colText = "";
    for (let j = 0; j < 15; j++) {
      colText += chars[Math.floor(Math.random() * chars.length)];
    }
    col.textContent = colText;
    node.appendChild(col);
  }

  const overlay = document.createElement("div");
  overlay.className = "matrix-overlay";
  overlay.textContent = text;
  node.appendChild(overlay);

  // Handle selection for append:false
  node.addEventListener("pointerdown", (e) => {
    e.stopImmediatePropagation();
  }, { capture: true });

  return { node, append: false };
}

function renderAquarium(annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-aquarium";

  // Seaweed (3 strands)
  const seaweedConfigs = [
    { left: "10%", width: "8px", height: "30px", color: "#1a6b3a", duration: "2s" },
    { left: "18%", width: "6px", height: "40px", color: "#2d8b4e", duration: "2.5s" },
    { left: "75%", width: "7px", height: "35px", color: "#1a6b3a", duration: "3s" },
  ];
  for (const cfg of seaweedConfigs) {
    const sw = document.createElement("div");
    sw.className = "seaweed";
    sw.style.cssText = `
      left: ${cfg.left}; width: ${cfg.width}; height: ${cfg.height};
      background: ${cfg.color}; animation-duration: ${cfg.duration};
    `;
    node.appendChild(sw);
  }

  // Fish (3)
  const fishConfigs = [
    { emoji: "\uD83D\uDC20", top: "20%", duration: "5s", delay: "0s" },
    { emoji: "\uD83D\uDC1F", top: "50%", duration: "7s", delay: "-2s" },
    { emoji: "\uD83D\uDC21", top: "35%", duration: "6s", delay: "-4s" },
  ];
  for (const cfg of fishConfigs) {
    const fish = document.createElement("span");
    fish.className = "fish";
    fish.textContent = cfg.emoji;
    fish.style.cssText = `
      top: ${cfg.top}; animation-duration: ${cfg.duration};
      animation-delay: ${cfg.delay};
    `;
    node.appendChild(fish);
  }

  // Bubbles (4)
  const bubbleConfigs = [
    { left: "30%", size: "6px", duration: "3s", delay: "0s" },
    { left: "55%", size: "4px", duration: "4s", delay: "1s" },
    { left: "40%", size: "5px", duration: "3.5s", delay: "0.5s" },
    { left: "65%", size: "3px", duration: "4.5s", delay: "2s" },
  ];
  for (const cfg of bubbleConfigs) {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.style.cssText = `
      left: ${cfg.left}; width: ${cfg.size}; height: ${cfg.size};
      animation-duration: ${cfg.duration}; animation-delay: ${cfg.delay};
    `;
    node.appendChild(bubble);
  }

  return { node, append: true };
}
```

Add to `rendererMap`:

```typescript
  "callout": renderCallout,
  "confetti": renderConfetti,
  "matrix": renderMatrix,
  "aquarium": renderAquarium,
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/custom-renderers/renderers.ts
git commit -m "feat(custom-renderers): add Animated renderers (callout, confetti, matrix, aquarium)"
```

---

### Task 4: Renderers — Data & Status group (4 renderers)

**Files:**
- Modify: `app/web-sdk/custom-renderers/renderers.ts`

- [ ] **Step 1: Add Data & Status renderers to `renderers.ts`**

Add these functions above the `rendererMap` export, and add their entries to the map.

```typescript
// --- Data & Status ---

function renderDataViz(annotation: any): RendererResult | null {
  const values: number[] = annotation.customData?.values || [40, 60, 35, 80, 55, 90];
  const label: string = annotation.customData?.label || "Q1-Q4 Revenue";

  const maxVal = Math.max(...values);
  const node = document.createElement("div");
  node.className = "renderer-dataviz";

  const labelEl = document.createElement("div");
  labelEl.className = "dataviz-label";
  labelEl.textContent = label;
  node.appendChild(labelEl);

  const barsContainer = document.createElement("div");
  barsContainer.className = "dataviz-bars";
  values.forEach((val, i) => {
    const bar = document.createElement("div");
    bar.className = "dataviz-bar" + (i === values.length - 1 ? " highlight" : "");
    bar.style.height = `${(val / maxVal) * 100}%`;
    barsContainer.appendChild(bar);
  });
  node.appendChild(barsContainer);

  const lastVal = values[values.length - 1];
  const prevVal = values[values.length - 2];
  const trendEl = document.createElement("div");
  trendEl.className = "dataviz-trend";
  if (lastVal >= prevVal) {
    trendEl.style.color = "#10b981";
    trendEl.textContent = "\u25B2 " + Math.round(((lastVal - prevVal) / prevVal) * 100) + "%";
  } else {
    trendEl.style.color = "#ef4444";
    trendEl.textContent = "\u25BC " + Math.round(((prevVal - lastVal) / prevVal) * 100) + "%";
  }
  node.appendChild(trendEl);

  return { node, append: true };
}

function renderApprovalBadge(annotation: any): RendererResult | null {
  const name: string = annotation.customData?.name || "Jane Doe";
  const status: string = annotation.customData?.status || "approved";
  const timestamp: string = annotation.customData?.timestamp || "2m ago";

  const statusConfig: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
    approved: { bg: "#f0fdf4", border: "#86efac", icon: "\u2713", iconColor: "#22c55e" },
    pending: { bg: "#fffbeb", border: "#fde68a", icon: "\u23F3", iconColor: "#f59e0b" },
    rejected: { bg: "#fef2f2", border: "#fca5a5", icon: "\u2717", iconColor: "#ef4444" },
  };
  const cfg = statusConfig[status] || statusConfig.approved;

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const node = document.createElement("div");
  node.className = "renderer-badge";
  node.style.cssText = `background: ${cfg.bg}; border-color: ${cfg.border};`;

  const avatar = document.createElement("div");
  avatar.className = "badge-avatar";
  avatar.style.background = cfg.iconColor;
  avatar.textContent = initials;
  node.appendChild(avatar);

  const info = document.createElement("div");
  info.className = "badge-info";
  const nameEl = document.createElement("div");
  nameEl.className = "badge-name";
  nameEl.textContent = name;
  const meta = document.createElement("div");
  meta.className = "badge-meta";
  meta.textContent = status.charAt(0).toUpperCase() + status.slice(1) + " \u00B7 " + timestamp;
  info.appendChild(nameEl);
  info.appendChild(meta);
  node.appendChild(info);

  const icon = document.createElement("div");
  icon.className = "badge-icon";
  icon.style.color = cfg.iconColor;
  icon.textContent = cfg.icon;
  node.appendChild(icon);

  return { node, append: true };
}

function renderInteractiveWidget(annotation: any): RendererResult | null {
  const initialRating: number = annotation.customData?.rating || 3;
  const deadlineMs: number = annotation.customData?.deadlineMs || (Date.now() + 14 * 24 * 60 * 60 * 1000);

  const node = document.createElement("div");
  node.className = "renderer-widget";

  // Star rating
  let currentRating = initialRating;
  const starsContainer = document.createElement("div");
  starsContainer.className = "widget-stars";

  function updateStars() {
    // Clear existing stars using safe DOM method (no innerHTML)
    starsContainer.replaceChildren();
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.className = "star " + (i <= currentRating ? "filled" : "empty");
      star.textContent = "\u2605";
      star.addEventListener("click", (e) => {
        e.stopPropagation();
        currentRating = i;
        updateStars();
      });
      starsContainer.appendChild(star);
    }
  }
  updateStars();
  node.appendChild(starsContainer);

  // Countdown timer
  const timerEl = document.createElement("div");
  timerEl.className = "widget-timer";
  node.appendChild(timerEl);

  function updateTimer() {
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) {
      timerEl.textContent = "\u23F0 Expired";
      return;
    }
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timerEl.textContent = "\u23F0 " + days + "d " + hours + "h remaining";
  }
  updateTimer();
  const intervalId = setInterval(updateTimer, 60000); // Update every minute

  // Pointer events for append:false
  node.addEventListener("pointerdown", (e) => {
    e.stopImmediatePropagation();
  }, { capture: true });

  return {
    node,
    append: false,
    onDisappear: () => clearInterval(intervalId),
  };
}

function renderRetroPixel(annotation: any): RendererResult | null {
  const progress: number = annotation.customData?.progress ?? 5;
  const total = 7;
  const text = annotation.customData?.text || "COMPLETE!";

  const node = document.createElement("div");
  node.className = "renderer-retro";

  // Pixel art checkmark (5x5 grid)
  const checkmarkPixels = [
    [0,0,0,0,1],
    [0,0,0,1,0],
    [1,0,1,0,0],
    [0,1,0,0,0],
    [0,0,0,0,0],
  ];
  const iconGrid = document.createElement("div");
  iconGrid.className = "retro-icon";
  iconGrid.style.gridTemplateColumns = "repeat(5, 5px)";
  for (const row of checkmarkPixels) {
    for (const px of row) {
      const pixel = document.createElement("div");
      pixel.className = "pixel";
      pixel.style.background = px ? "#4ade80" : "transparent";
      iconGrid.appendChild(pixel);
    }
  }
  node.appendChild(iconGrid);

  // Info section
  const info = document.createElement("div");
  info.className = "retro-info";

  const textEl = document.createElement("div");
  textEl.className = "retro-text";
  textEl.textContent = text;
  info.appendChild(textEl);

  const bar = document.createElement("div");
  bar.className = "retro-bar";
  for (let i = 0; i < total; i++) {
    const seg = document.createElement("div");
    seg.className = "bar-segment " + (i < progress ? "filled" : "empty");
    bar.appendChild(seg);
  }
  info.appendChild(bar);
  node.appendChild(info);

  return { node, append: true };
}
```

Add to `rendererMap`:

```typescript
  "data-viz": renderDataViz,
  "approval-badge": renderApprovalBadge,
  "interactive-widget": renderInteractiveWidget,
  "retro-pixel": renderRetroPixel,
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/custom-renderers/renderers.ts
git commit -m "feat(custom-renderers): add Data & Status renderers (dataviz, badge, widget, retro)"
```

---

### Task 5: Renderers — Creative group (4 renderers)

**Files:**
- Modify: `app/web-sdk/custom-renderers/renderers.ts`

- [ ] **Step 1: Add Creative renderers to `renderers.ts`**

Add these functions above the `rendererMap` export, and add their entries to the map.

```typescript
// --- Creative ---

function renderComicBubble(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "Looks great!";

  const node = document.createElement("div");
  node.className = "renderer-comic";

  const bubble = document.createElement("div");
  bubble.className = "comic-bubble";
  bubble.textContent = text;

  const tail = document.createElement("div");
  tail.className = "comic-tail";
  bubble.appendChild(tail);

  const tailInner = document.createElement("div");
  tailInner.className = "comic-tail-inner";
  bubble.appendChild(tailInner);

  node.appendChild(bubble);

  return { node, append: true };
}

function renderScratchOff(annotation: any): RendererResult | null {
  const revealText = annotation.customData?.revealText || "You found a secret!";

  const node = document.createElement("div");
  node.className = "renderer-scratch";

  // Reveal text underneath
  const reveal = document.createElement("div");
  reveal.className = "scratch-reveal";
  reveal.textContent = "\uD83C\uDF1F " + revealText;
  node.appendChild(reveal);

  // Canvas overlay (silver scratch layer)
  const canvas = document.createElement("canvas");
  node.appendChild(canvas);

  let isScratching = false;

  // Initialize canvas once it has dimensions
  requestAnimationFrame(() => {
    const rect = node.getBoundingClientRect();
    canvas.width = rect.width || 200;
    canvas.height = rect.height || 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw silver scratch surface
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#c0c0c0");
    gradient.addColorStop(0.3, "#d4d4d4");
    gradient.addColorStop(0.6, "#a8a8a8");
    gradient.addColorStop(1, "#b8b8b8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add "SCRATCH HERE" text
    ctx.fillStyle = "#888";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u25A0 SCRATCH TO REVEAL \u25A0", canvas.width / 2, canvas.height / 2);

    // Scratch (erase) on pointer move
    ctx.globalCompositeOperation = "destination-out";

    const scratch = (e: PointerEvent) => {
      if (!isScratching) return;
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
    };

    canvas.addEventListener("pointerdown", (e) => {
      e.stopImmediatePropagation();
      isScratching = true;
      scratch(e);
    }, { capture: true });
    canvas.addEventListener("pointermove", scratch);
    canvas.addEventListener("pointerup", () => { isScratching = false; });
    canvas.addEventListener("pointerleave", () => { isScratching = false; });
  });

  return { node, append: false };
}

function renderRichMedia(annotation: any): RendererResult | null {
  const title = annotation.customData?.title || "Training Video";

  const node = document.createElement("div");
  node.className = "renderer-media";

  let isPlaying = false;

  // Display area
  const display = document.createElement("div");
  display.className = "media-display";

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "position:absolute;top:8px;left:10px;color:#94a3b8;font-size:11px;";
  titleEl.textContent = title;
  display.appendChild(titleEl);

  const playBtn = document.createElement("div");
  playBtn.className = "media-play-btn";
  const triangle = document.createElement("div");
  triangle.className = "play-triangle";
  playBtn.appendChild(triangle);
  display.appendChild(playBtn);

  node.appendChild(display);

  // Controls bar
  const controls = document.createElement("div");
  controls.className = "media-controls";

  const progress = document.createElement("div");
  progress.className = "media-progress";
  const progressFill = document.createElement("div");
  progressFill.className = "media-progress-fill";
  progress.appendChild(progressFill);
  controls.appendChild(progress);

  const time = document.createElement("div");
  time.className = "media-time";
  time.textContent = "1:23 / 3:45";
  controls.appendChild(time);

  node.appendChild(controls);

  // Toggle play/pause
  node.addEventListener("pointerdown", (e) => {
    e.stopImmediatePropagation();
    isPlaying = !isPlaying;
    if (isPlaying) {
      triangle.style.cssText = `
        width: 12px; height: 16px; border: none; margin: 0;
        border-left: 4px solid white; border-right: 4px solid white;
      `;
    } else {
      triangle.style.cssText = `
        width: 0; height: 0;
        border-left: 16px solid white; border-top: 10px solid transparent;
        border-bottom: 10px solid transparent; margin-left: 4px;
      `;
    }
  }, { capture: true });

  return { node, append: false };
}

function renderMiniGame(annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-game";

  const canvas = document.createElement("canvas");
  node.appendChild(canvas);

  let animFrameId: number | null = null;

  requestAnimationFrame(() => {
    const rect = node.getBoundingClientRect();
    const W = rect.width || 200;
    const H = rect.height || 120;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Game state
    const paddleW = 40, paddleH = 6;
    let paddleX = W / 2 - paddleW / 2;
    const ballR = 4;
    let bx = W / 2, by = H * 0.6;
    let bdx = 1.5, bdy = -1.5;

    // Bricks
    const cols = 6, rows = 3, brickW = (W - 20) / cols, brickH = 8, brickPad = 2;
    const brickColors = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];
    const bricks: { x: number; y: number; w: number; h: number; color: string; alive: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: 10 + c * brickW + brickPad / 2,
          y: 8 + r * (brickH + brickPad),
          w: brickW - brickPad,
          h: brickH,
          color: brickColors[(r * cols + c) % brickColors.length],
          alive: true,
        });
      }
    }

    // Track pointer for paddle
    canvas.addEventListener("pointermove", (e) => {
      const canvasRect = canvas.getBoundingClientRect();
      paddleX = Math.max(0, Math.min(W - paddleW, e.clientX - canvasRect.left - paddleW / 2));
    });
    canvas.addEventListener("pointerdown", (e) => {
      e.stopImmediatePropagation();
    }, { capture: true });

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // Draw bricks
      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // Draw paddle
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.roundRect(paddleX, H - 12, paddleW, paddleH, 3);
      ctx.fill();

      // Draw ball
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(bx, by, ballR, 0, Math.PI * 2);
      ctx.fill();

      // Move ball
      bx += bdx;
      by += bdy;

      // Wall collisions
      if (bx <= ballR || bx >= W - ballR) bdx = -bdx;
      if (by <= ballR) bdy = -bdy;

      // Paddle collision
      if (by + ballR >= H - 12 && bx >= paddleX && bx <= paddleX + paddleW) {
        bdy = -Math.abs(bdy);
      }

      // Ball out of bounds — reset
      if (by > H + 10) {
        bx = W / 2;
        by = H * 0.6;
        bdx = 1.5 * (Math.random() > 0.5 ? 1 : -1);
        bdy = -1.5;
      }

      // Brick collisions
      for (const b of bricks) {
        if (!b.alive) continue;
        if (bx + ballR > b.x && bx - ballR < b.x + b.w && by + ballR > b.y && by - ballR < b.y + b.h) {
          b.alive = false;
          bdy = -bdy;
          break;
        }
      }

      // Reset bricks if all destroyed
      if (bricks.every((b) => !b.alive)) {
        for (const b of bricks) b.alive = true;
      }

      animFrameId = requestAnimationFrame(draw);
    }

    animFrameId = requestAnimationFrame(draw);
  });

  return {
    node,
    append: false,
    onDisappear: () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    },
  };
}
```

Add to `rendererMap`:

```typescript
  "comic-bubble": renderComicBubble,
  "scratch-off": renderScratchOff,
  "rich-media": renderRichMedia,
  "mini-game": renderMiniGame,
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/custom-renderers/renderers.ts
git commit -m "feat(custom-renderers): add Creative renderers (comic, scratch-off, media, mini-game)"
```

---

### Task 6: Viewer component — core setup and tab UI

**Files:**
- Create: `app/web-sdk/custom-renderers/viewer.tsx`

- [ ] **Step 1: Create `viewer.tsx` with viewer init, category tabs, and annotation lifecycle**

```tsx
"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { rendererMap } from "./renderers";

const DOCUMENT = "/documents/annual-report.pdf";

// Category definitions with annotation configs
type AnnotationConfig = {
  rendererType: string;
  label: string;
  // Position on page 0 (left, top, width, height in PDF points)
  rect: { left: number; top: number; width: number; height: number };
  // Extra customData props for the renderer
  props?: Record<string, unknown>;
};

type Category = {
  name: string;
  renderers: AnnotationConfig[];
};

const categories: Category[] = [
  {
    name: "Visual Effects",
    renderers: [
      {
        rendererType: "neon-sign",
        label: "Neon Sign",
        rect: { left: 50, top: 60, width: 200, height: 60 },
        props: { text: "APPROVED", color: "#ff6ec7" },
      },
      {
        rendererType: "hologram",
        label: "Holographic Foil",
        rect: { left: 300, top: 60, width: 200, height: 60 },
      },
      {
        rendererType: "glassmorphism",
        label: "Glassmorphism",
        rect: { left: 50, top: 160, width: 250, height: 50 },
        props: { text: "This section needs review \u2014 see comments from legal" },
      },
      {
        rendererType: "3d-stamp",
        label: "3D Transform",
        rect: { left: 350, top: 160, width: 180, height: 60 },
      },
    ],
  },
  {
    name: "Animated",
    renderers: [
      {
        rendererType: "callout",
        label: "Attention Callout",
        rect: { left: 50, top: 60, width: 180, height: 50 },
        props: { text: "Sign Here" },
      },
      {
        rendererType: "confetti",
        label: "Confetti",
        rect: { left: 300, top: 60, width: 220, height: 80 },
        props: { text: "MILESTONE REACHED" },
      },
      {
        rendererType: "matrix",
        label: "Matrix Rain",
        rect: { left: 50, top: 160, width: 220, height: 80 },
        props: { text: "CLASSIFIED" },
      },
      {
        rendererType: "aquarium",
        label: "Aquarium",
        rect: { left: 320, top: 160, width: 200, height: 80 },
      },
    ],
  },
  {
    name: "Data & Status",
    renderers: [
      {
        rendererType: "data-viz",
        label: "Data Visualization",
        rect: { left: 50, top: 60, width: 200, height: 90 },
        props: { values: [40, 60, 35, 80, 55, 95], label: "Q1\u2013Q4 Revenue" },
      },
      {
        rendererType: "approval-badge",
        label: "Approval Badge",
        rect: { left: 300, top: 60, width: 230, height: 50 },
        props: { name: "Jane Smith", status: "approved", timestamp: "2m ago" },
      },
      {
        rendererType: "interactive-widget",
        label: "Interactive Widget",
        rect: { left: 50, top: 190, width: 180, height: 80 },
        props: { rating: 4, deadlineMs: Date.now() + 14 * 24 * 60 * 60 * 1000 },
      },
      {
        rendererType: "retro-pixel",
        label: "Retro Pixel Art",
        rect: { left: 300, top: 190, width: 180, height: 60 },
        props: { progress: 5, text: "COMPLETE!" },
      },
    ],
  },
  {
    name: "Creative",
    renderers: [
      {
        rendererType: "comic-bubble",
        label: "Comic Bubble",
        rect: { left: 50, top: 60, width: 220, height: 70 },
        props: { text: "This looks amazing!" },
      },
      {
        rendererType: "scratch-off",
        label: "Scratch-Off",
        rect: { left: 320, top: 60, width: 200, height: 70 },
        props: { revealText: "You found a secret!" },
      },
      {
        rendererType: "rich-media",
        label: "Rich Media Player",
        rect: { left: 50, top: 170, width: 220, height: 100 },
        props: { title: "Training Video 01" },
      },
      {
        rendererType: "mini-game",
        label: "Mini-Game (Breakout)",
        rect: { left: 320, top: 170, width: 200, height: 100 },
      },
    ],
  },
];

export default function CustomRenderersViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const createdAnnotationIdsRef = useRef<string[]>([]);

  // Remove all custom annotations from the viewer
  const clearCustomAnnotations = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance) return;

    for (const id of createdAnnotationIdsRef.current) {
      try {
        await instance.delete(id);
      } catch {
        // Annotation may already be deleted
      }
    }
    createdAnnotationIdsRef.current = [];
  }, []);

  // Create annotations for a category
  const loadCategory = useCallback(async (categoryIndex: number) => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    await clearCustomAnnotations();

    const category = categories[categoryIndex];
    const ids: string[] = [];

    for (const config of category.renderers) {
      const annotation = new NV.Annotations.NoteAnnotation({
        pageIndex: 0,
        boundingBox: new NV.Geometry.Rect(config.rect),
        text: { format: "plain" as const, value: config.label },
        color: NV.Color.TRANSPARENT,
        customData: {
          rendererType: config.rendererType,
          category: category.name,
          ...(config.props || {}),
        },
      });

      try {
        const created = await instance.create(annotation);
        const createdAnnotation = Array.isArray(created) ? created[0] : created;
        if (createdAnnotation?.id) {
          ids.push(createdAnnotation.id as string);
        }
      } catch (err) {
        console.error(`Failed to create ${config.rendererType} annotation:`, err);
      }
    }

    createdAnnotationIdsRef.current = ids;
  }, [clearCustomAnnotations]);

  // Handle tab click
  const handleTabClick = useCallback(
    (index: number) => {
      setActiveCategory(index);
      loadCategory(index);
    },
    [loadCategory],
  );

  // Initialize viewer
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load viewer once on mount
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
      styleSheets: ["/custom-renderers.css"],
      customRenderers: {
        Annotation: ({ annotation }: any) => {
          const rendererType = annotation.customData?.rendererType;
          if (!rendererType) return null;

          const renderFn = rendererMap[rendererType];
          return renderFn ? renderFn(annotation) : null;
        },
      },
    })
      .then((instance: Instance) => {
        instanceRef.current = instance;
        // Load first category on init
        loadCategory(0);
      })
      .catch((error: Error) => {
        console.error("Error loading viewer:", error);
      });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col overflow-y-auto">
        <div className="p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Select a category to see different custom annotation renderers applied to the document.
          </p>

          {/* Category Tabs */}
          <div className="space-y-2">
            {categories.map((category, index) => (
              <button
                key={category.name}
                type="button"
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  activeCategory === index
                    ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)]/10 font-semibold"
                    : "border-[var(--warm-gray-400)] hover:border-[var(--warm-gray-600)]"
                }`}
                onClick={() => handleTabClick(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {category.renderers.length}
                  </span>
                </div>
                {activeCategory === index && (
                  <div className="mt-2 space-y-1">
                    {category.renderers.map((renderer) => (
                      <div
                        key={renderer.rendererType}
                        className="text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-[var(--digital-pollen)]"
                      >
                        {renderer.label}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        style={{ flex: 1, height: "100%", position: "relative" }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the full sample loads and renders**

Run: `npm run dev` (if not already running)

Navigate to `http://localhost:3000/web-sdk/custom-renderers`. Verify:
1. The sidebar shows 4 category tabs
2. "Visual Effects" is selected by default
3. 4 annotations appear on the PDF with custom rendered DOM nodes
4. Clicking other tabs swaps the annotations

- [ ] **Step 3: Commit**

```bash
git add app/web-sdk/custom-renderers/viewer.tsx
git commit -m "feat(custom-renderers): add viewer with tab navigation and annotation lifecycle"
```

---

### Task 7: Register sample in Web SDK samples list

**Files:**
- Modify: `app/web-sdk/page.tsx`

- [ ] **Step 1: Add sample entry to the `samples` array in `app/web-sdk/page.tsx`**

Add this entry to the `samples` array, maintaining alphabetical order (after "Custom Menu Interface"):

```typescript
  {
    name: "Custom Renderers",
    category: "Annotations",
    description:
      "Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more",
    path: "/web-sdk/custom-renderers",
  },
```

- [ ] **Step 2: Verify the sample appears in the listing**

Navigate to `http://localhost:3000/web-sdk`. Verify "Custom Renderers" appears in the Annotations category.

- [ ] **Step 3: Commit**

```bash
git add app/web-sdk/page.tsx
git commit -m "feat(custom-renderers): register sample in Web SDK samples list"
```

---

### Task 8: Visual QA and annotation position tuning

**Files:**
- Modify: `app/web-sdk/custom-renderers/viewer.tsx` (annotation positions)
- Modify: `public/custom-renderers.css` (any visual fixes)
- Modify: `app/web-sdk/custom-renderers/renderers.ts` (any renderer fixes)

- [ ] **Step 1: Open the sample and test each category tab**

Navigate through all 4 category tabs and verify:
1. All 16 renderers display correctly
2. No annotations overlap each other
3. Annotations are positioned on visible areas of page 0
4. Interactive renderers work: star rating clicks, scratch-off scratching, mini-game paddle, media play/pause
5. Animations run smoothly (no layout thrashing)
6. Tab switching cleanly removes old annotations and creates new ones

- [ ] **Step 2: Adjust annotation `rect` positions if any overlap or fall off the page**

Update the `rect` values in the `categories` array in `viewer.tsx` based on the actual document layout. The positions in Task 6 are initial estimates — they may need adjustment depending on the annual report's actual content layout.

- [ ] **Step 3: Fix any renderer visual issues**

Common issues to check:
- Canvas renderers (scratch-off, mini-game) may need size adjustments if the annotation bounding box doesn't match
- Matrix rain columns may need count/spacing adjustments
- Glassmorphism `backdrop-filter` may not work if the annotation DOM is structured differently than expected
- 3D transform may clip outside the annotation container

- [ ] **Step 4: Commit**

```bash
git add app/web-sdk/custom-renderers/viewer.tsx public/custom-renderers.css app/web-sdk/custom-renderers/renderers.ts
git commit -m "fix(custom-renderers): tune annotation positions and fix visual issues"
```

---

### Task 9: Run lint and type checks

- [ ] **Step 1: Run the linter**

Run: `npx biome check app/web-sdk/custom-renderers/ --write`

Fix any lint issues (likely `any` type annotations needing biome-ignore comments, similar to other samples).

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`

Fix any type errors.

- [ ] **Step 3: Commit if there were fixes**

```bash
git add app/web-sdk/custom-renderers/
git commit -m "chore(custom-renderers): fix lint and type issues"
```

---

### Task 10: Final commit and verify

- [ ] **Step 1: Full end-to-end verification**

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/web-sdk` — verify "Custom Renderers" is listed
3. Click into the sample — verify it loads
4. Click through all 4 tabs — verify all 16 renderers display
5. Test interactivity: scratch the scratch-off, play the mini-game, click stars, toggle media play
6. Verify the page works after a hard refresh (no stale state)

- [ ] **Step 2: Final commit if any remaining changes**

```bash
git add -A
git commit -m "feat(custom-renderers): complete custom renderers showcase sample"
```
