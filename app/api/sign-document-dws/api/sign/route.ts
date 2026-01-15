import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NUTRIENT_API_KEY;
    const apiBaseUrl =
      process.env.NUTRIENT_API_BASE_URL || "https://api.nutrient.io/";

    if (!apiKey) {
      console.error("NUTRIENT_API_KEY is not configured");
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const signatureType = formData.get("signatureType") as string;

    console.log("Received signing request:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      signatureType,
    });

    if (!file) {
      console.error("No file provided in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Prepare the request to Nutrient DWS Sign API
    const dwsFormData = new FormData();
    dwsFormData.append("file", file);

    // Build signature configuration
    const signatureData: Record<string, unknown> = {
      signatureType: "cades",
      cadesLevel: "b-lt",
    };

    // Add position configuration based on signature type
    if (signatureType === "invisible") {
      // For invisible signatures, use a zero-size rect to make it invisible
      signatureData.position = {
        pageIndex: 0,
        rect: [0, 0, 0, 0], // [x, y, width, height] - zero size makes it invisible
      };
    } else {
      // For visible signatures, add position and appearance
      signatureData.position = {
        pageIndex: 0,
        rect: [50, 50, 200, 100], // [x, y, width, height] in PDF points
      };

      signatureData.appearance = {
        mode: "signatureAndDescription",
        showWatermark: true,
        showSignDate: true,
        showDateTimezone: false,
      };
    }

    console.log(
      "Signature configuration:",
      JSON.stringify(signatureData, null, 2),
    );

    dwsFormData.append("data", JSON.stringify(signatureData));

    console.log("Sending request to DWS API:", `${apiBaseUrl}sign`);

    // Call Nutrient DWS Sign API
    const response = await fetch(`${apiBaseUrl}sign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: dwsFormData,
    });

    console.log("DWS API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nutrient DWS Sign API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to sign document", details: errorText },
        { status: response.status },
      );
    }

    // Get the signed PDF as a buffer
    const signedPdfBuffer = await response.arrayBuffer();

    // Return the signed PDF
    return new NextResponse(signedPdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="signed-${file.name}"`,
      },
    });
  } catch (error) {
    console.error("Error signing document:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
