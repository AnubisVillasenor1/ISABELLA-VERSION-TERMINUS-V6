# Auditoría de producción y despliegue — 2026-11-24

**Estado:** `draft | auto_generated`; revisión y aprobación humana pendientes. Esta auditoría no certifica producción.  
**Alcance:** checkout `v0/wire-mongodb-supabase`, commit observado `64b2eed1328704f03620eb65b11531387fb834b3`, configuración de CI/despliegue, Docker, gates de preparación, suite local y variables disponibles en el sandbox. No se modificó el estado de servicios externos ni se ejecutó un despliegue.

## Veredicto ejecutivo

**NO LISTO PARA DESPLIEGUE/CERTIFICACIÓN DE PRODUCCIÓN.** El código compila en su ruta de distribución y los gates locales principales están verdes, pero `deploy:readiness` falla con requisitos de configuración/credenciales y el CI de este SHA no aporta evidencia de un run exitoso en GitHub. Los valores/secretos de producción, la aprobación humana, el canary y el rollback observado no se pueden inventar ni declarar completos desde este checkout.

## Evidencia local observada

| Gate | Resultado | Evidencia |
|---|---|---|
| TypeScript principal | PASS | `pnpm run typecheck` |
| ESLint | PASS | `pnpm run lint`, cero warnings/error |
| Compilación distribuible | PASS | `pnpm run build:dist`; `dist/server.js` y chequeo de JS completados |
| Validación canónica | PASS | `pnpm run validate`: typecheck, lint, formato y build completo; 404 archivos y 2.899 pruebas aprobadas |
| Smoke runtime | PASS | `pnpm run smoke:runtime`; endpoints/guardrails locales pasan. IKES necesitó reintentos de hidratación inicial; inferencia externa se omitió sin credencial OpenRouter elegible. |
| Smoke UI | PASS | `pnpm run smoke:ui`: navegación, intro, workspace y exportaciones |
| Seguridad del repositorio | PASS | `pnpm run security:suite`: 14 controles, 0 fallidos |
| Contrato Docker | PASS | `test/deployment/docker-artifacts.test.ts`: 12 pruebas, incluye CORS explícito |
| Dependencias producción | PASS local | `pnpm audit --prod --audit-level=moderate`: no se encontraron vulnerabilidades conocidas |
| Variables documentadas | PASS | `pnpm run check:env`: 243 claves documentadas, 113 referenciadas desde `src` |
| Placeholders SOPS | PASS | `pnpm run check:sops` |
| Frescura de estado | PASS | `node scripts/generate-status.mjs --check` |
| Assurance estructural | PASS | `pnpm run validate`: 44/44, 0 fallidos, 0 advertencias |
| Typecheck de capas | PASS | `pnpm run typecheck:layers` |
| Typecheck de skills/lib | **FAIL / no gate CI actual** | `pnpm run typecheck:skills` encuentra referencias ausentes a Prisma generado, `@vercel/connect`, `commander`, `js-yaml` y errores de tipos asociados. No se debe presentar como verde; investigar si estos módulos son código activo u opcional y restaurar su fuente/generación o delimitar conscientemente el proyecto de tipos. |
| Formato | PASS | `pnpm run format:check` pasó tras normalizar los 16 archivos inicialmente señalados. |
| Preparación de despliegue | **BLOCKED** | Simulación del contexto de GitHub/Vercel (`VERCEL=1`, secretos reales omitidos) reporta: `PF-TOKEN-ADMIN-MISSING`, `PF-STRIPE-WEBHOOK-MISSING`, `PF-STRIPE-TEST-KEY`, `DR-BOOKPI-SECRET-MISSING`, `DR-STORAGE-PROVIDER-MISSING`, `DR-DATABASE-MISSING`, `DR-ORIGINS-LOCAL`, `DR-SERVERLESS-NON_DURABLE_API_KEYS` y `DR-SERVERLESS-NON_DURABLE_FEDERATION`. `PF-PUBLIC-URL-MISSING` es advertencia. No apareció falta de proveedor AI: en Vercel Gateway usa OIDC y no requiere clave estática. No es una lectura de configuración real de producción. |
| CI del SHA / evidencia atada | **NO OBSERVADA** | No se consultó un run exitoso de GitHub para este SHA. El deploy workflow exige evidencia del SHA exacto. |
| Imagen Docker / K8s / smoke remoto | **NO VERIFICADOS** | El comando de construcción Docker no se pudo ejecutar porque `docker` no está instalado en el sandbox; tampoco se ejecutaron validación server-side de Kubernetes ni smoke del deployment. `pnpm run validate` sí pasó el build local del proyecto. |
| Auth/RLS, canary y rollback productivo | **NO OBSERVADO** | Requiere auditoría específica en el entorno desplegado y evidencia operacional; no se infiere del unit test. |

## Hallazgos que requieren acción antes de producción

