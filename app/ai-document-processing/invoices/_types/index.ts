export type FieldFormat = "Text" | "Number" | "Date" | "Currency";

export type ValidationMethod =
  | "PostalAddressIntegrity"
  | "IBANIntegrity"
  | "CreditCardNumberIntegrity"
  | "VehicleIdentificationNumberIntegrity"
  | "EmailIntegrity"
  | "URIIntegrity"
  | "VATIdIntegrity"
  | "PhoneNumberIntegrity"
  | "CurrencyIntegrity"
  | "DateIntegrity"
  | "NumberIntegrity"
  | null;

export type ValidationState = "Undefined" | "VerificationNeeded" | "Valid";

export interface TemplateField {
  name: string;
  semanticDescription: string;
  format: FieldFormat;
  validationMethod: ValidationMethod;
}

export interface DocumentTemplate {
  name: string;
  fields: TemplateField[];
  identifier: string;
  semanticDescription: string;
}

export interface RegisterComponentRequest {
  enableClassifier: boolean;
  enableExtraction: boolean;
  templates: DocumentTemplate[];
}

export interface RegisterComponentResponse {
  componentId: string;
}

export interface FieldValue {
  value: string;
  format: FieldFormat;
}

export interface ProcessedField {
  fieldName: string;
  value: FieldValue;
  validationState: ValidationState;
}

export interface ProcessDocumentResponse {
  detectedTemplate: string | null;
  fields: ProcessedField[] | null;
}

export interface InvoiceCollection {
  id: string;
  name: string;
  description: string;
  invoices: InvoiceMetadata[];
}

export interface InvoiceMetadata {
  id: string;
  filename: string;
  vendorName?: string;
  invoiceNumber?: string;
  date?: string;
  amount?: string;
  status: string;
  size?: number;
  lastModified?: string;
}

export interface InvoiceProcessingSummary {
  totalInvoices: number;
  processedInvoices: number;
  validFields: number;
  invalidFields: number;
  missingFields: number;
  overallStatus: "valid" | "needs_review" | "invalid";
}

export interface InvoiceResult {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed";
  detectedTemplate: string | null;
  fields: {
    name: string;
    value: string;
    status: "valid" | "verification_needed" | "missing" | "invalid";
  }[];
}

export interface InvoiceProcessingResults {
  summary: InvoiceProcessingSummary;
  invoices: InvoiceResult[];
}

export interface ProcessingStep {
  id: number;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
}
