import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * `tsconfig.json` define `@/*` y `@/lib/*`, pero los `paths` de TypeScript son sólo de
 * compilación: no reescriben el JS emitido. `tsc` y `esbuild` sí los resuelven, y con eso
 * el typecheck y el build pasaban — pero vitest no, así que cualquier prueba que tocara el
 * subtree `src/lib/lib` (output-gate, capability-token, orion-engine…) moría en
 * `Cannot find package '@/lib/...'` antes de ejecutar una sola aserción. Ese fue el origen
 * real de los huecos de prueba, no la ausencia de tests.
 * El orden importa: `@/lib/` debe ganar a `@/`, igual que en `compilerOptions.paths`.
 */
const srcRoot = fileURLToPath(new URL("./src", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/lib\//, replacement: `${srcRoot}/lib/lib/` },
      { find: /^@\//, replacement: `${srcRoot}/` },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    env: {
      BOOKPI_INTEGRITY_SECRET: "test-only-integrity-secret-never-production-2026",
      NODE_ENV: "test",
    },
    include: ["test/**/*.test.ts"],
    // Several suites import the full server module (heavy on Windows and shared runners)
    // and a few benchmark loops run 500+ samples. The defaults (5s/10s) are too tight.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Only used by `pnpm test:coverage` (needs @vitest/coverage-v8). No threshold is enforced until a baseline is measured in CI.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
    },
  },
});