"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function PdfToXlsxPage() {
  return (
    <JavaSampleLayout
      title="PDF to XLSX"
      description="Convert PDF tables and data to Excel spreadsheets using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/pdf-to-xlsx"
      sampleFile="/documents/blank.pdf"
      sampleFileName="blank.pdf"
      resultType="download"
    />
  );
}
