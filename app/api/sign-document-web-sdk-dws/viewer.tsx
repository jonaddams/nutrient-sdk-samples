"use client";

/**
 * Digital Signature Sample with Nutrient DWS API
 *
 * This component demonstrates how to:
 * 1. Create a custom toolbar item with a signature icon
 * 2. Request authentication tokens from the DWS API
 * 3. Use the instance.signDocument() method to digitally sign documents
 * 4. Configure trusted CA certificates to validate signatures
 *
 * Key Features:
 * - Custom toolbar integration using toolbarItems configuration
 * - Token-based authentication with DWS API
 * - Trusted certificate callback for signature validation
 * - Status feedback during the signing process
 *
 * References:
 * - DWS API Signing: https://www.nutrient.io/api/signing-api/
 * - Custom Toolbar: https://www.nutrient.io/guides/web/user-interface/main-toolbar/create-a-new-tool/
 * - signDocument API: https://www.nutrient.io/api/web/classes/NutrientViewer.Instance.html#signdocument
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface ViewerProps {
  document: string;
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

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer instance type is not available
  const instanceRef = useRef<any>(null);
  const certificatesRef = useRef<{ ca_certificates: string[] } | null>(null);
  const hasLoadedRef = useRef(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signStatus, setSignStatus] = useState<string>("");
  const [certificatesLoaded, setCertificatesLoaded] = useState(false);

  // Fetch CA certificates on mount
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        // Fetch the CA certificates from DWS API
        const response = await fetch(
          "/api/sign-document-web-sdk-dws/api/certificates",
        );
        if (response.ok) {
          const data = await response.json();
          certificatesRef.current = data;
          console.log("Certificates loaded:", data);
        } else {
          console.warn(
            "Failed to fetch certificates - signature validation may be limited",
          );
        }
      } catch (error) {
        console.warn("Error fetching certificates:", error);
      } finally {
        // Always mark as loaded even if fetch failed
        setCertificatesLoaded(true);
      }
    };

    fetchCertificates();
  }, []);

  // Create custom toolbar items with signature button
  const toolbarItems = useMemo(() => {
    return [
      { type: "sidebar-thumbnails" },
      { type: "sidebar-document-outline" },
      { type: "sidebar-annotations" },
      { type: "sidebar-bookmarks" },
      { type: "pager" },
      { type: "zoom-out" },
      { type: "zoom-in" },
      { type: "zoom-mode" },
      { type: "spacer" },
      {
        type: "custom",
        id: "digital-signature-button",
        title: "Sign Document",
        className: "DigitalSignatureButton",
        icon: "/digital-fingerprint.png",
        onPress: async () => {
          const instance = instanceRef.current;

          if (!instance) {
            setSignStatus("Error: Viewer not loaded yet");
            setTimeout(() => setSignStatus(""), 3000);
            return;
          }

          if (isSigning) {
            return;
          }

          try {
            setIsSigning(true);
            setSignStatus("Requesting authentication token...");

            const tokenResponse = await fetch(
              "/api/sign-document-web-sdk-dws/api/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  origin: window.location.origin,
                }),
              },
            );

            if (!tokenResponse.ok) {
              throw new Error("Failed to get authentication token");
            }

            const { token } = await tokenResponse.json();

            // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer types not available
            const NutrientViewer = (window as any).NutrientViewer;

            // Flatten all annotations before signing
            setSignStatus("Preparing document...");
            console.log("Flattening all annotations before signing...");
            await instance.applyOperations([
              {
                type: "flattenAnnotations",
              },
            ]);
            console.log("All annotations flattened successfully");

            setSignStatus("Signing document...");

            const result = await instance.signDocument(
              {
                signingData: {
                  signatureType: NutrientViewer.SignatureType.CAdES,
                  padesLevel: NutrientViewer.PAdESLevel.b_lt,
                },
              },
              {
                jwt: token,
              },
            );

            console.log("signDocument result:", result);
            console.log("Document signed successfully with DWS API!");

            // Check if document actually has signatures
            try {
              const annotations = await instance.getAnnotations(0);
              console.log("Annotations on page 0:", annotations.size);
            } catch (e) {
              console.log("Could not get annotations:", e);
            }

            setSignStatus("Document signed successfully!");
            setTimeout(() => setSignStatus(""), 3000);
          } catch (error) {
            console.error("Error signing document:", error);
            setSignStatus(
              `Error: ${error instanceof Error ? error.message : String(error)}`,
            );
            setTimeout(() => setSignStatus(""), 5000);
          } finally {
            setIsSigning(false);
          }
        },
      },
      { type: "search" },
      { type: "print" },
      { type: "export-pdf" },
    ] as const;
  }, [isSigning]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: toolbarItems is intentionally excluded to prevent viewer from reloading after signing (which would lose the signature)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wait for certificates to be loaded before initializing viewer
    if (!certificatesLoaded) {
      return;
    }

    // Prevent double-loading in React strict mode
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
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

        // Unload any existing instance in this container
        try {
          await NutrientViewer.unload(container);
        } catch {
          // No existing instance, continue
        }

        // Only proceed if component is still mounted
        if (!isMounted) return;

        // Prepare configuration
        // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer configuration type is not available
        const configuration: any = {
          container,
          document,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          toolbarItems,
          instant: false,
          useCDN: true,
          // Show signature validation status when document is signed
          initialViewState: new NutrientViewer.ViewState({
            showSignatureValidationStatus:
              NutrientViewer.ShowSignatureValidationStatusMode.IF_SIGNED,
          }),
        };

        // Add certificate trust callback if certificates are available
        const certs = certificatesRef.current;
        if (certs?.ca_certificates && certs.ca_certificates.length > 0) {
          configuration.trustedCAsCallback = async () => {
            return certs.ca_certificates.map((cert: string) =>
              decodeBase64String(cert),
            );
          };
          console.log(
            "Trusting",
            certs.ca_certificates.length,
            "CA certificates",
          );
        }

        // Load the instance
        const instance = await NutrientViewer.load(configuration);

        if (!isMounted) {
          // Component unmounted during load, clean up using NutrientViewer.unload
          await NutrientViewer.unload(container);
          return;
        }

        instanceRef.current = instance;

        // Make instance available globally for debugging
        if (typeof window !== "undefined") {
          // biome-ignore lint/suspicious/noExplicitAny: Window global type extension
          (window as any).viewerInstance = instance;
        }

        console.log("Viewer loaded successfully");
      } catch (error) {
        console.error("Error loading viewer:", error);
        hasLoadedRef.current = false; // Reset on error
      }
    };

    loadViewer();

    // Cleanup
    return () => {
      isMounted = false;
      hasLoadedRef.current = false; // Reset for potential remount

      // Unload using the container reference
      // biome-ignore lint/suspicious/noExplicitAny: Window.NutrientViewer type is not available
      const NutrientViewer = (window as any)?.NutrientViewer;
      if (NutrientViewer && container) {
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore unload errors during cleanup
        }
      }

      instanceRef.current = null;
    };
  }, [document, certificatesLoaded]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "600px" }}>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: "600px" }}
      />

      {/* Status overlay */}
      {signStatus && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              signStatus.includes("Error")
                ? "bg-red-500 text-white"
                : signStatus.includes("success")
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          >
            {signStatus}
          </div>
        </div>
      )}
    </div>
  );
}
