import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const invoicesDir = path.join(process.cwd(), "public", "invoices");

    // Read all files in the invoices directory
    const files = await readdir(invoicesDir);

    // Filter for PDF files and get file stats
    const pdfFiles = [];
    for (const file of files) {
      if (file.toLowerCase().endsWith(".pdf")) {
        const filePath = path.join(invoicesDir, file);
        const stats = await stat(filePath);

        pdfFiles.push({
          id: `inv-${pdfFiles.length + 1}`.padStart(7, "0"),
          filename: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          status: "pending",
        });
      }
    }

    // Sort by filename for consistent ordering
    pdfFiles.sort((a, b) => a.filename.localeCompare(b.filename));

    return NextResponse.json({
      success: true,
      count: pdfFiles.length,
      invoices: pdfFiles,
    });
  } catch (error) {
    console.error("Error reading invoices directory:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to read invoices directory",
        invoices: [],
      },
      { status: 500 },
    );
  }
}
