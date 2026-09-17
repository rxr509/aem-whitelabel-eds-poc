#!/usr/bin/env node

/**
 * Assembles the site the same way `.github/workflows/build-and-sync.yml` does:
 * /shared first, then /brand-acme overlaid on top, with git and CI scaffolding
 * stripped. This is a faithful port of that workflow's assembly steps - the
 * workflow invokes the build, it does not own it.
 *
 * Deliberately does NOT do the git half (add/commit/push). It produces an
 * assembled tree and stops.
 *
 * Usage:
 *   node scripts/build-site.mjs [targetDir]
 *
 * targetDir defaults to ../aem-poc-preview (the develop worktree).
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = join(repoRoot, 'shared');
const brandDir = join(repoRoot, 'brand-acme');

// Entries the publish step leaves alone when it clears the target.
const PRESERVE_IN_TARGET = new Set(['.git', '.github']);

function fail(message) {
  console.error(`build-site: ${message}`);
  process.exit(1);
}

function resolveTarget(argv) {
  const requested = argv[2] ?? join(repoRoot, '..', 'aem-poc-preview');
  const target = resolve(requested);

  if (target === repoRoot) {
    fail('refusing to build into the repository root');
  }
  // The publish step deletes the target's contents, so an ancestor would take
  // the repository with it.
  if (repoRoot.startsWith(target + sep)) {
    fail(`refusing to build into ${target}: it contains the repository`);
  }
  return target;
}

/** Mirrors `cp -a <src>/. <dest>/` - merges contents, does not replace dest. */
function copyContentsInto(src, dest) {
  cpSync(src, dest, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    dereference: false,
    verbatimSymlinks: true,
  });
}

/** Mirrors `find <dir> -name '.git' -exec rm -rf {} +` - any depth, file or dir. */
function stripGitEntries(dir) {
  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.name === '.git') {
      rmSync(full, { recursive: true, force: true });
      removed += 1;
    } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
      removed += stripGitEntries(full);
    }
  }
  return removed;
}

function buildMergedTree() {
  const merged = mkdtempSync(join(tmpdir(), 'build-site-'));

  copyContentsInto(sharedDir, merged);
  copyContentsInto(brandDir, merged);

  rmSync(join(merged, '.gitmodules'), { force: true });
  const gitEntries = stripGitEntries(merged);
  rmSync(join(merged, '.github'), { recursive: true, force: true });

  return { merged, gitEntries };
}

function publishInto(merged, target) {
  mkdirSync(target, { recursive: true });

  let cleared = 0;
  for (const entry of readdirSync(target)) {
    if (PRESERVE_IN_TARGET.has(entry)) continue;
    rmSync(join(target, entry), { recursive: true, force: true });
    cleared += 1;
  }

  copyContentsInto(merged, target);
  return cleared;
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(full);
    else count += 1;
  }
  return count;
}

function main() {
  const target = resolveTarget(process.argv);

  for (const [label, dir] of [['shared', sharedDir], ['brand-acme', brandDir]]) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      fail(`${label} not found at ${dir}`);
    }
  }
  if (readdirSync(sharedDir).length === 0) {
    fail('shared/ is empty - run: git submodule update --init');
  }

  console.log(`build-site: repo   ${repoRoot}`);
  console.log(`build-site: target ${target}`);

  const { merged, gitEntries } = buildMergedTree();
  try {
    console.log(`build-site: merged shared + brand-acme, stripped ${gitEntries} .git entr${gitEntries === 1 ? 'y' : 'ies'}`);
    const cleared = publishInto(merged, target);
    console.log(`build-site: cleared ${cleared} entr${cleared === 1 ? 'y' : 'ies'} from target (kept .git, .github)`);
    console.log(`build-site: wrote ${countFiles(target)} files`);
  } finally {
    rmSync(merged, { recursive: true, force: true });
  }
}

main();
