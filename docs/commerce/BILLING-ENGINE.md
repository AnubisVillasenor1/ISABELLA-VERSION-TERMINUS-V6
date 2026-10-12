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

## Persistencia

`SubscriptionStore` usa por defecto persistencia en memoria
(`InMemorySubscriptionPersistence`). El contrato `SubscriptionPersistence` permite
conectar un backend durable (Postgres/JSONL/Supabase). `UsageMeter` es efímero por
día por diseño; su persistencia durable es trabajo pendiente.

## Pendiente (no presentar como terminado)

1. Auth de usuario final + sesiones.
2. Webhooks del proveedor de pagos → `subscriptionStore`.
3. Persistencia durable de suscripciones y metering.
4. UI de billing.
5. Tarifas/precios y facturación (invoices).
