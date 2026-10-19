# Isabella Villaseñor AI — TERMINUS V6 / Genesis TINA

**Isabella Villaseñor AI** es la plataforma de orquestación, gobernanza y operación de IA de TAMV Online. Integra una interfaz conversacional, selección de proveedores, memoria y recuperación, permisos, controles de ejecución, evidencia operativa, presupuesto de inferencia y mecanismos de resiliencia. Su propósito es que las capacidades de IA sean útiles sin confundir una respuesta generada con una autorización para actuar.

> **Invariante del sistema:** `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION`.

Una capacidad disponible no concede autoridad; una decisión no ejecuta por sí sola una acción externa; un evento guardado no prueba por sí mismo la verdad de su contenido; y un despliegue exitoso no demuestra la salud de todos los servicios.

## Avance general de implementación

**Avance global de implementación: 61%.** Se conserva la línea base operativa solicitada y documentada para el proyecto. Es una estimación de madurez del conjunto de software —código existente, módulos integrados y trabajo pendiente—, no un porcentaje de pruebas aprobadas ni una certificación de producción.

**Estado de liberación: PREPRODUCCIÓN BLOQUEADA.** El porcentaje global no sustituye los gates de salida. La evidencia consultada más recientemente mostró readiness profunda no saludable, trabajos de CI fallidos y dependencias externas sin validación completa. Por eso no se aumenta el 61% únicamente por cambios de documentación o por commits que aún no han superado sus pruebas.

| Indicador | Estado actual | Qué demuestra |
|---|---|---|
| Avance global de implementación | **61%** | Línea base de madurez del sistema; estimación, no resultado automático de CI. |
| Respuesta HTTP superficial | Parcialmente verificada | Una instancia respondió en la consulta previa; no prueba disponibilidad sostenida. |
| Readiness de dependencias | **Bloqueada / requiere revalidación** | El último registro de referencia devolvió HTTP 503. |
| CI, typecheck, suite y build | **No certificados en el HEAD actual** | Se observaron ejecuciones fallidas; faltan logs concluyentes y una ejecución verde reproducible. |
| Persistencia durable de extremo a extremo | **No certificada** | El adaptador PostgreSQL existe; faltan validaciones remotas, E2E, recuperación y cierre de consumidores heredados volátiles. |
| Inferencia generativa externa | **Dependiente de configuración y pruebas reales** | Una clave configurada no prueba conectividad, cuota, modelo disponible ni calidad de respuesta. |
| Despliegue y rollback | **No certificados conjuntamente** | El estado READY de Vercel no reemplaza readiness de aplicación, smoke posterior y prueba de recuperación. |

### Cómo se mide el avance

**No se publica un porcentaje de avance vigente**. El 61% es una línea base de madurez del sistema; estimación, no certificación.

El 61% se mantiene como línea base global hasta que exista una revisión de alcance completo que justifique una actualización. La regla de control es:

- El código debe estar integrado en la rama y conectado a un flujo real; un archivo aislado no basta.
- Una prueba solo cuenta como aprobada si se ejecutó y su resultado corresponde al SHA evaluado.
- Los servicios externos cuentan como verificados solo después de una comprobación real de conectividad, permisos y operación.
- Una variable de entorno presente no prueba que el servicio esté sano.
- Los porcentajes no se elevan por documentos, cantidad de archivos, tests escritos pero no ejecutados, ni despliegues que solo compilaron.
- Los bloqueos críticos se reportan por separado. No se ocultan ni se compensan con un promedio.

**SPECIFIED ≠ IMPLEMENTED ≠ TESTED.** La existencia de un contrato o módulo no significa que esté integrado, validado o disponible en producción.

## Objetivo del producto

Construir una plataforma modular que permita a personas y organizaciones interactuar con sistemas de IA con controles explícitos sobre:

