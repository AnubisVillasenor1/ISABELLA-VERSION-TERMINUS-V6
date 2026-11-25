/**
 * ISABELLA VILLASEÑOR AI™ — Native Skill Registry (TAMV).
 * state: draft | engine-generated.
 *
 * Registro nativo de skills disponibles para Isabella. Incluye las capacidades
 * de los skills del entorno (.agents/skills/) adaptadas como capacidades nativas
 * TAMV. No copia código de terceros; declara la capacidad y su estado real.
 *
 * Cada skill declara: id, nombre, descripción, categoría, estado de
 * implementación y si requiere red o ejecución externa.
 */
import { digest } from './skills';

export interface NativeSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'browser' | 'deploy' | 'discovery' | 'design' | 'ml' | 'governance' | 'media' | 'audio';
  readonly implemented: boolean;
  readonly requiresNetwork: boolean;
  readonly requiresExecution: boolean;
  readonly maturity: 'specified' | 'implemented' | 'tested';
}

export const NATIVE_SKILLS_REGISTRY: readonly NativeSkill[] = [
  { id: 'browser-automation', name: 'Automatización de navegador', description: 'Navegar, llenar formularios, capturar screenshots, extraer datos de páginas web.', category: 'browser', implemented: false, requiresNetwork: true, requiresExecution: true, maturity: 'specified' },
  { id: 'vercel-deploy', name: 'Despliegue a Vercel', description: 'Desplegar aplicaciones y sitios web a Vercel, crear preview deployments.', category: 'deploy', implemented: false, requiresNetwork: true, requiresExecution: true, maturity: 'specified' },
  { id: 'skill-discovery', name: 'Descubrimiento de skills', description: 'Buscar e instalar skills de agentes desde el ecosistema.', category: 'discovery', implemented: false, requiresNetwork: true, requiresExecution: false, maturity: 'specified' },
  { id: 'design-interview', name: 'Entrevista de diseño', description: 'Entrevistar al usuario para clarificar planes de diseño y arquitectura.', category: 'design', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'hf-cli', name: 'Hugging Face CLI', description: 'Gestionar modelos, datasets, spaces y repos en Hugging Face Hub.', category: 'ml', implemented: false, requiresNetwork: true, requiresExecution: true, maturity: 'specified' },
  { id: 'pii-redaction', name: 'Redacción de PII (TJG)', description: 'Inspeccionar y redactar PII antes de inferencia según jurisdicción.', category: 'governance', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'provenance-genome', name: 'Genoma de procedencia (TPG)', description: 'Generar hash SHA3-512 de autoría y procedencia.', category: 'governance', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'cognitive-modulation', name: 'Modulación cognitiva (LCM)', description: 'Modular prompts con capas Lógica-Empatía-Resonancia.', category: 'governance', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'media-cull', name: 'Culling de media', description: 'Seleccionar candidatos por métricas declaradas.', category: 'media', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'audio-analysis', name: 'Análisis de audio (Kaos)', description: 'FFT, centroide, flatness, bandas, transitorios, estéreo M/S.', category: 'audio', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'durable-recovery', name: 'Recuperación durable', description: 'Idempotencia, lease fencing, crash recovery, relay at-least-once.', category: 'governance', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
  { id: 'governance-evolution', name: 'Evolución de gobernanza (ONU)', description: 'Incidentes, CROWN, estándares, datos, capacidad, auditoría, interop, foros.', category: 'governance', implemented: true, requiresNetwork: false, requiresExecution: false, maturity: 'implemented' },
] as const;

export function listNativeSkills(category?: string): readonly NativeSkill[] {
  if (category) return NATIVE_SKILLS_REGISTRY.filter((s) => s.category === category);
  return NATIVE_SKILLS_REGISTRY;
}

export function getNativeSkill(id: string): NativeSkill | null {
  return NATIVE_SKILLS_REGISTRY.find((s) => s.id === id) ?? null;
}

export function nativeSkillDigest(): string {
  return digest(NATIVE_SKILLS_REGISTRY);
}

export function describeNativeSkillRegistry(): Readonly<Record<string, unknown>> {
  const implemented = NATIVE_SKILLS_REGISTRY.filter((s) => s.implemented).length;
  return {
    total: NATIVE_SKILLS_REGISTRY.length,
    implemented,
    specified: NATIVE_SKILLS_REGISTRY.length - implemented,
    categories: [...new Set(NATIVE_SKILLS_REGISTRY.map((s) => s.category))],
    executionPerformed: false,
    note: 'Registro de capacidades nativas; las no implementadas requieren red o ejecución externa.',
  };
}