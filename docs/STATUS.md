---
state: engine-generated
generator: scripts/generate-status.mjs
---
# Estado verificable (generado)

No editar a mano: `node scripts/generate-status.mjs` regenera este archivo y `--check` lo valida en CI.

- Áreas de `src/` excluidas del typecheck principal: 6

## Áreas fuera del typecheck principal

| Área | Cubierta por `tsconfig.layers.json` |
| --- | --- |
| `src/authz-runtime` | no |
| `src/components` | no |
| `src/core` | no |
| `src/hooks` | no |
| `src/hypercore-runtime` | no |
| `src/lib` | parcial (src/lib/native-ml) |

Una capa excluida del typecheck principal **no puede declararse lista para producción** (CAPABILITY ≠ PRODUCTION).

## Limitaciones declaradas en SECURITY.md

- BookPI currently provides a volatile in-memory SHA-256 hash chain. It is not durable WORM storage, a Merkle tree, or a signed external audit log.
- The post-quantum and HSM providers are not configured. The system must not claim FIPS/ML-DSA/ML-KEM verification until an actual provider and test evidence exist.
