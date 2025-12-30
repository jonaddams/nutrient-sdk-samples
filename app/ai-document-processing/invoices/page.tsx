import { ArrowRight, CheckCircle, FileText, Zap } from "lucide-react";
import Link from "next/link";

import Header from "./_components/Header";

export default function InvoiceManagement() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold"
            style={{ color: "var(--foreground)", marginBottom: "1rem" }}
          >
            AI Document Processing
          </h1>
          <h3
            className="text-3xl sm:text-3xl font-bold"
            style={{
              color: "var(--foreground)",
              opacity: 0.7,
              marginBottom: "1.5rem",
            }}
          >
            Invoice Management Demo
          </h3>
          <p
            className="mt-6 max-w-3xl mx-auto text-base sm:text-lg text-center"
            style={{ color: "var(--foreground)", opacity: 0.9 }}
          >
            Experience AI-powered document classification and data extraction
            for invoices. Process your invoice collection and watch as our
            advanced technology automatically extracts and validates key
            information.
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <FileText
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: "var(--disc-pink)" }}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Smart Invoice Recognition
            </h3>
            <p
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Automatically identifies and classifies invoices, receipts,
              purchase orders, and utility bills.
            </p>
          </div>

          <div
            className="rounded-lg p-6 text-center border"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <Zap
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: "var(--digital-pollen)" }}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Instant Data Extraction
            </h3>
            <p
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Extracts key information like vendor details, amounts, dates, and
              line items in seconds.
            </p>
          </div>

          <div
            className="rounded-lg p-6 text-center border sm:col-span-2 md:col-span-1"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <CheckCircle
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: "var(--data-green)" }}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Built-in Validation
            </h3>
            <p
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Validates extracted data for accuracy and completeness, ensuring
              reliable invoice processing.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/ai-document-processing/invoices/preview"
            className="btn btn-secondary btn-lg inline-flex items-center"
          >
            Preview Invoice Collection
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        <div
          className="mt-12 text-center text-sm"
          style={{ color: "var(--neutral)" }}
        >
          <p>
            This is a proof-of-concept demonstration of the Nutrient AI Document
            Processing API capabilities.
          </p>
          <p className="mt-2">Powered by Nutrient Document Processing SDK</p>
        </div>
      </div>
    </div>
  );
}
