import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_BRAND = 'acme';

/** Splits --brand=<id> out of argv; everything else is returned untouched. */
export function parseBrandArg(argv) {
  let brandId = DEFAULT_BRAND;
  const rest = [];
  for (const arg of argv) {
    const match = /^--brand=(.+)$/.exec(arg);
    if (match) {
      brandId = match[1];
    } else {
      rest.push(arg);
    }
  }
  return { brandId, rest };
}

function listBrands(brandsRoot) {
  if (!existsSync(brandsRoot)) return [];
  return readdirSync(brandsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Resolves brands/<id>, failing with the path it looked for and what exists. */
export function resolveBrandDir(repoRoot, brandId, logPrefix) {
  const brandsRoot = join(repoRoot, 'brands');
  const brandDir = join(brandsRoot, brandId);

  if (!existsSync(brandDir) || !statSync(brandDir).isDirectory()) {
    const available = listBrands(brandsRoot);
    console.error(`${logPrefix}: no such brand "${brandId}" - looked for ${brandDir}`);
    console.error(`${logPrefix}: available brands: ${available.length ? available.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  return brandDir;
}
