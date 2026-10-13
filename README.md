# Isabella Villaseñor AI — Genesis TINA / Terminus Ω

**Runtime cognitivo gobernado para TAMV Online Network.** Este es el repositorio autorizado para la evolución de Isabella V6: https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6

[![Repository Assurance](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/ci.yml)

> **Invariante:** CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION

## Preparación global para producción y despliegue

**47.5% — estimación global provisional de readiness.**

La estimación aumenta respecto de la base declarada anteriormente por la implementación del plano de autorización Terminus, almacenamiento cifrado con codificación de borrado 6+3, control de tamaño de objetos, registros BookPI para operaciones de almacenamiento y pruebas nuevas de contrato y regresión. Es una estimación de ingeniería, no una certificación; todavía debe confirmarse la suite sobre el SHA de esta rama. Los adaptadores reales de los nueve dominios de almacenamiento y el KMS durable no se dan por conectados ni se consideran listos sólo por existir sus interfaces.

## Qué hace Isabella

Isabella coordina modelos, memoria, capacidades, herramientas y operaciones bajo reglas de identidad, autoridad, evidencia, verificación y supervisión humana. La presencia de una capacidad técnica no concede automáticamente permiso para ejecutarla ni autoridad para presentar un resultado como hecho.

El estado del repositorio no se presenta como un modelo fundacional entrenado desde cero, AGI, entidad consciente, MoE entrenado ni plataforma certificada. Un router heurístico no demuestra entrenamiento de pesos; un hash no demuestra la verdad del contenido; una especificación de arquitectura no demuestra integración operacional.

## Arquitectura operativa

    Solicitud / cliente / agente
             |
    Validación y límites de entrada
             |
    Identidad, tenant y scopes
             |
    CROWN / AEGIS / política de riesgo
             |
    Terminus Ω — mandato acotado y decisión
             |
    Inferencia / memoria / capacidad autorizada
             |
    VERITAS / validación de evidencia
             |
    BookPI — eventos de decisión y trazabilidad
             |
    Respuesta / decisión / alerta operacional

### Terminus Ω: autoridad antes de ejecución

El módulo **src/terminus/mandate.ts** define el contrato del mandato, una política versionada, presupuestos de recursos, evidencia, separación de actores y límites de riesgo. Una decisión de riesgo elevado pasa a **ESCALATE** si no existe una aprobación humana vigente ligada a la evidencia declarada. Las operaciones prohibidas se rechazan independientemente del nombre de la capacidad solicitada.

**TerminusRuntime** no ejecuta la acción gobernada. Antes de devolver **ALLOW**, exige que los adaptadores configurados verifiquen la identidad y la evidencia, que un contador duradero reserve una ejecución de forma atómica y que el resultado pueda registrarse en BookPI. Si falla una dependencia necesaria, se aplica **fail-closed**.

Los adaptadores **verifyIdentity**, **verifyEvidence** y **ExecutionCounter** son dependencias externas deliberadas. No hay una identidad verificada ni un contador distribuido sólo por implementar una interfaz: deben conectarse al proveedor de identidad y a la base de datos autorizados y someterse a pruebas de concurrencia y revocación.

### BookPI: evidencia duradera y mantenimiento

BookPI conserva el ledger JSONL durable existente, seleccionable mediante **BOOKPI_LEDGER_PATH**. Sus eventos forman una cadena hash y el mantenimiento permite verificar, respaldar, restaurar y planear la retención de prefijos. La retención del ledger necesita conservar un archivo y un checkpoint; no se debe borrar su historia desde una rutina de limpieza de cargas de datos.

El adaptador PostgreSQL utiliza trece campos para registrar el evento completo, incluido **canonical**; la prueba de contrato correspondiente valida que la sentencia inserte los trece parámetros. Para que PostgreSQL sea el almacenamiento autoritativo, aún deben probarse el esquema real, los permisos append-only, la concurrencia, la propagación de errores, el respaldo y la restauración contra una instancia de prueba.

**BookPI no es un dispositivo WORM.** La cadena de hashes permite detectar modificaciones que no reencadenen correctamente, pero no impide por sí sola que un administrador privilegiado cambie el archivo, los permisos, el checkpoint o todas las copias de respaldo. Para endurecer la evidencia se requieren roles de sólo inserción, anclaje externo y una política de backup/restauración comprobada.

### Terminus Sharded Store: cifrado, 6+3 y cuotas

**src/terminus/erasure-code.ts** implementa codificación Reed–Solomon sobre GF(2^8): seis shards de datos y tres de paridad. Los datos se cifran con AES-256-GCM antes de codificarse; el coordinador sólo devuelve datos tras validar tenant, índices, metadata, hashes y autenticación del sobre. Se pueden reconstruir los ciphertexts a partir de cualquier seis shards válidos, tolerando como máximo tres shards perdidos o inválidos.

Esta estrategia aporta redundancia, no espacio de almacenamiento gratuito. Los nueve shards requieren más bytes que el objeto original y suman costes de metadatos y cifrado. El constructor exige nueve identificadores de proveedor diferentes y una cota local de bytes/objetos por proveedor; esto no demuestra que existan nueve bases de datos externas ni nueve dominios de fallo realmente independientes.

Cada adaptador productivo debe escribir de forma atómica y sin sobrescribir, aplicar las cuotas locales y verificar las cuotas reales del proveedor. Las cuotas gratuitas pueden cambiar; cuando la capacidad real sea desconocida, el adaptador debe rechazar la operación en lugar de suponer que existe espacio. Nueve aliases en una sola cuenta, región, volumen o servicio no constituyen nueve dominios de fallo.

El coordinador requiere **ShardStore**, **DataKeyManager**, **BookPiStorage** durable y un **maxObjectBytes** explícito. Las pruebas locales de estos contratos usan proveedores en memoria y no cuentan como conexión con servicios externos.

### Borrado y retención de datos

La retención de cargas externas es independiente de la retención de eventos de auditoría. Las políticas de **src/terminus/retention.ts** fijan un límite versionado de objetos, bytes, edad máxima, edad mínima y tamaño de lote. Los datos con retención legal, fijados o en uso no se eliminan automáticamente.

Una pasada de retención calcula los candidatos de forma determinista, escribe primero la intención en BookPI, solicita la eliminación de la carga y sus shards al adaptador y registra el resultado para cada objeto. Si BookPI no puede escribir el evento de intención, no se elimina nada. Si no es posible llegar a los límites por existir elementos protegidos o por haberse alcanzado el tamaño máximo de lote, debe bloquearse la nueva admisión hasta resolver la situación.

El borrado criptográfico sólo queda confirmado si el KMS real destruye durablemente todas las copias recuperables de la clave. La eliminación de shards físicos se informa por separado, con sus fallos visibles. Réplicas, backups, cachés, almacenamiento del proveedor y requisitos legales requieren sus propios ciclos de expiración; el estado “eliminado” no debe ocultarlos.

## Interfaz de producto

La interfaz usa un sistema visual Obsidian / Platino / Azul Eléctrico, con superficies de contraste controlado, jerarquía tipográfica, estados de foco visibles y diseño responsive. El espacio de trabajo se abre directamente; la secuencia cinemática de marca sigue disponible de forma explícita mediante la URL con el parámetro `?intro=1`. Esto evita que la historia de marca impida usar la aplicación en la primera interacción.

Las respuestas de Isabella incluyen una acción de copia con confirmación y fallback visible. El estado del nodo comunica sólo el resultado del endpoint de salud; no se presenta como garantía de inferencia externa. Se eliminaron el fondo gráfico alojado fuera del repositorio y los identificadores HTML duplicados para reducir dependencias y mantener la navegación y las referencias ARIA deterministas.

## Requisitos de ingeniería

- Node.js 24.x.
- pnpm 10.28.0.
- Rust y PostgreSQL de prueba para validar el workspace IGE-Ω y sus pruebas de integración.
- Para almacenar objetos con Terminus: nueve adaptadores independientes, cuotas reales verificadas, un KMS durable y un BookPI duradero configurado.

### Validación

    corepack enable
    pnpm install --frozen-lockfile
    pnpm run typecheck
    pnpm test
    pnpm run build
    pnpm run security:suite
    pnpm run production:evidence

**pnpm test** incluye las pruebas nuevas de Terminus y BookPI. El resultado debe observarse sobre el SHA de la rama en GitHub Actions; los tests escritos no equivalen a tests ejecutados ni demuestran por sí solos integración distribuida.

### Mantenimiento BookPI

    pnpm bookpi:maintenance verify --path data/bookpi/ledger.jsonl
    pnpm bookpi:maintenance summary --path data/bookpi/ledger.jsonl
    pnpm bookpi:maintenance backup --path data/bookpi/ledger.jsonl --dest backups/ledger.jsonl
    pnpm bookpi:maintenance retention --path data/bookpi/ledger.jsonl --max-events 10000 --archive backups/archive.jsonl --prune

Ejecuta operaciones destructivas sólo después de validar el ledger, confirmar el backup y comprobar el destino del archivo. La poda del ledger no es un sustituto de la retención de payloads de Terminus.

## Gates pendientes para liberar

- Ejecutar typecheck, suite completa Vitest, build, smokes, seguridad estática y production-evidence sobre el mismo SHA.
- Probar con PostgreSQL real el contrato de trece campos, el rol append-only, las restricciones, aislamiento multi-tenant, concurrencia, backup y restore.
- Aprovisionar nueve dominios de fallo independientes y validar las cuotas actuales del servicio y sus límites de escritura.
- Integrar un gestor de claves real con límites de acceso, rotación, destrucción duradera y prueba de restauración; comprobar que no se conservan copias recuperables no autorizadas.
- Ensayar pérdida de tres shards, pérdida por encima del quórum, proveedores fuera de cuota, fallo de KMS, fallo de BookPI, restauración y retención legal.
- Ejecutar formato, Clippy, tests y build release del workspace Rust con lockfile comprometido y **--locked**.
- Medir latencia p50/p95/p99 con carga reproducible, distinguiendo tiempo de aplicación, red, cold start, inferencia y persistencia. No se promete latencia casi cero sin esas medidas.
- Verificar rollback, permisos y recuperación con objetivos RTO/RPO documentados antes de promoción.

## Documentación

- [Auditoría global del perfil GitHub y plano Terminus](docs/audits/GLOBAL-PROFILE-TERMINUS-2026-10-12.md)
- [BookPI: ledger durable, retención y backup/restore](docs/bookpi/DURABLE-LEDGER.md)
- [Estado real de Isabella y gates previos](docs/ESTADO-REAL-ACTUAL.md)
- [Auditoría P0 de arquitectura](docs/audits/P0-ARCHITECTURE-HARDENING-2026-10-12.md)
- [Inventario de API](docs/api/README.md) · [OpenAPI](docs/api/openapi.yaml)
- [Política de seguridad](SECURITY.md)

## Contrato de veracidad, reproducibilidad y evolución

El **Contrato de veracidad** distingue código declarado, código conectado, pruebas ejecutadas y comportamiento observable. La presencia de un módulo en el árbol no prueba que esté desplegado ni conectado a un proveedor real.

El **Bloqueo de instalación reproducible** exige lockfiles versionados, instalación congelada y toolchains fijadas para reducir cambios no intencionales en las dependencias.

Las **Fases de evolución** siguen una secuencia verificable: contrato, implementación, pruebas unitarias, integración de adaptadores, validación E2E, evidencia del mismo SHA, revisión humana, despliegue y observación posterior. No se marca una fase como terminada por la sola creación de archivos.

## Principio de liberación

**SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED.** Ninguna capacidad se declara lista para producción por su nombre, por tener un archivo o por aparecer en un diagrama. La promoción exige evidencia reproducible vinculada al SHA liberable, integración real en el entorno objetivo, pruebas de fallo y rollback, y supervisión humana para operaciones privilegiadas.
