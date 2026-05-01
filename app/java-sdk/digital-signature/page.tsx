"use client";

import { useCallback, useState } from "react";
import { JavaSampleHeader } from "../_components/JavaSampleHeader";
import { PdfViewer } from "../_components/PdfViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

const SOURCE_PDF = "/documents/service-agreement.pdf";
const CERT_URL = `${process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080"}/api/signing/demo-certificate`;

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
  { type: "search" },
];

export default function DigitalSignaturePage() {
  const [processing, setProcessing] = useState(false);
  const [document, setDocument] = useState<ArrayBuffer | string>(SOURCE_PDF);
  const [downloadBytes, setDownloadBytes] = useState<ArrayBuffer | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isSigned = downloadBytes !== null;

  const handleSign = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(SOURCE_PDF);
      const blob = await response.blob();
      const file = new File([blob], "service-agreement.pdf");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/signing/sign-demo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const buffer = await res.arrayBuffer();
      setDownloadBytes(buffer.slice(0));
      setDocument(buffer);
      setResultSize(buffer.byteLength);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = useCallback(() => {
    setDocument(SOURCE_PDF);
    setDownloadBytes(null);
    setResultSize(0);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!downloadBytes) return;
    const blob = new Blob([downloadBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "signed-service-agreement.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JavaSampleHeader
        title="Digital Signature"
        description="Apply a digital signature to a PDF document using a server-side certificate with the Nutrient Java SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)] flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Document
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1414] rounded-md p-3">
                  <span className="font-mono text-xs">
                    service-agreement.pdf
                  </span>
                </div>
              </div>

              <div className="p-4 border-b border-[var(--warm-gray-400)] flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Certificate
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                  <p>
                    Self-signed demo certificate stored securely on the server.
                    The private key never leaves the server.
                  </p>
                  <div className="bg-gray-50 dark:bg-[#1a1414] rounded-md p-2 font-mono">
                    <p>Signer: Nutrient SDK Demo</p>
                    <p>Type: PKCS#12</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {!isSigned ? (
                  <button
                    type="button"
                    onClick={handleSign}
                    disabled={processing}
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--digital-pollen)",
                      color: "var(--black)",
                    }}
                  >
                    {processing ? "Signing..." : "Sign Document"}
                  </button>
                ) : (
                  <>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md space-y-1">
                      <span className="text-green-600 dark:text-green-400 text-xs font-semibold">
                        Document signed successfully
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        The viewer may show a signature warning because it
                        applies stricter CA validation than Adobe. Opening the
                        downloaded PDF in Adobe Acrobat will confirm a valid
                        digital signature.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Download Signed PDF ({(resultSize / 1024).toFixed(1)} KB)
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer text-[var(--digital-pollen)] border border-[var(--digital-pollen)] bg-transparent hover:bg-[var(--digital-pollen)] hover:text-[var(--black)]"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              {error && (
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Applying digital signature...
                    </p>
                  </div>
                </div>
              )}

              <PdfViewer
                document={document}
                showSignatureValidation={isSigned}
                toolbarItems={TOOLBAR_ITEMS}
                trustedCertificateUrl={isSigned ? CERT_URL : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
