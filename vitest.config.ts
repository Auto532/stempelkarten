import { defineConfig } from "vitest/config";

// Tests laufen in der edge-runtime, weil das der Convex-Laufzeit am nächsten
// kommt (convex-test-Empfehlung). Nur die convex/-Tests werden ausgeführt.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
