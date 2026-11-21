/**
 * ISABELLA VILLASEÑOR AI™ — I18N Fabric (determinista).
 * state: draft | engine-generated.
 *
 * Catálogo de cadenas para los locales soportados. No traduce automáticamente:
 * cada cadena se declara explícitamente. El selector devuelve la cadena del
 * locale solicitado o la de `es-MX` (nativo) si falta.
 */
import { digest, SkillInputError } from './skills';

export const SUPPORTED_LOCALES = ['es-MX', 'es-ES', 'en', 'pt-BR'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageCatalog = Readonly<Record<string, string>>;

const CATALOGS: Readonly<Record<Locale, MessageCatalog>> = {
  'es-MX': {
    'app.title': 'Isabella Villaseñor AI™',
    'app.tagline': 'Infraestructura Cognitiva Civilizatoria Soberana y Antifrágil',
    'action.allow': 'Permitir',
    'action.deny': 'Denegar',
    'status.ready': 'Listo',
    'status.blocked': 'Bloqueado',
    'status.degraded': 'Degradado',
    'media.pixelsModified': 'Píxeles modificados: {count}',
    'build.planOnly': 'Solo plan, sin ejecución',
    'evolution.simulated': 'Evolución simulada en memoria',
  },
  'es-ES': {
    'app.title': 'Isabella Villaseñor AI™',
    'app.tagline': 'Infraestructura Cognitiva Civilizatoria Soberana y Antifrágil',
    'action.allow': 'Permitir',
    'action.deny': 'Denegar',
    'status.ready': 'Listo',
    'status.blocked': 'Bloqueado',
    'status.degraded': 'Degradado',
    'media.pixelsModified': 'Píxeles modificados: {count}',
    'build.planOnly': 'Solo plan, sin ejecución',
    'evolution.simulated': 'Evolución simulada en memoria',
  },
  en: {
    'app.title': 'Isabella Villaseñor AI™',
    'app.tagline': 'Sovereign and Antifragile Civilizational Cognitive Infrastructure',
    'action.allow': 'Allow',
    'action.deny': 'Deny',
    'status.ready': 'Ready',
    'status.blocked': 'Blocked',
    'status.degraded': 'Degraded',
    'media.pixelsModified': 'Pixels modified: {count}',
    'build.planOnly': 'Plan only, no execution',
    'evolution.simulated': 'Evolution simulated in memory',
  },
  'pt-BR': {
    'app.title': 'Isabella Villaseñor AI™',
    'app.tagline': 'Infraestrutura Cognitiva Civilizatória Soberana e Antifrágil',
    'action.allow': 'Permitir',
    'action.deny': 'Negar',
    'status.ready': 'Pronto',
    'status.blocked': 'Bloqueado',
    'status.degraded': 'Degradado',
    'media.pixelsModified': 'Pixels modificados: {count}',
    'build.planOnly': 'Apenas plano, sem execução',
    'evolution.simulated': 'Evolução simulada em memória',
  },
};

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function selectLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  return 'es-MX';
}

export function translate(locale: unknown, key: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const resolved = selectLocale(locale);
  const template = CATALOGS[resolved][key] ?? CATALOGS['es-MX'][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  );
}

export function listMessages(locale: unknown): MessageCatalog {
  return CATALOGS[selectLocale(locale)];
}

export function i18nDigest(): string {
  return digest(CATALOGS);
}

export function isSupportedLocale(value: unknown): value is Locale {
  return isLocale(value);
}

export function describeI18n(): Readonly<Record<string, unknown>> {
  return {
    native: 'es-MX',
    locales: SUPPORTED_LOCALES,
    messages: Object.keys(CATALOGS['es-MX']).length,
    autoTranslation: false,
    executionPerformed: false,
    note: 'Cada cadena se declara explícitamente; no hay traducción automática.',
  };
}
