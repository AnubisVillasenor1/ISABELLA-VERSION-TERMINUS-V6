---
state: auto_generated
---

# Auditoría de máximo nivel — ISABELLA-VERSION-TERMINUS-V6 (2026-11-03)

**Repo:** `OsoPanda1/ISABELLA-VERSION-TERMINUS-V6` · **Rama:** `main` · **HEAD medido:**
`5e6fe2f5c5a895e2570bb853706437e7a49deef6` (igual a `origin/main`).
**Método:** cada afirmación se buscó por símbolo en `src/**` y se midió con las puertas del propio
repo. Escalera usada: **SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ VERIFIED** (README.md:14, AGENTS.md §7).
En conflicto entre especificación y código se archiva la divergencia y **no** se reescribe el código
(AGENTS.md §6). Los números de línea citados corresponden al árbol con los cambios de esta tanda.

**Runtime de las mediciones (no es un detalle):** Node **v26.13.0** en
`C:/Program Files/nodejs/node.exe`. El Node embebido de Qoder (`ELECTRON_RUN_AS_NODE=1`) reporta
`process.versions.openssl = "0.0.0"` y **no tiene SHA3 ni blake2**; con ese runtime la misma suite
arroja 136 fallos falsos (`Error: Digest method not supported`). Ninguna cifra de esta página vale
sin el runtime encima. CI fija `engines.node: "24.x"` (package.json), que sí trae OpenSSL completo.

## §0 Veredicto en una línea

Isabella **corre hoy** y sus puertas de calidad están en verde sobre el fuente actual; lo que impide
desplegar **no es código**: son dos hechos de cuenta (GitHub Actions bloqueado por facturación y el
proyecto Vercel de producción inexistente) más un conjunto de credenciales que sólo el owner puede
provisionar.

## §1 Puertas medidas en esta máquina

| Puerta | Comando | Resultado | Detalle |
|---|---|---|---|
| Typecheck principal | `tsc --noEmit` | **exit 0**, 0 errores | Tras promover 15 capas desde `tsconfig.layers.json`. |
| Typecheck de capas | `tsc -p tsconfig.layers.json` | **exit 0** | Pasaba ya antes del cambio; por eso la promoción fue segura. |
| Lint (ámbito ampliado) | `eslint "src/**/*.{ts,tsx,js,jsx}" "scripts/**/*.mjs" "test/**/*.ts" --max-warnings=0` (el glob declarado en `package.json` → `lint`) | **exit 0** | 19 scripts y 390 archivos de test entran por primera vez. Ver §11: pasar los directorios a secas **no** sale 0. |
| Formato | `prettier --check "src/**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"` (`format:check`) | **exit 0** | `src/**` sin extensión arrastra `.jpeg` y `.css` y falla; el gate usa la lista de extensiones. |
| Env example | `node scripts/check-env-example.mjs` | `ENV_EXAMPLE_OK keys=224 read_in_src=113` | |
| SOPS | `node scripts/check-sops-placeholders.mjs` | `SOPS_PLACEHOLDERS_OK` | Ningún archivo cifrado rastreado. |
| Suite completa | `vitest run` | **2709 pruebas passed / 0 failed** · 389/390 archivos | 1 archivo no carga por defecto de entorno (§3.F-F). |
| Security suite | `node scripts/security-suite.mjs` | **14 passed, 0 failed** | |
| Smoke de runtime | `node scripts/runtime-smoke.mjs` | **exit 0**, 7 sondas OK | Requiere `dist/server.js` rehecho (§3.F-G). |
| Readiness de despliegue | `tsx scripts/deploy-readiness.ts` | `DEPLOY_READINESS_BLOCKED` (6 errores, 3 avisos) | Los 6 son credenciales ausentes, no defectos (§5). |
| Inventario de rutas | `node scripts/route-inventory.mjs` | **336 rutas** | El JSON commiteado estaba obsoleto; regenerado (§2). |
| Formato Rust | `cargo fmt --all -- --check` en `ige-omega/` | **exit 0** | Primer paso del job `IGE-Ω Rust Workspace CI`. |

Línea base antes del lote: **2706** pruebas. Con el lote aplicado, dos mediciones independientes
(una a media sesión, otra al cerrar) dieron **2709 passed / 0 failed** sobre Node v26; los 3 de
diferencia son `test/routes/learning-train-disclosure.test.ts`. Sobre el runtime de Qoder, en
cambio, la misma suite da 136 fallos falsos por digests (§ encabezado).

**Puertas del CI que NO se pudieron verificar en esta máquina** (no es que fallen; es que no hay
medio local): `pnpm audit --prod --audit-level=moderate` y `pnpm install --frozen-lockfile`
(acá no hay `pnpm` en el PATH, sólo `npm`), el escaneo Trivy de imagen, `cargo clippy --workspace
--locked -- -D warnings`, `cargo test --workspace --locked` y el build de release Rust. Por eso
F-F (`tslib`) sigue sin probarse empíricamente: cerraría con una instalación completa.

## §2 Correcciones ejecutadas en esta tanda

