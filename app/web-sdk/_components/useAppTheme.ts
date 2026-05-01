"use client";

import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

function readAppTheme(): AppTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Returns the active app theme set by the Tweaks toggle on <html data-theme>.
 * Re-renders when the user changes themes.
 */
export function useAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>(() => readAppTheme());

  useEffect(() => {
    setTheme(readAppTheme());
    const observer = new MutationObserver(() => setTheme(readAppTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
