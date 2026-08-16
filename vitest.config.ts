import { configDefaults, defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "tests/e2e/**",
      ".eve/**",
      ".next/**",
      ".output/**",
    ],
  },
});
