/**
 * Route prefixes that get special-cased as "just a bare viewer, embedded in
 * an <iframe>" rather than a normal page in the app.
 *
 * Used by:
 * - TopBar / Footer, which render nothing there — the surrounding SDK
 *   Samples navigation and footer would just eat vertical space inside the
 *   iframe.
 * - NutrientViewerScript, which skips its preloadWorker() pre-warm call
 *   there. preloadWorker() captures the SDK's Standalone configuration
 *   (customFonts included, as undefined) before any sample code runs, and
 *   NutrientViewer rejects any later load() whose configuration differs —
 *   which a customFonts-supplying pane's load() always would. Skipping the
 *   preload there lets that pane's own load() be the first configuration.
 *
 * Currently just the fonts sample's pane route
 * (app/dotnet-sdk/fonts/pane/page.tsx).
 */
const CHROMELESS_PREFIXES = ["/dotnet-sdk/fonts/pane"];

export function isChromelessRoute(pathname: string | null): boolean {
  return CHROMELESS_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}
