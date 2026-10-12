# Implementation backlog — Isabella V6 / TINA / Genesis

> state: draft | engine-generated. Inventario y plan de evolución.
> Contrato de fidelidad heredado: **SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠
> INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED**.
> Invariante: **CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION**.

Este documento es un inventario honesto de lo hallado en el repositorio y un plan
por lotes. No declara producción, certificación ni métricas no medidas. Cada lote
solo se marca `wired` tras evidencia de tests + aprobación humana con nombre.

## Método del inventario

Reconocimiento ejecutado sobre `src/`, `docs/`, `test/` y scripts:

- Inventario de especificaciones (`docs/spec`, `docs/evolution`) vs implementación.
- Búsqueda de marcadores de trabajo sin terminar (`TODO`, `FIXME`, `XXX`, "not implemented").
- Verificación de cableado de registries en `src/genesis/runtime.ts`.
- Revisión del subsistema de comercio (`src/commerce/`) y persistencia (`src/bookpi/`, `src/atlas/`).

## Hallazgos verificados

### Comercio / monetización

- Existe una **capa de contratos** completa y testeada: planes (`src/commerce/plans.ts`),
  candados (`src/commerce/locks.ts`), guards (`src/commerce/guards.ts`), webhook,
  connectors, anti-fraude, revenue.
- **Faltaba** el flujo funcional de usuario: no había store de suscripciones, ni
  decisiones de entitlement aplicadas, ni metering de uso, ni endpoints `/billing/*`.
- No hay integración con un proveedor de pagos (correcto por diseño: el dinero se
  mueve fuera; Isabella solo registra estado verificado).

### Persistencia / backups

- `BookPiStorage` está definido (`src/bookpi/types.ts:79-88`) y hay adaptadores
  (`storage-jsonl.ts`, `storage-postgres.ts`), pero el runtime usa
  `InMemoryBookPiLedger` (`src/bookpi/ledger.ts:56-181`) que es **no durable**
  (`storage:"VOLATILE_IN_MEMORY"`, `wormEnforced:false`, `durable:false`).
- Atlas persiste vía Supabase REST (`src/atlas/persistence.ts`).
- Faltan backup/restore/retención y el cableado HTTP → storage durable.

### Seguridad

- `src/security/post-quantum.ts:193,201,209`: FIPS 203/204/205 declarados "not
  implemented" (dependen de HSM/KMS externo). No simular como verdes.

### Registries

- Todos los registries (skills/tools/capabilities/modules/protocols/plugins) están
  cableados en `src/genesis/runtime.ts`. No hay stubs `throw` sin resolver.

## Plan por lotes

### P0 — Cimiento real (en curso)

1. **Motor de monetización (entitlements + suscripciones + metering + endpoints).**
   Estado: `wired` en módulo + endpoints; tests verdes. Ver
   `docs/commerce/BILLING-ENGINE.md`.
2. **Persistencia durable de BookPI** + retención + backup/restore.
   Estado: `wired` en módulo (ledger durable JSONL + retención + backup/restore)
   y CLI `pnpm bookpi:maintenance`; el runtime selecciona durable con
   `BOOKPI_LEDGER_PATH`. Falta E2E con Postgres/Supabase y simulacro de
   recuperación. Ver `docs/bookpi/DURABLE-LEDGER.md`.
3. **CI con jobs verdes** (typecheck, test, build, security suite) sobre `main`.
   Estado: `specified`.
4. **Inferencia externa real** con credenciales (sin inventar disponibilidad).
   Estado: `specified`.
5. **Aislamiento multi-tenant verificado**.
   Estado: `specified`.

### P1 — Endurecimiento

6. Hardening de seguridad de producción (rate-limit distribuido, secretos, rotación).
7. Recuperación con objetivos RTO/RPO medidos.
8. Observabilidad productiva (trazas, alertas, dashboards).
9. Verificación VERITAS real (no simulada).

### P2 — Escala

10. Dedupe de módulos homónimos.
11. E2E en navegadores.
12. Heptafederación.

## Lote 1 — Motor de monetización (implementado)

Nuevos módulos (todos `state: draft | engine-generated`):

- `src/commerce/subscriptions.ts`: `SubscriptionStore` con máquina de estados
  explícita y rastro de auditoría. Exige referencia de proveedor; no infiere
  estado pagado. Plan ENTERPRISE exige `contract: true`.
- `src/commerce/entitlements.ts`: `checkFeature`, `checkQuota`, `planEntitlements`.
  Decisiones deterministas sin efectos secundarios.
- `src/commerce/metering.ts`: `UsageMeter` con cubos por workspace/cuota/día y
  acotación de memoria.

Endpoints (ver `docs/commerce/BILLING-ENGINE.md`): `GET /api/v1/billing/plans`,
`GET /api/v1/billing/entitlements`, `GET|POST /api/v1/billing/subscribe`,
`POST /api/v1/billing/cancel`, `GET /api/v1/billing/usage`,
`GET /api/v1/billing/subscription`, y la puerta real `POST /api/v1/commerce/offers`.

Pruebas: `test/commerce/subscriptions.test.ts`, `entitlements.test.ts`, `metering.test.ts`.

### Pendiente del lote 1 (honesto)

- Autenticación de usuario final (hoy las rutas usan token de servicio
  `GENESIS_ADMIN_API_TOKEN`; no hay login de usuario).
- Recepción de webhooks del proveedor de pagos que actualicen el store.
### Pendiente del lote 1 (honesto)

- Autenticación de usuario final (hoy las rutas usan token de servicio
  `GENESIS_ADMIN_API_TOKEN`; no hay login de usuario).
- Recepción de webhooks del proveedor de pagos que actualicen el store.
- Persistencia durable del `SubscriptionStore` y del `UsageMeter`.
- UI de billing.

## Lote 2 — Persistencia durable del BookPI (implementado)

Nuevos/actualizados módulos (`state: draft | engine-generated`):

- `src/bookpi/ledger.ts`: se añade `DurableBookPiLedger` (JSONL append-only,
  recarga y reverificación en arranque, checkpoint) y `createAuditLedger()`. El
  singleton `bookPiLedger` selecciona durable con `BOOKPI_LEDGER_PATH`.
- `src/bookpi/retention.ts`: `planRetention` (planeación pura).
- `src/cli/bookpiMaintenance.ts`: CLI `verify | summary | backup | restore |
  retention` (script `pnpm bookpi:maintenance`).

Pruebas: `test/bookpi/durable-ledger.test.ts`, `test/bookpi/retention.test.ts`.
Documentación: `docs/bookpi/DURABLE-LEDGER.md`.

### Pendiente del lote 2 (honesto)

- Cableado E2E Postgres/Supabase (`createPostgresStorage`) con rol append-only.
- Simulacro de recuperación con RTO/RPO medidos.
- Cifrado en reposo y sellado externo (WORM real).
