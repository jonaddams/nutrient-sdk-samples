// app/api/document-generation-pipeline/api/generate/route.ts
import type { NextRequest } from "next/server";
import {
  buildInstantJson,
  type JsonContent,
  locateAnchors,
} from "../../pipeline";
import { type MergeValues, mergeTemplate, SIGNERS } from "../../template";

export const runtime = "nodejs";

interface FilePart {
  data: string | ArrayBuffer;
  filename: string;
  type: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.NUTRIENT_API_KEY;
  const baseUrl = (
    process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/"
  ).replace(/\/?$/, "/");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "NUTRIENT_API_KEY is not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const values = (await request.json()) as MergeValues;

  // One multipart POST to the DWS Build endpoint.
  async function dwsBuild(
    instructions: unknown,
    files: Record<string, FilePart>,
  ): Promise<Response> {
    const form = new FormData();
    for (const [name, part] of Object.entries(files)) {
      form.append(
        name,
        new Blob([part.data], { type: part.type }),
        part.filename,
      );
    }
    form.append("instructions", JSON.stringify(instructions));
    return fetch(`${baseUrl}build`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      const fail = (step: string, detail: string) => {
        send({ step, status: "error", detail });
        controller.close();
      };

      try {
        // Step 1: merge HTML (local).
        const html = mergeTemplate(values);
        send({
          step: "html",
          status: "done",
          detail: "Template merged with form values",
        });

        // Step 2: HTML -> PDF.
        const pdfRes = await dwsBuild(
          { parts: [{ html: "index.html" }], output: { type: "pdf" } },
          {
            "index.html": {
              data: html,
              filename: "index.html",
              type: "text/html",
            },
          },
        );
        if (!pdfRes.ok) return fail("pdf", (await pdfRes.text()).slice(0, 500));
        const pdf = await pdfRes.arrayBuffer();
        send({
          step: "pdf",
          status: "done",
          detail: `PDF generated (${pdf.byteLength.toLocaleString()} bytes)`,
        });

        // Step 3: extract text with positions and locate anchors.
        const contentRes = await dwsBuild(
          {
            parts: [{ file: "doc.pdf" }],
            output: {
              type: "json-content",
              plainText: true,
              structuredText: true,
            },
          },
          {
            "doc.pdf": {
              data: pdf,
              filename: "doc.pdf",
              type: "application/pdf",
            },
          },
        );
        if (!contentRes.ok)
          return fail("locate", (await contentRes.text()).slice(0, 500));
        const content = (await contentRes.json()) as JsonContent;
        const anchors = locateAnchors(content);
        if (anchors.length === 0) {
          return fail(
            "locate",
            "No signature anchors found in the generated document",
          );
        }
        send({
          step: "locate",
          status: "done",
          detail: `${anchors.length} signature anchors located`,
        });

        // Step 4: scrub markers (white redaction) + add signature fields, one call.
        const instantJson = buildInstantJson(anchors);
        const redactions = SIGNERS.map((signer) => ({
          type: "createRedactions",
          strategy: "text",
          strategyOptions: { text: signer.token, caseSensitive: false },
          content: { backgroundColor: "#FFFFFF", overlayText: "" },
        }));
        const finalRes = await dwsBuild(
          {
            parts: [{ file: "doc.pdf" }],
            actions: [
              ...redactions,
              { type: "applyRedactions" },
              { type: "applyInstantJson", file: "annotations.json" },
            ],
            output: { type: "pdf" },
          },
          {
            "doc.pdf": {
              data: pdf,
              filename: "doc.pdf",
              type: "application/pdf",
            },
            "annotations.json": {
              data: JSON.stringify(instantJson),
              filename: "annotations.json",
              type: "application/json",
            },
          },
        );
        if (!finalRes.ok)
          return fail("fields", (await finalRes.text()).slice(0, 500));
        const finalPdf = await finalRes.arrayBuffer();
        send({
          step: "fields",
          status: "done",
          detail: `${anchors.length} signature fields added`,
        });

        // Final line: the document + anchor summary.
        send({
          step: "done",
          pdfBase64: Buffer.from(finalPdf).toString("base64"),
          anchors: anchors.map((a) => ({
            fieldName: a.fieldName,
            label: a.label,
            page: a.pageIndex,
          })),
        });
        controller.close();
      } catch (error) {
        send({
          step: "error",
          status: "error",
          detail: error instanceof Error ? error.message : String(error),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
