# Isabella V6 · TINA — Genesis Runtime

> **Trusted Intelligence, Native & Adaptive.** Runtime modular de asistencia conversacional, orquestación y gobernanza. Separa explícitamente capacidad, autoridad, ejecución, evidencia y producción.

[![Repository Assurance](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml)

## Ficha del proyecto

- **Sistema:** Isabella Villaseñor AI — Genesis TINA V6.
- **Repositorio:** [OsoPanda1/isabella-V6-TINA-h6](https://github.com/OsoPanda1/isabella-V6-TINA-h6) (privado).
- **Rama principal:** `main`.
- **Runtime:** Node.js 24, TypeScript, Express 5, pnpm, Vitest y esbuild.
- **Interfaz:** HTML/CSS/JavaScript servido por el runtime Express; navegación por anclas, menú móvil, chat, reconocimiento y síntesis de voz del navegador.
- **Núcleo adicional:** `ige-omega/`, workspace Rust experimental con crates de cognición, memoria, world model, ABX, BookPI, kernel y gateway.
- **Despliegue:** Vercel (entrypoint `server.js` que importa `dist/server.js` generado por el build); hay manifiestos Docker/Kubernetes para escenarios separados.
- **Madurez declarada:** beta de ingeniería. No promocionar a producción basándose únicamente en un build o un Preview.

> **Contrato de veracidad:** `SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED`. Un esquema, mock, hash, endpoint o manifiesto no demuestra por sí solo una integración end-to-end.

## Estado operativo y readiness

La última línea base cuantificada en documentación fue **44.25% (≈44%) de preparación ponderada**, basada en un Preview anterior que reportó 519 pruebas aprobadas en 100 archivos, smoke local y guardrails correctos. Esa cifra **no es una medición científica ni el porcentaje de funcionalidades** y no debe presentarse como validación del SHA actual hasta repetir el pipeline completo después de estos cambios de UI.

| Dimensión de readiness | Peso | Última evaluación documentada | Evidencia/gate |
|---|---:|---:|---|
| Runtime HTTP y flujo local | 20% | 75% | Smoke HTTP en Preview; repetir en el SHA de liberación |
| Pruebas y validación automatizada | 20% | 75% | Línea base anterior: 519 pruebas / 100 archivos |
| Seguridad y guardrails | 15% | 45% | Guardrails de API y rutas; requiere revisión de producción |
| Inferencia externa real | 15% | 0% verificado | Falta demostrar respuesta real con proveedor configurado |
| Persistencia durable y recuperación | 10% | 20% | Adaptadores disponibles; backup/restore y aislamiento requieren evidencia |
| CI reproducible y workspace Rust | 10% | 20% | Confirmar CI verde y validar Rust con `--locked` |
| Operación, observabilidad y rollback | 10% | 35% | Instrumentación y artefactos existen; probar procedimientos en entorno objetivo |

### Bloqueadores de liberación

1. Obtener una ejecución verde de GitHub Actions sobre el SHA exacto de liberación.
2. Generar y revisar `ige-omega/Cargo.lock` con Cargo; ejecutar `cargo fmt --check`, Clippy, pruebas y build release con `--locked`.
3. Configurar un proveedor externo elegible en Preview y comprobar una respuesta generativa real; no introducir secretos en código, commits ni conversaciones.
4. Probar timeout, HTTP 429/5xx, respuesta vacía, modelo no permitido, cooldown y fallback.
5. Demostrar persistencia durable, aislamiento por workspace, backup, restauración y comportamiento fail-closed.
6. Completar revisión de seguridad, observabilidad, límites de coste, rollback y validación de runtime en el entorno de destino.
7. Revisar el diff y las pruebas del SHA exacto antes de cualquier promoción.

## Propósito y límites

Isabella Genesis coordina asistencia conversacional y adaptadores de IA bajo políticas, identidad, seguridad, herramientas y evidencia. El objetivo es impedir que una capacidad técnica implique automáticamente permiso para ejecutarla o autoridad para presentar una salida como verdad.

```text
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION
```

Este repositorio no se presenta como modelo fundacional propio, AGI, sistema certificado ni motor neuronal entrenado nativamente. El enrutamiento entre proveedores no equivale a entrenamiento propio. El fallback local es determinista y no sustituye a un LLM.

## Arquitectura implementada y contratos

```text
Navegador (src/ui)
  ├─ navegación por secciones y menú adaptable
  ├─ conversación /api/v1/cognition/route
  ├─ voz del navegador (SpeechRecognition / SpeechSynthesis, si existe)
  └─ estado de salud /api/v1/health
             │
             ▼
Express + TypeScript (src/server.ts)
  ├─ validación de entrada y límites
  ├─ identidad, scopes, consentimiento y autoridad
  ├─ C.R.O.W.N. / AEGIS: admisión y guardrails
  ├─ runtime cognitivo y gateway de inferencia
  ├─ fallback local cuando el proveedor no responde
  ├─ VERITAS / BookPI según integración y configuración
  └─ métricas de latencia y endpoints operativos
             │
             ▼
Adaptadores / servicios opcionales
  ├─ OpenRouter (modelo gratuito por defecto; disponibilidad variable)
  ├─ Hugging Face (solo modelos configurados explícitamente)
  ├─ Gemini / AI Gateway (sujeto a configuración y política de coste)
  ├─ Supabase/Atlas (si las variables y permisos están configurados)
  └─ IGE-Ω Rust (workspace separado; no asumir integrado end-to-end)
```

C.R.O.W.N., YUN, AEGIS, ISA, VERITAS, BookPI e IGE-Ω son dominios y módulos con distintos niveles de implementación. Consulta [mapa de arquitectura](docs/ARCHITECTURE-OPERATING-MAP.md), [especificación C.R.O.W.N./VΩ](docs/CROWN-ISABELLA-VOMEGA-OPERATING-SPEC.md), [estado real](docs/ESTADO-REAL-ACTUAL.md) y [gates de IGE-Ω](ige-omega/docs/OPERATIONS-AND-RELEASE-GATES.md). La documentación diferencia contratos de componentes realmente conectados.

## Interfaz, navegación y voz

La interfaz de `src/ui/index.html`, `src/ui/cinematic.css` y `src/ui/app.js` contiene:

- Anclas funcionales para Inicio, Conversar, Tools, Skills, Monetización y Gobernanza; el smoke verifica que cada destino exista.
- Menú móvil accesible con `aria-expanded`, cierre por Escape/clic fuera y cierre después de seleccionar una sección.
- Estado de API consultado a `/api/v1/health`; “API disponible” solo indica que el endpoint de salud respondió, no que la inferencia externa esté activa.
- Conversación contra la ruta real `POST /api/v1/cognition/route`, con historial limitado a ocho mensajes previos y sin duplicar el mensaje actual.
- Manejo de respuestas HTTP no exitosas, cuerpo JSON inválido, solicitudes duplicadas y estados de carga.
- Reconocimiento y síntesis de voz del navegador cuando estén disponibles y autorizados; los navegadores y sistemas operativos pueden ofrecer voces distintas. No se garantiza una voz femenina específica ni soporte universal.
- Preferencia de movimiento reducido, foco visible y enlace para saltar al chat.

La interfaz **no** crea herramientas productivas por el hecho de mostrar tarjetas de “Tools”, ni activa cobros, campañas o automatizaciones comerciales. Esas acciones requieren endpoints, permisos, proveedores y pruebas independientes.

## API y rutas

El inventario estático de endpoints se mantiene en [docs/api/route-inventory.json](docs/api/route-inventory.json), junto con [guía de API](docs/api/README.md) y [OpenAPI](docs/api/openapi.yaml). El inventario es una ayuda de revisión; su marca de “verified” debe apoyarse en pruebas reales, no solo en que la ruta exista.

Rutas de referencia para la interfaz y diagnóstico:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/` | Interfaz principal |
| GET | `/styles/cinematic.css` | Estilos de la interfaz |
| GET | `/ui/app.js` | Lógica del navegador |
| GET | `/health` | Salud básica del runtime |
| GET | `/api/v1/health` | Salud pública de API |
| GET | `/api/v1/status` | Estado resumido |
| POST | `/api/v1/cognition/route` | Conversación/orquestación |
| GET | `/api/v1/readyz` | Readiness operativa |

Para rutas sensibles, consultar el handler y los controles de autorización antes de habilitarlas a usuarios externos. No se deben inferir permisos a partir del nombre de una ruta.

## Requisitos y ejecución local

- Node.js **24.x**.
- pnpm **10.28.x** (recomendado por el campo `packageManager`).
- Rust toolchain fijado en `ige-omega/rust-toolchain.toml` para el workspace Rust.
- Python solo para los bridges que lo requieran.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

La aplicación escucha en el puerto 3000 por defecto. Para validar antes de enviar cambios:

```bash
pnpm run typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run security:suite
pnpm run build
```

`pnpm run build` ejecuta compilación TypeScript, Vitest, bundle de esbuild, comprobación sintáctica del JS de interfaz, smoke de navegación/UI y smoke de runtime. Los resultados del comando deben guardarse por SHA; no se deben copiar resultados de un commit previo como evidencia del nuevo.

## Configuración de proveedores

Las claves son variables de entorno de servidor; nunca deben exponerse en el frontend.

| Variable | Propósito |
|---|---|
| `OPENROUTER_API_KEY` | Habilita adaptador OpenRouter |
| `OPENROUTER_FREE_MODEL` | Modelo OpenRouter elegido; `openrouter/free` es el valor predeterminado |
| `HF_TOKEN` / `HF_FREE_MODELS` | Habilita los modelos Hugging Face configurados explícitamente |
| `GEMINI_API_KEY` / `MODEL_API_KEY` | Cliente Gemini cuando está configurado |
| `ALLOW_PAID_PROVIDER_FALLBACK` | Debe ser `true` para permitir rutas de pago donde se exige consentimiento de configuración |
| `INFERENCE_TIMEOUT_MS` | Timeout acotado de proveedores |
| `PROVIDER_FAILURE_COOLDOWN_MS` | Cooldown tras fallos del proveedor |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Inicialización de persistencia Atlas opcional; la clave de servicio solo en backend |
| `APP_PUBLIC_URL` | URL pública declarada al proveedor OpenRouter |

Consultar [.env.example](.env.example) y [guía de entorno](docs/ENVIRONMENT.md). Los modelos gratuitos tienen límites, cambian de disponibilidad y no deben tratarse como SLA. Si no existe proveedor operativo, el sistema puede responder mediante fallback local con capacidades limitadas.

## Seguridad y operación

- No guardar secretos en frontend, README, commits, fixtures o logs.
- Mantener CORS, autenticación, scopes, límites, validación y controles de tenant explícitos para cada ruta sensible.
- Rechazar por defecto acciones sin consentimiento, identidad o autoridad requerida.
- Tratar historial y texto de usuario como entrada no confiable.
- No registrar payloads sensibles ni cuerpos completos de error de proveedores.
- Verificar firma e idempotencia de webhooks antes de procesarlos.
- Ejecutar [suite de seguridad](scripts/security-suite.mjs), [smoke runtime](scripts/runtime-smoke.mjs) y [repository assurance](.github/workflows/repository-assurance.yml).
- Usar [modelo de amenazas](docs/security/GENESIS-V6-THREAT-MODEL.md) y [runbook del gate de modelo](docs/runbooks/BETA-LIVE-MODEL-GATE.md) antes de habilitar capacidades externas.

## Estructura del repositorio

| Ruta | Responsabilidad |
|---|---|
| `src/server.ts` | Runtime HTTP, rutas, políticas y adaptadores |
| `src/ui/` | HTML, CSS y JS de interfaz |
| `src/inference/` | Router, adaptadores y políticas de proveedor |
| `src/cognition/`, `src/genesis/`, `src/isabella/` | Orquestación y contratos cognitivos |
| `src/crown/`, `src/security/`, `src/identity/` | Gobernanza, identidad y seguridad |
| `src/memory/`, `src/atlas/`, `src/bookpi/` | Memoria, persistencia y evidencia |
| `src/federation/`, `src/observability/`, `src/deployment/` | Eventos, telemetría y operación |
| `src/commerce/` | Contratos de comercio, riesgo y conectores |
| `ige-omega/` | Workspace Rust separado |
| `test/` | Pruebas automatizadas |
| `scripts/` | Smokes, seguridad, inventarios y evidencia |
| `docs/` | Especificaciones, auditorías, runbooks y contratos |

## Licencia y responsabilidad

El repositorio declara licencia MIT. La licencia no constituye certificación de seguridad, cumplimiento legal, capacidad comercial ni garantía de disponibilidad. Las integraciones de terceros quedan sujetas a sus propios términos y configuración.

**Regla de liberación:** no fusionar ni desplegar a producción por narrativa o por un porcentaje aislado. Exigir evidencia reproducible del SHA, pruebas integrales, revisión humana y rollback comprobado.
