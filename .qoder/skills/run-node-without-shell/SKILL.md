---
name: run-node-without-shell
description: Ejecutar scripts Node (ESM o CJS), comandos de Windows y binarios como git cuando el tool Bash no funciona (errno 11 / dofork) y no hay node.exe en el PATH. Usa mcp__node-repl__node_repl vía mcp_call como pasarela: node real (el node.exe de .noderoot o Qoder.exe con ELECTRON_RUN_AS_NODE=1) mediante child_process.execSync sobre cmd.exe, o ejecución ESM dentro del REPL con un shim de process obligatorio. Usar cuando Bash falle con errno 11, cuando `node`/`npx`/`npm` no exista o sea señuelo, cuando un script ESM necesite process.argv/env/fs, cuando haga falta capturar stdout/stderr de un comando .cmd sin shell utilizable, o cuando un script .cjs tenga que correr pese a que el REPL no puede importarlo.
when_to_use: El tool Bash muere con "forked process died unexpectedly ... errno 11", `where node` no devuelve nada, o hay que correr un .mjs/.js y el sandbox de node_repl no define `process`.
---

# Ejecutar Node sin shell utilizable

## Overview

En esta máquina el tool **Bash es inutilizable** (Git Bash aborta con `errno 11`) y **no hay `node.exe` en el PATH**. La vía funcional es `mcp__node-repl__node_repl` invocado con `mcp_call`: dentro de él `node:child_process` abre un `cmd.exe` real, y `Qoder.exe` con `ELECTRON_RUN_AS_NODE=1` actúa como Node auténtico.

Dos rutas. Preferir **A**; usar **B** solo cuando el código deba vivir en el mismo contexto del REPL (clientes ya instalados, estado entre celdas).

## Reglas duras

- **Nunca** el tool `Bash`. Falla antes de ejecutar nada (`errno 11`).
- **Nunca** `npx` ni `npm` a secas: son señuelos sin `node.exe` en el PATH.
- Operaciones de archivo normales (leer/escribir/editar) van con `Read`/`Write`/`Edit`, que sí funcionan. Este skill es sólo para *ejecutar*.
- La salida del REPL **no** se devuelve sola: publicar con `nodeRepl.write(...)`. Un solo `write` con las líneas unidas por `\n`; varios `write` consecutivos se concatenan sin separador.
- Declarar con `let`, nunca `const`, los nombres que otra celda pueda reusar: el estado de la célula persiste y redeclarar lanza el aviso de `node_repl`.
- **Todo `execSync` lleva `timeout` y `windowsHide: true`.** Sin `timeout` una orden colgada (p. ej. un servidor que se queda escuchando) bloquea la célula hasta el límite de ~10 min y el resultado se pierde entero; `node_repl_cancel` no interrumpe un `spawnSync` bloqueante.
- Un hijo con exit ≠ 0 hace que **`execSync` lance**, no que devuelva la salida: capturar `e.stdout` **y** `e.stderr`, no solo `e.message`. Quien necesite el texto completo de un comando que puede fallar usa `qrun.mjs` (ve Ruta A).
- Si la celda supera el yield (~10 s) devuelve `cell_id` en vez de resultado → llamar `mcp__node-repl__node_repl_wait` con ese `cell_id`. No reenviar el código. El límite real de la célula son ~10 min: una corrida más larga se parte en celdas y se guarda a disco.

## Ruta A — Node real (preferida)

`process`, `process.argv`, `process.env`, ESM y CJS funcionan de verdad. Sin shim.

Snippet canónico (pegar una vez por sesión; persiste entre celdas):

```js
let cp = await import('node:child_process');
let NODE_EXE = 'C:/Users/tamvo/Documents/Qoder/2026-10-24/d4046104/.noderoot/node.exe'; // verificado v24.18.0
let QODER = 'C:/Users/tamvo/AppData/Local/Programs/Qoder/Qoder.exe';
function sh(cmd, ms) {
  try { return cp.execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true, timeout: ms || 120000 }); }
  catch (e) { return 'ERR ' + String(e.stdout || '') + String(e.stderr || '') + String(e.message).split('\r\n')[0]; }
}
let BIN = sh(`"${NODE_EXE}" -v`).startsWith('v') ? NODE_EXE : `set ELECTRON_RUN_AS_NODE=1 && "${QODER}"`;
nodeRepl.write('node binario resuelto: ' + BIN);
```

Preferir `NODE_EXE` cuando exista (es un hardlink de `Qoder.exe` con `icudtl.dat`, `snapshot_blob.bin` y `v8_context_snapshot.bin` al lado; vive fuera del repo). Si falta, `Qoder.exe` + `ELECTRON_RUN_AS_NODE=1` da el mismo Node. `BIN` es la **orden de invocación** completa (`"ruta/node.exe"` o el prefijo `set …` + Qoder): siempre anteponerla al script, nunca sustituir `NODE_EXE` en una línea que ya llevaba el `set`.

Comprobado: `-v` → `v24.18.0`; `-e "console.log(1+1)"` → `2`; un `.mjs` que importa `node:process` recibe `argv[2]` distinto en cada corrida; `.cjs` corre por esta vía aunque el REPL no pueda importarlo.

