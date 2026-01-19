import { NextResponse } from "next/server";

/**
 * Fetches CA certificates from DWS API for digital signature validation
 */
export async function GET() {
  console.log("=== CERTIFICATES API CALLED ===");
  console.log("Timestamp:", new Date().toISOString());

  try {
    const apiKey = process.env.NUTRIENT_API_KEY;
    const apiBaseUrl =
      process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/";

    console.log("API Base URL:", apiBaseUrl);
    console.log("API Key available:", !!apiKey);

    if (!apiKey) {
      console.error("ERROR: NUTRIENT_API_KEY is not configured");
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const certificatesUrl = `${apiBaseUrl}i/certificates`;
    console.log("Fetching certificates from:", certificatesUrl);

    // Fetch CA certificates from Nutrient DWS API
    const response = await fetch(certificatesUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    console.log("DWS API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DWS API certificates error:", {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to fetch certificates", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("Certificates fetched successfully");
    console.log("Certificate count:", data.data?.ca_certificates?.length || data.ca_certificates?.length || 0);

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