| # | Afirmación previa | Lo que existe ahora | Veredicto |
|---|---|---|---|
| 1 | «`pnpm lint` protege el repo.» | `package.json:23` amplía el glob a `scripts/**/*.mjs` y `test/**/*.ts`; `eslint.config.mjs` añade el bloque de globals Node que faltaba (sin él, `process`/`console` daban 22 `no-undef` y la puerta era incorregible). | **NO EXISTÍA → CABLEADO en este cambio** |
| 2 | 15 capas declaradas «excluidas del typecheck, pendientes de que se pongan verdes». | `tsconfig.json:38` reduce `exclude` de 23 a 8 entradas (15 retiradas); `ci.yml` retira `continue-on-error` del paso de capas. | **SOBREDECLARACIÓN**: estaban *ya* typecheadas (ver F-A), así que la exclusión era cosmética. |
| 3 | «los layers son advisory hasta que estén verdes en CI». | `typecheck:layers` sale exit 0 en local; el paso pasa a bloqueante con comentario veraz. | **NO EXISTÍA → CABLEADO en este cambio** |
| 4 | 15 defectos léxicos en código que gobierna el despliegue y en sus tests: 8 al sacar del `ignores` de eslint las capas promovidas (`no-case-declarations` ×4, `no-unsafe-declaration-merging` ×2, directivas `eslint-disable eqeqeq` muertas ×2), 4 en `scripts/**` (uso de variable declarada sin consumir ×2, `no-empty`, `no-useless-escape`) y 3 en `test/**` (`no-regex-spaces`). | Todos corregidos y verificados: typecheck principal y de capas en exit 0, lint ampliado en exit 0, y los dos archivos de test tocados siguen pasando (13 pruebas). | **NO EXISTÍA → CABLEADO en este cambio** |
| 5 | `/api/v1/learning/train` servía métricas de `Math.random()` como si fueran un pipeline real (AGENTS.md §4). | `src/server.ts:6764` responde con `evidence: { simulated: true, metricsSource: 'Math.random', signatureVerified: false }`; `test/routes/learning-train-disclosure.test.ts` (3 pruebas) lo fija. | **NO EXISTÍA → CABLEADO en este cambio** |
| 6 | `docs/api/route-inventory.json` commiteado. | Regenerado: 140 desplazamientos de línea + 4 cambios reales, entre ellos `/api/v1/learning/train` que pasó de `verified: false` a cubierto por prueba. | **PARCIAL → corregido** |
| 7 | README afirmaba «LLM fundacional propio». | `README.md:92` ahora dice «Motor de inferencia propio (orquestación, no modelo fundacional)». | **SOBREDECLARACIÓN (1×)** |
| 8 | `CITATION.cff:22-23` enlazaba `OsoPanda1/isabella-V6-TINA-h6`. | Misma repo id `1413901307` renombrado (HTTP 301 verificable); se fija el nombre canónico y `license: proprietary` acorde a `LICENSE`. | **DIVERGENCIA DE NOMBRE → corregida** |
| 9 | `src/server.ts` comentaba que el almacén de conocimiento verificado era «Supabase-backed … in-memory otherwise». | `src/server.ts:1046` y `src/memory/verified-knowledge.ts` reflejan el contrato real: `mongodb` por defecto, arranque bloqueado sin `MONGODB_URI`, `memory` sólo para desarrollo. | **SOBREDECLARACIÓN → corregida** |

Ninguna de estas filas añade capacidad. Todas hacen que lo afirmado coincida con lo medido.

## §3 Hallazgos

**F-A — `tsconfig.json` `exclude` no significaba «no typechecked».** Medido con
`tsc --listFilesOnly`: el programa tenía 621 archivos bajo `src/` antes y **625** después de retirar
las 15 exclusiones. La diferencia es de 4 archivos porque un archivo importado desde una raíz
entra al programa aunque esté en `exclude`. Consecuencia: `docs/STATUS.md` (generada desde la lista
de exclusiones por `scripts/generate-status.mjs:14`) y el comentario del `ci.yml` describían una
frontera de cobertura que no existía. El guard
`test/deployment/hardening-guards.test.ts:38` sólo comprueba coherencia tsconfig↔layers, no que la
exclusión sea efectiva.

**F-B — 508 de 1133 archivos `.ts/.tsx` bajo `src/` nunca pasan por el typecheck** (44.8 %).
Concentración: `src/lib/lib` 323, `src/components/**` ~150, `src/core/core` 15, `src/hooks/hooks` 3,
`src/authz-runtime` 6, `src/hypercore-runtime` 4.

**F-C — `src/components/**` es inejecutable como TypeScript.** `tsconfig.json` no declara opción
`jsx` y el grafo de dependencias **no tiene React**: `react`, `react-dom`, `@types/react`,
`@types/react-dom` están ausentes de `package.json` y de `node_modules/.pnpm`. Un sondeo con
`"jsx"` activado produjo 21 561 errores, de los que 12 244 son `TS7026` (no existe
`JSX.IntrinsicElements`) y 7 769 `TS17004` (falta `--jsx`). Es decir: ~150 componentes `.tsx` no se
pueden typechequear ni compilar con las dependencias actuales. `tsconfig.build.json` los excluye y
nada del runtime los importa; la UI que sirve el servidor vive en `src/ui/*.js`.

