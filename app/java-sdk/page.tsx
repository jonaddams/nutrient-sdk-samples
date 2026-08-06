import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

const categories = ["All", "Conversion", "Signatures"];

export default function JavaSDKPage() {
  return (
    <SamplesIndex
      title="Java SDK"
      description="Server-side conversion, OCR, and digital signing for JVM applications."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/sdk/java/"
      guidesUrl="https://www.nutrient.io/guides/java/"
      intro={
        <div className="callout">
          <span className="callout-label">How these samples work</span>
          <p>
            This Next.js frontend calls a{" "}
            <a
              href="https://github.com/jonaddams/java-spring-boot"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spring Boot backend
            </a>{" "}
            that wraps the Nutrient Java SDK. The frontend handles uploads and
            displays results; the backend performs the conversions, signing, and
            other operations.
          </p>
        </div>
      }
    />
  );
}
