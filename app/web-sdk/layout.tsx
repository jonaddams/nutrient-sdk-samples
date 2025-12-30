import Script from "next/script";
import { SDK_CDN_URL } from "@/lib/constants";

export default function WebSDKLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<Script src={SDK_CDN_URL} strategy="lazyOnload" />
			{children}
		</>
	);
}
