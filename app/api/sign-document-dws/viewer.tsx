"use client";

/**
 * Viewer for Signed Documents
 *
 * This component displays signed PDF documents returned from the DWS API.
 * Configured to show signature validation status for signed documents.
 */

import { useEffect, useRef, useState } from "react";

interface ViewerProps {
  documentUrl: string;
}

// Helper function to decode base64 certificates
function decodeBase64String(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function Viewer({ documentUrl }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer instance type is not available
  const instanceRef = useRef<any>(null);
  const [certificates, setCertificates] = useState<{ ca_certificates: string[] } | null>(null);

  // Fetch CA certificates on mount
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await fetch("/api/sign-document-dws/api/certificates");
        if (response.ok) {
          const data = await response.json();
          setCertificates(data);
          console.log("Certificates loaded:", data);
        } else {
          console.warn("Failed to fetch certificates - signature validation may be limited");
        }
      } catch (error) {
        console.warn("Error fetching certificates:", error);
      }
    };

    fetchCertificates();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wait for certificates to be loaded before initializing viewer
    if (certificates === null) {
      console.log("Waiting for certificates to load...");
      return;
    }

    let isMounted = true;

    const loadViewer = async () => {
      try {
        // Load Nutrient Web SDK
        // biome-ignore lint/suspicious/noExplicitAny: Window.NutrientViewer type is not available
        const NutrientViewer = (window as any).NutrientViewer;

        if (!NutrientViewer) {
          console.error("NutrientViewer is not loaded");
          return;
        }

        // Ensure container is empty before loading
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Unload any existing instance
        try {
          await NutrientViewer.unload(container);
        } catch {
          // No existing instance
        }

        if (!isMounted) return;

        // Prepare configuration
        // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer configuration type is not available
        const configuration: any = {
          container,
          document: documentUrl,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          instant: false,
          useCDN: true,
          // Show signature validation status for signed documents
          initialViewState: new NutrientViewer.ViewState({
            showSignatureValidationStatus:
              NutrientViewer.ShowSignatureValidationStatusMode.IF_SIGNED,
          }),
        };

        // Add certificate trust callback if certificates are available
        if (certificates?.ca_certificates && certificates.ca_certificates.length > 0) {
          configuration.trustedCAsCallback = async () => {
            return certificates.ca_certificates.map((cert) =>
              decodeBase64String(cert)
            );
          };
          console.log("Trusting", certificates.ca_certificates.length, "CA certificates");
        }

        // Load the instance
        const instance = await NutrientViewer.load(configuration);

        if (!isMounted) {
          await NutrientViewer.unload(container);
          return;
        }

        instanceRef.current = instance;

        console.log("Signed document loaded successfully");
      } catch (error) {
        console.error("Error loading viewer:", error);
      }
    };

    loadViewer();

    // Cleanup
    return () => {
      isMounted = false;

      // biome-ignore lint/suspicious/noExplicitAny: Window.NutrientViewer type is not available
      const NutrientViewer = (window as any)?.NutrientViewer;
      if (NutrientViewer && container) {
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore unload errors
        }
      }

      instanceRef.current = null;
    };
  }, [documentUrl, certificates]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "600px" }}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: "600px" }} />
    </div>
  );
}
