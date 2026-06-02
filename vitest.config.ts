import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @vitejs/plugin-react was removed: v6.0.2 is incompatible with vite@7.3.1
  // (imports the removed `vite/internal`). esbuild handles JSX/TSX in tests,
  // so the plugin is unnecessary for our test runs. Restore/pin it if a future
  // test needs React Fast Refresh or Babel-based JSX transforms.
  plugins: [],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        ".next/",
        "nutrient-website/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  css: {
    postcss: {},
  },
});
