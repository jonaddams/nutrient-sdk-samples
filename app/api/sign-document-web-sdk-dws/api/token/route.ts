import { NextResponse } from "next/server";

export async function POST() {
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

    // Create a JWT token for digital signatures API
    const response = await fetch(`${apiBaseUrl}tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        allowedOperations: ["digital_signatures_api"],
        expirationTime: 3600, // 1 hour
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DWS API token creation error:", errorText);
      return NextResponse.json(
        { error: "Failed to create JWT token", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();

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
