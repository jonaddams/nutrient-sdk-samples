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
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link
          rel="preconnect"
          href="https://cdn.cloud.pspdfkit.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://document-authoring.cdn.nutrient.io"
        />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />

        {/* CodeMirror CSS for JSON editor */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/codemirror.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/theme/material-darker.min.css"
        />

        {/* External Scripts - Using traditional script tags for better compatibility */}
        <script
          src={`https://document-authoring.cdn.nutrient.io/releases/document-authoring-${process.env.NEXT_PUBLIC_DOCUMENT_AUTHORING_SDK_VERSION || "1.10.0"}-umd.js`}
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/codemirror.min.js" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/mode/javascript/javascript.min.js" />
        <script
          src={`https://cdn.cloud.pspdfkit.com/pspdfkit-web@${process.env.NEXT_PUBLIC_WEB_SDK_VERSION || "1.10.0"}/nutrient-viewer.js`}
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