- **Interacción:** conversación y selección de capacidades, lentes y modalidades compatibles con la configuración activa.
- **Orquestación de inferencia:** enrutamiento a proveedores y modelos permitidos, límites de tiempo, fallbacks y límites de gasto.
- **Gobernanza:** evaluación de riesgo, permisos, aprobación humana y decisiones de permitir, denegar o escalar.
- **Memoria y conocimiento:** recuperación, procedencia y tratamiento gobernado de información.
- **Evidencia:** registro de eventos, verificación de integridad y trazabilidad de decisiones.
- **Resiliencia:** límites de entrada, rate limiting, timeouts, circuit breakers y readiness explícita.
- **Operación:** controles de estado, métricas, preflight, validaciones de seguridad y evidencia vinculada al commit.

La plataforma **no debe describirse como un modelo fundacional propietario entrenado desde cero**: el repositorio integra SDKs y proveedores externos. Tampoco se afirma consciencia, autonomía soberana, resistencia poscuántica completa, certificación normativa ni liderazgo de mercado sin evidencia independiente.

## Arquitectura implementada en el repositorio

El repositorio organiza las capacidades en dominios que se conectan desde el servidor Express/TypeScript. Las responsabilidades y el nivel de integración deben confirmarse con el código y las pruebas vigentes.

| Dominio | Componentes principales | Responsabilidad |
|---|---|---|
| Runtime y experiencia | `src/server.ts`, `src/ui/`, `src/genesis/` | Aplicación HTTP, interfaz y composición de runtime. |
| Identidad y autoridad | `src/identity/`, `src/crown/`, `src/authority/` | Principales, capacidades, aprobaciones y separación de autoridad. |
| Gobernanza | `src/governance/constitutional-governance-fabric.ts`, `src/reina/`, `src/gameover/` | Evaluación de política/riesgo, adjudicación y evidencia de decisión. |
| Memoria y conocimiento | `src/memory/`, `src/atlas/` | Memoria de sesión, recuperación, conocimiento verificado y persistencia Atlas/IKES. |
| BookPI y evidencia | `src/bookpi/`, `infra/db/migrations/`, `supabase/migrations/` | Eventos, integridad, adaptadores PostgreSQL/JSONL/memoria y verificación de cadena. |
| Inferencia | `src/inference/` | Selección de proveedor, presupuestos temporales, caché, voz y capacidades multimodales. |
| Seguridad HTTP | `src/security/`, `src/http/` | Tokens, rate limiting, cabeceras, redacción de errores y límites de entrada. |
| Resiliencia y operación | `src/deployment/`, `src/health/`, `src/observability/` | Readiness, métricas de latencia, circuit breakers y preflight. |
| Economía y comercio | `src/economy/`, `src/commerce/` | Catálogo de precios, cuotas, suscripciones y eventos de proveedor; la presencia de rutas no acredita una transacción real de cobro. |
| Gateway soberano experimental | `ige-omega/` | Subsistema Rust; su compilación, conectividad, autorización y readiness se verifican por separado. |

### ISA-CORE Ω: integración segura, no una afirmación de producto terminado

La propuesta ISA-CORE Ω define nueve fabrics conceptuales: identidad, confianza, seguridad, gobernanza, memoria, evidencia, federación, observabilidad y runtime. Isabella ya contiene componentes relacionados con varias de estas responsabilidades; eso no significa que exista una implementación monolítica certificada de los nueve fabrics.

La integración debe reutilizar los módulos existentes en vez de crear una segunda fuente de verdad. El blueprint compartido no se copió literalmente porque requiere correcciones antes de considerarse apto para producción: almacenamiento y método con el mismo identificador en la clase de memoria, registro anti-replay solo local al proceso, claves de firma efímeras generadas durante cada evaluación y falta de persistencia duradera para las decisiones. Tampoco se declara ML-KEM/ML-DSA en producción hasta verificar las bibliotecas, sus API reales, interoperabilidad y pruebas criptográficas.

Cambio operativo reciente: el fabric constitucional ahora valida las banderas de decisión y los límites de los campos en tiempo de ejecución, y limita el caché de dossiers en memoria para evitar crecimiento sin cota. Sus contadores de decisión permanecen acumulativos en el proceso. Este caché **no** es un ledger durable: la persistencia auditable sigue dependiendo del flujo BookPI y de su estado real.

## Flujo de petición esperado

