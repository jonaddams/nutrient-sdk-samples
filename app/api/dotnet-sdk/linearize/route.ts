import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_DOTNET_SDK_API_URL;
  const apiKey = process.env.DOTNET_SDK_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        error: "config",
        message:
          "DOTNET_SDK_API_KEY and NEXT_PUBLIC_DOTNET_SDK_API_URL must be set.",
      },
      { status: 500 },
    );
  }

  // Read the incoming body as formData (more compatible than streaming in all Next.js 16 configs)
  const formData = await request.formData();
  const upstreamFormData = new FormData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  upstreamFormData.append("file", file);

  const upstream = await fetch(`${apiUrl}/api/v1/linearize`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: upstreamFormData,
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ??
        'inline; filename="linearized.pdf"',
    },
  });
}
