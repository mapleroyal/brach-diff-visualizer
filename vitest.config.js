import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@main": resolve(__dirname, "src/main"),
      "@shared": resolve(__dirname, "src/shared"),
    },
    extensions: [".jsx", ".js", ".json"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js", "tests/**/*.test.jsx"],
  },
});
