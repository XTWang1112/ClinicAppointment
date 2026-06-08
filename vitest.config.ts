import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      NODE_ENV: "test",
    },
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    coverage: {
      reporter: ["text", "lcov", "html"],
    },
    include: ["test/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**", "coverage/**"],
  },
});
