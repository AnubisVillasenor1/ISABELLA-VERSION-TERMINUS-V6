// Post-deployment smoke CLI (ISA-371).
// Usage: SMOKE_BASE_URL=https://host pnpm run smoke:production
// Exits non-zero if any deployment surface fails verification.
//
// Niveles de readiness (SMOKE_REQUIRE_READINESS):
//   sin definir | "true"  -> nivel certificado (default, fail-closed). Exige
//                            GET /api/v1/readyz = 200 con readiness.ready=true.
//   "false"                -> nivel de borrador. La superficie de readiness debe
//                            seguir respondiendo con un contrato 200/503 coherente,
//                            pero un 503 declarado por una dependencia no lista
//                            (p. ej. el ledger legacy VOLATILE_IN_MEMORY) no bloquea
//                            el despliegue. Un despliegue de borrador NO es una
//                            certificacion de produccion y no debe presentarse como tal.
// Cualquier otro valor se trata como un error tipografico en una compuerta
// fail-closed: se conserva el nivel estricto y se advierte en el log.
import { verifyDeployment } from "../src/deployment/production-smoke";

const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.APP_PUBLIC_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000";

export function resolveRequireReadiness(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === "") return true;
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  console.log(`SMOKE_WARN valor invalido en SMOKE_REQUIRE_READINESS=${JSON.stringify(raw)}; se usa el nivel estricto`);
  return true;
}

const requireReadiness = resolveRequireReadiness(process.env.SMOKE_REQUIRE_READINESS);
const tier = requireReadiness ? "certified-production" : "draft-contract";
console.log(`SMOKE_TIER ${tier}`);

const result = await verifyDeployment(baseUrl, fetch, { requireReadiness });

for (const check of result.checks) {
  const status = check.status === 0 ? "-" : String(check.status);
  console.log(`[${check.ok ? "PASS" : "FAIL"}] ${check.name} (HTTP ${status}) — ${check.detail}`);
}

const verdict = result.ok ? "PRODUCTION_SMOKE_OK" : "PRODUCTION_SMOKE_FAILED";
console.log(`${verdict} baseUrl=${result.baseUrl} tier=${tier}`);
if (!result.ok) process.exit(1);
