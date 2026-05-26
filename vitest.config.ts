import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: ["**/*.config.ts", "**/*.config.mts", "**/node_modules/**"]
    }
  },
  resolve: {
    alias: {
      "@smartpay/contracts": `${projectRoot}packages/contracts/src/index.ts`,
      "@smartpay/domain": `${projectRoot}packages/domain/src/index.ts`,
      "@smartpay/rules": `${projectRoot}packages/rules/src/index.ts`,
      "@smartpay/db": `${projectRoot}packages/db/src/index.ts`,
      "@smartpay/mock-data": `${projectRoot}packages/mock-data/src/index.ts`
    }
  }
});
