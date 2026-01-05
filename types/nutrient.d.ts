// Type definitions for Nutrient Web SDK
// The Nutrient SDK is loaded from CDN and attached to the window object
// We use a flexible type definition since the global API differs slightly from the module exports
declare global {
	interface Window {
		// biome-ignore lint/suspicious/noExplicitAny: Nutrient SDK loaded from CDN has complex global API
		NutrientViewer: any;
		// Legacy alias for backwards compatibility
		// biome-ignore lint/suspicious/noExplicitAny: Legacy PSPDFKit global for backwards compatibility
		PSPDFKit: any;
	}
}

export {};
