/* biome-ignore-all lint/suspicious/noExplicitAny: Nutrient SDK annotation types not fully exported */

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

  return { node, append: false };
}

function renderHologram(_annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-hologram";
  const span = document.createElement("span");
  span.textContent = "\u2713 VERIFIED AUTHENTIC";
  node.appendChild(span);

  return { node, append: false };
}

function renderGlassmorphism(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "Review note";

  const node = document.createElement("div");
  node.className = "renderer-glass";
  node.textContent = `\uD83D\uDCAC ${text}`;

  return { node, append: false };
}

function render3DStamp(_annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-3d-stamp-wrapper";
  const stamp = document.createElement("div");
  stamp.className = "renderer-3d-stamp";
  stamp.textContent = "CONFIDENTIAL";
  node.appendChild(stamp);

  return { node, append: false };
}

// --- Animated ---

function renderCallout(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "Sign Here";

  const node = document.createElement("div");
  node.className = "renderer-callout";
  const span = document.createElement("span");
  span.textContent = `\u270E ${text}`;
  node.appendChild(span);

  return { node, append: false };
}

function renderConfetti(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "MILESTONE REACHED";
  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#ff6ec7",
    "#a78bfa",
  ];
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
  label.textContent = `\uD83C\uDF89 ${text}`;
  node.appendChild(label);

  return { node, append: false };
}

function renderMatrix(annotation: any): RendererResult | null {
  const text = annotation.customData?.text || "CLASSIFIED";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*";

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

  node.addEventListener(
    "pointerdown",
    (e) => {
      e.stopImmediatePropagation();
    },
    { capture: true },
  );

  return { node, append: false };
}

function renderAquarium(_annotation: any): RendererResult | null {
  const node = document.createElement("div");
  node.className = "renderer-aquarium";

  const seaweedConfigs = [
    {
      left: "10%",
      width: "8px",
      height: "30px",
      color: "#1a6b3a",
      duration: "2s",
    },
    {
      left: "18%",
      width: "6px",
      height: "40px",
      color: "#2d8b4e",
      duration: "2.5s",
    },
    {
      left: "75%",
      width: "7px",
      height: "35px",
      color: "#1a6b3a",
      duration: "3s",
    },
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

  return { node, append: false };
}

// --- Data & Status ---

function renderDataViz(annotation: any): RendererResult | null {
  const values: number[] = annotation.customData?.values || [
    40, 60, 35, 80, 55, 90,
  ];
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
    bar.className = `dataviz-bar${i === values.length - 1 ? " highlight" : ""}`;
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
    trendEl.textContent = `\u25B2 ${Math.round(((lastVal - prevVal) / prevVal) * 100)}%`;
  } else {
    trendEl.style.color = "#ef4444";
    trendEl.textContent = `\u25BC ${Math.round(((prevVal - lastVal) / prevVal) * 100)}%`;
  }
  node.appendChild(trendEl);

  return { node, append: false };
}

