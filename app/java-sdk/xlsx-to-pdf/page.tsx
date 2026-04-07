"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function XlsxToPdfPage() {
  return (
    <JavaSampleLayout
      title="XLSX to PDF"
      description="Convert Excel spreadsheets to PDF format using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/xlsx-to-pdf"
      sampleFile="/documents/quarterly-sales.csv"
      sampleFileName="quarterly-sales.csv"
      resultType="pdf"
    />
  );
}
