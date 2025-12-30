import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/lib/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Nutrient SDK Samples",
  description:
    "Interactive examples and demos showcasing Nutrient SDKs and features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* DNS prefetch hints for faster CDN connections when needed */}
        <link rel="dns-prefetch" href="//cdn.cloud.pspdfkit.com" />
        <link rel="dns-prefetch" href="//document-authoring.cdn.nutrient.io" />
        <link
          rel="preconnect"
          href="https://cdn.cloud.pspdfkit.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
