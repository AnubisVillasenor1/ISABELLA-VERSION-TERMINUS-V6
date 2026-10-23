# ISABELLA VILLASEÑOR AI · TERMINUS V6

**Isabella** es un ecosistema de IA gobernada con servicios de inferencia, herramientas, memoria, evidencia, integraciones y una capa económica auditable. Este repositorio contiene el runtime V6 Terminus y sus servicios de servidor; la interfaz comercial puede integrarse con la aplicación Isabella mediante las APIs de este backend.

> **Regla de diseño:** capacidad ≠ autoridad ≠ ejecución ≠ evidencia ≠ aprendizaje ≠ producción.

Un módulo presente en el código no equivale a una integración externa activa. Los estados de pago, la elegibilidad, los asientos contables y las transferencias bancarias son hechos diferentes y deben verificarse por separado.

## Estado real de esta versión

- La política de reparto v5, la persistencia de suscripciones, el checkout de Stripe, la verificación de webhooks y el libro mayor transaccional están implementados en esta rama.
- Las migraciones deben aplicarse a una base PostgreSQL de prueba y las variables privadas deben configurarse antes de probar el flujo real.
- **No se declara un porcentaje global de producción**: no se dispone todavía de una ejecución CI verificada de este cambio ni de pruebas end-to-end con Stripe y PostgreSQL reales.
- La disponibilidad de checkout, la integridad del ledger y la configuración de identidad se exponen como capacidades comprobables en `GET /api/v1/revenue/health`; la ruta devuelve estado degradado si el ledger persistente no se puede verificar.
- Los pagos a creadores mediante Stripe Connect, el onboarding KYC, las retenciones/impuestos, las devoluciones, los contracargos y la conciliación bancaria **no están habilitados**. El devengo contable no significa que el dinero se haya transferido.

## Arquitectura del repositorio

| Área | Responsabilidad |
| --- | --- |
| `src/server.ts` | Runtime HTTP, integración de servicios, límites y wiring de dependencias |
| `src/commerce/` | Planes, suscripciones, política de reparto, webhooks, autenticación de usuario |
| `src/economy/revenue-fabric/` | Cálculo de devengos, IETS, ledger de doble entrada, persistencia PostgreSQL, inbox/outbox |
| `src/economy/sovereign-revenue-fabric.ts` | Motor de dominio con validación, política de reparto y evidencias de settlement |
| `src/routes/revenue-fabric.ts` | APIs de settlement, billing, uso, wallet, outbox y readiness |
| `src/crown/`, `src/identity/`, `src/bookpi/`, `src/ige-omega/` | Gobernanza, identidad, evidencia y runtime cognitivo |
| `src/inference/` | Enrutamiento y políticas de proveedores de IA, límites de tiempo y multimodalidad |
| `test/` | Pruebas unitarias y de integración; deben ejecutarse en CI para certificar este cambio |

Los motores de monetización heredados que producen simulaciones o estructuras en memoria no deben usarse como fuente de verdad financiera. Los nuevos settlements pasan por la política compartida de `src/commerce/revenue-share.ts` y el motor normalizado de Revenue Fabric.

## Política de reparto v5

La política aplica sobre el **pool distribuible**, después de costes directos, impuestos, comisiones de pasarela y las reservas configuradas por la política de settlement.

### Participación del creador

| Tipo de ingreso | Participación del creador | Participación de plataforma |
| --- | ---: | ---: |
| API de Isabella (`ISA_API`) | 75% | 25% |
| Nivel Starter | 50% | 50% |
| Nivel Professional | 60% | 40% |
| Nivel Advanced | 70% | 30% |
| Nivel Elite | 80% | 20% |
| Nivel Sovereign | 80% | 20% |
| Hyperautomation | 50–80%, según nivel | 50–20% |
| Suscripción de Isabella | 0% | 100% |
| Data Vault | 50–80%, con evidencia explícita | 50–20% |

El porcentaje de Data Vault requiere referencias de consentimiento y licencia. Las tarifas fuera de 50–80% se rechazan. Los porcentajes de IETS y los niveles se calculan desde una tabla común; la puntuación de IETS no puede elevar la participación por encima del 80%.

