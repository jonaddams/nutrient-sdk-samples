"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
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

const AVAILABLE_DOCUMENTS = [
  { path: "/documents/contract-template.pdf", name: "Contract Template" },
  {
    path: "/documents/the-wind-in-the-willows.pdf",
    name: "The Wind in the Willows",
  },
  {
    path: "/documents/jacques-torres-chocolate-chip-cookies.pdf",
    name: "Chocolate Chip Cookies Recipe",
  },
  { path: "/documents/usenix-example-paper.pdf", name: "USENIX Example Paper" },
];

export default function SignDocumentDWSPage() {
  const [selectedDocument, setSelectedDocument] = useState<string>(
    AVAILABLE_DOCUMENTS[0].path,
  );
  const [signatureType, setSignatureType] = useState<"invisible" | "visible">(
    "invisible",
  );
  const [isSigning, setIsSigning] = useState(false);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSign = useCallback(async () => {
    try {
      setIsSigning(true);
      setError(null);

      // Fetch the selected document
      const documentResponse = await fetch(selectedDocument);
      if (!documentResponse.ok) {
        throw new Error("Failed to fetch document");
      }

      const documentBlob = await documentResponse.blob();

      // Prepare form data
      const formData = new FormData();
      formData.append(
        "file",
        documentBlob,
        selectedDocument.split("/").pop() || "document.pdf",
      );
      formData.append("signatureType", signatureType);

      // Call our API to sign the document
      const response = await fetch("/api/sign-document-dws/api/sign", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign document");
      }

      // Get the signed PDF blob
      const signedBlob = await response.blob();

      // Create a URL for the signed document
      const url = URL.createObjectURL(signedBlob);
      setSignedDocumentUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign document");
    } finally {
      setIsSigning(false);
    }
  }, [selectedDocument, signatureType]);

  const handleReset = useCallback(() => {
    setSignatureType("invisible");
    if (signedDocumentUrl) {
      URL.revokeObjectURL(signedDocumentUrl);
      setSignedDocumentUrl(null);
    }
    setError(null);
  }, [signedDocumentUrl]);

  const selectedDocumentName = useMemo(() => {
    return (
      AVAILABLE_DOCUMENTS.find((doc) => doc.path === selectedDocument)?.name ||
      "document"
    );
  }, [selectedDocument]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="DWS API Document Signing"
        description="Sign PDF documents server-side by uploading to Nutrient DWS Processor API"
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
              href="https://www.nutrient.io/guides/dws-processor/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              DWS Processor Guide
            </a>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-orange-600 dark:text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Server-Side Signing</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Server-Side Signing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Send complete documents to DWS API for server-side digital
              signature processing
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-pink-600 dark:text-pink-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Full Document Processing</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Full Document Processing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Complete PDF is sent to DWS API and returned fully signed
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-teal-600 dark:text-teal-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Configurable Signatures</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Configurable Signatures
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Choose between visible and invisible signatures with CAdES b-lt
              validation
            </p>
          </div>
        </div>

        {/* Document Selection Section */}
        {!signedDocumentUrl && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Select Document to Sign
            </h3>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Document Selection */}
              <div>
                <label
                  htmlFor="document-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Choose PDF Document
                </label>
                <select
                  id="document-select"
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {AVAILABLE_DOCUMENTS.map((doc) => (
                    <option key={doc.path} value={doc.path}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Signature Type */}
              <div>
                <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Signature Type
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signature-type"
                      value="invisible"
                      checked={signatureType === "invisible"}
                      onChange={(e) =>
                        setSignatureType(e.target.value as "invisible")
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      Invisible (Cryptographic only)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signature-type"
                      value="visible"
                      checked={signatureType === "visible"}
                      onChange={(e) =>
                        setSignatureType(e.target.value as "visible")
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      Visible
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {signatureType === "invisible"
                    ? "Signature will be embedded cryptographically without visible appearance"
                    : "Signature will appear on the first page with date and watermark"}
                </p>
              </div>

              {/* Sign Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigning ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <title>Loading</title>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing Document...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <title>Sign Document</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      Sign Document via DWS API
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signed Document Viewer */}
        {signedDocumentUrl && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Signed Document
              </h3>
              <div className="flex gap-3">
                <a
                  href={signedDocumentUrl}
                  download={`signed-${selectedDocumentName}.pdf`}
                  className="btn btn-sm btn-secondary"
                >
                  Download Signed PDF
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-sm btn-secondary"
                >
                  Sign Another Document
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-[calc(100vh-28rem)]">
                <Viewer documentUrl={signedDocumentUrl} />
              </div>
            </div>
          </div>
        )}

        {/* How It Works - Collapsible */}
        {!signedDocumentUrl && (
          <details className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <summary className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-80">
              How It Works
            </summary>
            <ol className="mt-4 ml-5 space-y-2 text-gray-600 dark:text-gray-400 list-decimal">
              <li>Select a PDF document from the available samples</li>
              <li>Choose between visible or invisible signature types</li>
              <li>
                The entire document is sent to the DWS Processor API via POST
                request
              </li>
              <li>
                DWS API applies a CAdES b-lt digital signature to the document
              </li>
              <li>
                The signed PDF is returned and displayed in the Web SDK viewer
              </li>
              <li>
                Download the signed document with legally binding digital
                signature
              </li>
            </ol>
          </details>
        )}

        {/* Footer Note */}
        {!signedDocumentUrl && (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            <p>
              This sample demonstrates server-side document signing using DWS
              Processor API. Requires NUTRIENT_API_KEY environment variable to
              be configured
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
