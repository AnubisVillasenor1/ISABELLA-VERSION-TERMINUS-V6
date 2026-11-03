# RFC-0007 — Despliegue y operaciones

**Estado:** `draft | engine-generated`

## Gates
typecheck, lint, format:check, test, smoke:ui, smoke:runtime, build, deploy:readiness.

## CI
`.github/workflows/ci.yml` ejecuta lint/typecheck/test/security/docker. Deploy staging/producción manual o por push develop.

## Vercel — topología y corrección del `FUNCTION_INVOCATION_FAILED`

Incidente observado el 2026-10-31 en producción: `GET /` devolvía HTTP 500 con
`FUNCTION_INVOCATION_FAILED` y el log de la función mostraba:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/src/commerce/catalog'
imported from /var/task/src/server.js
```

Causa raíz: el proyecto estaba configurado con el preset de framework `Express`.
Ese preset detectaba `src/server.ts` como entrypoint y lo compilaba con `tsc`
dentro de la función; `tsc` emite imports ESM sin extensión (`./commerce/catalog`),
que Node ESM no resuelve en tiempo de ejecución. El bundle correcto de esbuild
(`dist/server.js`) nunca era el entrypoint. Además existían dos funciones
(`λ index` y `λ api/index`), lo que volvía ambiguo qué artefacto atendía `/`.

Configuración corregida y verificada:

| Elemento | Valor | Motivo |
|---|---|---|
| Framework del proyecto | `null` (Other) | Evita que el preset `Express` compile `src/server.ts` como entrypoint |
| Función desplegada | `api/index.js` → `../dist/server.js` | Único entrypoint; importa el bundle de esbuild |
| `outputDirectory` | `public` | Vercel exige un directorio estático; contiene solo `robots.txt` |
| `includeFiles` | `dist/**`, `src/ui/**`, `src/assets/video/**` | Solo lo que el runtime lee del disco; sin `src/**` completo |
| Entrypoint raíz | eliminado (`server.js`) | Quita el segundo candidato ambiguo |
| `rewrites` | `/(.*)` → `/api` | Todo el tráfico HTTP pasa por la app Express |

Evidencia observada en `dpl_C5xBWTQ2z2Zay969hoP6YrJp2Fhq` (2026-10-31):

- `GET /` → 200 `text/html`, 54 447 bytes.
- `GET /health` → 200 `application/json`.
- `GET /ui/app.js` y `GET /styles/cinematic.css` → 200 con sus tipos MIME.
- `GET /api/v1/nexus` y `GET /api/v1/nexus/health` → 200.
- Build de Vercel: una sola función, `λ api/index` (36.14 MB); ya no existe `λ index`.

Límites de esta evidencia:

1. Demuestra que el artefacto arranca y sirve; **no** demuestra autoridad, ni
   producción certificada, ni aprobación humana.
2. No cubre streaming largo, cold start bajo carga, ni rollback.
3. Los fallos de persistencia (`This operation was aborted`,
   `Connection terminated unexpectedly`) y los preflight `PF-*` siguen abiertos:
   son de configuración de entorno, no del empaquetado.
4. `GET /api/health` devuelve 404 por diseño: el health canónico es `/health`.

## Faltantes
- CI verde en SHA candidato.
- Rollback real, backup/restore probado y monitorización con alertas.
- Variables de producción completas (`BOOKPI_INTEGRITY_SECRET`, token admin,
  almacén durable de API keys) y migraciones Postgres aplicadas con TLS verificado.
- OTLP export real y alertas.
- E2E navegador desktop/móvil.
- Medición de latencia p50/p95/p99 bajo carga.