### Elegibilidad para monetizar

La elegibilidad se resuelve en servidor contra el estado de suscripción persistido. El creador necesita:

1. Identidad de usuario verificada.
2. Plan de pago (`premium`, `vip` o `enterprise`).
3. Estado de suscripción `active`.
4. Periodo pagado vigente.
5. Identificador de creador válido para el settlement.

Las cuentas gratuitas, de prueba (`trialing`), vencidas (`past_due`), canceladas o sin estado de suscripción verificable no reciben participación de creador. Si falta la fuente de suscripción persistente, la elegibilidad falla de forma cerrada.

### Distribución de la participación de plataforma

La parte de plataforma se desglosa internamente, sin alterar el porcentaje total que le corresponde a la plataforma:

- **20%** Fondo Fénix.
- **30%** Infraestructura.
- **50%** DAO / tesorería comunitaria.

El cálculo se hace en centavos enteros. El residuo de redondeo se asigna a DAO para que los tres asientos sumen exactamente la participación de plataforma. Esta distribución es una asignación contable interna, no una transferencia de fondos.

### Precio de la suscripción

El plan Premium usa una referencia configurable de **US$20/mes** y un margen predeterminado del **25%**, para un precio calculado de **US$25/mes**:

`monthlyPrice = ceil(referencePriceCents × (10000 + markupBps) / 10000)`

Esto es una regla de configuración, **no un promedio de mercado verificado**. Si `STRIPE_PRICE_PREMIUM` está configurado, Stripe debe devolver un precio activo en USD, mensual y con el mismo importe calculado. VIP y Enterprise requieren Price IDs mensuales configurados explícitamente.

## APIs de Revenue Fabric

| Método | Endpoint | Función |
| --- | --- | --- |
| POST | `/api/v1/revenue/settle` | Calcula y persiste un settlement; solo administración |
| GET | `/api/v1/revenue/settlements/:idempotencyKey` | Consulta un settlement |
| POST | `/api/v1/billing/checkout` | Crea una sesión real de Stripe Checkout para un usuario autenticado |
| POST | `/api/v1/billing/portal` | Crea una sesión real del portal de facturación Stripe |
| POST | `/api/v1/billing/stripe/webhook` | Procesa eventos Stripe con firma verificada |
| GET | `/api/v1/revenue/usage/:userId` | Consulta uso del usuario autenticado o de un proveedor autorizado |
| GET | `/api/v1/revenue/outbox/status` | Estadísticas de outbox persistente |
| GET | `/api/v1/revenue/outbox/dead-letter` | Eventos fallidos con cinco o más intentos |
| POST | `/api/v1/revenue/outbox/retry/:eventId` | Reintenta un evento dead-letter |
| GET | `/api/v1/revenue/health` | Estado del ledger y capacidades configuradas |

Las rutas de usuario comparan el usuario objetivo con la identidad devuelta por Supabase Auth. Los identificadores enviados en headers no son prueba de identidad. El settlement es una ruta administrativa y requiere el token de administración.

## Integridad financiera

- El ledger usa enteros en unidades menores (centavos), no sumas monetarias en punto flotante.
- La persistencia escribe el journal, el settlement y el evento outbox en una sola transacción PostgreSQL.
- Las escrituras se serializan con un bloqueo transaccional y se verifica la cabeza actual de la cadena antes de añadir un journal.
- La restauración recorre la cadena por `previous_hash`, no por fecha; verifica hash y balance de débitos/créditos.
- Las claves de idempotencia no pueden reutilizarse con un payload económico diferente.
- Los eventos Stripe se verifican con la firma HMAC de Stripe y una ventana temporal de cinco minutos, se deduplican en inbox y se aplican solo si el evento es más reciente que el estado ya guardado.
- Los registros monetarios anteriores conservan la marca `legacy_major`; los nuevos usan `minor_v2`. No se reescriben silenciosamente los asientos históricos.
- Si la base histórica tiene más de una cabeza de ledger, el sistema falla cerrado y requiere reconciliación manual. No inventa una cadena única ni modifica el historial.

