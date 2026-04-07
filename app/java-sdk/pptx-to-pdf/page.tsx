"use client";
import { JavaSampleLayout } from "../_components/JavaSampleLayout";

export default function PptxToPdfPage() {
  return (
    <JavaSampleLayout
      title="PPTX to PDF"
      description="Convert PowerPoint presentations to PDF format using the Nutrient Java SDK."
      apiEndpoint="/api/conversion/pptx-to-pdf"
      sampleFile="/documents/sample-presentation.pptx"
      sampleFileName="sample-presentation.pptx"
      resultType="pdf"
    />
  );
}
