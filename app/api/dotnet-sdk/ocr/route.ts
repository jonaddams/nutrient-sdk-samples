import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_DOTNET_SDK_API_URL;
  const apiKey = process.env.DOTNET_SDK_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        error: "config",
        message: "DOTNET_SDK_API_KEY and NEXT_PUBLIC_DOTNET_SDK_API_URL must be set.",
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") ?? "eng";
  const format = url.searchParams.get("format"); // "json" or null

  const formData = await request.formData();
  const upstreamFormData = new FormData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  upstreamFormData.append("file", file);

  const upstreamUrl = new URL(`${apiUrl}/api/v1/ocr`);
  upstreamUrl.searchParams.set("lang", lang);
  if (format === "json") upstreamUrl.searchParams.set("format", "json");

  const upstream = await fetch(upstreamUrl.toString(), {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: upstreamFormData,
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  // Pass through the upstream content type — JSON for text mode, application/pdf for PDF mode.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ??
        (format === "json" ? "application/json" : "application/pdf"),
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ??
        (format === "json" ? "" : 'inline; filename="ocr.pdf"'),
    },
  });
}
