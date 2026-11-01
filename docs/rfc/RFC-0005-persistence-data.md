# RFC-0005 — Persistencia e integridad

**Estado:** `draft | engine-generated`

## Requisitos
- Postgres durable para BookPI y suscripciones.
- `BOOKPI_INTEGRITY_SECRET` obligatorio y fuerte.
- Aplicar migraciones `supabase/migrations` y `infra/db/migrations`.
- Supabase Atlas/IKES requiere URL + service role + anon/publishable key.
- IKES fail-closed en lectura/escritura.
- BookPI Postgres append transaccional y actor-scoped.
- Ledger legacy sigue separado (no unificado aún).
- Sin DB, estado degradado explícito, no datos simulados.

## Estado observado de la base de producción (2026-10-31)

Medición local contra el `DATABASE_URL` de producción (Neon Postgres 18.6, base
`neondb`, pooler en `us-east-1`): `select 1` respondió en 953 ms. La conexión
usa `sslmode=require`; `pg` advierte que hoy lo trata como `verify-full` y que
esa semántica cambiará en la próxima versión mayor, por lo que la configuración
correcta a futuro es `sslmode=verify-full` explícito.

Migraciones aplicadas y verificadas en esa base:

| Migración | Objetos verificados |
|---|---|
| `supabase/migrations/20261030000000_isabella_api_keys.sql` | `isabella_api_keys` |
| `supabase/migrations/20261030000001_isabella_federation.sql` | `federation_connectors`, `federation_inbox` |
| `infra/db/migrations/001_create_bookpi_events.sql` | `bookpi_events` (14 columnas), secuencia `bookpi_events_sequence_seq` |
| `infra/db/migrations/002_bookpi_canonical_immutability.sql` | `bookpi_validate_chain`, políticas `bookpi_actor_read` y `bookpi_actor_append` |

La migración `001` declaraba `REVOKE UPDATE, DELETE, TRUNCATE ON SEQUENCE ...`,
sintaxis inválida en PostgreSQL (`0LP01: invalid privilege type DELETE for
sequence`) que impedía aplicarla. Se corrigió a `REVOKE ALL PRIVILEGES ON
SEQUENCE ...` y después se aplicó en Neon. La corrección vive en el archivo de
migración, no en un parche manual de la base.

### Variables aprovisionadas (solo target `production`)

| Variable | Tipo | Verificación |
|---|---|---|
| `GENESIS_ADMIN_API_TOKEN` | secreto (48 bytes base64url) | `401` sin token, `200` con token en `/api/v1/ops/preflight` |
| `BOOKPI_INTEGRITY_SECRET` | secreto (48 bytes base64url) | `pipeline-bookpi-storage` pasó de `degraded` a `healthy` |
| `ISABELLA_API_KEY_PEPPER` | secreto (48 bytes base64url) | digests persistidos; nunca se guarda el secreto |
| `APP_PUBLIC_URL` | plano | `https://isabella-version-terminus-v6.vercel.app` |
| `ISABELLA_API_KEY_STORE` | plano | `postgres` |
| `ISABELLA_FEDERATION_STORE` | plano | `postgres` |

Los secretos se generaron con `crypto.randomBytes(48)` y nunca se imprimieron ni
se escribieron en el repositorio; solo quedan en el proyecto de Vercel y en el
archivo local gitignored del operador.

### Causa raíz: el timeout de conexión degradaba los almacenes durables

Los logs de runtime mostraban, en cada *cold start*:

```
[Isabella] Durable API key store unavailable; keys stay process-local { message: 'Connection terminated due to connection timeout' }
[Isabella] Durable federation store unavailable; state stays process-local { message: 'Connection terminated due to connection timeout' }
```

Los pools usaban `connectionTimeoutMillis: 2_000`. Un arranque en frío del
pooler de Neon supera ese umbral, así que el adaptador se abandonaba y el
almacén quedaba en memoria **aunque** `ISABELLA_API_KEY_STORE` y
`ISABELLA_FEDERATION_STORE` ya fueran `postgres`. El valor por defecto subió a
10 s, es ajustable con `ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS` (clamp
1000–30000 ms) y se aplica al cliente compartido, al pool de BookPI, a la
conexión de Drizzle y al pool de suscripciones; se agregó `keepAlive` y una
prueba de regresión del resolvedor. Commit `3da3f71`.

### Evidencia de durabilidad en producción

Verificado contra el alias de producción después del despliegue
`dpl_EVczyonXW8WsGCuK3FWw73U95FgE` (commit `3da3f71`):

- **API keys:** `POST /api/v1/admin/programs` → `201`; la fila existe en
  `public.isabella_api_keys`; `GET /api/v1/developer/me` con la clave nueva →
  `200`; `DELETE /api/v1/admin/api-keys/:id` → `200` y `revoked_at` queda
  establecido; la misma clave revocada → `401`. La fila de sonda se eliminó
  después de la prueba.
- **Federación:** `POST /api/v1/federation/connectors` (`kind: webhook`) → `201`;
  una fila en `public.federation_connectors`; `DELETE /api/v1/federation/connectors/:id`
  → `200` y `0` filas restantes. La sonda se eliminó.
- **BookPI pipeline:** `pipeline-bookpi-storage` responde `healthy`, backend
  `POSTGRES`, cadena verificada, `eventCount: 0`.
- **Logs del despliegue nuevo:** sin avisos de degradación de los almacenes
  durables.

Migraciones **no** aplicadas, con razón explícita:

- `supabase/migrations/20261017000000_atlas-store-core.sql` y
  `20261017000001_ikes-memory.sql`: hacen `grant ... to service_role`, un rol de
  Supabase que no existe en la base Neon de producción. Aplicarlas requiere
  decisión humana (adaptar el grant o mover el runtime a Supabase).
- `infra/db/migrations/003..005` (comercio) e `ige-omega/migrations/*` siguen
  pendientes de aplicación y verificación.

Límites de la evidencia: que la base responda, las tablas existan y una sonda
persista **no** demuestra backup/restore, comportamiento de RLS bajo el rol de
servicio, ni recuperación ante fallos. Nada de esto se declara `verified` ni
`production` sin aprobación humana nominal.

## Postura de readiness: ledger legacy, observabilidad e IKES

- **Ledger legacy (`bookpi-ledger`).** Sigue siendo `VOLATILE_IN_MEMORY` porque
  es síncrono y sus consumidores (`hypercore`, `osiris`, `gameover`,
  `tools/catalog`) lo invocan sin `await`; Node no tiene cliente Postgres
  síncrono. La durabilidad de la evidencia de producción la aporta
  `pipeline-bookpi-storage` (Postgres, `healthy`). Decisión registrada el
  2026-10-31: **no** se reclasifica el ledger legacy como saludable ni se
  retira del gate; `readyz` permanece en `503` con el bloqueo visible hasta que
  exista una migración asíncrona aprobada. Responsable del trabajo pendiente:
  mantenedor del repositorio (`OsoPanda1`); sin fecha comprometida.
- **Observabilidad.** La evidencia de readiness ya no usa una razón fija: se
  deriva de `probeObservability(process.env)`. Sin
  `OTEL_EXPORTER_OTLP_ENDPOINT`, el estado es `degraded` con una razón medida
  ("observability is limited to in-process metrics"). Como dependencia opcional
  degradada, la regla fail-closed mantiene `readyz` en `503`.
- **IKES en cold start.** El probe de readiness espera hasta 5 s la hidratación
  en curso en lugar de publicar un `pending` transitorio. Una hidratación
  fallida se reporta como `degraded` con el código saneado
  (`IKES_*`), no como `pending` indefinido.


