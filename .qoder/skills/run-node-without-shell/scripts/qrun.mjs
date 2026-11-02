#!/usr/bin/env node
// Ejecuta un script JS o un comando en cmd.exe con salida legible para un agente.
// Debe correr bajo node real: ELECTRON_RUN_AS_NODE=1 Qoder.exe qrun.mjs ...
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_LINES = 200;
const CHILD_TIMEOUT_MS = 300000;

function findNodeHost() {
  const c = ['C:/Users/tamvo/Documents/Qoder/2026-10-24/d4046104/.noderoot/node.exe',
    process.execPath,
    'C:/Users/tamvo/AppData/Local/Programs/Qoder/Qoder.exe'].filter(Boolean);
  for (const p of c) if (p && existsSync(p)) return p;
  return null;
}

function clip(buf) {
  const s = String(buf == null ? '' : buf);
  const lines = s.split(/\r?\n/);
  if (lines.length <= MAX_LINES) return s.trimEnd();
  return lines.slice(0, MAX_LINES).join('\n')
    + `\n[... ${lines.length - MAX_LINES} líneas suprimidas por qrun]`;
}

const argv = process.argv.slice(2);
const mode = argv[0];
const target = argv[1];

if (!mode || !target || !['--node', '--run', '--eval', '--read'].includes(mode)) {
  console.log('uso: qrun --node <script.mjs> [args...] | --run "<cmd /c string>" '
    + '| --eval "<js>" | --read <archivo>');
  process.exitCode = 2;
} else if (mode === '--read') {
  const p = resolve(target);
  if (!existsSync(p)) { console.log('ERROR no existe: ' + p); process.exitCode = 1; }
  else console.log(clip(readFileSync(p, 'utf8')));
} else {
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  let cmd, args;
  if (mode === '--node') {
    const host = findNodeHost();
    if (!host) { console.log('ERROR no encuentro node.exe ni Qoder.exe para actuar como node'); process.exitCode = 127; }
    cmd = host; args = [resolve(target), ...argv.slice(2)];
  } else if (mode === '--eval') {
    const host = findNodeHost();
    cmd = host; args = ['-e', target];
  } else {
    cmd = 'cmd.exe'; args = ['/d', '/s', '/c', target];
  }
  if (!cmd) { process.exitCode = 127; } else {
    const r = spawnSync(cmd, args, { encoding: 'utf8', env, windowsHide: true,
      maxBuffer: 32 * 1024 * 1024, timeout: CHILD_TIMEOUT_MS });
    const out = clip(r.stdout), err = clip(r.stderr);
    if (out) console.log('STDOUT:\n' + out);
    if (err) console.log('STDERR:\n' + err);
    if (r.error) {
      console.log('ERROR spawn: ' + r.error.message
        + (r.signal ? ' (senal ' + r.signal + ' tras ' + CHILD_TIMEOUT_MS + ' ms)' : ''));
      process.exitCode = r.status === null ? 124 : 126;
    } else {
      console.log('EXIT=' + r.status);
      process.exitCode = r.status === 0 ? 0 : 1;
    }
  }
}
