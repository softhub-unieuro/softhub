import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: 'v8', // v8 is standard but check if needed to install separately
      reporter: ["text", "json", "html"],
      include: ["src/servicos/**", "src/repositorios/**"],
    },
  },
});
