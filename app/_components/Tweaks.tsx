"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Theme = "light" | "dark";
type Palette = "warm" | "cool" | "mono" | "forest";
type TypePairing = "editorial" | "technical" | "warm-sans";
type Density = "spacious" | "balanced" | "dense";
type Radius = "sharp" | "soft" | "round";

interface TweaksState {
  theme: Theme;
  palette: Palette;
  type: TypePairing;
  density: Density;
  radius: Radius;
}

const STORAGE_KEY = "sdk-samples-tweaks-v1";

const DEFAULTS: TweaksState = {
  theme: "light",
  palette: "cool",
  type: "technical",
  density: "balanced",
  radius: "soft",
};

function readStored(): Partial<TweaksState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<TweaksState>) : {};
  } catch {
    return {};
  }
}

function applyToDocument(t: TweaksState) {
  const html = document.documentElement;
  html.dataset.theme = t.theme;
  html.dataset.palette = t.palette;
  html.dataset.type = t.type;
  html.dataset.density = t.density;
  html.dataset.radius = t.radius;
}

export function Tweaks() {
  const [tweaks, setTweaks] = useState<TweaksState>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    const systemDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next: TweaksState = {
      ...DEFAULTS,
      theme: stored.theme ?? (systemDark ? "dark" : "light"),
      ...stored,
    };
    setTweaks(next);
    applyToDocument(next);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<TweaksState>) => {
    setTweaks((prev) => {
      const next = { ...prev, ...patch };
      applyToDocument(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota / unavailable errors
      }
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    update({ theme: tweaks.theme === "dark" ? "light" : "dark" });
  }, [tweaks.theme, update]);

  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
      >
        {hydrated && tweaks.theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="tweaks-toggle"
        aria-label="Open theme tweaks"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Tweaks
      </button>

      {open && hydrated && createPortal(
        <div className="tweaks-panel" role="dialog" aria-label="Theme tweaks">
          <div className="tweaks-head">
            <strong>Tweaks</strong>
            <button
              type="button"
              className="tweaks-close"
              aria-label="Close tweaks"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="tweaks-body">
            <div className="tweaks-section">Theme</div>
            <Segmented
              label="Palette"
              value={tweaks.palette}
              options={[
                { value: "warm", label: "Warm" },
                { value: "cool", label: "Cool" },
                { value: "mono", label: "Mono" },
                { value: "forest", label: "Forest" },
              ]}
              onChange={(v) => update({ palette: v as Palette })}
            />
            <Toggle
              label="Dark mode"
              value={tweaks.theme === "dark"}
              onChange={(v) => update({ theme: v ? "dark" : "light" })}
            />

            <div className="tweaks-section">Type</div>
            <Segmented
              label="Pairing"
              value={tweaks.type}
              options={[
                { value: "editorial", label: "Edit." },
                { value: "technical", label: "Tech." },
                { value: "warm-sans", label: "Serif" },
              ]}
              onChange={(v) => update({ type: v as TypePairing })}
            />

            <div className="tweaks-section">Layout</div>
            <Segmented
              label="Density"
              value={tweaks.density}
              options={[
                { value: "spacious", label: "Loose" },
                { value: "balanced", label: "Reg." },
                { value: "dense", label: "Dense" },
              ]}
              onChange={(v) => update({ density: v as Density })}
            />
            <Segmented
              label="Radius"
              value={tweaks.radius}
              options={[
                { value: "sharp", label: "Sharp" },
                { value: "soft", label: "Soft" },
                { value: "round", label: "Round" },
              ]}
              onChange={(v) => update({ radius: v as Radius })}
            />

            <button
              type="button"
              className="tweaks-reset"
              onClick={() => {
                window.localStorage.removeItem(STORAGE_KEY);
                setTweaks(DEFAULTS);
                applyToDocument(DEFAULTS);
              }}
            >
              Reset to defaults
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

interface SegOption {
  value: string;
  label: string;
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SegOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="tweaks-row">
      <div className="tweaks-row-label">{label}</div>
      <div className="tweaks-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="tweaks-row tweaks-row-h">
      <div className="tweaks-row-label">{label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className="tweaks-switch"
        data-on={value ? "1" : "0"}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
