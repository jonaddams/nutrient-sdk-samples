import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
