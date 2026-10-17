# Runbook de cierre de bloqueos de producción — Isabella TERMINUS V6

**Estado:** plan operativo basado en evidencia del preview; no constituye certificación de producción.
**Objetivo:** convertir bloqueadores observados en comprobaciones reproducibles sin marcar como saludable una dependencia que no ha sido probada.

## Evidencia observada

En el preview consultado, `GET /api/v1/readyz` devolvió HTTP 503. El informe indicó:
- BookPI utiliza una cadena hash en memoria, por lo que los eventos no sobreviven a un reinicio.
- La consulta de solo lectura a Atlas/Supabase no quedó verificada.
- IKES no tiene un probe conectado a memoria durable.
- No existe una comprobación de exportación de telemetría en readiness.

El smoke test local sí verificó `health=200`, `chat=200` y `followUp=200` mediante el motor soberano local. El smoke test del gateway LLM externo se omitió porque no encontró credenciales gratuitas/de código abierto configuradas. Esto demuestra interacción local, no una ruta generativa externa disponible.

## Acciones necesarias

### 1. Aplicar el esquema de Atlas en Supabase

Migración versionada: `supabase/migrations/20261017000000_atlas-store-core.sql`.

1. Revisar el SQL con el responsable de la base de datos.
2. Aplicarlo mediante el flujo de migraciones aprobado del proyecto Supabase (no pegar secretos en issues, PRs o logs).
3. Confirmar que existen las cinco tablas `atlas_users`, `atlas_protocols`, `atlas_ledger`, `atlas_xr_events` y `atlas_webrtc_signals`.
4. Verificar RLS habilitado y ausencia de permisos directos para `anon` y `authenticated`; el adaptador de servidor usa `SUPABASE_SERVICE_ROLE_KEY`.
5. Validar `GET /api/v1/readyz` y confirmar que la evidencia informa éxito real del probe de solo lectura.

**No resuelto por la migración:** que el valor de las variables de entorno sea válido, que el esquema existente sea compatible o que las operaciones funcionales cumplan aislamiento multi-tenant. La migración no se ha aplicado a la base remota desde este cambio.

### 2. Sustituir BookPI volátil en producción

- No configurar un archivo local o `/tmp` como si fuera almacenamiento durable de Vercel/serverless.
- `createPostgresStorage` ya existe como adaptador asíncrono, pero el singleton `bookPiLedger` usado por rutas sigue siendo síncrono y selecciona memoria/JSONL local.
- Implementar y probar un adaptador durable integrado a los consumidores reales, con migración, concurrencia transaccional, verificación de cadena, backup/restore y control de acceso.
- No declarar WORM: el adaptador Postgres por sí solo no proporciona almacenamiento WORM ni inmutabilidad física.

### 3. Hacer durable IKES

- `IKESEngine` mantiene fuentes y claims en mapas en memoria.
- Implementar persistencia y recuperación de fuentes/claims, control de versión, hashes, transacciones y pruebas de reinicio.
- Añadir un probe de solo lectura que compruebe la persistencia activa sin exponer contenido de claims.
- Mantener revisión humana para elevar estados epistémicos; guardar datos no debe elevar automáticamente la confianza.

### 4. Validar inferencia real sin violar privacidad

- La inferencia externa keyless queda desactivada por defecto.
- Para habilitar un proveedor externo, el operador debe configurar expresamente `ISABELLA_KEYLESS_FREE_PROVIDER=pollinations` o un proveedor con credenciales, tras revisar tratamiento de datos, límites, disponibilidad y condiciones.
- No enviar información confidencial a proveedores gratuitos sin aprobación explícita.
- Ejecutar el smoke test del gateway y registrar proveedor/modelo efectivo, latencia, fallback y errores sin registrar prompts o secretos.

### 5. Instrumentar observabilidad

- Configurar `OTEL_EXPORTER_OTLP_ENDPOINT` y credenciales de exportación cuando corresponda.
- Añadir una comprobación de exportación real y acotada, no sólo de presencia de variable.
- Verificar correlación trace/request, retención, acceso, alertas y ausencia de PII en logs.

### 6. Cerrar CI/CD y producción

- Esperar CI verde en el SHA candidato, incluidos typecheck, tests, build, auditoría Rust, Trivy, SBOM y artefactos de seguridad.
- Confirmar que el workflow de liberación descarga evidencia del mismo SHA y rechaza runs que no sean un push exitoso a `main`.
- El workflow actual valida evidencia y llega a un handoff; no prueba por sí mismo una promoción real a producción. Confirmar el mecanismo real de despliegue, health check post-deploy, rollback y aprobación del entorno.
- Habilitar reglas de protección de `main`: PR obligatorio, checks requeridos, resolución de conversaciones y restricción de force-push/deleción.
- No elevar el porcentaje de preparación hasta comprobar despliegue, persistencia y recuperación reales.

## Criterios mínimos de cierre

- [ ] CI verde en el SHA candidato y checks obligatorios configurados en `main`.
- [ ] Preview más reciente en estado READY y smoke HTTP exitoso.
- [ ] `/api/v1/readyz` devuelve 200 sólo con todas las dependencias requeridas verificadas.
- [ ] BookPI sobrevive reinicio y pasa verificación de cadena; backup/restore probado.
- [ ] IKES recupera fuentes/claims tras reinicio y conserva hashes/versiones.
- [ ] Proveedor de inferencia configurado por decisión explícita y smoke generativo aprobado.
- [ ] Telemetría exportada y alertas probadas.
- [ ] Despliegue de producción y rollback demostrados sobre un SHA trazable.

**Regla de evidencia:** una migración en Git no equivale a una migración aplicada; un endpoint local 200 no demuestra salud de dependencias; un preview READY no equivale a producción desplegada.
