// app/document-authoring-sdk/template-variables/data/variables.ts

export interface TemplateVariable {
  /** Display label shown in sidebar */
  label: string;
  /** Token inserted into document (without delimiters) */
  token: string;
  /** Sample value used in preview mode */
  sampleValue: string;
}

export interface VariableCategory {
  name: string;
  variables: TemplateVariable[];
}

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: "Company",
    variables: [
      { label: "Company Name", token: "companyName", sampleValue: "Acme Corp" },
      {
        label: "Company Address",
        token: "companyAddress",
        sampleValue: "123 Business Ave, Suite 100",
      },
      {
        label: "Company City",
        token: "companyCity",
        sampleValue: "San Francisco",
      },
      {
        label: "Company State",
        token: "companyState",
        sampleValue: "CA",
      },
      {
        label: "Company Zip",
        token: "companyZip",
        sampleValue: "94105",
      },
      {
        label: "Company Email",
        token: "companyEmail",
        sampleValue: "billing@acmecorp.com",
      },
      {
        label: "Company Phone",
        token: "companyPhone",
        sampleValue: "(555) 123-4567",
      },
    ],
  },
  {
    name: "Client",
    variables: [
      { label: "Client Name", token: "clientName", sampleValue: "Jane Smith" },
      {
        label: "Client Company",
        token: "clientCompany",
        sampleValue: "Smith & Associates",
      },
      {
        label: "Client Address",
        token: "clientAddress",
        sampleValue: "456 Oak Street",
      },
      {
        label: "Client City",
        token: "clientCity",
        sampleValue: "Portland",
      },
      {
        label: "Client State",
        token: "clientState",
        sampleValue: "OR",
      },
      {
        label: "Client Zip",
        token: "clientZip",
        sampleValue: "97201",
      },
      {
        label: "Client Email",
        token: "clientEmail",
        sampleValue: "jane@smithassociates.com",
      },
    ],
  },
  {
    name: "Invoice",
    variables: [
      {
        label: "Invoice Number",
        token: "invoiceNumber",
        sampleValue: "INV-2026-0042",
      },
      {
        label: "Invoice Date",
        token: "invoiceDate",
        sampleValue: "April 14, 2026",
      },
      { label: "Due Date", token: "dueDate", sampleValue: "May 14, 2026" },
      { label: "Payment Terms", token: "paymentTerms", sampleValue: "Net 30" },
    ],
  },
  {
    name: "Items (Loop)",
    variables: [
      { label: "Loop Start", token: "#items", sampleValue: "" },
      {
        label: "Description",
        token: "description",
        sampleValue: "Website Redesign",
      },
      { label: "Quantity", token: "quantity", sampleValue: "1" },
      {
        label: "Unit Price",
        token: "unitPrice",
        sampleValue: "$3,000.00",
      },
      { label: "Amount", token: "amount", sampleValue: "$3,000.00" },
      { label: "Loop End", token: "/items", sampleValue: "" },
    ],
  },
  {
    name: "Totals",
    variables: [
      { label: "Subtotal", token: "subtotal", sampleValue: "$4,500.00" },
      { label: "Tax Rate", token: "taxRate", sampleValue: "8.5%" },
      { label: "Tax Amount", token: "taxAmount", sampleValue: "$382.50" },
      { label: "Total", token: "total", sampleValue: "$4,882.50" },
    ],
  },
];

/** Flat lookup: token → sampleValue, used for preview replacement */
export const SAMPLE_VALUES: Record<string, string> = Object.fromEntries(
  VARIABLE_CATEGORIES.flatMap((cat) =>
    cat.variables.map((v) => [v.token, v.sampleValue]),
  ),
);
