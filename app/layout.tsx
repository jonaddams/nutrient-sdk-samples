import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ErrorBoundary } from "@/lib/components/ErrorBoundary";
import { TopBar } from "./_components/TopBar";
import { Footer } from "./_components/Footer";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SDK Samples",
  description:
    "Interactive examples and demos showcasing document SDKs and features.",
};

// Applies persisted tweaks (theme/palette/type/density/radius) to <html>
// before React hydrates, so there's no flash from defaults to user prefs.
// Mirrors the keys read/written by app/_components/Tweaks.tsx.
const NO_FLASH_SCRIPT = `(function(){try{var k="sdk-samples-tweaks-v1",s=localStorage.getItem(k),t=s?JSON.parse(s):{},h=document.documentElement,d=t.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");h.dataset.theme=d;if(t.palette)h.dataset.palette=t.palette;if(t.type)h.dataset.type=t.type;if(t.density)h.dataset.density=t.density;if(t.radius)h.dataset.radius=t.radius;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      data-palette="cool"
      data-type="technical"
      data-density="balanced"
      data-radius="soft"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} ${fraunces.variable}`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {NO_FLASH_SCRIPT}
        </Script>

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

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/codemirror.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/theme/material-darker.min.css"
        />

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
        <ErrorBoundary>
          <TopBar />
          {children}
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