## Configuración de entorno

Copia `.env.example` a `.env` y reemplaza los valores de ejemplo. Nunca subas secretos reales al repositorio.

Variables principales:

```dotenv
# PostgreSQL persistente
DATABASE_URL=postgresql://user:password@host:5432/isabella

# Identidad de usuario
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=

# URL pública usada en los redirects de Stripe
ISABELLA_PUBLIC_URL=https://tu-dominio.example

# Stripe (solo servidor)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PREMIUM=
STRIPE_PRICE_VIP=
STRIPE_PRICE_ENTERPRISE=

# Precio Premium: US$20 + 25% = US$25
ISABELLA_REFERENCE_AI_PRICE_CENTS=2000
ISABELLA_PRICE_MARKUP_BPS=2500
```

Nunca publiques `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` ni tokens de administración en variables `NEXT_PUBLIC_*`.

### Migraciones

Aplicar en un entorno de pruebas, en este orden:

1. `src/commerce/migrations/002_persistent_subscriptions.sql` — estado de suscripción persistente, cliente Stripe y orden de eventos.
2. `src/economy/revenue-fabric/migrations/002_creator_share_policy.sql` — atribución del creador, unidades monetarias versionadas, distribución de plataforma y orden de eventos de elegibilidad.

El runtime también crea tablas operativas de Revenue Fabric cuando `DATABASE_URL` está configurado, pero la migración de suscripciones debe ejecutarse antes de activar billing. Verifica respaldo, permisos y resultado de cada migración; no ejecutes cambios financieros directamente sobre producción sin staging.

### Stripe

1. Configura los Price IDs mensuales de VIP y Enterprise.
2. Para Premium, configura un Price ID solo si coincide con el importe calculado por la política.
3. Registra `/api/v1/billing/stripe/webhook` en Stripe.
4. Suscribe al menos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
5. Configura `STRIPE_WEBHOOK_SECRET` y verifica el estado de `/api/v1/revenue/health`.
6. Prueba checkout, cancelación, vencimiento, eventos repetidos y eventos fuera de orden en modo test.

El evento `checkout.session.completed` por sí solo no concede elegibilidad: el estado pagado se determina mediante eventos de suscripción firmados y un periodo vigente.

## Desarrollo y validación

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run build
```

Para validar PostgreSQL y el runtime, revisa también `pnpm run postgres:e2e`, `pnpm run smoke:runtime` y `pnpm run smoke:production` con las variables y servicios de prueba requeridos. No se afirma que estas comprobaciones estén aprobadas para esta rama hasta que CI muestre resultados exitosos.

## Dependencias, modelos y licencias

Isabella puede enrutar a distintos proveedores y herramientas según la configuración del entorno. La disponibilidad, precio, cuota, región y licencia son específicos de cada modelo o servicio. No existe garantía de inferencia gratuita ilimitada, incluso cuando los pesos de un modelo son abiertos.

Revisa la licencia de cada modelo, dataset, herramienta, proveedor y dependencia antes de usarla comercialmente. No descargues ni ingieras datasets completos sin autorización, base jurídica y controles de procedencia.

## Próximos bloqueos antes de producción financiera

- Validar CI completa y ejecutar las migraciones en staging.
- Ejecutar pruebas end-to-end con Stripe test mode, Supabase Auth y PostgreSQL persistente.
- Implementar Stripe Connect, onboarding/KYC, cálculo fiscal/CFDI, retiros, reembolsos, contracargos y conciliación.
- Añadir políticas de moderación de ofertas y disputas de marketplace.
- Confirmar el procesamiento de la outbox persistente y alertas operativas.
- Revisar el historial existente del ledger: si hay ramas múltiples, conciliarlas mediante un procedimiento auditado antes de habilitar nuevos settlements.

**No confundir:** catálogo ≠ disponibilidad; sesión de checkout ≠ suscripción activa; devengo ≠ dinero pagado al creador; código implementado ≠ despliegue verificado.
