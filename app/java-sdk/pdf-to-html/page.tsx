"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function PdfToHtmlPage() {
  return (
    <JavaSampleLayout
      title="PDF to HTML"
      description="Convert PDF documents to HTML for web display using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/pdf-to-html"
      sampleFile="/documents/blank.pdf"
      sampleFileName="blank.pdf"
      resultType="html"
    />
  );
}
