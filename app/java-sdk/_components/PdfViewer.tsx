"use client";

import { useEffect, useRef } from "react";
import { NUTRIENT_SDK } from "@/lib/constants";

interface PdfViewerProps {
  /** ArrayBuffer from API response, or a URL string for static files */
  document: ArrayBuffer | string;
  /** Show signature validation banner for signed documents */
  showSignatureValidation?: boolean;
  /** Custom toolbar items — overrides the default toolbar */
  toolbarItems?: Array<{ type: string }>;
  /** URL to fetch a DER-encoded trusted CA certificate for signature validation */
  trustedCertificateUrl?: string;
  /** Callback with the loaded viewer instance */
  onInstance?: (instance: any) => void;
}

export function PdfViewer({
  document,
  showSignatureValidation,
  toolbarItems,
  trustedCertificateUrl,
  onInstance,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as any).NutrientViewer;
    if (!container || !NutrientViewer || !document) return;

    let cancelled = false;

    const config: Record<string, unknown> = {
      container,
      document,
      useCDN: true,
      pageRendering: "next",
      licenseKey: NUTRIENT_SDK.LICENSE_KEY,
      ...(toolbarItems && { toolbarItems }),
    };

    if (showSignatureValidation) {
      config.initialViewState = new NutrientViewer.ViewState({
        showSignatureValidationStatus:
          NutrientViewer.ShowSignatureValidationStatusMode.IF_SIGNED,
      });
    }

    if (trustedCertificateUrl) {
      const certUrl = trustedCertificateUrl;
      config.trustedCAsCallback = async () => {
        const res = await fetch(certUrl);
        if (!res.ok) throw new Error(`Certificate fetch failed: ${res.status}`);
        return [await res.arrayBuffer()];
      };
    }

    NutrientViewer.load(config)
      .then((instance: any) => {
        if (!cancelled && onInstance) onInstance(instance);
      })
      .catch((err: Error) => {
        if (!cancelled) console.error("Viewer load error:", err);
      });

    return () => {
      cancelled = true;
      NutrientViewer.unload(container);
    };
  }, [
    document,
    showSignatureValidation,
    toolbarItems,
    trustedCertificateUrl,
    onInstance,
  ]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
