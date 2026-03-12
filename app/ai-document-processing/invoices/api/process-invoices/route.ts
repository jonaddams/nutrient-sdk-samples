import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import type { DocumentTemplate } from "../../_types";

// Configure route segment for longer execution time
export const maxDuration = 300; // 5 minutes (maximum for Pro plan, 60s for Hobby)
export const dynamic = "force-dynamic"; // Disable caching for this route

const API_BASE_URL =
  process.env.NEXT_PUBLIC_NUTRIENT_API_URL || "https://api.xtractflow.com";
const AUTH_TOKEN = process.env.NUTRIENT_AUTH_TOKEN;

// Common headers for API requests
const commonHeaders = {
  "User-Agent": "invoice-management-system/1.0",
};

// Optimized invoice template with comprehensive field extraction
const INVOICE_TEMPLATE = {
  name: "Comprehensive Invoice",
  identifier: "comprehensive_invoice",
  semanticDescription:
    "Business invoice in any language or format — standard invoices, progress invoices, purchase invoices, or Rechnungen — with vendor, customer, financial, and line-item details across industries including tech, construction, design, manufacturing, and food supply",
  fields: [
    // Vendor/Supplier Information
    {
      name: "vendorName",
      semanticDescription:
        "Name of the vendor, supplier, contractor, or service provider issuing the invoice (e.g. company name from the header, logo area, or 'From' section)",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "vendorAddress",
      semanticDescription:
        "Complete business address of the vendor including street, city, state/region, country, and postal code",
      format: "Text" as const,
      validationMethod: "PostalAddressIntegrity" as const,
    },
    {
      name: "vendorPhone",
      semanticDescription:
        "Phone number or contact number of the vendor, including international format (e.g. +1, +49)",
      format: "Text" as const,
      validationMethod: "PhoneNumberIntegrity" as const,
    },
    {
      name: "vendorEmail",
      semanticDescription:
        "Email address of the vendor or billing contact (e.g. billing@, info@, hello@, orders@)",
      format: "Text" as const,
      validationMethod: "EmailIntegrity" as const,
    },
    {
      name: "vendorTaxId",
      semanticDescription:
        "Tax identifier of the vendor — Tax ID, EIN, VAT number, USt-IdNr., or business registration number (e.g. DE 287 456 123, US-87-4521903)",
      format: "Text" as const,
      validationMethod: null,
    },

    // Customer/Buyer Information
    {
      name: "customerName",
      semanticDescription:
        "Name of the customer, client, buyer, or owner receiving the invoice (from the 'Bill To', 'Customer', 'Rechnungsempfänger', or 'To' section)",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "customerAddress",
      semanticDescription:
        "Billing or shipping address of the customer including street, city, state/region, and postal code",
      format: "Text" as const,
      validationMethod: "PostalAddressIntegrity" as const,
    },
    {
      name: "customerContact",
      semanticDescription:
        "Customer contact person name, department, or attention line (e.g. 'Attn:', 'Ansprechpartner:', 'Buyer:')",
      format: "Text" as const,
      validationMethod: null,
    },

    // Invoice Details
    {
      name: "invoiceNumber",
      semanticDescription:
        "Unique invoice number or identifier (look for 'Invoice #', 'Invoice No.', 'Rechnung', 'RE-', 'NT-', 'GL-', 'AC-', 'SD-', or similar alphanumeric codes)",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "invoiceDate",
      semanticDescription:
        "Date the invoice was issued or created — NOT the due date or payment date. Look for labels like 'Date', 'Issue Date', 'Issued', 'Invoice Date', 'Rechnungsdatum', or 'Datum'. This is the earliest date on the invoice, before the due date.",
      format: "Date" as const,
      validationMethod: "DateIntegrity" as const,
    },
    {
      name: "dueDate",
      semanticDescription:
        "Payment due date — NOT the invoice issue date. Look for labels like 'Due', 'Due Date', 'Payment Due', 'Fälligkeitsdatum', or 'Zahlungsziel'. This is the later date by which payment must be made.",
      format: "Date" as const,
      validationMethod: "DateIntegrity" as const,
    },
    {
      name: "purchaseOrder",
      semanticDescription:
        "Purchase order number, PO reference, contract number, or project reference (e.g. 'PO Ref', 'Bestellnummer', 'Contract #', 'SOW-')",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "invoiceType",
      semanticDescription:
        "Type of invoice if stated — e.g. 'Invoice', 'Progress Invoice', 'Purchase Invoice', 'Rechnung', 'Credit Note'",
      format: "Text" as const,
      validationMethod: null,
    },

    // Financial Details
    {
      name: "subtotal",
      semanticDescription:
        "Subtotal amount before taxes, discounts, and additional charges (may appear as 'Subtotal', 'Zwischensumme', 'Nettobetrag')",
      format: "Currency" as const,
      validationMethod: "CurrencyIntegrity" as const,
    },
    {
      name: "taxAmount",
      semanticDescription:
        "Total tax amount — sales tax, VAT, MwSt., or other taxes applied to the invoice",
      format: "Currency" as const,
      validationMethod: "CurrencyIntegrity" as const,
    },
    {
      name: "taxRate",
      semanticDescription:
        "Tax rate percentage (e.g., 8.875%, 19%, 21% — extract the number without the % symbol)",
      format: "Number" as const,
      validationMethod: "NumberIntegrity" as const,
    },
    {
      name: "discountAmount",
      semanticDescription:
        "Discount, volume discount, Mengenrabatt, or retainer credit amount applied to the invoice",
      format: "Currency" as const,
      validationMethod: "CurrencyIntegrity" as const,
    },
    {
      name: "shippingAmount",
      semanticDescription:
        "Shipping, delivery, freight, or handling charges (e.g. 'Refrigerated Shipping', 'Shipping/Handling')",
      format: "Currency" as const,
      validationMethod: "CurrencyIntegrity" as const,
    },
    {
      name: "totalAmount",
      semanticDescription:
        "Final total amount due or payable including all taxes and charges (may appear as 'Total Due', 'Amount Due', 'Balance Due', 'Rechnungsbetrag', 'Amount Paid')",
      format: "Currency" as const,
      validationMethod: "CurrencyIntegrity" as const,
    },

    // Payment Information
    {
      name: "paymentTerms",
      semanticDescription:
        "Payment terms — e.g. 'Net 30', 'Due on receipt', '30 Tage netto', retainage percentage, or Skonto conditions",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "paymentMethod",
      semanticDescription:
        "Payment method or bank details — bank transfer, wire, PayPal, IBAN, routing number, BIC/SWIFT, or Bankverbindung",
      format: "Text" as const,
      validationMethod: null,
    },

    // Line Items (General)
    {
      name: "itemDescriptions",
      semanticDescription:
        "List of all line-item descriptions — products, services, project phases, SKUs, or Artikelnummern including any category headers",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "itemQuantities",
      semanticDescription:
        "Quantities for each line item — may be units, hours, cases, days (Tage), or Stück",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "itemPrices",
      semanticDescription:
        "Unit prices, rates, or per-item costs for each line item (e.g. hourly rate, price per case, Einzelpreis)",
      format: "Text" as const,
      validationMethod: null,
    },

    // Additional Information
    {
      name: "currency",
      semanticDescription:
        "Currency used in the invoice — USD ($), EUR (€), GBP (£), or other currency codes/symbols",
      format: "Text" as const,
      validationMethod: null,
    },
    {
      name: "notes",
      semanticDescription:
        "Additional notes, terms and conditions, special instructions, Hinweise, or project references on the invoice",
      format: "Text" as const,
      validationMethod: null,
    },
  ],
};

