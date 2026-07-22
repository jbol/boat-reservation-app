import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/format.ts",
        "lib/pricing.ts",
        "lib/adapters.ts",
        "lib/i18n.ts",
        "lib/adminAuth.ts",
        "lib/customerAuth.ts",
      ],
    },
  },
});
