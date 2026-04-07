import Script from "next/script";
import { SDK_CDN_URL } from "@/lib/constants";

export default function PythonSDKLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script src={SDK_CDN_URL} strategy="beforeInteractive" />
      {children}
    </>
  );
}
