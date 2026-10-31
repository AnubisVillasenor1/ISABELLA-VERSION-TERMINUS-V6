#!/usr/bin/env node
/**
 * generate-sbom.mjs — SBOM SPDX 2.3 sin dependencias (state: engine-generated).
 *
 * Fuente de verdad: `pnpm-lock.yaml` (lockfileVersion 9). Cada entrada de `packages:`
 * se convierte en un paquete SPDX con su versión y, cuando el lockfile la trae, la
 * suma de integridad SHA-512 real del resolutor. Las licencias se declaran
 * NOASSERTION: este repositorio no re-licencia dependencias y el texto de cada una
 * vive en su propio paquete; inventar una licencia sería peor que no afirmarla.
 *
 * Falla cerrado: sin sección `packages:` o sin ningún paquete resuelto, sale con
 * código != 0 en vez de escribir un SBOM vacío que el gate de producción tragaría.
 *
 * Uso: node scripts/generate-sbom.mjs [--out <ruta>] [--ref <sha>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = process.cwd();
const LOCK_FILE = path.join(REPO_ROOT, 'pnpm-lock.yaml');

/** Clave de `packages:` (dos espacios de indentación, termina en ':', quotes opcionales). */
const PACKAGE_KEY_LINE = /^ {2}(\S.*):$/;

function stripQuotes(raw) {
  const quoted = /^'(.*)'$/.exec(raw) ?? /^"(.*)"$/.exec(raw);
  return quoted ? quoted[1] : raw;
}

/** Clave de `packages:` → nombre y versión. Acepta formas de pnpm v9:
 *  `pkg@1.2.3`, `@scope/pkg@1.2.3`, `pkg@1.2.3(peer@2.0.0)`, `pkg@1.2.3@https://…/x.tgz`. */
export function parsePackageKey(key) {
  const withoutPeers = key.split('(')[0];
  // Un nombre con scope empieza por '@', así que el separador es el segundo '@'.
  const sep = withoutPeers.startsWith('@') ? withoutPeers.indexOf('@', 1) : withoutPeers.indexOf('@');
  if (sep <= 0) return null;
  const name = withoutPeers.slice(0, sep);
  let rest = withoutPeers.slice(sep + 1);
  // `pkg@1.2.3@https://…`: la versión termina en el siguiente '@'.
  const nested = rest.indexOf('@');
  if (nested > 0) rest = rest.slice(0, nested);
  const version = rest.trim();
  if (!name || !version) return null;
  return { name, version };
}

/** Cuerpo de la sección `packages:` del lockfile → entradas [nombre@versión, integrity]. */
export function readLockfilePackages(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l === 'packages:');
  if (start === -1) {
    throw new Error(
      'SBOM_GENERATION_FAILED: pnpm-lock.yaml no tiene sección `packages:` (¿lockfileVersion != 9?)'
    );
  }
  const entries = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== '' && !/^\s/.test(line)) break; // siguiente clave de nivel 0
    const keyMatch = PACKAGE_KEY_LINE.exec(line);
    if (keyMatch) {
      current = { key: stripQuotes(keyMatch[1]), integrity: null };
      entries.push(current);
      continue;
    }
    if (current === null) continue;
    const integrity = /^\s+resolution:.*?integrity:\s*sha512-([A-Za-z0-9+/=]+)/.exec(line);
    if (integrity) current.integrity = integrity[1];
  }
  return entries;
}

/** SPDXID admite sólo [A-Za-z0-9.-]; cualquier otro carácter se colapsa a '-'. */
export function spdxId(raw) {
  const collapsed = raw.replace(/[^A-Za-z0-9.-]/g, '-').replace(/-+/g, '-');
  return 'SPDXRef-Package-' + collapsed.replace(/^-+|-+$/g, '');
}

function sha512Hex(base64) {
  return Buffer.from(base64, 'base64').toString('hex');
}

export function buildSbom(entries, meta) {
  const described = [];
  const seen = new Set();
  for (const entry of entries) {
    const parsed = parsePackageKey(entry.key);
    if (parsed === null) continue;
    const id = spdxId(`${parsed.name}@${parsed.version}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const pkg = {
      SPDXID: id,
      name: parsed.name,
      versionInfo: parsed.version,
      downloadLocation: meta.registry + encodeURIComponent(parsed.name) + '/' + parsed.version,
      licenseConcluded: 'NOASSERTION',
      licenseDeclared: 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      externalRefs: [
        {
          referenceCategory: 'PACKAGE-MANAGER',
          // PURL canónico: el '@' de los scopes va percent-encoded.
          referenceLocator: `pkg:npm/${parsed.name.replace(/^@/, '%40')}@${parsed.version}`,
        },
      ],
    };
    if (entry.integrity) {
      pkg.checksums = [{ algorithm: 'SHA512', checksumValue: sha512Hex(entry.integrity) }];
    }
    described.push(pkg);
  }
  if (described.length === 0) {
    throw new Error('SBOM_GENERATION_FAILED: ninguna entrada de pnpm-lock.yaml fue resoluble');
  }
  const rootId = spdxId('isabella-terminus-v6@' + meta.version);
  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `isabella-terminus-v6-${meta.ref}`,
    documentNamespace: `https://github.com/${meta.repository}/commit/${meta.ref}`,
    creationInfo: {
      created: meta.created,
      creators: [
        'Tool: generate-sbom.mjs',
        'Organization: TAMV ONLINE ENTERPRISE (contact: see NOTICE.md)',
      ],
      licenseListVersion: '3.25',
    },
    packages: [
      {
        SPDXID: rootId,
        name: 'isabella-terminus-v6',
        versionInfo: meta.version,
        downloadLocation: `git+ssh://${meta.repository}#${meta.ref}`,
        filesAnalyzed: false,
        licenseConcluded: 'NOASSERTION',
        licenseDeclared: 'NOASSERTION',
        copyrightText: 'Copyright (c) 2026 TAMV ONLINE ENTERPRISE',
      },
      ...described,
    ],
    relationships: [
      { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: rootId },
      ...described.map((pkg) => ({
        spdxElementId: rootId,
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: pkg.SPDXID,
      })),
    ],
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function gitRef() {
  return arg('--sha', process.env.GITHUB_SHA || process.env.EXPECTED_SHA || 'local');
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const ref = gitRef();
  const entries = readLockfilePackages(fs.readFileSync(LOCK_FILE, 'utf8'));
  const sbom = buildSbom(entries, {
    version: pkg.version,
    ref,
    registry: 'https://registry.npmjs.org/',
    repository: process.env.GITHUB_REPOSITORY || 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
    created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  const outFile = arg('--out', path.join('evidence', `isabella-${ref}.spdx.json`));
  fs.mkdirSync(path.dirname(path.resolve(REPO_ROOT, outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(REPO_ROOT, outFile), JSON.stringify(sbom, null, 2) + '\n', 'utf8');
  console.log(
    `[sbom] ${sbom.packages.length - 1} paquetes → ${outFile} (ref ${ref}, doc ${sbom.documentNamespace})`
  );
}

// Sólo se ejecuta como comando; importado desde las pruebas expone sus funciones puras.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
