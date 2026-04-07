"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function DocxToPdfPage() {
  return (
    <JavaSampleLayout
      title="DOCX to PDF"
      description="Convert Word documents to PDF format using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/docx-to-pdf"
      sampleFile="/documents/sample-invoice.docx"
      sampleFileName="sample-invoice.docx"
      resultType="pdf"
    />
  );
}
