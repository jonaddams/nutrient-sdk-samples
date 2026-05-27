"use client";

import Script from "next/script";

const VERSION = process.env.NEXT_PUBLIC_WEB_SDK_VERSION || "1.10.0";
const BASE_URL = `https://cdn.cloud.pspdfkit.com/pspdfkit-web@${VERSION}/`;
const LICENSE_KEY = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

type NutrientWindow = Window & {
  NutrientViewer?: {
    preloadWorker?: (cfg: {
      licenseKey?: string;
      useCDN?: boolean;
    }) => Promise<void>;
  };
};

export function NutrientViewerScript() {
  return (
    <Script
      id="nutrient-viewer"
      src={`${BASE_URL}nutrient-viewer.js`}
      strategy="afterInteractive"
      onLoad={() => {
        const w = window as NutrientWindow;
        w.NutrientViewer?.preloadWorker?.({
          licenseKey: LICENSE_KEY,
          useCDN: true,
        });
      }}
    />
  );
}
