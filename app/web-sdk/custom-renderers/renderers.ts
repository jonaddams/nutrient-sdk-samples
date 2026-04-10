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

  node.addEventListener("pointerdown", (e) => {
    e.stopImmediatePropagation();
  }, { capture: true });

  return { node, append: false };
}

function renderAquarium(annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-aquarium";

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

// --- Renderer Map (will grow in subsequent tasks) ---

export const rendererMap: Record<string, RenderFunction> = {
  "neon-sign": renderNeonSign,
  "hologram": renderHologram,
  "glassmorphism": renderGlassmorphism,
  "3d-stamp": render3DStamp,
  "callout": renderCallout,
  "confetti": renderConfetti,
  "matrix": renderMatrix,
  "aquarium": renderAquarium,
};