1. Recibir la solicitud y aplicar límites de cuerpo, formato y tiempo.
2. Determinar principal, permisos, presupuesto y políticas aplicables.
3. Evaluar riesgo y aprobación humana cuando corresponda.
4. Seleccionar únicamente un proveedor/modelo habilitado por configuración y política.
5. Ejecutar inferencia dentro de un presupuesto temporal total; si falla, aplicar únicamente fallbacks autorizados.
6. Validar y presentar el resultado sin afirmar que el contenido es verdadero solo por haber sido generado.
7. Registrar la evidencia necesaria sin exponer secretos ni información personal innecesaria.
8. Ejecutar acciones externas solo mediante una capacidad autorizada y la aprobación que corresponda.
9. Reflejar errores de dependencias en readiness, no esconderlos detrás de una respuesta HTTP superficial saludable.

Este es el contrato arquitectónico esperado. La cobertura real de cada flujo debe probarse mediante suites unitarias, integración y E2E.

## Instalación y validación

Requisitos declarados en `package.json`: **Node.js 24.x** y **pnpm 10.28.0**.

```bash
corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

Comprobaciones adicionales:

```bash
pnpm run security:suite
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run production:evidence
pnpm run postgres:e2e
pnpm run smoke:production
pnpm run verify:production
```

No todos los comandos son autónomos: los E2E de PostgreSQL necesitan una base de datos y migraciones; los smoke de producción necesitan un entorno configurado; y la validación Docker/Kubernetes requiere sus herramientas y permisos. No se deben marcar como aprobados si no se ejecutaron.

### Gates pendientes para liberar

- [ ] Instalar dependencias con lockfile congelado en Node 24/pnpm 10.28.0.
- [ ] Typecheck, suite completa, build, UI smoke, runtime smoke y seguridad en verde para el mismo SHA.
- [ ] Resolver la causa raíz de GitHub Actions con logs de jobs accesibles y ejecución reproducible.
- [ ] Confirmar que el workflow de liberación realiza una promoción real, no solo valida evidencia o ejecuta un handoff.
- [ ] Aplicar las migraciones PostgreSQL/Supabase necesarias en el entorno correcto.
- [ ] Ejecutar E2E de escritura, lectura, verificación de cadena, concurrencia y recuperación tras reinicio.
- [ ] Eliminar o bloquear en producción las rutas heredadas que todavía dependan de un ledger volátil cuando se requiera evidencia durable.
- [ ] Validar Atlas e IKES con operaciones reales de lectura/escritura y aislamiento por tenant.
- [ ] Configurar un secreto `BOOKPI_INTEGRITY_SECRET` aleatorio de al menos 32 caracteres en el gestor de variables de Vercel; nunca en el código ni en este README.
- [ ] Probar una conversación generativa con proveedor/modelo real, timeout, fallback, límites de gasto y tratamiento de errores.
- [ ] Confirmar exportación de telemetría, métricas, alertas y ausencia de secretos/PII en logs.
- [ ] Validar backup, restauración, despliegue de staging, despliegue de producción, smoke posterior y rollback.
- [ ] Decidir si Vercel se mantendrá protegido para pruebas cerradas o se abrirá mediante dominio y controles de acceso revisados.
- [ ] Recalcular el porcentaje general solo con evidencia reproducible, documentando qué cambió y por qué.

## Configuración y secretos

Las variables exactas deben contrastarse con los módulos de configuración antes de preparar un entorno. Las más relevantes observadas en el código incluyen:

| Variable | Propósito | Condición operativa |
|---|---|---|
| `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` | PostgreSQL; el adaptador BookPI selecciona una URL compatible. | URL presente no demuestra conectividad, migraciones, permisos ni salud de la cadena. |
| `BOOKPI_PIPELINE_STORAGE` | Selección explícita del adaptador `postgres`, `jsonl` o `memory`. | Memoria es volátil; JSONL solo es durable si el volumen persiste; PostgreSQL es el backend compartido previsto. |
| `BOOKPI_PIPELINE_LEDGER_PATH` | Ruta del adaptador JSONL del pipeline. | No usar un filesystem efímero serverless como persistencia duradera. |
| `BOOKPI_LEDGER_PATH` | Ledger síncrono heredado. | No equivale al adaptador de pipeline; sus consumidores deben evaluarse por separado. |
| `BOOKPI_INTEGRITY_SECRET` | Integridad de eventos BookPI PostgreSQL. | Mínimo 32 caracteres; guardar solo como secreto del entorno. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persistencia Atlas/IKES del lado servidor. | Nunca exponer la service-role key al navegador. Verificar esquema, permisos y políticas RLS. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Destino declarado para telemetría OTLP. | Configuración no significa exportación exitosa; requiere prueba real. |
| `ALLOW_PAID_PROVIDER_FALLBACK` | Opt-in para proveedores potencialmente facturables. | Mantener desactivado hasta aprobar coste, modelo, presupuesto y privacidad. |
| `ISABELLA_KEYLESS_FREE_PROVIDER` | Habilita explícitamente un proveedor gratuito externo compatible. | No enviar datos sensibles sin autorización y evaluación del proveedor. |
| `GENESIS_ADMIN_API_TOKEN`, `OPS_API_TOKEN` | Protección de rutas operativas. | Generar, rotar y almacenar externamente; no publicar su presencia ni valor. |
| `STRICT_PREFLIGHT` | Política de preflight de arranque. | Confirmar que las dependencias obligatorias se detectan de forma real. |

Nunca se deben pegar credenciales en issues, commits, documentación o chats. Tras cambiar secretos, reiniciar/re-desplegar según el proveedor y verificar el comportamiento sin revelar sus valores.

## API y operación

Rutas observadas en el servidor incluyen:

- `GET /health`: salud superficial del proceso.
- `GET /api/v1/healthz`: comprobaciones de configuración/IO local; no sustituye una prueba de conectividad de todas las dependencias.
- `GET /api/v1/readyz`: readiness de operación, incluyendo probes de BookPI, Atlas e IKES.
- `GET /api/v1/status`: descripción de runtime y backend seleccionado; sus etiquetas no sustituyen la evidencia de salud.
- `GET /api/v1/ops/preflight`: diagnóstico operativo protegido por token.
- `GET /api/v1/integrations/graph`: grafo de integración y evidencia, protegido por token administrativo.
- `POST /api/v1/cognition/route`: flujo conversacional de cognición, sujeto a proveedor y configuración reales.

La lista no implica que cada ruta esté validada externamente o sea una API estable. Para cualquier consumidor público, definir contrato de entrada/salida, autenticación, límites, errores, idempotencia y pruebas de regresión.

## Seguridad, privacidad y gobernanza

- **Fail closed:** ante ausencia de autorización, evidencia requerida o política válida, denegar o escalar; no asumir permisos.
- **Aprobación humana:** operaciones sensibles o irreversibles necesitan autorización contextual verificable.
- **Datos personales:** la redacción por patrones no garantiza anonimización completa.
- **Aislamiento por tenant:** probar consultas, cachés, claves, eventos y artefactos entre tenants.
- **Memoria:** establecer clasificación, retención, acceso, eliminación, restauración y procedencia.
- **BookPI:** hash/HMAC no equivale por sí mismo a WORM ni evita que un administrador con privilegios altere el almacenamiento.
- **Criptografía post-cuántica:** no afirmar compatibilidad FIPS o seguridad poscuántica por incluir un nombre de algoritmo; exigir biblioteca revisada, parámetros correctos, pruebas de interoperabilidad y gestión de claves.
- **Proveedores externos:** evaluar privacidad, residencia, coste, disponibilidad, límites, retención de datos y condiciones de uso.
- **Logs:** nunca registrar tokens, secretos, prompt sensible o datos personales sin necesidad y controles adecuados.
- **Supply chain:** ejecutar auditoría de dependencias, escaneo de secretos y SBOM asociados al mismo SHA candidato.
- **Acceso de despliegue:** no desactivar SSO ni controles de acceso solo para hacer pública una URL. Elegir explícitamente el modo de pruebas cerradas o el lanzamiento público.

## CI/CD y despliegue

La configuración declara workflows de GitHub Actions, Vercel y tareas de verificación. El contrato para liberar es:

1. Ejecutar CI completo en el SHA candidato.
2. Revisar logs y artefactos reales, incluido SBOM y escaneo de secretos.
3. Confirmar que las migraciones y variables del entorno objetivo están configuradas.
4. Desplegar el artefacto que corresponde al mismo SHA.
5. Comprobar health, readiness, conversación real, persistencia y observabilidad después del despliegue.
6. Validar el procedimiento de rollback y registrar el resultado.

Un build READY en Vercel indica que la plataforma completó una fase de despliegue; no demuestra que Isabella esté lista para atender usuarios. Si GitHub Actions termina en fallo pero no expone pasos/logs, el fallo se clasifica como **causa raíz no determinada**, no como una prueba de código aprobada o reprobada sin evidencia.

## Monetización y uso comercial

Los componentes de catálogo, planes, cuotas, suscripciones, webhooks y motores económicos son infraestructura para una oferta comercial; no garantizan ingresos ni prueban que los cobros estén habilitados en producción.

Líneas que pueden validarse progresivamente:

- Suscripciones y niveles de uso con cuotas verificadas.
- Flujos de trabajo de IA para organizaciones.
- Servicios de integración, automatización y gobernanza.
- Plantillas, herramientas, formación y acompañamiento técnico.
- Integraciones empresariales con acuerdos explícitos sobre datos, soporte y disponibilidad.

Antes de vender una función como disponible, probar el flujo de autorización, la prestación real, la medición de uso, el pago cuando aplique, los reembolsos/errores y la separación de datos. Los ingresos potenciales son oportunidades comerciales, no resultados garantizados.

## Posicionamiento y comparación

**Categoría principal:** plataforma de orquestación y gobernanza de IA.

Referencias por segmento, sin afirmar superioridad:

| Segmento | Referencias | Qué comparar |
|---|---|---|
| Orquestación de aplicaciones LLM | LangChain/LangGraph, LlamaIndex, Vercel AI SDK | Herramientas, flujo, integraciones, control y facilidad de desarrollo. |
| Plataformas/modelos de IA | OpenAI, Google Gemini, Anthropic Claude | Calidad, herramientas, latencia, coste, disponibilidad y experiencia. Isabella no debe presentarse como modelo base equivalente. |
| Observabilidad/evaluación | LangSmith, Arize Phoenix, Weights & Biases Weave | Trazas, evaluación, depuración y evidencia. |
| Políticas y seguridad | OPA, Cedar, controles de identidad cloud | Garantías de autorización, expresividad, auditoría e integración. |
| Infraestructura | Kubernetes y plataformas cloud gestionadas | Despliegue, escalado, resiliencia y recuperación. |

La integración de gobernanza, memoria, evidencia y operación es la hipótesis de diferenciación de Isabella. Su eficacia y posición de mercado deben demostrarse mediante adopción, benchmarks comparables, auditorías independientes y métricas reproducibles.

## Licencias y contribución

Verifica los archivos de licencia del repositorio y el alcance de cada licencia antes de redistribuir código, documentación, marcas o activos de terceros. No se debe inferir licencia de un texto histórico del README.

Para contribuir:

1. Crear una rama de trabajo.
2. Implementar cambios pequeños con pruebas de regresión.
3. Ejecutar los gates disponibles localmente.
4. Adjuntar evidencia de los comandos ejecutados y el SHA.
5. Abrir un PR y exigir CI verde antes de integrar cambios sensibles.

## Referencias operativas

- [Auditoría de preparación para producción](docs/audits/PRODUCTION-READINESS-AUDIT-2026-10-18.md)
- [Runbook de cierre de bloqueos de producción](docs/ops/PRODUCTION-READINESS-RUNBOOK.md)
- [Presentación pública del proyecto](docs/ISABELLA-PRESENTACION-PUBLICA-2026-10.md)
- [Mapa y consolidación de documentación](docs/README.md)
- [Repositorio GitHub](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6)
- [Acciones CI/CD](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions)

---

**Declaración final de estado:** Isabella mantiene un avance global de implementación estimado del **61%**. El sistema continúa en preproducción hasta que las pruebas del mismo SHA estén verdes, la readiness de dependencias responda saludable, la persistencia durable y la inferencia real estén verificadas, y el despliegue/rollback hayan sido demostrados. Esta declaración debe actualizarse únicamente con evidencia nueva y reproducible.




