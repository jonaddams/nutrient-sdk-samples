import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("=== DWS TOKEN API CALLED ===");
  console.log("Timestamp:", new Date().toISOString());

  try {
    const apiKey = process.env.NUTRIENT_API_KEY;
    const apiBaseUrl =
      process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/";

    console.log("API Base URL:", apiBaseUrl);
    console.log("API Key available:", !!apiKey);
    console.log("API Key (first 10 chars):", apiKey?.substring(0, 10) + "...");

    if (!apiKey) {
      console.error("ERROR: NUTRIENT_API_KEY is not configured");
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    // Get origin from request body or headers
    const body = await request.json();
    const origin = body.origin || request.headers.get("origin") || "*";

    console.log("Request origin:", origin);

    // Create a JWT token for digital signatures API
    const tokenRequestBody = {
      allowedOperations: ["digital_signatures_api"],
      allowedOrigins: [origin],
      expirationTime: 3600, // 1 hour
    };

    console.log("Requesting token from DWS API:");
    console.log("  URL:", `${apiBaseUrl}tokens`);
    console.log("  Request body:", JSON.stringify(tokenRequestBody, null, 2));

    const response = await fetch(`${apiBaseUrl}tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(tokenRequestBody),
    });

    console.log("DWS API response status:", response.status);
    console.log("DWS API response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DWS API token creation error:", errorText);
      return NextResponse.json(
        { error: "Failed to create JWT token", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("DWS API success - token created");
    console.log("Token ID:", data.id);
    console.log("Access token (first 20 chars):", data.accessToken?.substring(0, 20) + "...");

    return NextResponse.json({ token: data.accessToken });
  } catch (error) {
    console.error("Error generating authentication token:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
