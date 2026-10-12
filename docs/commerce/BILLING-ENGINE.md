# Billing & commerce engine — endpoints y contrato de fidelidad

> state: draft | engine-generated.
> Isabella **registra** el estado de suscripción verificado por un proveedor
> externo y **aplica** planes/cuotas. **No procesa pagos, no almacena datos de
> tarjeta y no infiere un estado pagado sin referencia de proveedor.**

El movimiento de dinero permanece en el proveedor externo. El servidor solo
compara un token/estado que el proveedor ya confirmó.

## Módulos

| Módulo | Responsabilidad |
| --- | --- |
| `src/commerce/subscriptions.ts` | `SubscriptionStore`: máquina de estados + auditoría. |
| `src/commerce/entitlements.ts` | Decisiones de función y cuota (puras). |
| `src/commerce/metering.ts` | `UsageMeter`: contadores por workspace/cuota/día. |
| `src/commerce/provider-events.ts` | Puente evento-de-proveedor → `SubscriptionStore`. |
| `src/commerce/plans.ts` | Configuración de planes FREE/PREMIUM/VIP/ENTERPRISE. |
| `src/commerce/guards.ts` | Guards de servicio, roles y errores tipados. |

## Endpoints

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/v1/billing/plans` | pública | Lista de planes, funciones y cuotas. |
| GET | `/api/v1/billing/entitlements?plan=` | pública | Funciones y cuotas del plan. |
| GET | `/api/v1/billing/subscription?workspaceId=` | admin | Suscripción registrada + entitlements efectivos. |
| POST | `/api/v1/billing/subscribe` | admin | Registra estado verificado del proveedor. |
| POST | `/api/v1/billing/cancel` | admin | Cancela la suscripción registrada. |
| GET | `/api/v1/billing/usage?workspaceId=` | admin | Uso del día vs cuota por clave. |
| POST | `/api/v1/commerce/offers` | admin | Puerta real: exige `offer` + cuota `active_offers`. |
| POST | `/api/v1/connectors/ingest` | firma | Webhook firmado del proveedor; aplica la suscripción. |

Auth `admin` = bearer `GENESIS_ADMIN_API_TOKEN` (auth de servicio). No hay login de
usuario final todavía; esa es la brecha pendiente.

## Máquina de estados de suscripción

```
none ──subscribe──▶ active | trialing
active ──cancel──▶ canceled        canceled ──subscribe──▶ active
active ──markPastDue──▶ past_due   past_due ──(reactivar)──▶ active
*      ──suspend──▶ suspended      suspended ──(reinstaurar)──▶ active
```

Reglas duras:

- Se exige `provider` y `externalRef` no vacíos (prueba de estado del proveedor).
- Plan ENTERPRISE exige `contract: true` explícito.
- Cada transición queda en el rastro de auditoría y se registra en BookPI.

## Semántica de entitlements

- `checkFeature(plan, status, feature)`: `OK`, `ACCOUNT_SUSPENDED`,
  `SUBSCRIPTION_INACTIVE` o `FEATURE_NOT_IN_PLAN`.
- `checkQuota(plan, status, key, used)`: `OK` (incluye ilimitado `-1`) o
  `QUOTA_EXCEEDED`.
- El estado de la suscripción manda: un plan PREMIUM `canceled` no habilita nada.

## Webhooks del proveedor → suscripción

`POST /api/v1/connectors/ingest` verifica la firma HMAC del proveedor y resuelve el
tenant (ver `src/commerce/connector.ts`). Si el evento se **ACEPTA**, se aplica al
`SubscriptionStore` vía `applyProviderSubscriptionEvent`:

- `defaultResolveIntent(eventType)` clasifica por palabras clave en orden de
  prioridad (terminales antes que activadores): `suspend`, `cancel`, `past_due`,
  `trial`, `activate`; desconocido → `ignore` (no se inventa transición).
- El **evento no es autoridad**: solo aplica después de firma válida + tenant
  resuelto. El plan se toma del cuerpo (`planCode`/`plan_code`/`plan`) o del
  registro existente. ENTERPRISE exige `contract: true`.
- Resultados de negocio no lanzan; se devuelven como `outcome`: `APPLIED`,
  `IGNORED_UNMAPPED_EVENT`, `REJECTED_NO_SUBSCRIPTION`,
  `REJECTED_PLAN_UNRESOLVED`, `REJECTED_CONTRACT_REQUIRED`, `REJECTED_TRANSITION`.
- Cada suscripción aplicada se registra en BookPI
  (`commerce.subscription.webhook_applied`).

Se requiere `CONNECTOR_WEBHOOK_SECRET` (y opcional `CONNECTOR_TENANT_MAP`) para que
el endpoint atienda; sin esa configuración responde `CONNECTOR_NOT_CONFIGURED`.

## Persistencia

`SubscriptionStore` usa por defecto persistencia en memoria
(`InMemorySubscriptionPersistence`). El contrato `SubscriptionPersistence` permite
conectar un backend durable (Postgres/JSONL/Supabase). `UsageMeter` es efímero por
día por diseño; su persistencia durable es trabajo pendiente.

## Pendiente (no presentar como terminado)

1. Auth de usuario final + sesiones.
2. Persistencia durable de suscripciones y metering.
3. UI de billing.
4. Tarifas/precios y facturación (invoices).
5. Mapeo de planes específico por proveedor (hoy heurístico por cuerpo/registro).

> Nota: el puente webhooks → `SubscriptionStore` ya está implementado y probado
> (ver arriba); no se declara verificado hasta revisión humana.
