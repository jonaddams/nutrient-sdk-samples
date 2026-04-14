"use client";
import { PythonSampleLayout } from "../_components/PythonSampleLayout";

export default function PdfToHtmlPage() {
  return (
    <PythonSampleLayout
      title="PDF to HTML"
      description="Convert PDF documents to HTML for web display using the Nutrient Python SDK."
      apiEndpoint="/api/conversion/pdf-to-html"
      sampleFile="/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf"
      sampleFileName="jacques-torres-chocolate-chip-cookies-recipe.pdf"
      resultType="html"
    />
  );
}
