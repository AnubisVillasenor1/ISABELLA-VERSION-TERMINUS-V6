# Isabella Villaseñor AI — Genesis TINA / Terminus Ω

Runtime cognitivo gobernado para TAMV Online Network. Este repositorio contiene el núcleo operativo, API HTTP, BookPI, HyperCore Ω, superficies multimodales y el workspace de interacción de Isabella V6.

> **Invariante operativa:** CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.

La inteligencia propone, calcula y evalúa. La autoridad humana decide, aprueba, arbitra y ejecuta. Un test verde demuestra capacidad computacional; no demuestra autoridad humana ni producción.

## Estado honesto de producción

**Avance global estimado: 84% de implementación local funcional; readiness de producción: 76%.** El primer porcentaje mide código operativo cubierto por contratos, tests y smoke checks; el segundo descuenta persistencia durable, configuración de infraestructura, observabilidad externa, revisión humana nominal y evidencia E2E. Producción no está certificada ni declarada `wired`.

| Área | Estado | Evidencia / bloqueo |
|---|---|---|
| Núcleo cognitivo, CROWN, AEGIS, VERITAS y Terminus Ω | Implementado | Tests locales y contratos fail-closed |
| HyperCore Ω y Skill Fabric | Implementado | Catálogo, nueve fases, triangulación y BookPI |
| API HTTP | Funcional | Express, health/readiness, cognition, MCP y skills |
| Workspace de Isabella | Implementado | Chat-first, intro cinematográfico, video, rails plegables y layouts |
| Video de intro | Implementado localmente | MP4 servido con cache; Mux no está disponible como integración conectable en este proyecto |
| Stripe | Conectado | Disponible para Checkout/donaciones; usar webhooks e idempotencia antes de producción |
| Supabase | Variables disponibles | Requiere validar esquema/RLS y flujo de autenticación en entorno objetivo |
| Neon/Postgres | Variables disponibles | Persistencia distribuida requiere prueba E2E y migraciones reproducibles |
| Mux | Variables disponibles | Adaptador operativo aún requiere validar playback/asset real en entorno objetivo |
| Kubernetes | Manifiestos autorados | No implica que exista un clúster aplicado |
| CI/CD y despliegue | Automatizable | Requiere secretos, entorno objetivo y aprobación humana |

El estado `draft | auto_generated` se mantiene hasta revisión humana. El estado `verified` requiere tests reproducibles y aprobación nominal. El estado `wired` solo corresponde a producción después de evidencia operacional.

## Inicio rápido

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

### Build de producción

```bash
pnpm run build:dist
pnpm run verify:production
pnpm start:dist
```

El build ejecuta TypeScript, tests, smoke UI/runtime, seguridad estática y generación de `dist/server.js`.

## Variables de entorno

Copia `.env.example` a un archivo local seguro. Nunca versionar secretos.

### Runtime y evidencia

- `PORT`, `APP_BASE_URL`
- `BOOKPI_LEDGER_PATH`
- `HYPERCORE_API_TOKEN`
- `APPROVER_PUBLIC_KEY`
- `RECONCILIATION_TIMEOUT_MS`
- `RECONCILIATION_MAX_ATTEMPTS`
- `RECONCILIATION_RETRY_BASE_MS`
- `RECONCILIATION_RETRY_MAX_MS`

### Inferencia y multimodal

Isabella solo usa proveedores cuando existe una credencial explícita. La selección es determinista y fail-closed.

- OpenRouter, Hugging Face, Ollama, Groq, Cerebras, Together, Deep Infra y Fireworks según los adaptadores de `src/inference`.
- `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_TTS_MODEL`, `GROQ_TTS_VOICE`, `GROQ_STT_MODEL`.
- `LOCAL_VISION_BASE_URL`, `LOCAL_IMAGE_BASE_URL`.

### Integraciones conectadas

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Los precios deben vivir en servidor. Checkout debe usar idempotency keys y webhook para fulfillment.
- **Supabase:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` únicamente en servidor. Toda tabla expuesta necesita RLS.
- **Postgres/Neon:** variables `POSTGRES_*` para el adaptador durable, sujeto a validación E2E.
- **Mux:** la integración Mux no está disponible para ser solicitada o conectada en el proyecto actual. El intro usa una ruta MP4 local segura como fallback real; no se simula una integración Mux ni se inventan tokens.

## Arquitectura

```text
Cliente / workspace
        |
Validación y límites de entrada
        |
Identidad, tenant y scopes
        |
CROWN / AEGIS / política de riesgo
        |
Terminus Ω — mandato y decisión
        |
HyperCore Ω — contrato → ejecución → verificación
        |
Inferencia / memoria / herramientas
        |
VERITAS / triangulación
        |
BookPI — ledger append-only y evidencia
        |
