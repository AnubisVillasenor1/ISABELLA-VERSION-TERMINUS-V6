import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string): string => readFileSync(p, "utf8");

/** Extract the headline percentage and the rubric total from each document. */
function headline(md: string): number {
  const m = md.match(/\*\*(?:Avance global estimado[^*]*?:\s*)?(\d{1,3}(?:\.\d+)?)%[^*]*\*\*/);
  if (!m) throw new Error("headline percentage not found");
  return Number(m[1]);
}

describe("production-readiness percentage is single-sourced", () => {
  const readme = read("README.md");
  const estado = read("docs/ESTADO-REAL-ACTUAL.md");

  it("README and ESTADO-REAL-ACTUAL state the same headline value", () => {
    expect(headline(readme)).toBe(headline(estado));
  });

  it("the rubric rows sum to the headline value in both documents", () => {
    for (const md of [readme, estado]) {
      const rows = [...md.matchAll(/\|\s*[^|\n]+\|\s*(\d+)\s*\/\s*(\d+)[^|\n]*\|/g)].filter((m) => m[2] !== "100");
      const got = rows.reduce((a, m) => a + Number(m[1]), 0);
      const avail = rows.reduce((a, m) => a + Number(m[2]), 0);
      expect(avail).toBe(100);
      expect(got).toBe(Math.round(headline(md)));
    }
  });

  it("never reintroduces unsupported legacy figures", () => {
    for (const md of [readme, estado]) {
      expect(md).not.toMatch(/~\s*66\s*%|~\s*80\s*%|46\.25\s*%\s*ponderado/);
    }
  });
});