1. **Variables y secretos de producción pendientes.** Configurar `GENESIS_ADMIN_API_TOKEN`, `BOOKPI_INTEGRITY_SECRET`, `DATABASE_URL`, `ISABELLA_STORAGE_PROVIDER=postgres|neon`, `ISABELLA_API_KEY_STORE=postgres`, `ISABELLA_FEDERATION_STORE=postgres`, `ALLOWED_ORIGINS` con orígenes HTTPS exactos y `APP_PUBLIC_URL`. Configurar también `STRIPE_WEBHOOK_SECRET` y cambiar la integración Stripe de test a live antes de procesar pagos. No copiar valores a Git, logs o este documento. Vercel AI Gateway ya está conectado y, en despliegue Vercel, usa OIDC; no se debe solicitar `AI_GATEWAY_API_KEY` ni una clave de otro proveedor por este gate.
2. **Bloqueo de despliegue no sustituible por código.** `deploy-production.yml` exige Vercel production config y credenciales de workflow, evidencia CI del mismo SHA, aprobación del environment `production` y readiness satisfactorio. La cuenta/CI debe poder ejecutar y publicar artefactos.
3. **`typecheck:skills` está fuera de la cobertura configurada de CI y falla localmente.** Resolver la procedencia de `src/lib/lib/accounting/*`, el cliente Prisma, y los módulos no declarados antes de afirmar cobertura total. No ocultar los errores agregando exclusiones sin contrato explícito.
4. **Los documentos de estado/artefactos existentes son evidencia fechada.** `docs/status/production-progress-evidence.json` indica `state: auto_generated`, incluye puertas `failed`/`not_observed` y no debe interpretarse como aprobación vigente.
5. **RLS Supabase — hallazgo y alcance.** El advisor de seguridad informa 7 tablas públicas con RLS habilitado y sin policies (`atlas_knowledge_claims`, `atlas_knowledge_sources`, `atlas_ledger`, `atlas_protocols`, `atlas_users`, `atlas_webrtc_signals`, `atlas_xr_events`). La consulta de metadatos confirma grants directos de esas tablas solo a `service_role` (sin grants para `anon`/`authenticated`/`PUBLIC`) y no encontró funciones `SECURITY DEFINER` públicas. Para estas tablas, ausencia de policies más ausencia de grants a roles cliente es fail-closed y compatible con el adaptador server-side que usa service role; no añadir policies amplias solo para silenciar el advisor. El listado de tablas también tiene RLS activo. Las vistas, grants a secuencias y políticas de otros esquemas no se certifican aquí. Advisor: [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). El advisor de rendimiento reporta 7 índices no usados (`INFO`); no se eliminaron sin carga representativa, ya que podría perjudicar consultas futuras. [Unused Index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). El advisor de salud no reportó hallazgos.
6. **MongoDB/Stripe/Supabase operan según variable real y configuración remota.** La presencia de nombres de variables o adaptadores en el repositorio no prueba conexión, escrituras durables, webhooks verificados, acceso mínimo ni restauración real.
7. **Migraciones Supabase.** El proyecto registra `atlas_store_core`, `ikes_sources_and_claims` y `harden_ikes_trigger_search_path`. Se alineó el nombre del archivo local de la tercera migración con la versión aplicada `20261124173211`, para evitar divergencia de historial al sincronizar migraciones.

## Cambio aplicado en esta auditoría

Se eliminó del `Dockerfile` el valor por defecto `ALLOWED_ORIGINS=http://localhost:8080`. La imagen de producción ya no habilita un origen local accidentalmente: Compose exige `ALLOWED_ORIGINS` explícito y el gate valida orígenes HTTPS exactos. Se corrigió el falso bloqueo del proveedor en Vercel al reconocer que AI Gateway obtiene OIDC de runtime sin clave estática. También se alineó readiness con el contrato de `config.ts`: producción requiere `DATABASE_URL` canónica y `ISABELLA_STORAGE_PROVIDER` explícito; no basta que existan variables alias `POSTGRES_*`. El smoke runtime reintenta únicamente la condición transitoria de hidratación IKES y continúa fallando ante cualquier error persistente. El README ahora documenta instalación reproducible y gates pendientes; assurance subió de 43/44 a 44/44.

## Criterio de salida

No declarar `100%`, `verified`, `wired` ni `production-ready` hasta que se cumplan todos estos puntos y quede evidencia reproducible ligada al SHA:

- `pnpm run validate` pasa sin omitir el formato ni los gates canónicos; resolver/documentar la situación de `typecheck:skills`.
- CI de GitHub termina en éxito para el SHA exacto y publica evidencia de pruebas, seguridad y SBOM; escaneo de secretos/dependencias y construcción Docker pasan.
- `deploy:readiness` ejecutado contra configuración real de producción devuelve `READY`, sin exponer secretos.
- Tablas, políticas RLS, grants, vistas y RPC/funciones privilegiadas revisadas; pruebas de autorización negativas y positivas pasan para cada almacén.
- Despliegue aprobado por una persona responsable, smoke post-despliegue pasa, canary monitorizado, y rollback probado con restauración verificada.
- Revisión humana de los cambios y aceptación explícita de riesgos residuales, responsable y fecha.

**Próximo gate:** completar las variables de Vercel/GitHub `DATABASE_URL`, provider y modos de almacenamiento durable, token admin, secreto BookPI, orígenes/URL públicos y secreto webhook; cambiar Stripe a Live; ejecutar readiness usando la configuración real de producción. Después, CI del SHA, Docker/K8s, smoke remoto, aprobación humana, canary y rollback. Ningún valor de credencial se incluye en este reporte.
