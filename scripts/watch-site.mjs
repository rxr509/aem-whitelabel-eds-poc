#!/usr/bin/env node

/**
 * Watches shared/ and the active brand's folder under brands/, copying changed
 * files into the assembled target, so the local preview updates without
 * re-running the full build.
 *
 * Incremental, but precedence-preserving: the winning source for a path is
 * resolved on every event by looking in the brand folder first, regardless of
 * which tree the event came from. A change under shared/ therefore cannot
 * clobber a brand override, and deleting a brand override falls back to the
 * shared file.
 *
 * Usage:
 *   node scripts/watch-site.mjs [targetDir] [--brand=<id>]
 *
 * targetDir defaults to ../aem-poc-preview, matching build-site.mjs.
 * --brand defaults to acme.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  watch,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrandArg, resolveBrandDir } from './brand.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = join(repoRoot, 'shared');

// Editors write via temp file + rename, so one save can fire several events.
const DEBOUNCE_MS = 60;

/** Paths the full build strips - they must never reach the target. */
function isExcluded(rel) {
  const parts = rel.split(sep);
  if (parts.includes('.git')) return true;
  if (parts[0] === '.github') return true;
  if (rel === '.gitmodules') return true;
  return false;
}

/**
 * Resolves which layer owns a path and syncs it. The brand folder is checked
 * first, so precedence holds no matter which tree fired the event.
 */
function syncPath(target, rel, brandDir) {
  const dest = join(target, rel);
  const brandSrc = join(brandDir, rel);
  const sharedSrc = join(sharedDir, rel);

  const fromBrand = existsSync(brandSrc);
  const src = fromBrand ? brandSrc : (existsSync(sharedSrc) ? sharedSrc : null);

  if (src === null) {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
      return { action: 'removed', layer: '-' };
    }
    return null;
  }

  if (statSync(src).isDirectory()) return null;

  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  return { action: 'copied', layer: fromBrand ? 'brand' : 'shared' };
}

export function startWatcher(target, brandDir) {
  const pending = new Map();

  const onEvent = (rel) => {
    if (!rel || isExcluded(rel)) return;

    clearTimeout(pending.get(rel));
    pending.set(rel, setTimeout(() => {
      pending.delete(rel);
      try {
        const result = syncPath(target, rel, brandDir);
        if (result) {
          const shadowed = result.layer === 'brand' && existsSync(join(sharedDir, rel));
          console.log(`watch: ${result.action} ${rel} [${result.layer}]${shadowed ? ' (shadows shared)' : ''}`);
        }
      } catch (err) {
        console.error(`watch: failed on ${rel}: ${err.message}`);
      }
    }, DEBOUNCE_MS));
  };

  const watchers = [sharedDir, brandDir].map((dir) => watch(dir, { recursive: true }, (_type, file) => onEvent(file)));

  console.log(`watch: watching shared/ and ${brandDir} -> ${target}`);
  return () => watchers.forEach((w) => w.close());
}

function main() {
  const { brandId, rest } = parseBrandArg(process.argv.slice(2), { prefix: 'watch-site', npmScript: 'watch:site' });
  const brandDir = resolveBrandDir(repoRoot, brandId, 'watch-site');
  const target = resolve(rest[0] ?? join(repoRoot, '..', 'aem-poc-preview'));

  if (!existsSync(target)) {
    console.error(`watch-site: target ${target} does not exist - run \`npm run build:site\` first`);
    process.exit(1);
  }

  const stop = startWatcher(target, brandDir);
  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });
}

if (resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
