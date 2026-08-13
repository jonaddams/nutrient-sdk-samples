import { type NextRequest, NextResponse } from "next/server";

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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const upstreamFormData = new FormData();
  upstreamFormData.append("file", file);

  const upstream = await fetch(`${apiUrl}/api/v1/fonts`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: upstreamFormData,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
