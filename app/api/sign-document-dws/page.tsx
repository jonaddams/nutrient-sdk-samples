"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
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

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
};

const AVAILABLE_DOCUMENTS = [
  { path: "/documents/contract-template.pdf", name: "Contract Template" },
  {
    path: "/documents/the-wind-in-the-willows.pdf",
    name: "The Wind in the Willows",
  },
  {
    path: "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf",
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

      const documentResponse = await fetch(selectedDocument);
      if (!documentResponse.ok) {
        throw new Error("Failed to fetch document");
      }

      const documentBlob = await documentResponse.blob();

      const formData = new FormData();
      formData.append(
        "file",
        documentBlob,
        selectedDocument.split("/").pop() || "document.pdf",
      );
      formData.append("signatureType", signatureType);

      const response = await fetch("/api/sign-document-dws/api/sign", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign document");
      }

      const signedBlob = await response.blob();
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
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
              className="btn ghost btn-sm"
            >
              API Documentation
            </a>
            <a
              href="https://www.nutrient.io/guides/dws-processor/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost btn-sm"
            >
              DWS Processor Guide
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
              style={featureIconBg("var(--code-coral)")}
            >
              <svg
                className="w-6 h-6"
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
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              Server-Side Signing
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Send complete documents to DWS API for server-side digital
              signature processing
            </p>
          </div>

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
                <title>Full Document Processing</title>
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
              Full Document Processing
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Complete PDF is sent to DWS API and returned fully signed
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
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              Configurable Signatures
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Choose between visible and invisible signatures with CAdES b-lt
              validation
            </p>
          </div>
        </div>

        {/* Document Selection Section */}
        {!signedDocumentUrl && (
          <div className="p-8 mb-8" style={cardStyle}>
            <h3
              className="text-2xl font-bold mb-6"
              style={{ color: "var(--ink)" }}
            >
              Select Document to Sign
            </h3>

            {error && (
              <div
                className="mb-6 p-4"
                style={{
                  background: "color-mix(in srgb, var(--code-coral) 12%, var(--bg-elev))",
                  border: "1px solid color-mix(in srgb, var(--code-coral) 35%, var(--line))",
                  borderRadius: "var(--r-2)",
                  color: "var(--code-coral)",
                }}
              >
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="document-select"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--ink-2)" }}
                >
                  Choose PDF Document
                </label>
                <select
                  id="document-select"
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  className="w-full px-4 py-2 focus:outline-none"
                  style={inputStyle}
                >
                  {AVAILABLE_DOCUMENTS.map((doc) => (
                    <option key={doc.path} value={doc.path}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--ink-2)" }}
                >
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
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--ink)" }}
                    >
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
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--ink)" }}
                    >
                      Visible
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                  {signatureType === "invisible"
                    ? "Signature will be embedded cryptographically without visible appearance"
                    : "Signature will appear on the first page with date and watermark"}
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3
                className="text-2xl font-bold"
                style={{ color: "var(--ink)" }}
              >
                Signed Document
              </h3>
              <div className="flex gap-3">
                <a
                  href={signedDocumentUrl}
                  download={`signed-${selectedDocumentName}.pdf`}
                  className="btn ghost btn-sm"
                >
                  Download Signed PDF
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn ghost btn-sm"
                >
                  Sign Another Document
                </button>
              </div>
            </div>

            <div className="overflow-hidden" style={cardStyle}>
              <div className="h-[calc(100vh-28rem)]">
                <Viewer documentUrl={signedDocumentUrl} />
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        {!signedDocumentUrl && (
          <details className="p-6" style={cardStyle}>
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

        {!signedDocumentUrl && (
          <div
            className="mt-6 text-sm text-center"
            style={{ color: "var(--ink-3)" }}
          >
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
