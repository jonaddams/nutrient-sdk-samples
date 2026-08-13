import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

export default function DotNetSDKPage() {
  return (
    <SamplesIndex
      title=".NET SDK"
      description="File optimization, linearization, and OCR for .NET workloads."
      samples={samples}
      productHomeUrl="https://www.nutrient.io/guides/dotnet/"
      guidesUrl="https://www.nutrient.io/guides/dotnet/"
      intro={
        <div className="callout">
          <span className="callout-label">How these samples work</span>
          <p>
            This Next.js frontend calls server-side .NET routes that wrap the
            Nutrient .NET SDK. Routes live under <code>/api/dotnet-sdk</code>.
          </p>
        </div>
      }
    />
  );
}