**`ELECTRON_RUN_AS_NODE` ya llega puesto.** Medido: el `cmd.exe` que hereda `execSync` desde node_repl trae `ELECTRON_RUN_AS_NODE=1` (`echo [%ELECTRON_RUN_AS_NODE%]` → `[1]`), así que `--run`/`--read` funcionan sin prefijo. Fijarlo explícitamente sigue siendo obligatorio en el código que escribas: ese valor es del entorno de *esta* sesión y no debes depender de que se filtre.

Para comandos de Windows o binarios (git, curl, `tasklist`, `dir`), `execSync` ya habla con `cmd.exe`:

```js
nodeRepl.write(sh('git --version'));
```

Para varias corridas o salida ruidosa, usar el runner incluido (cita los argumentos por ti, trunca a 200 líneas y termina con `EXIT=<code>`; no lanza aunque el hijo falle):

```js
let QRUN = 'C:/Users/tamvo/.qoder/skills/run-node-without-shell/scripts/qrun.mjs';
let CALLS = [
  `${NODE_EXE} "${QRUN}" --node script.mjs build`,   // script JS real
  `"${NODE_EXE}" "${QRUN}" --run "git status --short"`, // cmd.exe
  `"${NODE_EXE}" "${QRUN}" --read ruta.log`,         // lectura truncada
];
nodeRepl.write(CALLS.map((c) => '== ' + c + '\n' + sh(c)).join('\n'));
```

## Ruta B — ESM dentro del REPL

Para importar un `.mjs` en el propio contexto del REPL, cuando ya hay clientes o estado en las celdas y no conviene sacar la lógica fuera.

**1. Instalar el shim en la primera celda.** El sandbox define `process === undefined` y **bloquea** `import('node:process')` con `Importing module "node:process" is not allowed in node_repl`. Copiar literal `references/process-shim.mjs` (con `Read`, o `fs.readFileSync` + `eval` no: pegar el cuerpo en la celda).

**2. Importar por URL de archivo.** `node:fs`, `node:path`, `node:url`, `node:child_process`, `node:vm`, `node:os`, `node:crypto` están permitidos.

```js
let fsB = await import('node:fs');
process.argv = ['node', 'cli.mjs', 'build'];
const mod = await import('file:///C:/ruta/absoluta/cli.mjs');
nodeRepl.write(JSON.stringify(mod.run ? mod.run() : mod.default));
```

**3. Para re-ejecutar con otros argumentos: path nuevo, no `?v=N`.** El query string se descarta al resolver el módulo —`?v=1`, `?v=2`, `?v=3` ejecutan el cuerpo **una sola vez** (verificado con contador global). Copiar el script a `<nombre>.<n>.mjs` por corrida, o mejor: exportar funciones y llamarlas con argumentos explícitos, que no necesita re-carga.

```js
let n = 0;
function rerun(src) {
  const f = dir + '/run_' + (++n) + '.mjs';
  fsB.writeFileSync(f, src);
  return import('file:///' + f.replace(/\\/g, '/'));
}
```

## Errores conocidos

| Mensaje | Causa | Acción |
|---|---|---|
| `forked process ... errno 11` | tool Bash roto | no reintentar Bash; ir a Ruta A |
| `Importing module "node:process" is not allowed` | bloque del sandbox | shim (Ruta B) o node real (Ruta A) |
| `ReferenceError: process is not defined` | shim no instalado en esta celda | reinstalar; persiste entre celdas hasta un reset |
| `node_repl local file imports only support .js and .mjs` | `.cjs` importado en el REPL | renombrar a `.js` o ejecutar con Ruta A |
| `"node" no se reconoce como comando` | no hay node.exe en PATH | `NODE_EXE` de `.noderoot`; si falta, `Qoder.exe` + `ELECTRON_RUN_AS_NODE=1` |
| `FATAL: gin\v8_initializer.cc Error loading V8 startup snapshot file` | `node.exe` copiado/hardeado sin sus `.bin`/`.dat` hermanos | usar `Qoder.exe` desde su propio directorio |
| célula colgada y resultado perdido | `execSync` sin `timeout` sobre un proceso que no termina | matar con `node_repl_cancel`, añadir `timeout` y partir la corrida |
| salida vacía pese a `completed` | no se usó `nodeRepl.write` | publicar con un solo `write` |
| resultado `cell_id` en vez de valor | celda larga | `node_repl_wait` con ese id |

## Delegación

Las corridas que escupen mucho (builds, tests, logs crudos) consumen el contexto del agente principal. Delegarlas a un subagente (`Agent`, `subagent_type: general-purpose`) que devuelva sólo el resumen y el exit code; este skill va en el prompt junto con la ruta elegida.

## Resources

- `scripts/qrun.mjs` — runner: `--node <script> [args]`, `--run "<cmd /c string>"`, `--eval "<js>"`, `--read <archivo>`. Trunca, captura stdout/stderr/exit. Se ejecuta bajo node real (Ruta A).
- `references/process-shim.mjs` — shim de `process` verbatim para pegar en la primera celda de Ruta B.