function renderApprovalBadge(annotation: any): RendererResult | null {
  const name: string = annotation.customData?.name || "Jane Doe";
  const status: string = annotation.customData?.status || "approved";
  const timestamp: string = annotation.customData?.timestamp || "2m ago";

  const statusConfig: Record<
    string,
    { bg: string; border: string; icon: string; iconColor: string }
  > = {
    approved: {
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "\u2713",
      iconColor: "#22c55e",
    },
    pending: {
      bg: "#fffbeb",
      border: "#fde68a",
      icon: "\u23F3",
      iconColor: "#f59e0b",
    },
    rejected: {
      bg: "#fef2f2",
      border: "#fca5a5",
      icon: "\u2717",
      iconColor: "#ef4444",
    },
  };
  const cfg = statusConfig[status] || statusConfig.approved;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
  meta.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} \u00B7 ${timestamp}`;
  info.appendChild(nameEl);
  info.appendChild(meta);
  node.appendChild(info);

  const icon = document.createElement("div");
  icon.className = "badge-icon";
  icon.style.color = cfg.iconColor;
  icon.textContent = cfg.icon;
  node.appendChild(icon);

  return { node, append: false };
}

function renderInteractiveWidget(annotation: any): RendererResult | null {
  const initialRating: number = annotation.customData?.rating || 3;
  const deadlineMs: number =
    annotation.customData?.deadlineMs || Date.now() + 14 * 24 * 60 * 60 * 1000;

  const node = document.createElement("div");
  node.className = "renderer-widget";

  let currentRating = initialRating;
  const starsContainer = document.createElement("div");
  starsContainer.className = "widget-stars";

  function updateStars() {
    starsContainer.replaceChildren();
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.className = `star ${i <= currentRating ? "filled" : "empty"}`;
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
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    timerEl.textContent = `\u23F0 ${days}d ${hours}h remaining`;
  }
  updateTimer();
  const intervalId = setInterval(updateTimer, 60000);

  node.addEventListener(
    "pointerdown",
    (e) => {
      e.stopImmediatePropagation();
    },
    { capture: true },
  );

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

  const checkmarkPixels = [
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
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
    seg.className = `bar-segment ${i < progress ? "filled" : "empty"}`;
    bar.appendChild(seg);
  }
  info.appendChild(bar);
  node.appendChild(info);

  return { node, append: false };
}

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

  return { node, append: false };
}

function renderScratchOff(annotation: any): RendererResult | null {
  const revealText = annotation.customData?.revealText || "You found a secret!";

  const node = document.createElement("div");
  node.className = "renderer-scratch";

  const reveal = document.createElement("div");
  reveal.className = "scratch-reveal";
  reveal.textContent = `\uD83C\uDF1F ${revealText}`;
  node.appendChild(reveal);

  const canvas = document.createElement("canvas");
  node.appendChild(canvas);

  let isScratching = false;

  requestAnimationFrame(() => {
    const rect = node.getBoundingClientRect();
    canvas.width = rect.width || 200;
    canvas.height = rect.height || 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    gradient.addColorStop(0, "#c0c0c0");
    gradient.addColorStop(0.3, "#d4d4d4");
    gradient.addColorStop(0.6, "#a8a8a8");
    gradient.addColorStop(1, "#b8b8b8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#888";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "\u25A0 SCRATCH TO REVEAL \u25A0",
      canvas.width / 2,
      canvas.height / 2,
    );

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

    canvas.addEventListener(
      "pointerdown",
      (e) => {
        e.stopImmediatePropagation();
        isScratching = true;
        scratch(e);
      },
      { capture: true },
    );
    canvas.addEventListener("pointermove", scratch);
    canvas.addEventListener("pointerup", () => {
      isScratching = false;
    });
    canvas.addEventListener("pointerleave", () => {
      isScratching = false;
    });
  });

  return { node, append: false };
}

function renderRichMedia(annotation: any): RendererResult | null {
  const title = annotation.customData?.title || "Training Video";

  const node = document.createElement("div");
  node.className = "renderer-media";

  let isPlaying = false;

  const display = document.createElement("div");
  display.className = "media-display";

  const titleEl = document.createElement("div");
  titleEl.style.cssText =
    "position:absolute;top:8px;left:10px;color:#94a3b8;font-size:11px;";
  titleEl.textContent = title;
  display.appendChild(titleEl);

  const playBtn = document.createElement("div");
  playBtn.className = "media-play-btn";
  const triangle = document.createElement("div");
  triangle.className = "play-triangle";
  playBtn.appendChild(triangle);
  display.appendChild(playBtn);

  node.appendChild(display);

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

  node.addEventListener(
    "pointerdown",
    (e) => {
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
    },
    { capture: true },
  );

  return { node, append: false };
}

function renderMiniGame(_annotation: any): RendererResult | null {
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

    const paddleW = 40,
      paddleH = 6;
    let paddleX = W / 2 - paddleW / 2;
    const ballR = 4;
    let bx = W / 2,
      by = H * 0.6;
    let bdx = 1.5,
      bdy = -1.5;

    const cols = 6,
      rows = 3,
      brickW = (W - 20) / cols,
      brickH = 8,
      brickPad = 2;
    const brickColors = [
      "#f87171",
      "#fbbf24",
      "#34d399",
      "#60a5fa",
      "#a78bfa",
      "#f472b6",
    ];
    const bricks: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      alive: boolean;
    }[] = [];
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

    canvas.addEventListener("pointermove", (e) => {
      const canvasRect = canvas.getBoundingClientRect();
      paddleX = Math.max(
        0,
        Math.min(W - paddleW, e.clientX - canvasRect.left - paddleW / 2),
      );
    });
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        e.stopImmediatePropagation();
      },
      { capture: true },
    );

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.roundRect(paddleX, H - 12, paddleW, paddleH, 3);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(bx, by, ballR, 0, Math.PI * 2);
      ctx.fill();

      bx += bdx;
      by += bdy;

      if (bx <= ballR || bx >= W - ballR) bdx = -bdx;
      if (by <= ballR) bdy = -bdy;

      if (by + ballR >= H - 12 && bx >= paddleX && bx <= paddleX + paddleW) {
        bdy = -Math.abs(bdy);
      }

      if (by > H + 10) {
        bx = W / 2;
        by = H * 0.6;
        bdx = 1.5 * (Math.random() > 0.5 ? 1 : -1);
        bdy = -1.5;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        if (
          bx + ballR > b.x &&
          bx - ballR < b.x + b.w &&
          by + ballR > b.y &&
          by - ballR < b.y + b.h
        ) {
          b.alive = false;
          bdy = -bdy;
          break;
        }
      }

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

// --- Renderer Map (will grow in subsequent tasks) ---

export const rendererMap: Record<string, RenderFunction> = {
  "neon-sign": renderNeonSign,
  hologram: renderHologram,
  glassmorphism: renderGlassmorphism,
  "3d-stamp": render3DStamp,
  callout: renderCallout,
  confetti: renderConfetti,
  matrix: renderMatrix,
  aquarium: renderAquarium,
  "data-viz": renderDataViz,
  "approval-badge": renderApprovalBadge,
  "interactive-widget": renderInteractiveWidget,
  "retro-pixel": renderRetroPixel,
  "comic-bubble": renderComicBubble,
  "scratch-off": renderScratchOff,
  "rich-media": renderRichMedia,
  "mini-game": renderMiniGame,
};
