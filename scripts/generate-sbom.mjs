#!/usr/bin/env node
/**
 * generate-sbom.mjs — SBOM SPDX 2.3 sin dependencias (state: engine-generated).
 *
 * Fuente de verdad: `pnpm-lock.yaml` (lockfileVersion 9). Cada entrada de `packages:`
 * se convierte en un paquete SPDX con su versión y, cuando el lockfile la trae, la
 * suma de integridad SHA-512 real del resolutor. Las licencias se declaran
 * NOASSERTION: este repositorio no re-licencia dependencias y el texto de cada una
 * vive en su propio paquete; inventar una licencia sería peor que no afirmarla.
 * Lo mismo con `downloadLocation`: un lockfile de registro no trae la URL de descarga,
 * así que se afirma NOASSERTION y la identificadora real es el PURL de `externalRefs`.
 * Sintetizar una URL de registry que nadie resolvió sería meter en el SBOM un dato
 * que el gate de producción no puede verificar.
 *
 * Las aristas `DEPENDS_ON` salen de `snapshots:` (el grafo que el resolutor de pnpm
 * sí calcula). Un componente sin borde en `snapshots:` se declara con `OTHER` y su
 * `comment`, en vez de afirmarlo como dependencia directa de la raíz.
 *
 * Falla cerrado: sin sección `packages:` o sin ningún paquete resuelto, sale con
 * código != 0 en vez de escribir un SBOM vacío que el gate de producción tragaría.
 *
 * Uso: node scripts/generate-sbom.mjs [--out <ruta>] [--sha <commit>|--ref <commit>]
 *       Sin flag usa GITHUB_SHA / EXPECTED_SHA; si tampoco hay, `local` (y el gate
 *       de producción rechaza ese documento porque su namespace no lleva un commit).
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

/** Cuerpo de la sección `packages:` → entradas [nombre@versión, integrity, tarball]. */
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
      current = { key: stripQuotes(keyMatch[1]), integrity: null, tarball: null };
      entries.push(current);
      continue;
    }
    if (current === null) continue;
    const integrity = /^\s+resolution:.*?integrity:\s*sha512-([A-Za-z0-9+/=]+)/.exec(line);
    if (integrity) current.integrity = integrity[1];
    // Sólo los orígenes no-registry traen tarball; para el resto se afirma NOASSERTION.
    const tarball = /^\s+resolution:.*?tarball:\s*(\S+?)\s*[},]/.exec(line);
    if (tarball) current.tarball = tarball[1];
  }
  return entries;
}

const DEPENDENCY_BLOCK = /^ {4}(dependencies|optionalDependencies):$/;
const DEPENDENCY_LINE = /^ {6}(\S.*?):\s*(\S.*)$/;
const IMPORTER_KEY_LINE = /^ {2}(\S.*):$/;
const IMPORTER_DEP_LINE = /^ {6}(\S.*?):\s*$/;
const IMPORTER_VERSION_LINE = /^ {8}version:\s*(\S.*)$/;
const SECTION_LEVEL0 = /^(importers|packages|snapshots):$/;

/**
 * Grafo del lockfile: `snapshots:` da las dependencias resueltas de cada paquete y
 * `importers: '.'` las directas del proyecto. Las claves conservan el sufijo de peers
 * (`zod@4.6.6(typescript@5.9.3)`) porque eso es lo que hay que emparejar.
 */
