import { embed, cosineSimilarity } from './embeddings';

export interface RagDocument {
  id: string;
  text: string;
  embedding: Float32Array;
}

export interface RagHit {
  id: string;
  text: string;
  score: number;
}

export class SovereignRagStore {
  private docs: RagDocument[] = [];

  add(id: string, text: string): void {
    if (this.docs.some((d) => d.id === id)) return;
    this.docs.push({ id, text, embedding: embed(text) });
  }

  search(query: string, k = 3): RagHit[] {
    if (this.docs.length === 0) return [];
    const q = embed(query);
    return this.docs
      .map((d) => ({ id: d.id, text: d.text, score: cosineSimilarity(q, d.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  size(): number {
    return this.docs.length;
  }
}

export const sovereignRag = new SovereignRagStore();

sovereignRag.add(
  'isabella-identity',
  'Isabella Villaseñor AI es un runtime de inteligencia artificial gobernada, anclado en Real del Monte, Hidalgo, México. Invariante: CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.'
);
sovereignRag.add(
  'governance',
  'Gobernanza CROWN, AEGIS Triple Blockade, BookPI hash-chain SHA-3, IKES memoria epistémica E0-E6, Veritas verificador de evidencia.'
);
sovereignRag.add(
  'territory',
  'Real del Monte (Mineral del Monte), Hidalgo, México, 2660 msnm. Panteón Inglés (1851), Mina de Acosta (1727), Mina La Dificultad (1865), Museo del Paste (2012).'
);
sovereignRag.add(
  'monetization',
  'Monetización con Profit Guard: precio mínimo = costo * (1 + margen bps/10000). Nunca por debajo del costo. Split 75/25 soberanía.'
);
sovereignRag.add(
  'llm',
  'Implementación verificable en este repositorio: Isabella usa un LLM fundacional con rutas de proveedor, recuperación local, límites de tokens, caché y fallback determinista. La disponibilidad y selección de proveedores depende de la configuración del entorno; no equivale a inferencia siempre local ni a autonomía irrestricta.'
);

sovereignRag.add(
  'source-isabella-genesis-paper',
  'Fuente documental: ISABELLA AI GENESIS — Documento Técnico Final Unificado. Describe una propuesta de arquitectura federada, soberanía tecnológica, auditoría abierta, gobernanza distribuida, resiliencia y acceso abierto. Es una visión técnica del documento; las cifras, nodos, garantías criptográficas y despliegues descritos no se consideran hechos operativos sin evidencia verificable independiente.'
);

sovereignRag.add(
  'source-atlas-architecture',
  'Fuente documental: notas de ATLAS Trascendence/TAMV del repositorio compilacion-isabella. Propone un registro canónico de documentos, identidades, versiones, hashes, eventos auditables, observabilidad, publicación científica y federación por contratos. Las integraciones con ORCID, Zenodo, Figshare, OpenAIRE, GitHub y los servicios propuestos deben tratarse como objetivos hasta comprobar su estado en el código o en un sistema conectado.'
);

sovereignRag.add(
  'source-tamv-heptafederation',
  'Fuente documental: ecosistemacivil.txt y documentos del repositorio compilacion-isabella. TAMV presenta un marco conceptual heptafederado con dominios de gobernanza, identidad y seguridad, cómputo, cognición, simulación, economía e interoperabilidad/cultura-territorio. Los dominios organizan la visión arquitectónica; no implican por sí solos que existan siete redes operativas.'
);

sovereignRag.add(
  'source-governance-principles',
  'Invariante arquitectónico: capacidad no equivale a autoridad, ejecución, evidencia, aprendizaje ni estado de producción. La arquitectura documental prioriza mínimo privilegio, validación, trazabilidad, separación de dominios, revisión humana para decisiones de impacto y tratamiento de sistemas externos como no confiables por defecto. Toda respuesta debe distinguir políticas implementadas de políticas propuestas.'
);

sovereignRag.add(
  'source-atlas-document-lifecycle',
  'Propuesta ATLAS: un documento canónico puede tener identificador, namespace, versión, estado draft/validated/published/archived, metadatos normalizados y hash del contenido. El flujo de publicación o federación debería validar permisos, preservar historial y emitir eventos auditables; estos elementos describen el diseño fuente y no confirman que un depósito externo haya ocurrido.'
);
