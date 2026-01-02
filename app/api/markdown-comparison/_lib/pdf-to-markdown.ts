/**
 * Converts a PDF file or path to Markdown using the Nutrient DWS API
 */
export async function convertPdfToMarkdown(
  document: string | ArrayBuffer | File,
): Promise<string> {
  let fileToSend: File;
  let fileName = "document";

  // Convert various input types to File object
  if (typeof document === "string") {
    // Fetch the document from URL
    const response = await fetch(document);
    const blob = await response.blob();
    // Extract filename from URL
    const urlParts = document.split("/");
    fileName = urlParts[urlParts.length - 1].replace(".pdf", "");
    fileToSend = new File([blob], "document.pdf", { type: "application/pdf" });
  } else if (document instanceof ArrayBuffer) {
    // Convert ArrayBuffer to File
    const blob = new Blob([document], { type: "application/pdf" });
    fileToSend = new File([blob], "document.pdf", { type: "application/pdf" });
  } else if (document instanceof File) {
    fileToSend = document;
    fileName = document.name.replace(".pdf", "");
  } else {
    throw new Error("Unsupported document type");
  }

  // Send to our API route
  const formData = new FormData();
  formData.append("file", fileToSend);
  formData.append("fileName", fileName);

  const response = await fetch("/api/markdown-comparison/api/convert", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to convert PDF to Markdown");
  }

  const { markdown } = await response.json();
  return markdown;
}
