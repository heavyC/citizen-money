import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Server-side code is the default; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` pragma at the top of the file.
    environment: "node",
    include: ["tests/unit/**/*.test.ts?(x)"],
    setupFiles: ["./tests/setup.ts"],
    env: loadEnv("", process.cwd(), ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
