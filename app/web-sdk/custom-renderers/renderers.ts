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
