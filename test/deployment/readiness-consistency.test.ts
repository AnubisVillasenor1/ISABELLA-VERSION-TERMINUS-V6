// state: draft | engine-generated
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');

describe('production-readiness reporting is evidence-based', () => {
  const readme = read('README.md');
  const estado = read('docs/ESTADO-REAL-ACTUAL.md');

  // La compuerta original prohibía cualquier porcentaje global porque no existía denominador.
  // Ahora el denominador existe (scripts/production-progress.mjs), así que la aserción se
  // endurece: no «prohibido un porcentaje», sino «solo el porcentaje que el instrumento
  // calcula en este árbol». Una cifra inventada o desactualizada rompe el test.
  it('the README publishes only the global percentage the instrument computes', () => {
    const output = execFileSync(process.execPath, ['scripts/production-progress.mjs'], {
      encoding: 'utf8',
    });
    const printed = /AVANCE_REAL_GLOBAL_PRODUCCION_DESPLIEGUE=([0-9.]+)%/.exec(output);
    expect(printed, 'production-progress.mjs no emitió el porcentaje').not.toBeNull();

    expect(readme).toContain(`AVANCE_REAL_GLOBAL_PRODUCCION_DESPLIEGUE=${printed![1]}%`);
    expect(readme).toMatch(/cuatro ejes con peso declarado/);
    expect(readme).toMatch(/docs\/status\/production-progress-evidence\.json/);
    expect(readme).toMatch(/avance ponderado, no aptitud/);
    expect(readme).not.toMatch(/Avance global de implementación: 100%/);
  }, 30_000);

  it('never reintroduces unsupported legacy figures', () => {
    for (const md of [readme, estado]) {
      expect(md).not.toMatch(/~\s*66\s*%|~\s*80\s*%|46\.25\s*%\s*ponderado/);
    }
  });
});
