"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { isChromelessRoute } from "./chromelessRoutes";

const VERSION = process.env.NEXT_PUBLIC_WEB_SDK_VERSION || "1.16.1";
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
  const pathname = usePathname();
  // preloadWorker() captures the SDK's Standalone configuration (customFonts
  // included, as undefined) before any sample code runs. NutrientViewer
  // later asserts if a load() call supplies a DIFFERENT configuration than
  // whatever was captured first — so on the one route that needs to load
  // with customFonts (the fonts sample's pane), the preload itself would be
  // the first, font-less configuration, and every real load() would be
  // rejected. Skip only the pre-warm call there; the script tag still loads
  // everywhere so the sample can call load() itself as the first, and only,
  // configuration.
  const skipPreload = isChromelessRoute(pathname);

  return (
    <Script
      id="nutrient-viewer"
      src={`${BASE_URL}nutrient-viewer.js`}
      strategy="afterInteractive"
      onLoad={() => {
        if (skipPreload) return;
        const w = window as NutrientWindow;
        w.NutrientViewer?.preloadWorker?.({
          licenseKey: LICENSE_KEY,
          useCDN: true,
        });
      }}
    />
  );
}