Respuesta / escalamiento / supervisión humana
```

### HyperCore Ω

`src/skills/hypercore-engine.ts` ejecuta nueve fases:

1. Identidad y tenant.
2. Resolución de skill.
3. Validación de contrato.
4. Política CROWN.
5. Presupuesto y límites.
6. Ejecución aislada.
7. Verificación post-ejecución.
8. Sello de evidencia.
9. Registro BookPI.

Los veredictos canónicos son `ALLOW`, `DENY`, `ESCALATE` y `DEGRADE`. MCP transporta intención; no concede autoridad.

### BookPI

El ledger JSONL mantiene una cadena hash, `fsync`, backups atómicos, restauración y mantenimiento fail-closed. El backend local no debe considerarse fuente compartida para réplicas serverless hasta validar el adaptador Postgres, concurrencia, backup y restauración.

## API principal

- `GET /health` — liveness estático.
- `GET /api/v1/health` — readiness superficial.
- `GET /api/v1/healthz` — readiness profunda.
- `GET /api/v1/readyz` — dependencias observadas.
- `GET /api/v1/hypercore/skills` — catálogo gobernado.
- `POST /api/v1/hypercore/skills/execute` — ejecución con mandato.
- `POST /api/v1/mcp` — JSON-RPC MCP.
- `POST /api/v1/cognition/vision` — imagen a descripción.
- `POST /api/v1/cognition/image` — prompt a imagen.
- `POST /api/v1/cognition/speech` — texto a audio.
  - `POST /api/v1/cognition/transcribe` — audio a texto.
  - `POST /api/v1/yun/events` — recibe un evento YUN canónico, verifica integridad y lo registra en BookPI; requiere `GENESIS_ADMIN_API_TOKEN`.
  - `GET /api/v1/yun/events?limit=20` — expone únicamente metadatos saneados de eventos YUN recientes.

Las rutas mutantes fallan cerrado cuando falta configuración. `X-Request-ID` se genera o propaga en cada respuesta; en producción se añade HSTS. Ningún request ID sustituye autenticación, autorización humana o evidencia de despliegue.

Las rutas sensibles aplican autenticación, límites de tamaño, rate limiting y fallo cerrado cuando falta una dependencia.

## Workspace visual

La interfaz de `src/ui` es un workspace de interacción, no una landing page:

- Intro con consentimiento explícito.
- Video `src/assets/musica/IsabellaVideoIntro.mp4` servido como `/assets/video/IsabellaVideoIntro.mp4`.
- Intro textual superpuesto y degradado visual para fusionar ambas capas.
- Chat como superficie primaria.
- Seis rails plegables: tres izquierdos y tres derechos.
- Modos `CHAT`, `CHAT + DISEÑO` y `CHAT + DISEÑO + CONTROL`.
- Soporte de escucha por Web Speech y superficies multimodales gobernadas.

El navegador puede bloquear autoplay; por eso el video inicia después de la acción explícita de inmersión. La reproducción de audio no debe depender de autoplay silencioso.

## Pagos y donaciones

Stripe está conectado al proyecto. Antes de habilitar monetización real:

1. Definir productos/precios en servidor.
2. Validar precio y cantidad en servidor.
3. Crear Checkout con idempotency key.
4. Procesar `checkout.session.completed` y pagos asíncronos mediante webhook firmado.
5. Registrar el evento en BookPI y, si corresponde, en una tabla durable con RLS.
6. Probar sandbox, reintentos, duplicados, reembolsos y estados incompletos.

No se presenta una donación como completada desde la página de éxito; la confirmación válida proviene del webhook.

## Autenticación y datos

Supabase y Neon están disponibles en el entorno. La implementación debe conservar estas reglas:

- Email + contraseña como método base salvo solicitud explícita.
- Callback de autenticación y cookies seguras.
- RLS para toda tabla expuesta.
- `user_id` obligatorio en consultas de datos de usuario.
- Nunca usar `user_metadata` para autorización.
- Nunca enviar `service_role` al navegador.
- No insertar usuarios directamente en `auth.users`.

## Kubernetes

`deploy/k8s/isabella-hypercore-omega.yaml` contiene namespace, configuración, secretos referenciados, Deployments, Services, probes, HPA, PDB y NetworkPolicies. Los manifiestos son `draft | engine-generated` hasta que una persona los revise y se apliquen en un clúster de staging con evidencia.

```bash
kubectl apply --dry-run=server -f deploy/k8s/isabella-hypercore-omega.yaml
```

No aplicar a producción sin revisar secretos, límites, dominios, persistencia, migraciones, observabilidad y rollback.

## Verificación

```bash
pnpm typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run security:suite
pnpm run build
```

Para una URL desplegada:

```bash
SMOKE_BASE_URL=https://tu-dominio.example pnpm run smoke:production
```

Un resultado verde es evidencia de capacidad computacional del entorno de prueba, no aprobación humana ni certificación de producción.

## Estructura relevante

- `src/server.ts` — API y rutas runtime.
- `src/ui/` — workspace, intro y estilos.
- `src/skills/` — HyperCore, contratos, CROWN, triangulación y MCP.
- `src/terminus/` — mandatos, autoridad, store y cuotas.
- `src/inference/` — proveedores, multimodal y voz.
- `src/commerce/` — planes, locks, eventos y webhooks.
- `infra/db/migrations/` — persistencia SQL.
- `deploy/k8s/` — manifiestos Kubernetes.
- `test/` — evidencia automatizada.
- `docs/runbooks/` — operaciones y despliegue.

## Contribución y gobernanza

Cada cambio debe declarar intención, implementar el mínimo verificable, conservar estado `draft`, aportar evidencia, recibir revisión humana con nombre y solo entonces pasar a `verified` o `wired`.

No borrar historia compartida, no ocultar fallos, no añadir `TODO` sin dueño y fecha, no declarar capacidades como facultades y no presentar un manifiesto como despliegue real.

Repositorio: https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6

Licencia y términos de operación: revisar los documentos canónicos en `docs/spec` y `docs/evolution` antes de redistribuir o conectar nuevos proveedores.

**Estado del documento:** `state: draft | auto_generated`, pendiente de revisión humana.
