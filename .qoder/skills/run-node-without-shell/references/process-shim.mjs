// Shim de `process` para pegar en la PRIMERA celda de node_repl.
// El sandbox de node_repl define `process === undefined` y bloquea
// `import('node:process')` ("Importing module \"node:process\" is not allowed").
// Sin esto, cualquier ESM que toque process.argv/env/exit throws ReferenceError.
//
// Copiar/pegar literal en una celda antes de importar el script objetivo.
globalThis.process = {
  argv: ['node', 'repl-shim'],        // reasignar antes de cada import: argv[2] = subcomando
  execArgv: [],
  exitCode: 0,
  env: {},                            // si el script lee env, rellenar aqui; NO hereda del SO
  version: 'v22.0.0',
  versions: { node: '22.0.0' },
  platform: 'win32',
  arch: 'x64',
  pid: 1,
  cwd: () => 'C:/Users/tamvo/Documents/Qoder',
  chdir: () => {},
  nextTick: (fn, ...a) => queueMicrotask(() => fn(...a)),
  hrtime: (() => {
    let t = 0n;
    const step = () => (t += 1_000_000n);
    const pair = () => [Number(step() / 1_000_000_000n), Number(step() % 1_000_000_000n)];
    return Object.assign((prev) => {
      const [s, n] = pair();
      return prev ? [s - prev[0], n - prev[1]] : [s, n];
    }, { bigint: step });
  })(),
  stdout: { isTTY: false, write: (s) => nodeRepl.write(String(s)), columns: 120 },
  stderr: { isTTY: false, write: (s) => nodeRepl.write('[stderr] ' + String(s)), columns: 120 },
  on: () => {},
  once: () => {},
  off: () => {},
  emit: () => false,
  kill: () => false,
  exit: (code = 0) => { process.exitCode = code; },
  abort: () => { process.exitCode = 1; },
};
// `require` tambien es undefined: no hay CJS dentro del REPL.
