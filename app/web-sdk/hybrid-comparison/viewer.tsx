"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { ChangesRail } from "./ChangesRail";
import type { ChangeEntry } from "./changes";

const DOC_A = "/documents/hybrid-comparison-a.pdf";
const DOC_B = "/documents/hybrid-comparison-b.pdf";

export function HybridComparisonViewer() {
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftInstance = useRef<Instance | null>(null);
  const rightInstance = useRef<Instance | null>(null);
  const didInit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markupCount, setMarkupCount] = useState(0);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    async function waitForSDK() {
      for (let i = 0; i < 100; i++) {
        if (window.NutrientViewer) return window.NutrientViewer;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Nutrient Web SDK failed to load");
    }

    async function init() {
      try {
        const NV = await waitForSDK();
        leftInstance.current = await NV!.load({
          container: leftRef.current!,
          document: DOC_A,
          useCDN: true,
          licenseKey,
        });
        rightInstance.current = await NV!.load({
          container: rightRef.current!,
          document: DOC_B,
          useCDN: true,
          licenseKey,
        });
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    }

    init();

    return () => {
      const NV = window.NutrientViewer;
      if (NV && leftRef.current) NV.unload(leftRef.current);
      if (NV && rightRef.current) NV.unload(rightRef.current);
      leftInstance.current = null;
      rightInstance.current = null;
    };
  }, [licenseKey]);

  if (error) {
    return (
      <div style={{ padding: 16, color: "#c0392b" }}>
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {loading && <LoadingSpinner message="Loading comparison…" />}
      <div
        style={{
          display: "flex",
          height: "70vh",
          minHeight: 560,
          border: "1px solid #e0e0ea",
        }}
      >
        <div style={{ flex: 1, borderRight: "1px solid #e0e0ea" }}>
          <div style={{ fontSize: 12, padding: "4px 8px", color: "#666" }}>
            Visual overlay
          </div>
          <div
            ref={leftRef}
            style={{ width: "100%", height: "calc(100% - 24px)" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, padding: "4px 8px", color: "#666" }}>
            Text + changes
          </div>
          <div
            ref={rightRef}
            style={{ width: "100%", height: "calc(100% - 24px)" }}
          />
        </div>
        <ChangesRail
          changes={changes}
          selectedId={selectedId}
          markupCount={markupCount}
          onSelect={(c) => setSelectedId(c.id)}
        />
      </div>
    </div>
  );
}