// Get predefined templates from the API
async function getPredefinedTemplates(): Promise<DocumentTemplate | null> {
  console.log("📋 Fetching predefined templates...");

  try {
    const headers = {
      Authorization: AUTH_TOKEN || "",
      ...commonHeaders,
    };
    console.log(
      "🔑 Using auth token:",
      AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 8)}...` : "Not set",
    );

    const response = await fetch(
      `${API_BASE_URL}/api/get-predefined-templates`,
      {
        method: "GET",
        headers,
      },
    );

    if (!response.ok) {
      console.warn(
        "⚠️ Could not fetch predefined templates, using custom template",
      );
      return null;
    }

    const templates: DocumentTemplate[] = await response.json();
    console.log("✅ Fetched predefined templates:", templates.length);

    // Look for invoice-related templates
    const invoiceTemplates = templates.filter(
      (t: DocumentTemplate) =>
        t.name.toLowerCase().includes("invoice") ||
        t.identifier.toLowerCase().includes("invoice"),
    );

    if (invoiceTemplates.length > 0) {
      console.log(
        "🎯 Found predefined invoice templates:",
        invoiceTemplates.map((t: DocumentTemplate) => t.name),
      );
      return invoiceTemplates[0]; // Use the first invoice template found
    }

    return null;
  } catch (error) {
    console.warn("⚠️ Error fetching predefined templates:", error);
    return null;
  }
}

// Register templates and get component ID
async function registerInvoiceTemplates() {
  console.log("🔧 Registering invoice processing templates...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    // Try to get a predefined invoice template first
    const predefinedTemplate = await getPredefinedTemplates();
    const templateToUse = predefinedTemplate || INVOICE_TEMPLATE;

    console.log("📝 Using template:", templateToUse.name);
    console.log("🌐 API Base URL:", API_BASE_URL);
    console.log(
      "🔑 Auth token:",
      AUTH_TOKEN ? `${AUTH_TOKEN.substring(0, 8)}...` : "Not set",
    );

    const requestBody = {
      enableClassifier: true,
      enableExtraction: true,
      templates: [templateToUse],
    };
    console.log(
      "📤 Registration request body:",
      JSON.stringify(requestBody, null, 2),
    );

    const response = await fetch(`${API_BASE_URL}/api/register-component`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_TOKEN || "",
        ...commonHeaders,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Template registration failed:", errorText);
      throw new Error(
        `Template registration failed: ${response.status} ${errorText}`,
      );
    }

    const result = await response.json();
    console.log("✅ Template registration response:", result);

    if (!result.componentId) {
      console.error("❌ No componentId returned from registration:", result);
      throw new Error("No componentId returned from template registration");
    }

    console.log(
      "✅ Invoice templates registered successfully, componentId:",
      result.componentId,
    );
    return result.componentId;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error("⏰ Timeout registering templates after 30 seconds");
      throw new Error(
        "Timeout registering templates: Request took longer than 30 seconds",
      );
    }
    throw error;
  }
}

async function fetchInvoiceFile(fileName: string) {
  const filePath = join(process.cwd(), "public", "invoices", fileName);
  console.log(`📥 Reading invoice from filesystem: ${filePath}`);

  try {
    const fileBuffer = await readFile(filePath);
    console.log(`✅ Successfully read ${fileName}: ${fileBuffer.length} bytes`);
    return new Blob([new Uint8Array(fileBuffer)]);
  } catch (error) {
    console.error(`❌ Failed to read file ${filePath}:`, error);
    throw new Error(
      `Failed to read ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function processInvoiceDocument(
  file: Blob,
  fileName: string,
  componentId: string,
) {
  const formData = new FormData();
  formData.append("inputFile", file, fileName);
  formData.append("componentId", componentId);

  console.log(
    `🚀 Processing invoice ${fileName} with componentId: ${componentId}...`,
  );

  // Validate componentId format
  if (!componentId || typeof componentId !== "string") {
    throw new Error(`Invalid componentId: ${componentId}`);
  }

  // Create an AbortController with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout for invoices

  try {
    const response = await fetch(`${API_BASE_URL}/api/process`, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN || "",
        ...commonHeaders,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(
      `📡 API response for ${fileName}: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error for ${fileName}:`, errorText);
      throw new Error(
        `API error for ${fileName}: ${response.status} ${errorText}`,
      );
    }

    const result = await response.json();
    console.log(`✅ API success for ${fileName}:`, {
      detectedTemplate: result.detectedTemplate,
      fieldsCount: result.fields ? result.fields.length : 0,
      hasFields: !!result.fields,
    });

    // Log all field names and date-related values for debugging
    if (result.fields && result.fields.length > 0) {
      const allFieldNames = result.fields.map(
        (f: { fieldName: string }) => f.fieldName,
      );
      console.log(`🔍 All field names for ${fileName}:`, allFieldNames);

      // Log any field that looks date-related
      const dateRelated = result.fields.filter(
        (f: { fieldName: string; value: { value: string } }) => {
          const name = f.fieldName.toLowerCase();
          return (
            name.includes("date") ||
            name.includes("due") ||
            name.includes("invoice") ||
            name.includes("total") ||
            name.includes("amount")
          );
        },
      );
      console.log(
        `📅 Date/amount fields for ${fileName}:`,
        JSON.stringify(dateRelated, null, 2),
      );
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`⏰ Timeout processing ${fileName} after 90 seconds`);
      throw new Error(
        `Timeout processing ${fileName}: Request took longer than 90 seconds`,
      );
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log(
    "🔥 Invoice processing route called at",
    new Date().toISOString(),
  );

  try {
    if (!AUTH_TOKEN) {
      console.error("❌ Missing authentication token");
      return NextResponse.json(
        { error: "Authentication token not configured" },
        { status: 500 },
      );
    }

    const { collectionId } = await request.json();
    console.log(
      `📋 Processing invoice collection: ${collectionId || "dynamic"}`,
    );

    // Get all invoice files from the invoices directory
    const invoicesDir = join(process.cwd(), "public", "invoices");
    const allFiles = await readdir(invoicesDir);
    const pdfFiles = allFiles.filter((file) =>
      file.toLowerCase().endsWith(".pdf"),
    );

    if (pdfFiles.length === 0) {
      return NextResponse.json(
        { error: "No PDF files found in invoices directory" },
        { status: 400 },
      );
    }

    console.log(`📁 Found ${pdfFiles.length} invoice files:`, pdfFiles);

    // Register invoice processing templates
    console.log("🔧 Starting template registration process...");
    const componentId = await registerInvoiceTemplates();
    console.log(`📋 Got componentId for processing: ${componentId}`);

    // Step 1: Fetch all invoice files in parallel
    console.log(`📥 Pre-loading all ${pdfFiles.length} invoice files...`);
    const fileLoadingPromises = pdfFiles.map(async (fileName) => {
      try {
        const fileBlob = await fetchInvoiceFile(fileName);
        console.log(`✅ Loaded ${fileName}: ${fileBlob.size} bytes`);
        return { fileName, fileBlob, error: null };
      } catch (error) {
        console.error(`❌ Error loading ${fileName}:`, error);
        return { fileName, fileBlob: null, error };
      }
    });

    const fileResults = await Promise.all(fileLoadingPromises);
    console.log(
      `📦 File loading completed: ${fileResults.filter((r) => r.fileBlob).length}/${fileResults.length} files loaded successfully`,
    );

    // Step 2: Process all invoices with API in parallel
    console.log(`🚀 Starting parallel API processing of loaded invoices...`);

    const processingPromises = fileResults.map(async (fileResult) => {
      const { fileName, fileBlob, error: loadError } = fileResult;

      // If file loading failed, return failed result
      if (loadError || !fileBlob) {
        return {
          id: fileName,
          fileName: fileName,
          status: "failed",
          error:
            loadError instanceof Error
              ? loadError.message
              : "Failed to load file",
          timestamp: new Date().toISOString(),
        };
      }

      try {
        console.log(`🚀 Processing ${fileName} with API...`);

        // Process with API using invoice templates
        const apiResult = await processInvoiceDocument(
          fileBlob,
          fileName,
          componentId,
        );

        // Format the result
        const processedResult = {
          id: fileName,
          fileName: fileName,
          status: "completed",
          detectedTemplate: apiResult.detectedTemplate,
          fields: apiResult.fields || [],
          apiResponse: apiResult,
          timestamp: new Date().toISOString(),
        };

        console.log(`✅ Successfully processed ${fileName}`);
        return processedResult;
      } catch (error) {
        console.error(`❌ Error processing ${fileName}:`, error);

        return {
          id: fileName,
          fileName: fileName,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    });

    // Wait for all invoices to be processed
    const results = await Promise.all(processingPromises);
    console.log(
      `🎉 Parallel processing completed: ${results.length} invoices processed`,
    );

    // Calculate summary statistics
    const successCount = results.filter((r) => r.status === "completed").length;
    const completedResults = results.filter(
      (r) => r.status === "completed",
    ) as Array<{
      fields?: Array<{ validationState: string }>;
    }>;

    const totalFields = completedResults
      .filter((r) => r.fields)
      .reduce((acc, r) => acc + (r.fields?.length || 0), 0);

    const validFields = completedResults
      .filter((r) => r.fields)
      .reduce((acc, r) => {
        return (
          acc +
          (r.fields?.filter((f) => f.validationState === "Valid").length || 0)
        );
      }, 0);

    const verificationFields = completedResults
      .filter((r) => r.fields)
      .reduce((acc, r) => {
        return (
          acc +
          (r.fields?.filter((f) => f.validationState === "VerificationNeeded")
            .length || 0)
        );
      }, 0);

    const missingFields = completedResults
      .filter((r) => r.fields)
      .reduce((acc, r) => {
        return (
          acc +
          (r.fields?.filter((f) => f.validationState === "Undefined").length ||
            0)
        );
      }, 0);

    const summary = {
      collectionId: collectionId || "dynamic-invoices",
      totalInvoices: results.length,
      successfulInvoices: successCount,
      failedInvoices: results.length - successCount,
      totalFields,
      validFields,
      verificationNeededFields: verificationFields,
      missingFields: missingFields,
      overallStatus: successCount === results.length ? "completed" : "partial",
      timestamp: new Date().toISOString(),
    };

    console.log(`🏁 Invoice processing completed:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      invoices: results,
    });
  } catch (error) {
    console.error("💥 Unexpected error in process-invoices route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
