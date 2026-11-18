import type { NextConfig } from "next";
// Enables the "use workflow" / "use step" directives for the
// python-sdk/email-extraction-pipeline sample. No effect on any other sample:
// the plugin only transforms modules that carry those directives.
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled due to incompatibility with NutrientViewer SDK initialization
  // contract-rag embeds queries locally; the ONNX runtime is a native addon
  // and must be required at runtime, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  // transformers.js imports sharp at load time (unused for text embeddings).
  // Tracing copies sharp's .node addon but not the libvips .so it dlopens, so
  // the route crashed on Vercel with ERR_DLOPEN_FAILED libvips-cpp.so.
  outputFileTracingIncludes: {
    "/ai-document-processing/contract-rag/api/ask": [
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/.pnpm/@img+sharp-linux-x64@*/node_modules/@img/sharp-linux-x64/**/*",
    ],
  },
  env: {
    WEB_SDK_VERSION: process.env.NEXT_PUBLIC_WEB_SDK_VERSION,
  },
  // jonaddams.com is the canonical host: the Web SDK licence is bound to it.
  // Matching the exact production alias leaves preview deployments alone.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "nutrient-sdk-samples.vercel.app" }],
        destination: "https://jonaddams.com/:path*",
        permanent: true,
      },
    ];
  },
  // Configure externals for Turbopack (development) - now stable
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // Map @nutrient-sdk/viewer to the global NutrientViewer for Turbopack
      "@nutrient-sdk/viewer": "NutrientViewer",
    },
  },
  // Configure externals for Webpack (production builds)
  webpack: (config, { isServer }) => {
    // Exclude @nutrient-sdk/viewer from the bundle since we're loading it via CDN
    config.externals = config.externals || [];

    if (isServer) {
      config.externals.push("@nutrient-sdk/viewer");
    } else {
      config.externals.push({
        "@nutrient-sdk/viewer": "NutrientViewer",
      });
    }

    return config;
  },
};

export default withWorkflow(nextConfig);