**F-D — 38 componentes están duplicados byte a byte.** `src/components/isabella/isabella/` es copia
idéntica de `src/components/isabella/` (`diff -rq` no reporta ninguna diferencia) y **nadie** la
importa. Lo mismo en forma de directorio doble en `src/lib/lib`, `src/core/core`, `src/hooks/hooks`,
`src/components/ui/ui`, `src/components/navigation/navigation`, `src/components/intro/intro`,
`src/authz-runtime/authz-runtime`, `src/hypercore-runtime/hypercore-runtime`. Se reporta, no se
borra: tocar 38 archivos rastreados es decisión del owner.

**F-E — `format:check` no cubre `test/**` ni `scripts/**`.** Medido: 355 archivos de `test/` y
`scripts/` difieren del estilo Prettier. No se extendió la puerta porque eso exige un commit
mecánico masivo que rompería las citas `archivo:línea` del historial.

**F-F — `node_modules` local está incompleto.** `test/atlas/hcu-store.test.ts` no carga:
`Cannot find module 'tslib'` desde `@supabase/functions-js@2.118.0`. El lockfile **sí** declara
`tslib@2.8.1` (`pnpm-lock.yaml:2320`, y como dependencia en las líneas 3026/3030/3036/3041/3046), pero
`node_modules/.pnpm/*tslib*` no existe. Es instalación local rota, no defecto del repo: CI hace
`pnpm install --frozen-lockfile`. Nota operativa: en esta máquina **no hay `pnpm` en el PATH** (sólo
`npm`), así que los comandos `pnpm …` de la documentación no son ejecutables tal cual.

**F-G — el smoke de runtime prueba el bundle, no el fuente.** `scripts/runtime-smoke.mjs:19` importa
`../dist/server.js`. Con el `dist/` de 2026-10-31 la aserción de `diagnostics` falló con
`['diagnostics missing']` porque aquel bundle no contenía `probeFailures` (0 apariciones frente a 18
en `src/server.ts`). Tras `esbuild src/server.ts … --outfile=dist/server.js` el smoke pasa. Lección
de procedimiento: reconstruir `dist/` antes de citar el smoke.

**F-H — el ciclo de CI está muerto por facturación, no por el código.** `main` (5e6fe2f5) tiene tres
runs fallidos el 2026-11-02/03. Cada job falla en **3 segundos** (18:25:02Z → 18:25:05Z) con
**cero steps ejecutados** en los 12 jobs. Un job que muere sin steps no evaluó ni una línea del repo.
`Deploy Production Ω` (run 309) depende de `workflow_run`, o sea de la evidencia de CI; sin evidencia,
el gate de despliegue no puede pasar nunca. Causa declarada por GitHub en sesiones previas de esta
misma cuenta: *«The job was not started because your account is locked due to a billing issue»*.

**F-I — la producción documentada no existe.** El alias de Vercel referenciado en la documentación
responde `DEPLOYMENT_NOT_FOUND`.

**F-J — huecos de canon que vienen del corpus externo, no del repo.** En el material de
`C:\Users\tamvo\OneDrive` (documentos sueltos, no versionados en el repo) aparecen «PEDAGOG» y los
controles `ISA-014/015/017/019/021/022/024/025`. Medido en el árbol completo: **0 coincidencias**
para `pedagog` (insensible a mayúsculas, incluidos `docs/`) y 0 para esos ocho identificadores en
`src/**`. Los ISA del repo usan otros rangos (ISA-002…013, 016, 077, 159, 199-217, 259, 371, 451-458,
500). Dictamen: **NO IMPLEMENTADO**, y con procedencia externa — no son una regresión del repo.

## §4 Lo que sigue sin implementar (no declararlo como hecho)

1. **Pipeline de aprendizaje real.** El agregador `aggregateRobust` existe y está probado, pero ningún
   consumidor HTTP lo invoca; `/api/v1/learning/train` sigue siendo simulación etiquetada (§2.5).
   Hacen falta clientes federados reales y verificación de firma en el camino de datos.
2. **Typecheck del árbol UI.** Bloqueado por F-C: requiere decidir si se adopta React (o se borra
   `src/components/**`). Es diseño nuevo, pide decisión humana (AGENTS.md §6).
3. **`src/lib/lib` fuera del typecheck** (323 archivos). Requiere una pasada de errores; no se puede
   promover en tanda sin medir.
4. **Duplicados de F-D.** Borrado candidato, sin ejecutar.
5. **`state: wired`.** Ninguna capacidad de este repo puede declararse en producción mientras F-H y
   F-I sigan abiertos y `deploy-readiness` bloquee (§5).

## §5 Lo que necesita el owner para desplegar

Orden por dependencia. Ningún punto es código.

1. **Desbloquear GitHub Actions** de la cuenta `OsoPanda1` (factura/límite). Sin esto no hay
   `production-evidence`, `security-suite` ni `sbom` como artefactos, y `deploy-production.yml` no
   puede pasar su `verify-artifact`.
