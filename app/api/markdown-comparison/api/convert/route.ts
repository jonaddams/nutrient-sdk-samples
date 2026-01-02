import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NUTRIENT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NUTRIENT_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = (formData.get("fileName") as string) || "document";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Prepare the request to Nutrient API
    const nutrientFormData = new FormData();
    nutrientFormData.append("file", file);
    nutrientFormData.append(
      "instructions",
      JSON.stringify({
        parts: [{ file: "file" }],
        output: { type: "markdown" },
      }),
    );

    // Call Nutrient API
    const response = await fetch("https://api.nutrient.io/build", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: nutrientFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nutrient API error:", errorText);
      return NextResponse.json(
        { error: "Failed to convert PDF to Markdown", details: errorText },
        { status: response.status },
      );
    }

    // Get the markdown text
    const markdown = await response.text();

    // Save markdown to local file in the project root
    const outputPath = join(process.cwd(), `${fileName}.md`);
    await writeFile(outputPath, markdown, "utf-8");
    console.log(`Saved Markdown to: ${outputPath}`);

    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Error in PDF to Markdown conversion:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
