import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  server: { proxy: { "/api": "http://localhost:8788" } },
  test: { include: ["tests/**/*.test.ts"] },
});
