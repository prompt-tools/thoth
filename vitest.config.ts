import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: __dirname,
  // Next.js's tsconfig sets `jsx: "preserve"`, which Vitest 4's Rolldown
  // transformer honors and leaves JSX untransformed (breaking .tsx test
  // parsing). The React plugin owns JSX transformation regardless of tsconfig.
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [__dirname + "/src/test/setup.ts"],
    exclude: [".claude/**", "**/node_modules/**"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
