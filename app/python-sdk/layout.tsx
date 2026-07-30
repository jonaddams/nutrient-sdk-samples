export default function PythonSDKLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No <Script> here on purpose. The root layout (app/layout.tsx) already loads
  // the Web SDK app-wide via <NutrientViewerScript />, so loading it again here
  // evaluated the SDK TWICE and replaced window.NutrientViewer. Annotation
  // classes read from the global then no longer matched the module instance
  // that had created the viewer Instance, and instance.create() rejected them
  // with "Changes: Unsupported change type".
  //
  // Latent until a sample created annotations — every other python-sdk sample
  // only calls load()/unload(), which work from either copy. The
  // extraction-studio sample is the first to draw citations.
  //
  // Adding a matching `id` does NOT fix it: next/script cannot dedupe a
  // server-injected beforeInteractive script against the root's
  // afterInteractive one. Verified — still two tags.
  return <>{children}</>;
}