2. **Provisionar el proyecto Vercel** y exponer `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
3. **Credenciales de persistencia** que `deploy-readiness` exige como ERROR: `MONGODB_URI`
   (conocimiento verificado), `DATABASE_URL`/`POSTGRES_URL` (BookPI y suscripciones),
   `BOOKPI_INTEGRITY_SECRET` (sello del ledger), `GENESIS_ADMIN_API_TOKEN` (rutas admin), y
   configuración Supabase para las sondas Atlas/IKES de `/api/v1/readyz`.
4. **`ALLOWED_ORIGINS`** con orígenes HTTPS exactos (vacío/localhost/wildcard están bloqueados a
   propósito) y `APP_PUBLIC_URL`.
5. Decidir si `readyz` en 503 con degradación honesta es el estado inicial aceptable, o si se exige
   proveedor durable antes del primer despliegue.
6. Autorizar el commit/push. Estado actual: la tanda de §2 está publicada en `main` como `5468bc3`, y el
   cableado de §8 se publicó en el commit que contiene esta línea (verificable con
   `git log --oneline -1 docs/history/archive/AUDITORIA-2026-11-03.md`). Publicar no despliega: falta
   todo lo demás de esta lista.

## §6 Nota de seguridad

- Se **leyeron y excluyeron** deliberadamente `C:/Users/tamvo/OneDrive/clavess`, `secretos.txt` y
  `SECRETOSISABELLA.txt`. En el working copy del repo no existe archivo `.env`, por lo que no había
  credenciales vivas que exponer en esta tanda.
- Sin hallazgos de secretos nuevos en el diff: `check:sops` en verde, `security-suite` 14/14 y el
  escaneo de proveedores (`SEC-*`) sin coincidencias.
- Los documentos del corpus externo que se citan en §3.F-J deben revisarse antes de redistribuirse:
  en pasadas anteriores de este mismo material aparecieron URL prefirmadas y claves de proveedor.
  No se copiaron valores aquí.

## §7 Reconstrucción de esta tanda (qué toca cada archivo)

- `tsconfig.json` — `exclude` de 23 a 8 entradas.
- `eslint.config.mjs` — bloque de globals Node para `scripts/**` y `test/**`; `ignores` sincronizado
  con el nuevo `exclude`.
- `package.json` — `lint` y `lint:fix` amplían ámbito.
- `.github/workflows/ci.yml` — paso de capas pasa de advisory a bloqueante.
- `scripts/operational-inventory.mjs`, `scripts/repository-assurance.mjs`, `scripts/route-inventory.mjs`,
  `scripts/security-suite.mjs` — cuatro defectos de lint corregidos.
- `src/federation/tamv/tamv-federated-runtime.ts`, `src/learning/federated/federated-learning.ts`,
  `src/pipeline/hyper-turbo/hyper-turbo-pipelines.ts`, `src/multimodal/stepaudio/stepaudio-music.ts` —
  scoping de `switch`, directivas muertas y `StepAudioError` desdoblado en
  `StepAudioErrorPayload` (forma del cable) frente a la clase que se lanza.
- `test/deployment/hardening-guards.test.ts`, `test/deployment/openapi-contract.test.ts` — los
  literales `no-regex-spaces` se reescriben cuantificando el **espacio**, no el ancla:
  `/^ {2}[a-z_-]+:\s*$/m` y `/^ {4}(get|post|…):\s*$/`. (Una primera versión con `^{2}` habría
  cuantificado el principio de línea y vacío el guard; corregido antes de publicar y verificado con
  las 13 pruebas de esos dos archivos.)
- `test/routes/learning-train-disclosure.test.ts` — prueba nueva (3 casos).
- `docs/api/route-inventory.json`, `docs/STATUS.md` — regenerados por sus generadores canónicos.
- `README.md`, `CITATION.cff`, `src/memory/verified-knowledge.ts`, `src/server.ts` — correcciones de
  estado/afirmación de la tanda anterior.

## §8 Tanda posterior: `deploy:readiness` deja de ser decorativa

Medida sobre el árbol actual, después de `5468bc3`. No anula §1–§7: los suma.

**El problema.** `package.json` declaraba `deploy:readiness` y `.github/workflows/deploy-production.yml`
no lo invocaba en ninguna parte. La compuerta existía como capacidad, no como autoridad: un SHA con la
configuración productiva rota podía publicarse en GHCR con la etiqueta `:production` y desplegado en
Vercel sin que nadie la corriera (AGENTS.md §1: CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE).

**Lo que se cableó** (`.github/workflows/deploy-production.yml`, job `deploy`, `environment: production`):

| Orden | Step | Qué asegura |
|---|---|---|
| 5 | `Pull production environment from Vercel` | `vercel pull --environment=production`; si el proyecto no tiene ninguna variable, **falla** en vez de evaluar un gate con vacío |
| 6 | `Deploy readiness gate (producción real, valores nunca impresos)` | `pnpm exec tsx scripts/deploy-readiness.ts .env.production` con `VERCEL: "1"` |
| 9 | `Build and push production image` | sólo se alcanza si la compuerta no bloqueó |
| 10 | `Deploy to Vercel (prebuilt)` | ídem |
| 11 | `Post-deploy smoke (fail closed)` | nivel **certificado** por defecto (`SMOKE_REQUIRE_READINESS` derivado de `vars.SMOKE_TIER`) |

Tres decisiones de diseño, cada una con su razón:

1. **Antes de publicar, no después.** Si la readiness fuera posterior al `build-push-action`, GHCR
   quedaría con la etiqueta `:production` de un SHA rechazado, y un operador de k8s podría desplegarla
   creyendo que pasó la revisión.
2. **`.env.production`, no `process.env` del runner.** Las variables de producción viven en el proyecto
   de Vercel; evaluar el gate contra el entorno de Actions daría un `BLOCKED` decorativo (todo ausente)
   o un verde falso si alguien copia secretos al runner. El archivo lo escribe `vercel pull`, lo cubre
   `.gitignore` con `.env.*` (`.gitignore:6-8`) y nunca se imprime: `scripts/deploy-readiness.ts:7,14`
   lee `argv[2]` y sólo emite identificadores `DR-*`/`PF-*` y veredictos.
3. **`VERCEL=1` dentro del step del gate.** Define el contrato *serverless* de durabilidad
   (`checkDurableStore` en `src/health/deploy-readiness.ts`). Sin esa bandera, un almacén de claves o de
   federación en fichero pasa la revisión y pierde su estado en el primer arranque en frío.

**Dos bloqueos que no tienen forma de credencial** (el owner no los va a resolver con una clave):

- `.env.example:85` y `:96` fijan `ISABELLA_API_KEY_STORE=file` e `ISABELLA_FEDERATION_STORE=file`. Para
  el objetivo Vercel la compuerta los rechaza; quien copie ese archivo como entorno de producción
  obtiene un `BLOCKED` esperado, no un defecto del gate. No se cambió el ejemplo: es correcto para el
  camino de contenedor, donde `docker-compose.yml:214-217` usa los mismos almacenes respaldados por el
  volumen nombrado `bookpi-data:/app/data` (`docker-compose.yml:230`), que sí es durable.
- `BOOKPI_LEDGER_PATH` (aviso `PF-BOOKPI-VOLATILE` en `src/health/preflight.ts:129`) queda silenciado
  por `VERCEL=1`: en serverless no hay ruta donde persistir, así que el gate exige un almacén externo
  (`DR-*`), no un path.

**El smoke dejó de poder afirmar más que su evidencia.** Antes el step fijaba
`SMOKE_REQUIRE_READINESS: "false"` (borrador) y la summary decía «smoke verificado» sin nombrar el nivel;
además anunciaba «Imagen publicada» sin leer el outcome del `build-push-action`. Ahora: el nivel por
defecto es certificado, bajarlo exige declarar `SMOKE_TIER=draft` como variable de repo, la summary nombra
el tier en que corrió (`SMOKE_TIER_LABEL`), y tanto imagen como smoke se reportan desde
`steps.image.outcome` / `steps.smoke.outcome`. Un gate `skipped` se reporta como *no evaluada*, nunca como
aprobado.

**Contrato ejecutable.** Séptima y octava invariantes en
`test/deployment/workflow-contract.test.ts`: el gate corre después del `pull` y antes de la imagen y del
despliegue, consume `.env.production`, no hace `cat`/`printenv`, y fuerza `VERCEL=1`; el smoke corre en
nivel certificado por defecto y la summary lee su outcome. No-vacuidad probada por mutación: fijar
`SMOKE_REQUIRE_READINESS: "false"` hace fallar el test (`SMOKE_REQUIRE_READINESS fijado a un nivel
inferior`) y sustituir `SMOKE_OUTCOME` por `"success"` hace fallar el test (`la summary no lee el outcome
del step de smoke`). Ambas mutaciones se revirtieron; `git diff` del workflow no las contiene.

**Puertas medidas de nuevo** (este árbol, con las dos invariantes y el workflow editado):

| Puerta | Resultado |
|---|---|
| Parse YAML real del workflow (`js-yaml`) | `PARSE_OK`; orden `pull=5 gate=6 image=9 vercel=10 smoke=11`, `GATE_ENV={"VERCEL":"1"}` |
| `vitest run test/deployment/` | **122/122** en 20 archivos (antes de esta tanda: 121 en 20) |
| `vitest run` (suite completa) | **2711 pruebas passed / 0 failed**, 389/390 archivos |
| `check:env` / `check:sops` | `ENV_EXAMPLE_OK keys=224 read_in_src=113` / `SOPS_PLACEHOLDERS_OK` |
| `typecheck` + `typecheck:layers` | exit 0 ambos |
| `lint` (glob de `package.json`) | exit 0 |
| `format:check` (lista de extensiones de `package.json`) | exit 0 (ámbito real del gate, `ci.yml:63`) |

El archivo que no carga es el mismo que en §1: `test/atlas/hcu-store.test.ts` falla al *importar*
`@supabase/functions-js`, que requiere `tslib`. `tslib@2.8.1` está fijado en `pnpm-lock.yaml:2320` pero no
está materializado en `node_modules/.pnpm` de esta máquina: instalación local incompleta, no código — CI
hace `pnpm install --frozen-lockfile`, y ninguno de los tres archivos de esta tanda lo alcanza.

## §9 El pipeline sigue sin ejecutarse, y el advisory moderate ya está estimado

Dos hechos medidos sobre el remoto, después de `9c4a8d9`. Ninguno requiere tocar código.

**1) CI: rojo por facturación, no por aserción.** Los runs existen (`total_count=1938`), así que el
flujo de triggers funciona; pero los 7 check-runs que fallan en `9238d28` arrastran la misma anotación:
`The job was not started because your account is locked due to a billing issue`. Los jobs que sí
arrancaron quedaron en `skipped` por dependencia. Confirmado sobre el grafo real de check-runs
(`GET /commits/9238d28/check-runs` + `/check-runs/{id}/annotations`, anónimo: el repo es público).
Conclusión: §5.1 sigue abierto y **no hay evidencia de CI verde para ninguno de los tres commits
publicados**. Es la única compuerta de esta tanda que no puede cerrarse localmente, porque las puertas
locales ya corrieron verdes (§8) y Actions no ejecuta el árbol.

**2) El advisory es uno, moderate, y no vive en el artefacto desplegado.** Sin credenciales de la
cuenta se resolvió el grafo completo de `pnpm-lock.yaml` (508 paquetes snapshot, 236 alcanzables desde
las 22 dependencias de producción) contra `api.osv.dev/v1/querybatch` + `/v1/vulns/{id}`:

| Campo | Valor medido |
|---|---|
| Paquete | `minimatch@3.1.5` (el único `minimatch` del lock por debajo de 11.0.1; el otro es `11.0.1`) |
| Advisory | `GHSA-g3hv-75wg-m249` / `CVE-2026-118764` — DoS por amplificación de partes de glob |
| Severidad | MODERATE, `CVSS:4.0/…VC:N/VI:N/VA:L/SC:N/SI:N/SA:N` → sólo disponibilidad |
| Alcance | **`prod:false`** — cadena inversa: `eslint@9.39.5`, `@eslint/config-array@0.21.2`, `@eslint/eslintrc@3.3.7`. Herramienta de desarrollo |
| Fix | `introduced: 0`, `fixed: 11.0.1`. **No existe `3.1.6` ni `3.1.7`** (registry: el último 3.x es `3.1.5`) |

Es coherente con el «1 vulnerability (1 moderate)» que devolvió el push, y no se halló ningún otro.

**El repo ya lo conocía.** `pnpm-workspace.yaml:24-27` tiene una entrada para este mismo
`GHSA-g3hv-75wg-m249`, acotada a `minimatch@>=10.0.0 <11.0.1` → `11.0.1` (la línea que usa braintrust), y
el comentario explica por qué no se tocó el `3.1.5` de ESLint: «subir también el minimatch de eslint
cambiaría el instrumento con el que se verifica todo lo demás». El lock refleja nueve overrides en
`pnpm-lock.yaml` → `lock.overrides` (medido: `@hono/node-server`, `hono`, `qs`, `minimatch`, `lodash`,
`valibot`, `body-parser`, `undici`, `fast-uri`). La corrección de esta tanda **no** es escribir código
nuevo: es dejar de describir el aviso como sin resolver.

**Qué añade la medición de esta tanda.** El alcance residual (`3.1.5`, sólo ESLint) quedó acotado con
evidencia propia en lugar de con intuición:

- Los tres call sites de ESLint usan el export nombrado, no el módulo callable:
  `const { Minimatch } = require("minimatch")` (`file-enumerator.js:42`), `minimatch.Minimatch`
  (`eslint-helpers.js:30`) y `const Minimatch = minimatch.Minimatch` (`config-array/index.cjs:224`). En
  la familia ≥9/≥10 el módulo ya no es callable (`typeof exports === "object"`), pero
  `typeof exports.Minimatch === "function"`: lo que ESLint consume sigue presente.
- `IMinimatch` / `IMinimatchStatic` (`config-array/index.cjs:207-208`) aparecen sólo en bloques
  `@typedef`/`@import` de JSDoc: sin dependencia en runtime.
- Diferencia conductual sobre los patrones reales del repo: 17 patrones `ignores` de
  `eslint.config.mjs` × 628 rutas rastreadas = **10 676 comparaciones, 0 discrepancias, 0 errores** entre
  `3.1.5` y `10.2.6` con `{dot:true, allowWindowsEscape:true}`.
- Único consumo de opción que se pierde: `allowWindowsEscape` existe en 3.1.5 y ya no en ≥10, donde pasa
  a ser un no-op silencioso. Con separadores `/` (los que produce `git ls-files`) no altera ningún
  resultado; con patrones de barras invertidas en una máquina dev, sí habría que revisarlo.

**Por qué no se amplía el override ahora, aun siendo neutral en esta muestra.** Lo bloquea la razón del
propio comentario, no la técnica: el paso `3.1.5 → 11.0.1` cambia ESLint, que es el instrumento que
verifica al resto del repo, y Actions está bloqueado por facturación (§9.1). Un cambio en el verificador
sin CI que lo refute es exactamente el tipo de mérito que no se puede afirmar. La acción queda lista para
cuando el pipeline vuelva a correr: ampliar la clave a `"minimatch@^3.1.5": ^11.0.1` en
`pnpm-workspace.yaml` (campo `overrides`, no `package.json`: desde pnpm 10 el bloque `pnpm` de
`package.json` no se lee), regenerar con `pnpm install --lockfile-only`, y verificar `pnpm run lint`,
`pnpm run typecheck` y `pnpm install --frozen-lockfile` antes de comitear. Nota operativa medida en esta
tanda: `npx -y pnpm@10.28.0` **sí** ejecuta pnpm 10.28.0 en esta máquina (`10.28.0` impreso), aunque no
haya `pnpm` ni `corepack` en el PATH — así que la regeneración del lock es realizable sin instalar nada.
Mientras no se ejecute esa verificación, la posición honesta sigue siendo la documentada por el repo:
**riesgo aceptado y anotado** (dev-only, sólo disponibilidad, patrones de glob controlados por el
repositorio).
**Nota de ejecución.** En esta máquina no hay `corepack`/`pnpm` en el PATH, así que las puertas se
corrieron con `npx`/`node` sobre los mismos binarios de `node_modules/.bin` que CI usa bajo `pnpm`. CI
sigue ejecutando `pnpm run …`; lo que cambia es el lanzador local, no el veredicto.

**Sigue sin ser cierto.** Ninguno de estos cambios despliega nada: la rama `main` está publicada, pero
`deploy-production.yml` no puede correr con éxito mientras falten los elementos de §5 (Actions
desbloqueado, proyecto Vercel con sus tres credenciales, y las credenciales de persistencia). Con esas
piezas ausentes, el resultado esperado del pipeline es **readiness BLOQUEADA con los IDs `DR-*`/`PF-*`
nombrados**, que es exactamente lo que el cableado nuevo hace visible.

**Aviso del remoto, medido al empujar.** El `git push` de esta tanda devolvió «1 vulnerability (1
moderate) en la rama por defecto» con el enlace `security/dependabot/88`. El API de alerts requiere
sesión de la cuenta, y no se usó la de el owner: el advisory se estimó por otra vía, medible sin
credenciales, y se documenta en §9.

## §10 La compuerta de readiness fallaba abierta ante los literales de `.env.example`

Hallazgo propio, medido dos veces de forma independiente (una corrida propia y una de un subagente que
evaluó el mismo camino sin ver mi conclusión). Es un defecto de **código**, no de configuración, y quedó
cerrado en esta tanda.

**El fallo, en su forma más clara.** Una producción enteramente real —token de admin fuerte, origen HTTPS
exacto, proveedor de inferencia, Supabase completo, almacenes `postgres`— pero con las dos cadenas de
conexión todavía en plantilla. Medido sobre el árbol con la compuerta antes del cierre:

```
STATUS=READY_WITH_WARNINGS  ERRORS=0  findings=[DR-DATABASE-TLS]
```

Es decir: **aprobaba el despliegue**. La causa son tres compruebas que sólo preguntaban «no está vacío» o
«es largo y diverso»:

1. `has()` (`src/health/deploy-readiness.ts:19` antes del cierre) medía `(env[name]?.trim() ?? '') !== ''`.
2. `weakSecretReason` (`src/health/preflight.ts:58-64`) exigía ≥32 caracteres, ≥8 distintivos y ≥96 bits
   estimados. El literal que el propio repo publica, `<generate-with-openssl-rand-base64-32>`, tiene 38
   caracteres, más de 8 distintivos y más de 96 bits: **pasa un control de entropía sin nombrar nada**.
3. `dbUrl` se validaba por prefijo (`postgres://`), y una URL con `<host>` conserva el prefijo; además
   el prefijo coincidente la hacía elegible como almacén durable en la rama serverless.

**Segundo defecto, en dirección contraria.** `.env.example:13` declara `VERCEL=false`. `has()` lo leía como
«definido», así que un despliegue que no corre en Vercel recibía `DR-SERVERLESS-NON_DURABLE_API_KEYS` y
`DR-SERVERLESS-NON_DURABLE_FEDERATION`: dos errores que el despliegue real nunca vería y que ocultaban el
diagnóstico. La compuerta estaba mal en los dos sentidos —falsos negativos en credenciales, falsos positivos
en la plataforma.

**Cierre.** Cuatro cambios, todos en la dirección de apretar:

- `TEMPLATE_TOKEN = /<[^<>\s]{2,}>/` y `looksLikeTemplate()` exportados desde
  [src/health/preflight.ts:39-43](../../src/health/preflight.ts); conectados a `weakSecretReason` como
  razón `'is an unfilled template token'`, así que los cuatro secretos del ejemplo quedan en ERROR.
- `has()` es consciente de plantilla ([src/health/deploy-readiness.ts:25-28](../../src/health/deploy-readiness.ts)),
  por lo que `SUPABASE_URL`/`PROVIDER_VARS`/orígenes con `<...>` ya no cuentan como configurados.
- Nuevo `DR-DATABASE-PLACEHOLDER` (ERROR) antes de la rama TLS, y `realDbUrl` —la cadena sólo cuando no es
  plantilla— alimentando las dos llamadas a `checkDurableStore`: con URL de plantilla, el contrato
  serverless devuelve `DR-SERVERLESS-API_KEYS_DB_MISSING` y `..._FEDERATION_DB_MISSING` en lugar de aceptar.
- Nuevo `DR-VERIFIED-KNOWLEDGE-MONGODB-URI-PLACEHOLDER`, y la rama serverless usa ahora
  `envFlag(env,'VERCEL') || envFlag(env,'VERCEL_ENV')` (`src/lib/env-flags.ts:15`), el mismo criterio que
  ya aplicaba `preflight` para el listener: `false`/`0`/`no`/`off` significan no-desplegado.

**Medición después del cierre**, misma máquina, mismo lanzador (`npx tsx`):

| Caso | Antes | Después |
|---|---|---|
| Config real con las dos URLs en plantilla | `READY_WITH_WARNINGS`, 0 ERROR | `BLOCKED`, 4 ERROR: `DR-DATABASE-PLACEHOLDER`, `DR-VERIFIED-KNOWLEDGE-MONGODB-URI-PLACEHOLDER`, `DR-SERVERLESS-API_KEYS_DB_MISSING`, `DR-SERVERLESS-FEDERATION_DB_MISSING` |
| `.env.example` tal cual | 8 ERROR, 1 WARN — ninguno nombra las plantillas, y 2 son los serverless espurios | 11 ERROR, 0 WARN; cero IDs `DR-SERVERLESS-*` |
| Igual pero con credenciales rellenadas | `READY` | `READY`, 0 ERROR |

La tercera fila es la que demuestra que el cambio **no demerita**: una clave real no se bloquea. Es también
el control contra el único coste del diseño: un secreto legítimo que contenga literalmente `<xx>` (dos o
más caracteres sin espacios entre Less-than y greater-than) se marcaría como plantilla. No ocurre con
base64, JWT, cadenas de conexión de Mongo/Postgres ni claves de proveedor; si ocurriera, el mensaje nombra
la variable y nunca el valor, y el operador lo resuelve regenerando el secreto.

**No vacuidad.** Anular el detector (`TEMPLATE_TOKEN` por un literal impossible) hizo fallar exactamente 3
pruebas nuevas y ninguna antigua: `preflight > rejects an unfilled template token…`,
`deploy readiness > blocks the literal placeholders that .env.example publishes`,
`deploy readiness > applies serverless rules when VERCEL_ENV says production…`. La de `VERCEL=false` sigue
en verde bajo esa anulación porque protege el otro defecto (`envFlag`), y se reprodujo por separado
volviendo la rama a `has()`: reaparecieron los dos `DR-SERVERLESS-*`. Ambas mutaciones se revirtieron y se
verificó `grep` = 0 coincidencias de marcador antes de comitear.

**Puertas de esta tanda.** `vitest run test/health/ test/deployment/` → **153 pruebas / 23 archivos, 0
fallos** (31 en health: 25 antes del cierre; 122 en deployment, sin regresión). `tsc --noEmit` exit 0,
`lint` exit 0, `format:check` exit 0, con los globs declarados en `package.json`. Ninguna de estas cifras
equivale a CI verde: §9.1 sigue abierto.

## §11 Precisiones de medición sobre las propias puertas

Dos transcripciones de comando estaban mal escritas en este documento (filas `lint` y `formato` de §1 y §8).
No eran conclusiones falsas —las puertas sí pasan— pero el comando que se transcribió **no** pasa, y eso
importa porque alguien puede replicarlo:

- `eslint src scripts test --max-warnings=0` devuelve 6 errores de `Parsing error:
  "parserOptions.project" ... The file was not found in any of the provided project(s)` sobre
  `scripts/voice-profile-compare.ts`. El script `lint` del repo no usa directorios: usa
  `"src/**/*.{ts,tsx,js,jsx}" "scripts/**/*.mjs" "test/**/*.ts"`, y `scripts/**/*.mjs` deja fuera los
  `.ts` de esa carpeta. Con el glob real, exit 0.
- `prettier --check "src/**"` falla con `No parser could be inferred for ... logo-isav6.jpeg` y un aviso
  sobre `src/ui/platform/site.css`. El script `format:check` limita a
  `"src/**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"`. Con el glob real, exit 0.

**Hecho nuevo que esto revela.** `scripts/voice-profile-compare.ts` está rastreado en git, no lo cubre el
glob de `lint`, y no pertenece a ningún `tsconfig` proyectado: es un archivo de despliegue-adjacent que
ninguna puerta mira. No se corrige aquí porque sacarlo de su exclusión es una decisión de ámbito del
verificador, igual que la de `minimatch` en §9: requiere CI que la refute.
