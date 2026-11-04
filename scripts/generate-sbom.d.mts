/** Tipos públicos de scripts/generate-sbom.mjs (el script se ejecuta en CI y en
 *  las pruebas; esto es su contrato, no una reimplementación). */

export interface ParsedPackageKey {
  name: string;
  version: string;
}

export interface LockfilePackageEntry {
  key: string;
  integrity: string | null;
  tarball: string | null;
}

/** Referencia de dependencia tal como la escribe el lockfile (versión con sufijo de peers). */
export interface SbomDependencyRef {
  name: string;
  version: string;
}

/** Grafo del lockfile: directas del importador raíz y dependencias de cada snapshot. */
export interface SbomGraph {
  root: SbomDependencyRef[];
  snapshots: Record<string, SbomDependencyRef[]>;
}

export interface SbomMeta {
  version: string;
  ref: string;
  registry: string;
  repository: string;
  created: string;
  graph?: SbomGraph;
}

export interface SbomChecksum {
  algorithm: string;
  checksumValue: string;
}

export interface SbomExternalRef {
  referenceCategory: string;
  referenceLocator: string;
}

export interface SbomPackage {
  SPDXID: string;
  name: string;
  versionInfo: string;
  downloadLocation: string;
  filesAnalyzed?: boolean;
  licenseConcluded: string;
  licenseDeclared: string;
  copyrightText: string;
  externalRefs?: SbomExternalRef[];
  checksums?: SbomChecksum[];
}

export interface SbomRelationship {
  spdxElementId: string;
  relationshipType: string;
  relatedSpdxElement: string;
  comment?: string;
}

export interface SbomDocument {
  spdxVersion: string;
  dataLicense: string;
  SPDXID: string;
  name: string;
  documentNamespace: string;
  creationInfo: { created: string; creators: string[]; licenseListVersion: string };
  packages: SbomPackage[];
  relationships: SbomRelationship[];
}

export function parsePackageKey(key: string): ParsedPackageKey | null;
export function readLockfilePackages(text: string): LockfilePackageEntry[];
export function readLockfileGraph(text: string): SbomGraph;
export function spdxId(raw: string): string;
export function buildSbom(entries: LockfilePackageEntry[], meta: SbomMeta): SbomDocument;
