"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 mb-4"
          style={{
            border: "2px solid var(--line)",
            borderBottomColor: "var(--accent)",
          }}
        />
        <p style={{ color: "var(--ink-3)" }}>Loading viewer...</p>
      </div>
    </div>
  ),
});

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
};

const featureIconBg = (token: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${token} 18%, var(--bg-elev))`,
  color: token,
  borderRadius: "var(--r-2)",
});

export default function DigitalSignaturePage() {
  // Prefetch the PDF after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = "/documents/web-sdk-dws.pdf";
      document.head.appendChild(link);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PageHeader
        title="Web SDK Digital Signature with DWS API"
        description="Sign documents directly in the Nutrient Web SDK viewer using DWS API for secure digital signatures"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Nutrient DWS API", href: "/api" },
        ]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/api/signing-api/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost btn-sm"
            >
              API Documentation
            </a>
            <a
              href="https://www.nutrient.io/guides/web/signatures/digital-signatures/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost btn-sm"
            >
              Digital Signatures Guide
            </a>
          </>
        }
      />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
        }}
      >
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--disc-pink)")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Web SDK Integration</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              Web SDK Integration
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Sign documents digitally via DWS API directly in the Nutrient Web
              SDK viewer
            </p>
          </div>

          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--accent)")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>DWS API</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              DWS API Signing
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Secure digital signatures powered by Nutrient DWS API with
              token-based authentication
            </p>
          </div>

          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--data-green)")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Trusted Certificates</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              Trusted Certificates
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Configured to trust Nutrient signing certificates for proper
              signature validation
            </p>
          </div>
        </div>

        {/* Viewer Container */}
        <div className="overflow-hidden mb-8" style={cardStyle}>
          <div className="h-[calc(100vh-32rem)]">
            {useMemo(
              () => (
                <Viewer document="/documents/web-sdk-dws.pdf" />
              ),
              [],
            )}
          </div>
        </div>

        {/* How It Works */}
        <details className="p-6 mb-8" style={cardStyle}>
          <summary
            className="text-xl font-semibold cursor-pointer hover:opacity-80"
            style={{ color: "var(--ink)" }}
          >
            How It Works
          </summary>
          <ol
            className="mt-4 ml-5 space-y-2 list-decimal"
            style={{ color: "var(--ink-2)" }}
          >
            <li>
              Click the signature button in the toolbar to initiate the signing
              process
            </li>
            <li>
              The app requests an authentication token from the DWS API with
              signing permissions
            </li>
            <li>
              The Web SDK generates a document hash and sends it to the DWS API
              for signing
            </li>
            <li>
              The DWS API signs the document hash using its secure signing
              service
            </li>
            <li>
              The signature is returned and applied to the document in the
              viewer, maintaining end-to-end document privacy
            </li>
          </ol>
        </details>

        {/* Footer Note */}
        <div
          className="text-sm text-center space-y-2"
          style={{ color: "var(--ink-3)" }}
        >
          <p>
            This sample demonstrates digital signature integration with Nutrient
            DWS API. Requires NUTRIENT_API_KEY environment variable to be
            configured
          </p>
          <p>
            Note: Signature validation requires CA certificate configuration.
            For production use with full validation, contact Nutrient support
            for certificate setup.
          </p>
        </div>
      </main>
    </div>
  );
}
