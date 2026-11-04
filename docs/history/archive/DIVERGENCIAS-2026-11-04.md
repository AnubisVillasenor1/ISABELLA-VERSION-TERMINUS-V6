---
state: draft | auto_generated
---

# Divergencias entre los planos de agentes recibidos y el código (2026-11-04)

Documentos auditados: «ISABELLA GENESIS ∞ — NEXUS SOBERANO», `ISABELLA_TAMV_AGENT_SPEC.md`
y la documentación de Qoder Agent SDK pegada en la conversación. **Los tres llegaron como
archivos sueltos: ninguno vive en este repositorio** (`grep -r "NEXUS SOBERANO" docs/` →
0 coincidencias; `docs/spec/` no los contiene). Se registran aquí como procedencia externa
para que el dictamen no se lea como crítica a código inexistente.

Método: cada afirmación se buscó en `src/**` con el símbolo concreto y se clasificó con la
regla **SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ VERIFIED**. AGENTS.md §6: cuando la especificación
y el código se contradicen, **se archiva la divergencia y no se reescribe el código** para que
la afirmación resulte cierta.

## 1. Afirmaciones de estado que no se sostienen

| # | Afirmación del documento | Lo que existe en el repositorio | Veredicto |
|---|---|---|---|
| 1 | «Conexión nativa con miles de agentes de open source» | La fábrica existe y es real (`src/nexus/open-agent-fabric.ts`), pero su techo no es «miles»: `FabricManifestSchema` admite **64 agentes** por manifiesto y `MAX_TOOLS = 64` (`src/nexus/tool-registry.ts:51`) limita el registro por proceso. Con 5 herramientas de fábrica ya registradas, el margen real es **59 agentes externos concurrentes**. | **SOBREDECLARACIÓN (≈40×)** — el mecanismo es nativo y gobernable; la cuota es 64, no miles |
| 2 | «Qoder Agent SDK como runtime nativo de Isabella» | No hay ni un import del SDK en `src/**`; es un producto de nube con credenciales y contrato propios. Lo que sí se implementó es el camino que resuelve la necesidad sin dependencias nuevas: MCP por HTTP JSON-RPC 2.0 y tarjetas A2A, sobre la compuerta de egreso. | **NO IMPLEMENTADO** (sustituido por un camino equivalente, declarado como tal) |
| 3 | Scaffolding Python del plano NEXUS ∞ | No existe en el árbol: el runtime es TypeScript ESM (`package.json:type: module`, `engines.node: 24.x`). No se portó una segunda lengua por indicación de plano. | **NO IMPLEMENTADO** (decisión de no hacer: arbitraje humano pendiente) |
| 4 | «Simulación de fuga de privacidad, costo real e impacto» | `CapabilityEngine.simulate()` devuelve el informe y **enumera lo que no mide** (`notMeasured`: fuga de privacidad, costo en USD, impacto organizacional) en `src/nexus/capability-engine.ts`. No hay simulador de privacidad ni medidor de costo. | **NO IMPLEMENTADO** (declarado explícitamente en la superficie, no fingido) |
| 5 | Autonomía A4/A5 para agentes | `CONTRACT_CEILINGS.executableAutonomy = 'A3'` (`src/nexus/capability-contract.ts:58`) y `FABRIC_AUTONOMY = ['A0','A1','A2','A3']`: el esquema **rechaza** declarar A4/A5 en un agente externo. | **NO IMPLEMENTADO a propósito** (fuera del techo del motor: acción irreversible = operación humana) |
| 6 | «No implementado: no hay fetcher con robots ni allowlist» (`src/infinity/catalog.ts:284`) | La mitad de allowlist **sí** se cerró en este cambio: `src/security/egress-policy.ts` es política explícita fail-closed. La otra mitad sigue abierta: no hay parser de `robots.txt`; `src/infinity/constitution.ts:178` pide `robotsAllowed` al declarante, es decir **confía en una afirmación, no verifica** el archivo del sitio. | **PARCIAL** (falta el fetcher que lea `robots.txt`) |
| 7 | La compuerta de egreso protege «todas» las salidas del proceso | Los únicos consumidores de `evaluateEgressUrl` / `fetchWithEgressPolicy` son la fábrica (`src/nexus/open-agent-fabric.ts`) y su carga de manifiesto. Las rutas de proveedores de inferencia, federación e `infinity/*` **no** la consultan todavía. | **PARCIAL** (operativa en el camino de agentes; no globalizada) |
| 8 | «Listo para producción y despliegue» | `deploy:readiness` responde `DEPLOY_READINESS_BLOCKED` con 6 errores de entorno (base de datos, Supabase, MongoDB, `GENESIS_ADMIN_API_TOKEN`, `BOOKPI_INTEGRITY_SECRET`, `ALLOWED_ORIGINS`). Son credenciales e infraestructura, no defectos de código. El frontmatter de todos los módulos nuevos sigue en `state: draft`. | **NO IMPLEMENTADO** (el estado canónico hoy es `draft`, no `wired`) |

## 2. Lo que este cambio sí dejó operativo (con prueba)

