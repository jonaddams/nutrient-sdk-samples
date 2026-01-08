"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading viewer...</p>
      </div>
    </div>
  ),
});

export default function DigitalSignaturePage() {
  // Prefetch the PDF after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = "/documents/contract-template.pdf";
      document.head.appendChild(link);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
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
              className="btn btn-sm btn-secondary"
            >
              API Documentation
            </a>
            <a
              href="https://www.nutrient.io/guides/web/signatures/digital-signatures/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Digital Signatures Guide
            </a>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Web SDK Integration
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Sign documents digitally via DWS API directly in the Nutrient Web SDK viewer
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              DWS API Signing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Secure digital signatures powered by Nutrient DWS API with token-based authentication
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Trusted Certificates
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Configured to trust Nutrient signing certificates for proper signature validation
            </p>
          </div>
        </div>

        {/* Viewer Container */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="h-[calc(100vh-32rem)]">
            {useMemo(
              () => (
                <Viewer document="/documents/contract-template.pdf" />
              ),
              [],
            )}
          </div>
        </div>

        {/* How It Works */}
        <details className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <summary className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-80">
            How It Works
          </summary>
          <ol className="mt-4 ml-5 space-y-2 text-gray-600 dark:text-gray-400 list-decimal">
            <li>Click the signature button in the toolbar to initiate the signing process</li>
            <li>The app requests an authentication token from the DWS API with signing permissions</li>
            <li>The Web SDK generates a document hash and sends it to the DWS API for signing</li>
            <li>The DWS API signs the document hash using its secure signing service</li>
            <li>The signature is returned and applied to the document in the viewer, maintaining end-to-end document privacy</li>
          </ol>
        </details>

        {/* Footer Note */}
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center space-y-2">
          <p>
            This sample demonstrates digital signature integration with Nutrient DWS API.
            Requires NUTRIENT_API_KEY environment variable to be configured
          </p>
          <p>
            Note: Signature validation requires CA certificate configuration.
            For production use with full validation, contact Nutrient support for certificate setup.
          </p>
        </div>
      </main>
    </div>
  );
}
