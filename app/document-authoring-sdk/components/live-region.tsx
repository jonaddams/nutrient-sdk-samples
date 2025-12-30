"use client";

import type React from "react";
import { useEffect, useRef } from "react";

interface LiveRegionProps {
  message: string;
  priority?: "polite" | "assertive";
  clearDelay?: number;
}

export default function LiveRegion({
  message,
  priority = "polite",
  clearDelay = 3000,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    if (!message) return;

    // Clear any existing timeout
    const timeoutId = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = "";
      }
    }, clearDelay);

    return () => clearTimeout(timeoutId);
  }, [message, clearDelay]);

  return (
    <output
      ref={regionRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </output>
  );
}

interface AnnouncementManagerProps {
  children: React.ReactNode;
}

export function AnnouncementManager({ children }: AnnouncementManagerProps) {
  return (
    <>
      {children}

      {/* Global live regions for different priorities */}
      <div
        id="polite-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <div
        id="assertive-announcer"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
    </>
  );
}
