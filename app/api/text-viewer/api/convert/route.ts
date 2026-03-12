import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Converts a text file (.txt, .csv, .xml) to HTML, then uses the
 * Nutrient DWS API /build endpoint to produce a PDF.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NUTRIENT_API_KEY;
    const apiBaseUrl =
      process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/";

    if (!apiKey) {
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = (formData.get("fileType") as string) || "txt";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const textContent = await file.text();
    const html = convertToHtml(textContent, fileType);

    // Send HTML to DWS /build endpoint to get a PDF
    const htmlBlob = new Blob([html], { type: "text/html" });
    const dwsFormData = new FormData();
    dwsFormData.append("document", htmlBlob, "document.html");
    dwsFormData.append(
      "instructions",
      JSON.stringify({
        parts: [{ html: "document" }],
        output: { type: "pdf" },
      }),
    );

    const response = await fetch(`${apiBaseUrl}build`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: dwsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nutrient API error:", errorText);
      return NextResponse.json(
        { error: "Failed to convert to PDF", details: errorText },
        { status: response.status },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=converted.pdf",
      },
    });
  } catch (error) {
    console.error("Error in text-to-PDF conversion:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

function convertToHtml(content: string, fileType: string): string {
  let body: string;

  switch (fileType) {
    case "csv":
      body = csvToHtmlTable(content);
      break;
    case "xml":
      body = xmlToHtml(content);
      break;
    default:
      body = textToHtml(content);
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 40px;
      background: #fff;
    }
    /* Plain text */
    .text-line {
      margin: 0 0 2px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .text-line.empty {
      height: 1em;
    }
    /* CSV table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    th {
      background: #2c3e50;
      color: #fff;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 6px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:nth-child(even) td {
      background: #f8f9fa;
    }
    /* XML */
    .xml-line {
      margin: 0;
      white-space: pre;
      font-family: "Courier New", Courier, monospace;
      font-size: 10pt;
      line-height: 1.5;
    }
    .xml-tag { color: #2c3e50; }
    .xml-attr { color: #8e44ad; }
    .xml-value { color: #27ae60; }
    .xml-comment { color: #95a5a6; font-style: italic; }
    .xml-decl { color: #7f8c8d; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function textToHtml(content: string): string {
  const lines = content.split("\n");
  return lines
    .map((line) => {
      const escaped = escapeHtml(line);
      if (escaped.trim() === "") {
        return '<p class="text-line empty"></p>';
      }
      return `<p class="text-line">${escaped}</p>`;
    })
    .join("\n");
}

function csvToHtmlTable(content: string): string {
  const lines = content
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return "<p>Empty CSV file</p>";

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  let html = "<table>\n<thead>\n<tr>\n";
  for (const header of headers) {
    html += `  <th>${escapeHtml(header)}</th>\n`;
  }
  html += "</tr>\n</thead>\n<tbody>\n";

  for (const row of rows) {
    html += "<tr>\n";
    for (const cell of row) {
      html += `  <td>${escapeHtml(cell)}</td>\n`;
    }
    html += "</tr>\n";
  }

  html += "</tbody>\n</table>";
  return html;
}

function xmlToHtml(content: string): string {
  const lines = content.split("\n");
  return lines
    .map((line) => {
      const highlighted = highlightXmlEscaped(escapeHtml(line));
      return `<p class="xml-line">${highlighted}</p>`;
    })
    .join("\n");
}

function highlightXmlEscaped(escaped: string): string {
  let result = escaped;

  // XML declaration
  result = result.replace(
    /(&lt;\?xml[\s\S]*?\?&gt;)/g,
    '<span class="xml-decl">$1</span>',
  );

  // Comments
  result = result.replace(
    /(&lt;!--[\s\S]*?--&gt;)/g,
    '<span class="xml-comment">$1</span>',
  );

  // Attributes: name=&quot;value&quot;
  result = result.replace(
    /(\s)([\w:-]+)(=)(&quot;.*?&quot;)/g,
    '$1<span class="xml-attr">$2</span>$3<span class="xml-value">$4</span>',
  );

  // Tags: &lt;tagname or &lt;/tagname
  result = result.replace(
    /(&lt;\/?)([\w:-]+)/g,
    '$1<span class="xml-tag">$2</span>',
  );

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
