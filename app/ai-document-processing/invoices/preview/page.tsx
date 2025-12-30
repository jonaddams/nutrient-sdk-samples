"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  File,
  FileText,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "../_components/Header";
import Viewer from "../_components/Viewer";
import type { InvoiceMetadata } from "../_types";

export default function PreviewInvoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "/ai-document-processing/invoices/api/invoices",
        );
        const data = await response.json();

        if (data.success) {
          setInvoices(data.invoices);
        } else {
          setError(data.error || "Failed to load invoices");
        }
      } catch (err) {
        setError("Failed to fetch invoices");
        console.error("Error fetching invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/ai-document-processing/invoices"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
            style={{ color: "var(--foreground)" }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{ color: "var(--foreground)" }}
          >
            Invoice Collection Preview
          </h1>
          <p
            className="mt-4 text-lg"
            style={{
              color: "var(--foreground)",
              opacity: 0.8,
              textAlign: "center",
            }}
          >
            {loading
              ? "Loading invoices..."
              : error
                ? "Error loading invoices"
                : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} ready for AI processing`}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <FileText
              className="mx-auto h-8 w-8 mb-2"
              style={{ color: "var(--disc-pink)" }}
            />
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {loading ? "..." : invoices.length}
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Total Invoices
            </div>
          </div>
          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <File
              className="mx-auto h-8 w-8 mb-2"
              style={{ color: "var(--code-coral)" }}
            />
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {loading ? "..." : "PDF"}
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              File Format
            </div>
          </div>
          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <HardDrive
              className="mx-auto h-8 w-8 mb-2"
              style={{ color: "var(--digital-pollen)" }}
            />
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {loading
                ? "..."
                : invoices.length > 0
                  ? Math.round(
                      (invoices.reduce((sum, inv) => sum + (inv.size || 0), 0) /
                        1024 /
                        1024) *
                        10,
                    ) / 10
                  : 0}
              MB
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Total Size
            </div>
          </div>
          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <CheckCircle
              className="mx-auto h-8 w-8 mb-2"
              style={{ color: "var(--data-green)" }}
            />
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {loading ? "..." : "Ready"}
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Status
            </div>
          </div>
        </div>

        {/* Invoice Grid */}
        <div
          className="rounded-lg overflow-hidden mb-8 border"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: "var(--neutral)" }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Invoice Documents
            </h2>
          </div>
          <div style={{ borderColor: "var(--neutral)" }}>
            {loading ? (
              <div className="px-6 py-12 text-center">
                <RefreshCw
                  className="h-8 w-8 animate-spin mx-auto mb-4"
                  style={{ color: "var(--neutral)" }}
                />
                <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
                  Loading invoices...
                </p>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="mb-2" style={{ color: "var(--code-coral)" }}>
                  Error: {error}
                </p>
                <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
                  Please check that PDF files are present in
                  /public/documents/invoices/
                </p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <File
                  className="h-12 w-12 mx-auto mb-4"
                  style={{ color: "var(--neutral)" }}
                />
                <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
                  No invoice files found
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--neutral)" }}>
                  Add PDF files to /public/documents/invoices/ folder
                </p>
              </div>
            ) : (
              invoices.map((invoice) => {
                const isSelected = selectedInvoice === invoice.filename;
                const isDarkMode =
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches;

                return (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoice(invoice.filename)}
                    className="w-full px-6 py-4 transition-all text-left border-b last:border-b-0"
                    style={{
                      borderColor: "var(--neutral)",
                      background: isSelected
                        ? isDarkMode
                          ? "var(--digital-pollen-dark)"
                          : "hsla(43, 82%, 80%, 0.4)"
                        : "transparent",
                      borderLeftWidth: isSelected ? "4px" : "0",
                      borderLeftColor: isSelected
                        ? "var(--digital-pollen)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        const isDarkMode = window.matchMedia(
                          "(prefers-color-scheme: dark)",
                        ).matches;
                        e.currentTarget.style.background = isDarkMode
                          ? "rgba(229, 192, 79, 0.1)"
                          : "hsla(43, 82%, 67%, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{
                              background: isSelected
                                ? isDarkMode
                                  ? "var(--digital-pollen)"
                                  : "var(--digital-pollen)"
                                : "rgba(239, 68, 68, 0.1)",
                            }}
                          >
                            <File
                              className="h-6 w-6"
                              style={{
                                color: isSelected
                                  ? "var(--black)"
                                  : "var(--code-coral)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{
                              color: isSelected
                                ? isDarkMode
                                  ? "var(--white)"
                                  : "var(--black)"
                                : "var(--foreground)",
                            }}
                          >
                            {invoice.filename}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{
                              color: isSelected
                                ? isDarkMode
                                  ? "var(--white)"
                                  : "var(--black)"
                                : "var(--foreground)",
                              opacity: isSelected ? 0.8 : 0.6,
                            }}
                          >
                            {invoice.size
                              ? `${Math.round((invoice.size / 1024 / 1024) * 100) / 100} MB`
                              : "Unknown size"}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Eye
                          className="h-5 w-5"
                          style={{
                            color: isSelected
                              ? isDarkMode
                                ? "var(--digital-pollen)"
                                : "var(--digital-pollen)"
                              : "var(--neutral)",
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Document Preview Section */}
        {selectedInvoice && (
          <div
            className="rounded-lg mb-8 overflow-hidden border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: "var(--neutral)" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Document Preview: {selectedInvoice}
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--foreground)", opacity: 0.7 }}
              >
                Click and interact with the invoice to examine its contents
                before processing
              </p>
            </div>
            <Viewer
              document={`/invoices/${selectedInvoice}`}
              toolbarItems={[
                { type: "zoom-out" },
                { type: "zoom-in" },
                { type: "zoom-mode" },
                { type: "search" },
              ]}
            />
          </div>
        )}

        {/* Action Button */}
        {!loading && !error && invoices.length > 0 && (
          <div className="text-center">
            <Link
              href="/ai-document-processing/invoices/results"
              className="btn btn-secondary btn-lg inline-flex items-center"
            >
              Process All Invoices ({invoices.length})
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        )}

        <div
          className="mt-16 text-center text-sm"
          style={{ color: "var(--neutral)" }}
        >
          <p>Nutrient AI Document Processing SDK (formerly XtractFlow)</p>
        </div>
      </div>
    </div>
  );
}
