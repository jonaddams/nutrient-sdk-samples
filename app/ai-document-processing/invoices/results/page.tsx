"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Header from "../_components/Header";

interface ProcessedInvoice {
  id: string;
  fileName: string;
  vendorName: string;
  invoiceNumber: string;
  amount: string;
  status: string;
  detectedTemplate?: string;
  fields?: Array<{
    fieldName: string;
    value: {
      value: string;
      format: string;
    };
    validationState: "Valid" | "VerificationNeeded" | "Undefined";
  }>;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  summary: {
    collectionId: string;
    totalInvoices: number;
    successfulInvoices: number;
    failedInvoices: number;
    totalFields: number;
    validFields: number;
    verificationNeededFields: number;
    missingFields: number;
    overallStatus: string;
    timestamp: string;
  };
  invoices: ProcessedInvoice[];
}

// Removed complex processing steps - just show simple processing state

function ResultsContent() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [terminalRef, setTerminalRef] = useState<HTMLDivElement | null>(null);
  const hasStartedProcessing = useRef(false);

  const [showJsonModal, setShowJsonModal] = useState(false);

  const addLog = useCallback((message: string) => {
    setProcessingLogs((prev) => [...prev, message]);
  }, []);

  // Auto-scroll terminal to bottom when new logs are added
  useEffect(() => {
    if (terminalRef) {
      terminalRef.scrollTop = terminalRef.scrollHeight;
    }
  }, [terminalRef]);

  const simulateDocumentProcessing = useCallback(
    async (documents: readonly string[]) => {
      const templateMap: { [key: string]: string } = {
        invoice: "Standard Invoice",
        "tech-solutions": "Standard Invoice",
        marketing: "Standard Invoice",
        "office-supplies": "Receipt",
        "cloud-services": "Standard Invoice",
        consulting: "Service Invoice",
        print: "Receipt",
        facilities: "Service Invoice",
        software: "Standard Invoice",
        catering: "Receipt",
        transport: "Standard Invoice",
      };

      const getDocumentTemplate = (filename: string) => {
        const key = Object.keys(templateMap).find((k) => filename.includes(k));
        return key ? templateMap[key] : "Standard Invoice";
      };

      const getFieldCount = (filename: string) => {
        if (
          filename.includes("receipt") ||
          filename.includes("print") ||
          filename.includes("catering")
        )
          return Math.floor(Math.random() * 3) + 7; // 7-9 fields for receipts
        if (
          filename.includes("service") ||
          filename.includes("consulting") ||
          filename.includes("facilities")
        )
          return Math.floor(Math.random() * 3) + 8; // 8-10 fields for service invoices
        return Math.floor(Math.random() * 4) + 10; // 10-13 fields for standard invoices
      };

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const template = getDocumentTemplate(doc);
        const fieldCount = getFieldCount(doc);

        // Processing log
        addLog(`🚀 Processing ${doc}...`);
        await new Promise((resolve) => setTimeout(resolve, 800));

        // API response log
        addLog(`📡 API response for ${doc}: 200 OK`);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Success log
        addLog(
          `✅ API success for ${doc}: { detectedTemplate: '${template}', fieldsCount: ${fieldCount}, hasFields: true }`,
        );
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Completion log
        addLog(`✅ Successfully processed ${doc}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Add finalizing message
      addLog("⏳ Finalizing processing...");
    },
    [addLog],
  );

  const processInvoiceCollection = useCallback(async () => {
    try {
      // First, fetch the actual invoice files from the API
      addLog("📂 Discovering invoice files...");

      const invoicesResponse = await fetch(
        "/ai-document-processing/invoices/api/invoices",
      );
      const invoicesData = await invoicesResponse.json();

      if (!invoicesData.success) {
        throw new Error("Failed to load invoice files");
      }

      const documents = invoicesData.invoices.map(
        (inv: { filename: string }) => inv.filename,
      );

      addLog(`✅ Found ${documents.length} invoice files:`);
      documents.forEach((filename: string) => {
        addLog(`   📄 ${filename}`);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      addLog("🔧 Registering invoice templates...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog("✅ Invoice templates registered successfully");

      addLog(`📥 Pre-loading all ${documents.length} invoice files...`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      addLog(
        `📦 File loading completed: ${documents.length}/${documents.length} invoices loaded successfully`,
      );

      // Start the API call but also simulate detailed processing
      const responsePromise = fetch(
        "/ai-document-processing/invoices/api/process-invoices",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ collectionId: "dynamic-invoices" }),
        },
      );

      addLog("🚀 Starting parallel API processing of loaded invoices...");

      // Simulate document processing while waiting for real API
      await simulateDocumentProcessing(documents);

      const response = await responsePromise;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process invoices");
      }

      addLog("🎉 Parallel processing completed");
      addLog("⏳ Preparing results...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      const data: ProcessingResult = await response.json();
      addLog(
        `🏁 Invoice collection processed: ${data.summary.successfulInvoices}/${data.summary.totalInvoices} invoices processed`,
      );

      setResults(data);
      setIsProcessing(false);
    } catch (err) {
      console.error("❌ Processing failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setIsProcessing(false);
    }
  }, [simulateDocumentProcessing, addLog]);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasStartedProcessing.current) {
      return;
    }
    hasStartedProcessing.current = true;

    // Start processing immediately
    processInvoiceCollection();
  }, [processInvoiceCollection]);

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Show processing UI while processing
  if (isProcessing) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/ai-document-processing/invoices/preview"
              className="inline-flex items-center hover:opacity-80 transition-opacity"
              style={{ color: "var(--foreground)" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoice Preview
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold sm:text-4xl"
              style={{ color: "var(--foreground)" }}
            >
              Processing Invoices
            </h1>
            <p
              className="mt-2 text-lg"
              style={{ color: "var(--foreground)", opacity: 0.8 }}
            >
              Nutrient AI Document Processing is analyzing your invoice
              documents
            </p>
          </div>

          {/* Processing Logs Terminal */}
          <div
            className="rounded-lg overflow-hidden border"
            style={{
              background: "var(--black)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              className="px-4 py-2 flex items-center space-x-2"
              style={{ background: "var(--warm-gray-950)" }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "var(--code-coral)" }}
              ></div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "var(--digital-pollen)" }}
              ></div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "var(--data-green)" }}
              ></div>
              <span
                className="text-sm font-mono ml-4"
                style={{ color: "var(--warm-gray-400)" }}
              >
                Invoice Processing Terminal
              </span>
            </div>
            <div
              ref={setTerminalRef}
              className="p-4 h-64 overflow-y-auto scroll-smooth"
              style={{ scrollBehavior: "smooth" }}
            >
              <div className="font-mono text-sm">
                {processingLogs.map((log, index) => (
                  <div
                    key={`log-${index}-${log.substring(0, 20)}`}
                    className="mb-1"
                    style={{ color: "var(--data-green)" }}
                  >
                    {log}
                  </div>
                ))}
                {/* Blinking cursor */}
                <div
                  className="inline-block animate-pulse"
                  style={{ color: "var(--data-green)" }}
                >
                  ▋
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error && !isProcessing) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/ai-document-processing/invoices/preview"
              className="inline-flex items-center hover:opacity-80 transition-opacity"
              style={{ color: "var(--foreground)" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoice Preview
            </Link>
          </div>

          <div className="text-center">
            <XCircle
              className="mx-auto h-16 w-16 mb-4"
              style={{ color: "var(--code-coral)" }}
            />
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Processing Failed
            </h1>
            <p
              className="mb-4"
              style={{ color: "var(--foreground)", opacity: 0.8 }}
            >
              {error}
            </p>
            <Link
              href="/preview"
              className="btn btn-primary inline-flex items-center"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show results if processing is complete
  if (!results) return null;

  // Get all processed invoices for validation
  // const sourceInvoices = results.invoices || [];

  // Generate executive summary for invoice processing
  // const generateExecutiveSummary = () => {
  //	const failedInvoices = sourceInvoices.filter(
  //		(invoice) => invoice.status === "failed",
  //	);
  //	// ... rest of function commented out
  // };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/ai-document-processing/invoices/preview"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
            style={{ color: "var(--foreground)" }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice Preview
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{ color: "var(--foreground)" }}
          >
            Invoice Processing Complete
          </h1>
          <p
            className="mt-2 text-lg"
            style={{ color: "var(--foreground)", opacity: 0.8 }}
          >
            {results?.summary?.totalInvoices || 0} invoices processed
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            AI-powered document classification and data extraction results
          </p>
        </div>

        {/* Executive Summary */}
        <div
          className="rounded-lg p-5 mb-8 border"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--foreground)", marginBottom: "0.5rem" }}
          >
            Invoice Processing Summary
          </h2>

          {/* Processing Statistics */}
          <div className="grid md:grid-cols-4 gap-3">
            {(() => {
              // Calculate real statistics from the actual displayed data
              const totalInvoices = results.invoices.length;
              const successfulInvoices = results.invoices.filter(
                (inv) => inv.status === "completed" || inv.status === "success",
              ).length;

              let validFields = 0;
              let needsReviewFields = 0;
              let missingFields = 0;

              results.invoices.forEach((invoice) => {
                if (invoice.fields && invoice.fields.length > 0) {
                  invoice.fields.forEach((field) => {
                    const hasValue =
                      field.value?.value && field.value.value.trim() !== "";

                    if (field.validationState === "Valid") {
                      validFields++;
                    } else if (
                      field.validationState === "VerificationNeeded" ||
                      field.validationState === "Undefined"
                    ) {
                      if (hasValue) {
                        needsReviewFields++;
                      } else {
                        missingFields++;
                      }
                    } else if (hasValue) {
                      needsReviewFields++; // Unknown validation state but has value
                    } else {
                      missingFields++; // No value
                    }
                  });
                }
              });

              return (
                <>
                  <div
                    className="text-center p-4 rounded-lg border"
                    style={{
                      background: "transparent",
                      borderColor: "var(--neutral)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--disc-pink)" }}
                    >
                      {successfulInvoices}/{totalInvoices}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      Processed Invoices
                    </div>
                  </div>
                  <div
                    className="text-center p-4 rounded-lg border"
                    style={{
                      background: "transparent",
                      borderColor: "var(--neutral)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--data-green)" }}
                    >
                      {validFields}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      Valid Fields
                    </div>
                  </div>
                  <div
                    className="text-center p-4 rounded-lg border"
                    style={{
                      background: "transparent",
                      borderColor: "var(--neutral)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--digital-pollen)" }}
                    >
                      {needsReviewFields}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      Need Review
                    </div>
                  </div>
                  <div
                    className="text-center p-4 rounded-lg border"
                    style={{
                      background: "transparent",
                      borderColor: "var(--neutral)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--code-coral)" }}
                    >
                      {missingFields}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      Missing Data
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Legend */}
          <div
            className="mt-4 p-3 rounded-lg border"
            style={{
              background: "transparent",
              borderColor: "var(--neutral)",
            }}
          >
            <h3
              className="text-sm font-medium"
              style={{ color: "var(--foreground)", marginBottom: "0.25rem" }}
            >
              Field Status Legend
            </h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    background: "var(--data-green)",
                    borderColor: "var(--data-green)",
                  }}
                ></div>
                <span style={{ color: "var(--foreground)", opacity: 0.8 }}>
                  Data is validated
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    background: "var(--digital-pollen)",
                    borderColor: "var(--digital-pollen)",
                  }}
                ></div>
                <span style={{ color: "var(--foreground)", opacity: 0.8 }}>
                  Present but unable to be validated
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    background: "var(--code-coral)",
                    borderColor: "var(--code-coral)",
                  }}
                ></div>
                <span style={{ color: "var(--foreground)", opacity: 0.8 }}>
                  Missing
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Invoice Results */}
        <div
          className="rounded-lg mb-8 border"
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
              Invoice Data Extraction Results
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Extracted information from each processed invoice
            </p>
          </div>
          <div className="p-6 space-y-4">
            {results.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border rounded-lg p-4"
                style={{ borderColor: "var(--neutral)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {invoice.fileName}
                    </h3>
                    {invoice.detectedTemplate && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--disc-pink)" }}
                      >
                        Template: {invoice.detectedTemplate}
                      </p>
                    )}
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background:
                        invoice.status === "completed" ||
                        invoice.status === "success"
                          ? "var(--data-green-dark)"
                          : "var(--code-coral-dark)",
                      color: "var(--white)",
                    }}
                  >
                    {invoice.status === "completed" ||
                    invoice.status === "success"
                      ? "Processed"
                      : "Failed"}
                  </span>
                </div>

                {invoice.error ? (
                  <div
                    className="border rounded p-3"
                    style={{
                      background: "var(--code-coral-dark)",
                      borderColor: "var(--code-coral)",
                    }}
                  >
                    <div className="flex items-center">
                      <XCircle
                        className="h-4 w-4 mr-2"
                        style={{ color: "var(--white)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "var(--white)" }}
                      >
                        {invoice.error}
                      </span>
                    </div>
                  </div>
                ) : invoice.fields && invoice.fields.length > 0 ? (
                  <div className="space-y-2">
                    {/* Key Invoice Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {(() => {
                        // Define field mappings with possible API field names
                        const keyFields = [
                          {
                            label: "Vendor Name",
                            possibleNames: [
                              "vendorName",
                              "vendor",
                              "supplier",
                              "companyName",
                              "businessName",
                              "from",
                            ],
                            excludeNames: [
                              "address",
                              "vendorAddress",
                              "supplierAddress",
                              "street",
                              "boulevard",
                              "avenue",
                              "road",
                            ],
                          },
                          {
                            label: "Invoice Number",
                            possibleNames: [
                              "invoiceNumber",
                              "invoice",
                              "invoiceNo",
                              "billNumber",
                              "documentNumber",
                              "number",
                            ],
                            excludeNames: [
                              "phone",
                              "phoneNumber",
                              "contact",
                              "zip",
                              "postal",
                            ],
                          },
                          {
                            label: "Total Amount",
                            possibleNames: [
                              "totalAmount",
                              "total",
                              "grandTotal",
                              "finalAmount",
                              "amountDue",
                              "totalWithTax",
                              "totalIncVat",
                              "totalIncludingTax",
                              "amountTotal",
                              "invoiceTotal",
                            ],
                            excludeNames: [
                              "subtotal",
                              "taxAmount",
                              "vatAmount",
                              "discountAmount",
                              "shippingAmount",
                              "netAmount",
                              "beforeTax",
                              "preTax",
                              "partial",
                            ],
                          },
                          {
                            label: "Invoice Date",
                            possibleNames: [
                              "invoiceDate",
                              "date",
                              "issueDate",
                              "billDate",
                              "documentDate",
                              "createdDate",
                            ],
                            excludeNames: [
                              "dueDate",
                              "paymentDate",
                              "shipDate",
                              "deliveryDate",
                            ],
                          },
                          {
                            label: "Due Date",
                            possibleNames: [
                              "dueDate",
                              "paymentDue",
                              "paymentDate",
                              "payBy",
                              "due",
                            ],
                            excludeNames: [
                              "invoiceDate",
                              "issueDate",
                              "billDate",
                              "documentDate",
                              "createdDate",
                              "shipDate",
                              "deliveryDate",
                            ],
                          },
                        ];

                        return keyFields.map((keyField) => {
                          // Find the field using any of the possible names but exclude unwanted matches
                          let field = null;

                          if (keyField.label === "Total Amount") {
                            // Special logic for Total Amount - prioritize highest value that includes tax
                            const candidateFields =
                              invoice.fields?.filter((f) => {
                                const fieldNameLower =
                                  f.fieldName.toLowerCase();

                                // Exclude obvious non-total fields
                                const isExcluded =
                                  keyField.excludeNames?.some(
                                    (excludeName) =>
                                      fieldNameLower.includes(
                                        excludeName.toLowerCase(),
                                      ) ||
                                      excludeName
                                        .toLowerCase()
                                        .includes(fieldNameLower),
                                  ) || false;

                                if (isExcluded) return false;

                                // Check if field matches any possible names
                                return keyField.possibleNames.some(
                                  (name) =>
                                    fieldNameLower.includes(
                                      name.toLowerCase(),
                                    ) ||
                                    name.toLowerCase().includes(fieldNameLower),
                                );
                              }) || [];

                            // Among candidates, pick the one with the highest numerical value
                            // as it's likely the final total including taxes
                            field =
                              candidateFields.length > 0
                                ? candidateFields.reduce((highest, current) => {
                                    const currentValue = parseFloat(
                                      current.value?.value?.replace(
                                        /[^\d.-]/g,
                                        "",
                                      ) || "0",
                                    );
                                    const highestValue = parseFloat(
                                      highest.value?.value?.replace(
                                        /[^\d.-]/g,
                                        "",
                                      ) || "0",
                                    );
                                    return currentValue > highestValue
                                      ? current
                                      : highest;
                                  })
                                : undefined;
                          } else {
                            // Regular matching logic for other fields
                            field = invoice.fields?.find((f) => {
                              const fieldNameLower = f.fieldName.toLowerCase();

                              // Check if field matches any excluded names
                              const isExcluded =
                                keyField.excludeNames?.some(
                                  (excludeName) =>
                                    fieldNameLower.includes(
                                      excludeName.toLowerCase(),
                                    ) ||
                                    excludeName
                                      .toLowerCase()
                                      .includes(fieldNameLower),
                                ) || false;

                              if (isExcluded) return false;

                              // Check if field matches any possible names
                              return keyField.possibleNames.some(
                                (name) =>
                                  fieldNameLower.includes(name.toLowerCase()) ||
                                  name.toLowerCase().includes(fieldNameLower),
                              );
                            });
                          }

                          // More flexible validation state checking
                          const validationState = field?.validationState;
                          const hasValue =
                            field?.value?.value &&
                            field.value.value.trim() !== "";

                          // Debug log to see actual validation states
                          if (keyField.label === "Invoice Number" && field) {
                          }

                          let bgColor: string,
                            borderColor: string,
                            textColor: string;
                          if (validationState === "Valid") {
                            bgColor = "var(--data-green)";
                            borderColor = "var(--data-green)";
                            textColor = "var(--black)";
                          } else if (
                            (validationState === "VerificationNeeded" ||
                              validationState === "Undefined") &&
                            hasValue
                          ) {
                            bgColor = "var(--digital-pollen)";
                            borderColor = "var(--digital-pollen)";
                            textColor = "var(--black)";
                          } else {
                            bgColor = "var(--code-coral)";
                            borderColor = "var(--code-coral)";
                            textColor = "var(--white)";
                          }

                          return (
                            <div
                              key={`${invoice.id}-${keyField.label}`}
                              className="px-2 py-1 rounded text-xs border-2"
                              style={{
                                background: bgColor,
                                borderColor: borderColor,
                                color: textColor,
                              }}
                            >
                              <div className="font-medium">
                                {keyField.label}
                              </div>
                              <div
                                className="truncate"
                                title={field?.value?.value || "Missing"}
                              >
                                {field?.value?.value || "Missing"}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Additional Fields - Compact Grid */}
                    {(() => {
                      // Define the key field names that were already shown (including both possible and exclude names)
                      const keyFieldNames = [
                        // Vendor Name
                        "vendorName",
                        "vendor",
                        "supplier",
                        "companyName",
                        "businessName",
                        "from",
                        // Invoice Number
                        "invoiceNumber",
                        "invoice",
                        "invoiceNo",
                        "billNumber",
                        "documentNumber",
                        "number",
                        // Total Amount (including tax)
                        "totalAmount",
                        "total",
                        "grandTotal",
                        "finalAmount",
                        "amountDue",
                        "totalWithTax",
                        "totalIncVat",
                        "totalIncludingTax",
                        "amountTotal",
                        "invoiceTotal",
                        // Invoice Date
                        "invoiceDate",
                        "date",
                        "issueDate",
                        "billDate",
                        "documentDate",
                        "createdDate",
                        // Due Date
                        "dueDate",
                        "paymentDue",
                        "paymentDate",
                        "payBy",
                        "due",
                      ];

                      const remainingFields = invoice.fields.filter((f) => {
                        const fieldNameLower = f.fieldName.toLowerCase();
                        return !keyFieldNames.some(
                          (keyName) =>
                            fieldNameLower.includes(keyName.toLowerCase()) ||
                            keyName.toLowerCase().includes(fieldNameLower),
                        );
                      });

                      return (
                        remainingFields.length > 0 && (
                          <details className="mt-2">
                            <summary
                              className="text-xs cursor-pointer"
                              style={{
                                color: "var(--foreground)",
                                opacity: 0.7,
                              }}
                            >
                              View additional {remainingFields.length} extracted
                              fields
                            </summary>
                            <div className="mt-2 space-y-1">
                              {remainingFields.map((field) => {
                                // More flexible validation state checking
                                const validationState = field.validationState;
                                const hasValue =
                                  field.value?.value &&
                                  field.value.value.trim() !== "";

                                let bgColor: string, textColor: string;
                                if (validationState === "Valid") {
                                  bgColor = "var(--data-green)";
                                  textColor = "var(--black)";
                                } else if (
                                  (validationState === "VerificationNeeded" ||
                                    validationState === "Undefined") &&
                                  hasValue
                                ) {
                                  bgColor = "var(--digital-pollen)";
                                  textColor = "var(--black)";
                                } else {
                                  bgColor = "var(--code-coral)";
                                  textColor = "var(--white)";
                                }

                                return (
                                  <div
                                    key={field.fieldName}
                                    className="px-3 py-2 rounded text-sm flex justify-between items-start"
                                    style={{
                                      background: bgColor,
                                      color: textColor,
                                    }}
                                  >
                                    <div className="font-medium">
                                      {formatFieldName(field.fieldName)}:
                                    </div>
                                    <div className="ml-3 text-right flex-1">
                                      {field.value?.value || "—"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )
                      );
                    })()}
                  </div>
                ) : (
                  <div
                    className="text-center py-4 text-sm"
                    style={{ color: "var(--neutral)" }}
                  >
                    No data extracted from this invoice
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/ai-document-processing/invoices/preview"
            className="btn btn-secondary inline-flex items-center"
          >
            Process More Invoices
          </Link>
          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="btn btn-secondary inline-flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            View JSON Results
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(results, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `invoice-processing-results.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-primary inline-flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </button>
        </div>

        {/* JSON Modal */}
        {showJsonModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0, 0, 0, 0.5)" }}
          >
            <div
              className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border"
              style={{
                background: "var(--background)",
                borderColor: "var(--neutral)",
              }}
            >
              <div
                className="flex items-center justify-between p-6 border-b"
                style={{ borderColor: "var(--neutral)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Invoice Processing Results - JSON
                </h2>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(results, null, 2),
                      );
                      // You could add a toast notification here
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJsonModal(false)}
                    className="p-2 rounded-md hover:opacity-70 transition-opacity"
                    style={{ color: "var(--neutral)" }}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <pre
                  className="json-content rounded-lg p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto"
                  style={{
                    background: "var(--black)",
                    color: "var(--data-green)",
                    border: "1px solid var(--neutral)",
                  }}
                >
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
              <div
                className="flex justify-end space-x-3 p-6 border-t"
                style={{ borderColor: "var(--neutral)" }}
              >
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(results, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `invoice-processing-results.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn btn-primary"
                >
                  <Download className="inline h-4 w-4 mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="mt-8 text-center text-sm"
          style={{ color: "var(--neutral)" }}
        >
          <p>
            Nutrient AI Document Processing SDK • Processed at{" "}
            {new Date(results.summary.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{ background: "var(--background)" }}
        >
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div
              className="rounded-lg p-12 border"
              style={{
                background: "var(--background)",
                borderColor: "var(--neutral)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div className="text-center">
                <RefreshCw
                  className="h-12 w-12 animate-spin mx-auto mb-4"
                  style={{ color: "var(--disc-pink)" }}
                />
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Loading Results
                </h3>
                <p style={{ color: "var(--foreground)", opacity: 0.8 }}>
                  Please wait while we load your processing results...
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
