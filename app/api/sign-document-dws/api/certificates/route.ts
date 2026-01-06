import { NextResponse } from "next/server";

/**
 * Fetches CA certificates from DWS API for digital signature validation
 */
export async function GET() {
  try {
    const apiKey = process.env.NUTRIENT_API_KEY;
    const apiBaseUrl = process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/";

    if (!apiKey) {
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    // Fetch CA certificates from Nutrient DWS API
    const response = await fetch(`${apiBaseUrl}i/certificates`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nutrient DWS API certificates error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch certificates", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();

    // DWS API returns {data: {ca_certificates: [...]}}
    return NextResponse.json(data.data || data);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