### 2.1 Compuerta de egreso gobernada
`src/security/egress-policy.ts` (nuevo) + `test/security/egress-policy.test.ts` (**29 pruebas**).
Sin allowlist no sale tráfico; `http` exige que el operador lo nombre; se rechazan
credenciales en el URL, puertos no declarados y los dominios `.local/.internal/.localhost/.arpa/.home/.lan`;
las direcciones privadas, loopback, link-local (incluida la de metadatos `169.254.169.254`),
multicast, reservada, IPv6 de ámbito local, ULA, IPv4-mapeada y 6to4 con privada embebida se
bloquean **aun cuando el host esté allowlisteado**. Los redireccionamientos se siguen a mano y
cada `Location` se revalida. Techos de bytes por `Content-Length` y por stream.

El bypass que encontró la propia prueba, no una auditoría externa: `new URL('https://[::ffff:127.0.0.1]/')`
normaliza a `[::ffff:7f00:1]`, así que cualquier comprobación por prefijo de cadena devolvía
«host no permitida» en lugar de «dirección privada». Se cerró con expansión real de IPv6 a
16 bytes (`parseIpv6Bytes`), incluida la forma mixta.

### 2.2 Fábrica de agentes externos
`src/nexus/open-agent-fabric.ts` (nuevo) + `test/nexus/open-agent-fabric.test.ts` (**21 pruebas**).
Cada agente del manifiesto se registra como herramienta `fabric.<id>` y como
`CapabilityContract` `nexus.cap.fabric.<id>` **dentro del motor que ya gobierna** las demás
capacidades: no hay un segundo camino de ejecución. El manifiesto es la única autoridad;
`tools/list` es evidencia, no permiso — una herramienta que aparezca en el upstream pero no
esté declarada queda fuera de `callable`. El bearer se lee de `authEnv` al momento de llamar y
**no** aparece en el manifiesto, ni en la salida, ni en el ledger (aserción explícita en la prueba).

### 2.3 Cableado en el runtime y la superficie HTTP
`src/nexus/runtime.ts` construye la política desde el entorno, carga el manifiesto declarado y
publica `fabricStatus()` / `fabricDescribe()`. `src/routes/nexus.ts` expone
`GET /api/v1/nexus/fabric`, `GET /api/v1/nexus/fabric/:id`, `POST /api/v1/nexus/fabric/:id/discover`
y `POST /api/v1/nexus/fabric/:id/call`; `discover` y `call` ejecutan **solo** por
`capabilityExecute`. Un archivo de manifiesto declarado pero ilegible no tumba el arranque: se
publica como rechazo en `fabricReport`.

Efecto medido sobre el inventario (`node scripts/route-inventory.mjs`): **341 → 345 rutas**,
208 → 210 sensibles, 155 → 159 con contrato verificado. Las cuatro rutas nuevas están en
`test/deployment/route-inventory.json` y en `docs/api/route-inventory.json`; la prueba de
superficie congelada pasa y `test/routes/nexus.test.ts` pasó de 19 a **23** casos.

### 2.4 La escalera de sombra dejó de estar muerta
Antes de este cambio, una capacidad en `shadow` no podía ejecutarse y tampoco acumular
muestras: la compuerta exigía `MIN_REPUTATION_SAMPLES` de ejecuciones que ninguna ruta
registraba. Se cerró con dos líneas acotadas: `capabilityExecute` registra la salud bajo el
`toolId` que realmente corrió, y `CapabilityEngine.execute()` admite
`humanAuthorizedShadow` — `shadow` + `context.approvalGranted === true`, bandera que solo pone
el servidor al verificar el bearer. `quarantined`, `draft` y `retired` conservan el bloqueo.

**Esto afloja una compuerta, no la aprieta, y por eso se archiva:** la decisión de admitir
ejecución en `shadow` bajo portador humano es arbitraje de §7 paso 4 y sigue esperando revisión
nominal. Las 33 pruebas de `test/nexus/capability.test.ts` y las 18 de la fábrica siguen verdes
con el cambio.

## 3. Sigue sin implementar (no declarar como hecho)

1. **Parser de `robots.txt`** en el camino de extracción: hace falta un fetcher que lea el
   archivo del sitio y lo respete; hoy `constitution.ts:178` acepta una declaración del llamante.
2. **Egreso global**: que proveedores de inferencia, `src/infinity/*` y federación pasen por la
   misma `EgressPolicy` en lugar de solo la fábrica de agentes.
3. **Techo de agentes**: subir de 64 exige fragmentar el registro (`MAX_TOOLS`) o pasar a un
   registro perezoso por manifiesto; es diseño nuevo, no una cota que se cambie a discreción.
4. **Durabilidad**: grafo, ledger y fábrica viven en memoria del proceso.
5. **A4/A5, simulación de privacidad y costo, scaffolding Python**: véase §1.3–§1.5.
6. **Revisión humana nominal** del frente nuevo (AGENTS.md §7 paso 4): nada de este archivo
   puede leerse como `verified` hasta que una persona con nombre lo apruebe.

Registrar capacidad falsa es peor que confesar la real.

## 4. Nota de seguridad sobre los documentos recibidos

Los planos adjuntos **no** contienen valores de credenciales: nombran variables
(`ISABELLA_*`, `GENESIS_ADMIN_API_TOKEN`) y endpoints de servicio, sin secretos impresos. Sin
hallazgos que rotar. Regla operativa que sí se aplicó al diseñar la fábrica: el manifiesto
declara el **nombre** de la variable (`authEnv`), nunca su valor, y una ruta HTTP no puede
escribir el allowlist —quien controla el allowlist ya tiene autoridad de red, y §1 separa
precisamente esa autoridad de la capacidad.
