"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function PdfToDocxPage() {
  return (
    <JavaSampleLayout
      title="PDF to DOCX"
      description="Convert PDF documents to editable Word format using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/pdf-to-docx"
      sampleFile="/documents/the-wind-in-the-willows.pdf"
      sampleFileName="the-wind-in-the-willows.pdf"
      resultType="download"
    />
  );
}
