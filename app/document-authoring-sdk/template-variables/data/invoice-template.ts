// app/document-authoring-sdk/template-variables/data/invoice-template.ts

// --- DocJSON type helpers (local, mirrors document-builder pattern) ---

type DocJsonRun = {
  type: "r";
  text: string;
  rPr?: Record<string, unknown>;
};

type DocJsonParagraph = {
  type: "p";
  pPr?: Record<string, unknown>;
  elements: DocJsonRun[];
};

type DocJsonTableCell = {
  elements: DocJsonParagraph[];
  tcPr?: Record<string, unknown>;
};

type DocJsonTableRow = {
  cells: DocJsonTableCell[];
};

type DocJsonTable = {
  type: "t";
  rows: DocJsonTableRow[];
};

type DocJsonElement = DocJsonParagraph | DocJsonTable;

// --- Helpers ---

function run(text: string, props?: Record<string, unknown>): DocJsonRun {
  return { type: "r", text, ...(props ? { rPr: props } : {}) };
}

function para(
  runs: DocJsonRun[],
  props?: Record<string, unknown>,
): DocJsonParagraph {
  return { type: "p", elements: runs, ...(props ? { pPr: props } : {}) };
}

function textPara(
  text: string,
  runProps?: Record<string, unknown>,
  paraProps?: Record<string, unknown>,
): DocJsonParagraph {
  return para([run(text, runProps)], paraProps);
}

function emptyPara(): DocJsonParagraph {
  return { type: "p", elements: [] };
}

function cell(
  paragraphs: DocJsonParagraph[],
  props?: Record<string, unknown>,
): DocJsonTableCell {
  return { elements: paragraphs, ...(props ? { tcPr: props } : {}) };
}

// --- Template ---

const heading = { bold: true, pointSize: 11, color: "#1F4E79" };
const label = { bold: true, pointSize: 10 };
const value = { pointSize: 10 };
const smallGray = { pointSize: 9, color: "#666666" };

export function buildInvoiceTemplate(): object {
  const elements: DocJsonElement[] = [];

  // --- Header ---
  elements.push(
    textPara("{{companyName}}", { bold: true, pointSize: 22, color: "#1a1a2e" }),
  );
  elements.push(textPara("{{companyAddress}}", smallGray));
  elements.push(textPara("{{companyCity}}", smallGray));
  elements.push(
    textPara("{{companyEmail}}  |  {{companyPhone}}", smallGray),
  );

  elements.push(emptyPara());

  // --- INVOICE title ---
  elements.push(
    textPara("INVOICE", { bold: true, pointSize: 18, color: "#1F4E79" }),
  );

  elements.push(emptyPara());

  // --- Invoice details (as a 2-column table) ---
  elements.push({
    type: "t",
    rows: [
      {
        cells: [
          cell([
            textPara("Invoice Number", label),
            textPara("{{invoiceNumber}}", value),
          ]),
          cell([
            textPara("Invoice Date", label),
            textPara("{{invoiceDate}}", value),
          ]),
        ],
      },
      {
        cells: [
          cell([
            textPara("Due Date", label),
            textPara("{{dueDate}}", value),
          ]),
          cell([
            textPara("Payment Terms", label),
            textPara("{{paymentTerms}}", value),
          ]),
        ],
      },
    ],
  });

  elements.push(emptyPara());

  // --- Bill To ---
  elements.push(textPara("Bill To", heading));
  elements.push(textPara("{{clientName}}", value));
  elements.push(textPara("{{clientCompany}}", value));
  elements.push(textPara("{{clientAddress}}", value));
  elements.push(textPara("{{clientCity}}", value));

  elements.push(emptyPara());

  // --- Line items table (static sample rows — variables focus is on header/footer) ---
  elements.push(textPara("Items", heading));
  elements.push({
    type: "t",
    rows: [
      {
        cells: [
          cell([textPara("Description", label)]),
          cell([textPara("Qty", label)]),
          cell([textPara("Unit Price", label)]),
          cell([textPara("Amount", label)]),
        ],
      },
      {
        cells: [
          cell([textPara("Website Redesign", value)]),
          cell([textPara("1", value)]),
          cell([textPara("$3,000.00", value)]),
          cell([textPara("$3,000.00", value)]),
        ],
      },
      {
        cells: [
          cell([textPara("SEO Optimization", value)]),
          cell([textPara("1", value)]),
          cell([textPara("$1,500.00", value)]),
          cell([textPara("$1,500.00", value)]),
        ],
      },
    ],
  });

  elements.push(emptyPara());

  // --- Totals ---
  elements.push({
    type: "t",
    rows: [
      {
        cells: [
          cell([textPara("Subtotal", label)]),
          cell([textPara("{{subtotal}}", value)]),
        ],
      },
      {
        cells: [
          cell([textPara("Tax ({{taxRate}})", label)]),
          cell([textPara("{{taxAmount}}", value)]),
        ],
      },
      {
        cells: [
          cell([
            textPara("Total Due", { bold: true, pointSize: 12, color: "#1F4E79" }),
          ]),
          cell([
            textPara("{{total}}", { bold: true, pointSize: 12, color: "#1F4E79" }),
          ]),
        ],
      },
    ],
  });

  elements.push(emptyPara());

  // --- Footer ---
  elements.push(
    textPara(
      "Thank you for your business! Please remit payment by {{dueDate}}.",
      smallGray,
    ),
  );

  return {
    type: "https://pspdfkit.com/document-authoring/persistence/container",
    version: 1,
    container: {
      document: {
        body: {
          sections: [{ elements }],
        },
      },
    },
  };
}
