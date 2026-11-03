# Auditoria de despliegue — 2026-11-01 (engine-generated)

Medicion observada contra el alias de produccion
`https://isabella-version-terminus-v6.vercel.app` sobre `main` en
`a6b22a8e04e9b8af96c5bbdbed8de5dc02065692`. Es evidencia medida, no certificacion:
ningun punto de este documento declara `production`.

## 1. El artefacto desplegado funciona

| Superficie | Estado medido |
|---|---|
| `GET /` | 200, 54 447 B HTML |
| `GET /health` | 200 `status:healthy`, v40.0.0 |
| `GET /api/v1/health` | 200, `inferenceMode: external-if-configured-otherwise-local-fallback` |
| `GET /api/v1/status` | 200, 18 339 B |
| Cabeceras de seguridad | `nosniff`, `DENY`, `strict-origin-when-cross-origin` presentes |
| Barrido de las 149 rutas `GET` del inventario | 79x `200`, 32x `401`, 12x `503`, 3x `400`, 16x `429`, 7x `404` |

De los 7 `404`, seis son rutas con `:param` sustituido por un placeholder en el
barrido (404 esperado). El unico `404` real es `GET /api/v1/atlas/hcu`.

El despliegue **si esta al dia con `main`**: `GET /api/v1/agents/mesh` (anadido en
`a6b22a8`) responde 200. Por tanto los 404 no son un artefacto desactualizado.

## 2. Bloqueador principal: no es codigo, es la cuenta de GitHub

Los cuatro jobs que gatingan `build` en `.github/workflows/ci.yml` no llegan a
ejecutarse. Anotacion literal de GitHub Actions:

> The job was not started because your account is locked due to a billing issue.

Afecta a `Lint & TypeCheck`, `Test Suite`, `Security Scan` e `IGE-Ω Rust Workspace
CI`; cada uno muere en ~3 s. En consecuencia `Build Docker Image`, `Deploy to
Staging`, `Manual Production Deploy` y `Create Release` quedan `skipped`. El mismo
patrón se repite en `Repository Assurance` y en el run `Genesis Atlas Ingest`.

`deploy-production.yml` abre con `validate-source`, que exige un run de CI con
`conclusion === "success"` en `main`. Mientras la cuenta este bloqueada,
eso es imposible: **el despliegue automatizado no puede activarse por muchos
cambios de codigo que se hagan**. El repositorio es publico (Actions gratuitos),
así que el consumo proviene de los repositorios privados de la cuenta.

Acciones habilitantes (fuera del codigo):

1. Regularizar la facturacion de la cuenta (metodo de pago o limite de gasto) en
   <https://github.com/settings/billing>.
2. Reducir el consumo: desactivar los `schedule:` de `ci.yml` (semanal),
   `security-release` y `atlas-ingest.yml` mientras no se necesiten, o mover los
   jobs pesados a runners autoalojados.
3. Alternativa inmediata para publicar sin CI: `vercel deploy --prod` desde una
   copia local con el arbol validado. No sustituye la evidencia automatizada.

## 3. Deadlock real de codigo: la compuerta post-despliegue