export function readLockfileGraph(text) {
  const lines = text.split(/\r?\n/);
  const root = [];
  const snapshots = {};
  const snapStart = lines.findIndex((l) => l === 'snapshots:');
  if (snapStart !== -1) {
    let current = null;
    let inDeps = false;
    for (let i = snapStart + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line !== '' && !/^\s/.test(line)) break;
      const keyMatch = PACKAGE_KEY_LINE.exec(line);
      if (keyMatch) {
        current = stripQuotes(keyMatch[1]);
        snapshots[current] = [];
        inDeps = false;
        continue;
      }
      if (current === null) continue;
      if (DEPENDENCY_BLOCK.test(line)) {
        inDeps = true;
        continue;
      }
      if (/^ {4}\S/.test(line)) {
        inDeps = false;
        continue;
      }
      if (inDeps) {
        const dep = DEPENDENCY_LINE.exec(line);
        if (dep) snapshots[current].push({ name: stripQuotes(dep[1]), version: stripQuotes(dep[2]) });
      }
    }
  }
  const impStart = lines.findIndex((l) => l === 'importers:');
  if (impStart !== -1) {
    let inRoot = false;
    let pending = null;
    for (let i = impStart + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (SECTION_LEVEL0.test(line)) break;
      const importer = IMPORTER_KEY_LINE.exec(line);
      if (importer) {
        inRoot = stripQuotes(importer[1]) === '.';
        pending = null;
        continue;
      }
      if (!inRoot) continue;
      const dep = IMPORTER_DEP_LINE.exec(line);
      if (dep) {
        pending = stripQuotes(dep[1]);
        continue;
      }
      const version = IMPORTER_VERSION_LINE.exec(line);
      if (version && pending !== null) {
        root.push({ name: pending, version: stripQuotes(version[1]) });
        pending = null;
      }
    }
  }
  return { root, snapshots };
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
  /** SPDXIDs existentes: una arista que apunta a un paquete ausente se descarta. */
  const seenIds = new Set();
  /** nombre@versión de una referencia de dependencia → SPDXID del paquete, o null. */
  const idOfRef = (ref) => {
    const parsed = parsePackageKey(`${ref.name}@${ref.version}`);
    if (parsed === null) return null;
    const id = spdxId(`${parsed.name}@${parsed.version}`);
    return seenIds.has(id) ? id : null;
  };
  for (const entry of entries) {
    const parsed = parsePackageKey(entry.key);
    if (parsed === null) continue;
    const id = spdxId(`${parsed.name}@${parsed.version}`);
    if (seen.has(id)) continue;
    seen.add(id);
    seenIds.add(id);
    const pkg = {
      SPDXID: id,
      name: parsed.name,
      versionInfo: parsed.version,
      // El lockfile de registro no declara una URL de descarga: NOASSERTION + PURL.
      downloadLocation: entry.tarball ? entry.tarball : 'NOASSERTION',
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
  const relationships = [
    { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: rootId },
  ];
  const added = new Set();
  const pushEdge = (from, to, type, comment) => {
    if (to === null || from === to) return;
    const key = `${from}|${type}|${to}`;
    if (added.has(key)) return;
    added.add(key);
    const rel = { spdxElementId: from, relationshipType: type, relatedSpdxElement: to };
    if (comment) rel.comment = comment;
    relationships.push(rel);
  };
  const graph = meta.graph;
  const reached = new Set();
  if (graph) {
    // Raíz → dependencias directas del importador '.', y cada snapshot → su grafo.
    const queue = [];
    for (const ref of graph.root || []) {
      const id = idOfRef(ref);
      pushEdge(rootId, id, 'DEPENDS_ON');
      if (id) {
        reached.add(id);
        queue.push(ref);
      }
    }
    const visitedKeys = new Set();
    while (queue.length > 0) {
      const ref = queue.pop();
      const snapshotKey = `${ref.name}@${ref.version}`;
      if (visitedKeys.has(snapshotKey)) continue;
      visitedKeys.add(snapshotKey);
      const from = idOfRef(ref);
      if (from === null) continue;
      for (const dep of graph.snapshots[snapshotKey] || []) {
        const to = idOfRef(dep);
        if (to === null) continue;
        pushEdge(from, to, 'DEPENDS_ON');
        if (!reached.has(to)) {
          reached.add(to);
          queue.push(dep);
        }
      }
    }
    // Componentes que `packages:` declara pero `snapshots:` no conecta: se listan
    // sin afirmar que son directos de la raíz (OTHER + comment), para no perderlos.
    for (const pkg of described) {
      if (!reached.has(pkg.SPDXID)) {
        pushEdge(rootId, pkg.SPDXID, 'OTHER', 'en packages: pero sin arista en snapshots:');
      }
    }
  } else {
    // Sin grafo (lockfile antiguo o prueba unitaria): inventario plano, declarado.
    for (const pkg of described) {
      pushEdge(rootId, pkg.SPDXID, 'OTHER', 'inventario plano: este documento no trae el grafo de dependencias');
    }
  }
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
    relationships,
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function gitRef() {
  // `--ref` era lo que prometía la cabecera del script; `--sha` es lo que pasa ci.yml.
  // Los dos funcionan, y el documentado en la cabecera es el segundo.
  return arg('--sha', arg('--ref', process.env.GITHUB_SHA || process.env.EXPECTED_SHA || 'local'));
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const ref = gitRef();
  const lockText = fs.readFileSync(LOCK_FILE, 'utf8');
  const entries = readLockfilePackages(lockText);
  const sbom = buildSbom(entries, {
    version: pkg.version,
    ref,
    registry: 'https://registry.npmjs.org/',
    repository: process.env.GITHUB_REPOSITORY || 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
    created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    graph: readLockfileGraph(lockText),
  });
  const outFile = arg('--out', path.join('evidence', `isabella-${ref}.spdx.json`));
  fs.mkdirSync(path.dirname(path.resolve(REPO_ROOT, outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(REPO_ROOT, outFile), JSON.stringify(sbom, null, 2) + '\n', 'utf8');
  const edges = sbom.relationships.filter((r) => r.relationshipType === 'DEPENDS_ON').length;
  console.log(
    `[sbom] ${sbom.packages.length - 1} paquetes / ${edges} aristas → ${outFile} (ref ${ref}, doc ${sbom.documentNamespace})`
  );
}

// Sólo se ejecuta como comando; importado desde las pruebas expone sus funciones puras.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
