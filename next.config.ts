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
  // Native pieces Next's tracer misses for the contract-rag embedder (each one
  // a 500 on Vercel): sharp's libvips .so (transformers.js imports sharp at
  // load, unused for text) and onnxruntime-node, reached through a pnpm store
  // symlink. Only the linux-x64 ONNX binary: the package ships ~290 MB across
  // all platforms.
  outputFileTracingIncludes: {
    "/ai-document-processing/contract-rag/api/ask": [
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/.pnpm/@img+sharp-linux-x64@*/node_modules/@img/sharp-linux-x64/**/*",
      // Through transformers' own store symlink, so its import resolves.
      "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/package.json",
      "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/dist/**/*",
      "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
      // ...which resolves onnxruntime-common through pnpm's hoisted symlink
      // (already traced). Its CJS build is not, so add the files at the REAL
      // path: files under a symlinked dir make Vercel reject the package.
      "./node_modules/.pnpm/onnxruntime-common@*/node_modules/onnxruntime-common/**/*",
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
