# Isabella Villaseñor AI V6 · Genesis TINA

**Runtime cognitivo gobernado para TAMV Online Network y RDM Digital.** Isabella separa identidad, capacidad, autoridad, ejecución, evidencia, aprendizaje y producción. El objetivo es coordinar modelos, memoria, agentes, herramientas y operaciones bajo políticas verificables y supervisión humana.

[![Repository Assurance](https://github.com/OsoPanda1/Isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/Isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/Isabella-V6-TINA-h6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/Isabella-V6-TINA-h6/actions/workflows/ci.yml)

> **Invariante constitucional**
>
> `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION`
>
> **Contrato de veracidad:** `SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED`.

Este README distingue la arquitectura objetivo del comportamiento que cuenta con evidencia de implementación. Un nombre de módulo, un esquema, una tarjeta de interfaz, un hash o un endpoint no prueban por sí solos una integración completa.

## 1. Qué es Isabella

Isabella V6 Genesis es un runtime de orquestación y gobernanza cognitiva que forma parte del ecosistema TAMV Online Network. Su referencia territorial y de investigación es el Nodo Cero — Real del Monte (Mineral del Monte), Hidalgo, México.

No es, por el estado actual del repositorio, un modelo fundacional entrenado desde cero, una AGI, una entidad consciente ni una plataforma certificada. La selección de proveedores de inferencia no equivale a entrenamiento nativo. El fallback soberano local es determinista y no debe presentarse como un LLM.

### Principios operativos

- **Autoridad explícita:** las capacidades no crean permisos; la autorización se evalúa antes de operaciones protegidas.
- **Fail-closed:** una política inválida, un verificador ausente o una validación fallida no debe convertirse en permiso.
- **Evidencia antes de confianza:** los eventos relevantes deben enlazarse con fuentes, artefactos, pruebas o trazas identificables.
- **Memoria gobernada:** recuperar conocimiento requiere contexto y autorización; una memoria no se convierte en instrucción de sistema.
- **Supervisión humana:** las acciones de riesgo elevado deben escalarse o requerir aprobación de un principal autorizado.
- **Soberanía y privacidad:** aislamiento por tenant, minimización de datos, límites de entrada y control de secretos.
- **Honestidad de estado:** las cifras de riesgo, confianza y eficiencia son heurísticas hasta que existan calibración y benchmarks reproducibles.

## 2. Arquitectura

```text
Interfaz web / clientes / agentes
              │
              ▼
     Express + TypeScript API
              │
      Validación y límites
              │
   Identidad / scopes / C.R.O.W.N.
              │
    AEGIS + políticas de admisión
              │
       Genesis / TINA runtime
        ┌─────┼─────────┐
        ▼     ▼         ▼
    Cognición Memoria  HyperCore Ω²
        │     │         │
        └─────┼─────────┘
              ▼
       Adaptadores de modelo
  OpenRouter · Hugging Face · Gemini
       · AI Gateway · fallback local
              │
              ▼
    Verificación / política / BookPI
              │
              ▼
      Respuesta o decisión gobernada
```

Dominios asociados:

| Dominio | Responsabilidad y estado honesto |
|---|---|
| **TINA / Genesis** | Runtime cognitivo, registro de capacidades y orquestación. |
| **C.R.O.W.N.** | Política de capacidades, roles, scopes y autoridad. |
| **AEGIS** | Guardrails de entrada y herramientas; la decisión no-ALLOW debe bloquear la ejecución. |
| **YUN** | Contratos y eventos de federación; no implica una red federada distribuida ya operativa. |
| **BookPI** | Ledger encadenado y trazabilidad. La persistencia depende del backend configurado; un hash-chain no es almacenamiento WORM. |
| **GAME OVER / UAGP-1** | Evalúa pasaporte, confianza, riesgo, ética, aprobación y auditoría. En el runtime actual emite decisiones; no ejecuta la acción gobernada ni certifica el resultado. |
| **HyperCore Ω² / HyperPredict Ω** | Caché, compresión, predicción, enrutamiento y verificación. Router y afinidad son heurísticos; la caché léxica no equivale a embeddings ni a un MoE entrenado. |
| **OSIRIS** | Observación defensiva y registro de señales. No debe describirse como un bloqueo automático ni como certificación de seguridad. |
| **IGE-Ω (Rust)** | Workspace separado con crates y contratos de cognición, memoria, world model, ABX, BookPI y gateway. No asumir integración end-to-end hasta superar los gates de Rust e integración. |
| **ISVF** | Especificación de identidad acústica. La verificación biométrica, calibración por idioma/canal, anti-spoofing y procedencia requieren validación experimental antes de afirmaciones productivas. |

La monografía técnico-académica de Isabella V6 Genesis describe la arquitectura objetivo como una cadena de identidad, política, memoria gobernada, CROWN, runtime, herramientas, verificación y evidencia. Sus ecuaciones son modelos de diseño; no constituyen por sí mismas una prueba formal ni un resultado experimental.

## 3. GAME OVER — Universal Agent Governance Protocol (UAGP-1)

GAME OVER es una meta-capa de gobernanza para agentes, herramientas MCP y operaciones CI/CD. No es otro modelo generativo. Su contrato canónico contempla:

1. Validar estructura de la solicitud UAGP-1.
2. Verificar el AI Passport y su estado.
3. Calcular una puntuación heurística de confianza.
4. Evaluar riesgo y acciones de alto impacto.
5. Aplicar reglas éticas deterministas.
6. Requerir aprobación humana según la política.
7. Emitir una decisión explicable y registrar auditoría BookPI.
8. Devolver `ACCEPT`, `REJECT` o `ESCALATE`; nunca ejecutar por sí solo la operación protegida.

### Controles de seguridad en el runtime

El código de GAME OVER valida campos de riesgo, flags de aprobación, métricas de confianza y referencias de evidencia. La política derivada del riesgo no puede ser rebajada por `humanApprovalRequired: false`. Una identidad de pasaporte duplicada debe rechazarse en vez de reemplazar el registro existente. La evaluación de riesgo trata niveles de criticidad inválidos como críticos.

**Límite importante:** el registro de pasaportes del runtime es en memoria, no una autoridad criptográfica federada. La puntuación usa métricas declaradas y pesos heurísticos; no es una medición empírica de exactitud. El registro de auditoría hash-chain no es un dispositivo WORM.

### Plugin de Jenkins

El módulo `gameover-jenkins-plugin/` contiene el código fuente de un plugin Jenkins que expone el paso `gameOverGovernance`. Su contrato es bloquear el pipeline si el resultado no es `ACCEPT` cuando `failOnReject` está activo.

El plugin **no debe considerarse compilado, probado o instalado** hasta que Maven/JDK 17 produzcan el artefacto y la suite JUnit termine correctamente. La autoridad de pasaportes y el ledger del plugin son espejos en memoria; para decisiones autoritativas debe integrarse con el runtime configurado y validar autenticación, TLS, timeout, esquema y trazabilidad.

Documentación: [especificación canónica UAGP-1](docs/GAME_OVER_UAGP1_CANONICAL.md) · [README del plugin Jenkins](gameover-jenkins-plugin/README.md).

## 4. Estado de implementación y evidencia

### Última base de validación conocida

La revisión de runtime identificada como `8c19acd2959de3ae8f4c78a098d85192f1232164` pasó, según la evidencia de esa revisión:

| Gate | Resultado de esa revisión |
|---|---|
| Suite Vitest | 734 pruebas aprobadas en 135 archivos |
| UI smoke | `UI_NAVIGATION_SMOKE_OK`, `CINEMATIC_INTRO_12_SCENES_OK` |
| Runtime smoke | `LOCAL_CONVERSATION_SMOKE_OK`, `PUBLIC_API_GUARDRAILS_OK`, `OPENROUTER_PAID_ID_BLOCK_OK` |
| Suite estática de seguridad | 14 pasaron; 0 fallaron; 0 no aplicables |
| Vercel | Despliegue READY para esa revisión |

**No confundir esa base con el HEAD actual.** Se añadieron cambios posteriores en GAME OVER y pruebas de regresión; esos commits necesitan volver a pasar CI y build antes de declararse verificados. El último resultado histórico no valida automáticamente los cambios posteriores.

### Bloqueadores abiertos

- **CI reproducible:** obtener una ejecución de GitHub Actions con jobs ejecutados y conclusión verde para el SHA actual.
- **Pruebas de los cambios recientes:** build TypeScript, suite Vitest, smokes de UI/runtime y suite de seguridad sobre el HEAD actual.
- **Inferencia externa:** la última validación omitió el smoke del proveedor porque no había credenciales elegibles; no se afirma que la inferencia real esté verificada.
- **Rust / IGE-Ω:** ejecutar `cargo fmt --check`, Clippy, tests y release build con `--locked` usando el lockfile del workspace.
- **Persistencia y recuperación:** probar E2E Postgres/Supabase, aislamiento multi-tenant/RLS, retención, backup/restore y simulacro de recuperación.
- **GAME OVER/Jenkins:** compilar el plugin con JDK 17 y Maven, ejecutar JUnit, verificar su comunicación autenticada con el runtime y ensayar bloqueo de pipeline.
- **E2E de navegador y observabilidad:** pruebas reales en escritorio/móvil, dashboards, SLO, errores, coste y latencia p50/p95/p99.
- **CITEMESH y MoE:** los artefactos de CITEMESH siguen sin recuperarse/verificarse; el router heurístico no es un MoE entrenado.
- **KMS/HSM y PQC:** la integración con servicios y proveedores criptográficos reales depende de infraestructura externa y no se marca verde por tener contratos o adaptadores.

La estimación de readiness previamente publicada es **46.25% ponderado por gates**. No es un porcentaje científico de funcionalidades ni se incrementa hasta que las brechas anteriores tengan evidencia reproducible. Consulta el [estado real](docs/ESTADO-REAL-ACTUAL.md) y la [auditoría P0](docs/audits/P0-ARCHITECTURE-HARDENING-2026-10-12.md).

## 5. Requisitos

- Node.js **24.x**.
- pnpm **10.28.x** (el proyecto declara `pnpm@10.28.0`).
- Git.
- Para el plugin Jenkins: JDK 17, Maven y un Jenkins de pruebas compatible con la versión objetivo declarada por el plugin.
- Para inferencia externa, almacenamiento persistente y otros servicios: credenciales y recursos configurados fuera del repositorio.

## 6. Instalación y ejecución local

```bash
git clone https://github.com/OsoPanda1/Isabella-V6-TINA-h6.git
cd Isabella-V6-TINA-h6
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

El servidor se configura en el código para escuchar en el puerto `3000`. No expongas el servidor a Internet con secretos de desarrollo ni sin configurar autenticación, límites y observabilidad.

### Validación local

```bash
pnpm run typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run security:suite
pnpm run build
```

`pnpm run build` incluye typecheck de build, Vitest, bundle de servidor, comprobación sintáctica de la interfaz, smoke de UI, smoke de runtime y suite estática de seguridad. Una prueba local solo valida el entorno y el SHA en el que se ejecutó.

### Plugin Jenkins

```bash
cd gameover-jenkins-plugin
mvn -B test
mvn -B package
```

El comando de empaquetado debe producir un artefacto HPI sin errores antes de instalarlo en una instancia Jenkins aislada de pruebas. No pruebes el primer despliegue de un plugin de gobernanza sobre producción.

## 7. Configuración y secretos

Los nombres de variables pueden variar por integración. Revisa el código y los documentos de cada adaptador antes de habilitarlo. Entre los nombres de configuración usados por el runtime están:

- `GENESIS_ADMIN_API_TOKEN`: acceso administrativo a rutas protegidas.
- `GENESIS_HUMAN_APPROVAL_TOKEN` y `GENESIS_HUMAN_APPROVER_ID`: credencial y principal designado para la aprobación humana independiente en GAME OVER. Si no están configurados o no coinciden, una acción que exige aprobación debe quedar en `ESCALATE`; el token administrativo por sí solo no cuenta como aprobación.
- `BOOKPI_LEDGER_PATH`: ruta del ledger JSONL durable cuando se habilita ese backend.
- Credenciales específicas de proveedores de inferencia (por ejemplo, OpenRouter, Hugging Face o Gemini) y variables de conexión para persistencia.

Reglas mínimas:

- No guardes tokens, claves privadas, archivos `.env` ni credenciales de producción en Git.
- Usa el gestor de secretos del entorno de despliegue y rota cualquier secreto expuesto.
- No habilites proveedores de coste variable sin opt-in explícito, presupuesto y límites.
- Verifica identidad, scopes, tenant y autorización del lado servidor; no confíes en roles enviados por el cliente.
- No uses un token administrativo compartido como sustituto de identidades individuales para aprobaciones críticas. GAME OVER exige una credencial de aprobación separada y un ID de aprobador configurado; este mecanismo es un control de despliegue, no sustituye una integración completa con un proveedor de identidad corporativo.
- Prueba fallos de red, timeout, respuestas malformadas, proveedor indisponible, revocación y rollback.

## 8. API de referencia

El inventario completo está en [docs/api/route-inventory.json](docs/api/route-inventory.json), [docs/api/README.md](docs/api/README.md) y [OpenAPI](docs/api/openapi.yaml). Estas rutas son una guía; el estado de cada ruta debe confirmarse mediante pruebas y configuración reales.

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/v1/health` | Salud pública de la API |
| `GET` | `/api/v1/status` | Estado resumido |
| `POST` | `/api/v1/cognition/route` | Conversación/orquestación pública con límites |
| `POST` | `/api/v1/cognitive/request` | Mediación cognitiva |
| `GET` | `/api/v1/metrics` | Métricas agregadas |
| `GET` / `POST` | `/api/v1/gameover/constitution`, `/passports` | Constitución y pasaportes; requieren autorización administrativa en las rutas protegidas |
| `POST` | `/api/v1/gameover/passports/revoke` | Revocación de pasaporte |
| `POST` | `/api/v1/gameover/govern` | Decisión UAGP-1 |
| `GET` | `/api/v1/hypercore/modes` | Modos y límites declarados de HyperCore |
| `POST` | `/api/v1/hypercore/run` | Pipeline HyperCore protegido |
| `POST` | `/api/v1/hypercore/predict` | Predicción/prefetch gobernado |
| `GET` | `/api/v1/osiris/status` | Estado de observación OSIRIS |
| `POST` | `/api/v1/osiris/inspect` | Inspección defensiva advisory |
| `GET` | `/api/v1/billing/plans` | Planes y entitlements declarados |
| `POST` | `/api/v1/commerce/offers` | Puerta de ofertas con entitlements y cuotas |

Las rutas administrativas necesitan el token configurado. No se deben interpretar como abiertas por aparecer en la tabla.

## 9. Mapa de documentación

- [Mapa operativo de arquitectura](docs/ARCHITECTURE-OPERATING-MAP.md)
- [Estado real actual](docs/ESTADO-REAL-ACTUAL.md)
- [Auditoría P0 de endurecimiento](docs/audits/P0-ARCHITECTURE-HARDENING-2026-10-12.md)
- [Backlog de implementación](docs/evolution/IMPLEMENTATION-BACKLOG.md)
- [Especificación C.R.O.W.N. / VΩ](docs/CROWN-ISABELLA-VOMEGA-OPERATING-SPEC.md)
- [GAME OVER / UAGP-1](docs/GAME_OVER_UAGP1_CANONICAL.md)
- [BookPI: ledger durable y mantenimiento](docs/bookpi/DURABLE-LEDGER.md)
- [OSIRIS: arquitectura y límites](docs/osiris/ARCHITECTURE.md)
- [Aislamiento multi-tenant](docs/tenancy/ISOLATION.md)
- [Motor de facturación y entitlements](docs/commerce/BILLING-ENGINE.md)
- [Gates de operaciones IGE-Ω](ige-omega/docs/OPERATIONS-AND-RELEASE-GATES.md)

## 10. Seguridad y reporte de vulnerabilidades

No publiques secretos, datos personales, tokens válidos ni detalles explotables de una instancia productiva en issues públicos. Para reportar un problema, proporciona una reproducción mínima sin credenciales, el SHA afectado, entorno, impacto observado y pruebas que lo sustentan. Las medidas defensivas del repositorio no sustituyen una revisión independiente ni una auditoría de despliegue.

## 11. Licencia, autoría y alcance

Este repositorio contiene software y especificaciones en evolución. Antes de reutilizarlo, consulta los archivos de licencia y avisos existentes. Las afiliaciones, identificadores académicos, certificaciones, DOI y afirmaciones de cumplimiento deben citarse únicamente cuando estén publicados y verificables.

**Principio de cierre:** ninguna capacidad se considera lista para producción por su nombre, intención o documentación. Debe superar validación automatizada, integración real, revisión de seguridad, pruebas operativas y evidencia del SHA exacto que se pretende liberar.