`scripts/production-smoke.ts` llamaba `verifyDeployment(baseUrl)` sin opciones, de
modo que `requireReadiness` caia en su default `true` y exigia
`GET /api/v1/readyz` = 200 con `readiness.ready === true`. Pero el 503 es
intencional: el blocker publicado es
`bookpi-ledger:degraded / VOLATILE_IN_MEMORY`, y esa semantica esta congelada por
`test/bookpi/readiness.test.ts` ("does not treat a valid in-memory chain as
production-ready"). No existia ninguna via para elegir el nivel.

Resultado: aunque se resuelva la facturacion, el paso `Post-deploy smoke
(fail closed)` falla siempre y el job `deploy` se pone rojo sobre una app que
sirve correctamente. Ese ciclo no puede cerrarse con el diseno actual.

Este porte anade el nivel por `SMOKE_REQUIRE_READINESS`, **estricto por defecto**:

| Valor | Nivel | Semantica |
|---|---|---|
| sin definir, `true`, `1` | `certified-production` | exige 200 y `ready=true` (igual que antes) |
| `false`, `0` | `draft-contract` | exige contrato 200/503 coherente; un 503 declarado no bloquea |
| cualquier otro | `certified-production` | se advierte en log y conserva el estricto |

El nivel de borrador no es un bypass: un envelope `readyz` malformado sigue
fallando (cubierto por `test/deployment/smoke-readiness-tier.test.ts`) y la salida
imprime `SMOKE_TIER` para que el registro del despliegue no se pueda leer como
certificacion.

Para que `deploy-production.yml` use el nivel de borrador hace falta anadir una
linea en el paso `Post-deploy smoke (fail closed)`:

```yaml
        env:
          SMOKE_BASE_URL: ${{ steps.vercel.outputs.url }}
          SMOKE_REQUIRE_READINESS: "false"   # despliegue de borrador; no certifica
```

No se aplico en este porte para no reescribir a ciegas un YAML de 307 lineas sin
poder ejecutar el validador. Debe ser decision explicita del titular.

## 4. Los "31 archivos / 97 pruebas rojos" no son defectos del proyecto

Son `Digest method not supported` (`sha3-512` inexistente en el Node embebido de la
herramienta local) y `tslib`. Ningun fichero de `src/` importa `tslib`
aparece solo como dependencia transitiva opcional en `pnpm-lock.yaml` y
`importHelpers` ni siquiera esta en `tsconfig.json`. En CI con Node 24 no aplica.

## 5. Causa raiz unica detras de los 503 observados

`/api/v1/readyz`, `/api/v1/healthz` y las 8 rutas de `/api/v1/revenue/*` mas
`/api/v1/ops/latency` y `/api/v1/ops/snapshot` comparten el mismo motivo: la
dependencia requerida `bookpi-ledger` esta degradada. No son 11 fallos, es uno.

Para llevar `readyz` a 200 hace falta una de las dos, y la eleccion es de
gobernanza, no tecnica:

- **A (ingenieria):** migrar el ledger legacy a durable. Sus consumidores
  (`hypercore`, `osiris`, `gameover`, `tools/catalog`) lo invocan sin `await` y
  Node no tiene cliente Postgres sincrono, asi que implica volver asincronos esos
cuatro caminos. Es el trabajo real, no un parche.
- **B (gobernanza):** reclasificar el ledger legacy como dependencia opcional
  mientras `pipeline-bookpi-storage` (`POSTGRES`, `durable:true`, ya `healthy`)
  sea la fuente de evidencia de produccion. Cambia el contrato publico y obliga a
  reescribir las pruebas congeladas y el RFC-0005.

## 6. Lo que falta para "todas las funciones hagan su funcion"

Ordenado por valor, con lo que mide la evidencia anterior:

1. Proveedor de inferencia: `inference-provider:degraded`. La conversacion
generativa no esta verificada de punta a punta; hoy cae a motor local
   (`cognition/native-runtime` reporta `degraded:true`). Falta el secreto del
   proveedor autorizado en el entorno de produccion y una prueba E2E real.
2. `/api/v1/atlas/hcu` esta en el codigo
   (`inline@src/routes/atlas-hcu.ts:102`), en `docs/api/README.md` y en el
   inventario congelado, pero el servidor desplegado no la registra (404
   `Cannot GET`). Registro condicional: hay que cablearla o marcarla
   `verified:false` en el inventario. El inventario actual la presenta como
   existente.
3. Persistencia de conversaciones si funciona y es durable:
   `GET /api/v1/persistence/chat/sessions` → 200
   `{"success":true,"persistence":"neon","sessions":[]}`.
4. Quantum PennyLane `not-configured`; observabilidad sin exporter
   (`OTEL_EXPORTER_OTLP_ENDPOINT`); MCP 503 sin `MCP_SERVER_TOKEN`. Son
   configuracion ausente, no codigo roto.
5. 16 rutas del barrido quedaron sin medir porque el limiter propio corto el
   barrido (`429`), y `TOO_MANY_AUTH_FAILURES` en `revenue/*` y `ops/*` al
   reintentar sin credencial. Volver a medir con token administrativo cuando
   proceda.

## 7. Deriva de configuracion corregida en este porte

`vercel.json` declaraba `X-Frame-Options: SAMEORIGIN` mientras la aplicacion sirve
`DENY` (y mientras el smoke exige `DENY`). Se alinea a `DENY`. Sin cambio de
comportamiento observable: la cabecera efectiva ya era `DENY`.

## 8. Que NO se verifico en este porte

La shell local no arranca en esta sesion (`fork: errno 11`) y GitHub Actions esta
bloqueado por facturacion, así que `typecheck`, `lint`, `format:check`, `vitest` y
`build:dist` **no se ejecutaron**. Los cuatro ficheros son aditivos o quirurgicos
y no tocan gobernanza de `readyz`, pero quedan sin validar por maquina hasta que
la cuenta este habilitada. Ningun resultado de este documento sustituye esa
ejecucion.
