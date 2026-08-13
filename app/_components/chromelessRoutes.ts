/**
 * Route prefixes that render with no site chrome (TopBar, Footer).
 *
 * Used by the fonts sample's pane route (app/dotnet-sdk/fonts/pane/page.tsx),
 * which is embedded in an <iframe> as a bare viewer — the surrounding
 * SDK Samples navigation and footer would just eat vertical space there.
 */
const CHROMELESS_PREFIXES = ["/dotnet-sdk/fonts/pane"];

export function isChromelessRoute(pathname: string | null): boolean {
  return CHROMELESS_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}
