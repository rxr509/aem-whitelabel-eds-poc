#!/usr/bin/env node

/**
 * One command for local development: sets up the preview worktree if it is
 * missing, assembles the site, starts the AEM dev server, and watches for
 * changes. A developer never needs to know a git worktree is involved.
 *
 * Usage:
 *   npm run dev
 *   npm run dev -- --brand=<id>
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrandArg, resolveBrandDir } from './brand.mjs';
import { startWatcher } from './watch-site.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { brandId, rest } = parseBrandArg(process.argv.slice(2), { prefix: 'dev', npmScript: 'dev' });
const brandDir = resolveBrandDir(repoRoot, brandId, 'dev');
const target = resolve(rest[0] ?? join(repoRoot, '..', 'aem-poc-preview'));
const PREVIEW_BRANCH = 'develop';

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', ...opts }).trim();
}

function tryGit(args, opts = {}) {
  try {
    // Probing calls are expected to fail; keep git's stderr out of the console.
    return { ok: true, out: git(args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }) };
  } catch (err) {
    return { ok: false, out: (err.stderr || err.message || '').toString().trim() };
  }
}

function fail(message, hint) {
  console.error(`dev: ${message}`);
  if (hint) console.error(`dev: ${hint}`);
  process.exit(1);
}

/** develop--<repo>--<owner>.aem.page, derived from the origin remote. */
function previewUrl() {
  const remote = git(['remote', 'get-url', 'origin']);
  const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) fail(`could not parse owner/repo from origin remote: ${remote}`);
  const [, owner, repo] = match;
  return `https://${PREVIEW_BRANCH}--${repo}--${owner}.aem.page`;
}

function isWorktree(path) {
  const list = tryGit(['worktree', 'list', '--porcelain']);
  if (!list.ok) return false;
  return list.out.split('\n').some((line) => line.startsWith('worktree ') && resolve(line.slice(9)) === path);
}

function ensureWorktree() {
  if (isWorktree(target)) {
    console.log(`dev: preview worktree present at ${target}`);
    return;
  }
  if (existsSync(target)) {
    fail(`${target} exists but is not a git worktree`, 'move or delete it, then run npm run dev again');
  }

  console.log(`dev: creating preview worktree at ${target}`);
  tryGit(['fetch', 'origin', PREVIEW_BRANCH]);

  // Prefer the remote tip; a stale local branch would preview old content.
  const startPoint = tryGit(['rev-parse', '--verify', `origin/${PREVIEW_BRANCH}`]).ok
    ? `origin/${PREVIEW_BRANCH}`
    : PREVIEW_BRANCH;

  const localExists = tryGit(['rev-parse', '--verify', PREVIEW_BRANCH]).ok;
  const add = localExists
    ? tryGit(['worktree', 'add', target, PREVIEW_BRANCH])
    : tryGit(['worktree', 'add', '-b', PREVIEW_BRANCH, target, startPoint]);

  if (!add.ok) fail(`could not create worktree: ${add.out}`);
}

function refreshWorktree() {
  tryGit(['fetch', 'origin', PREVIEW_BRANCH]);
  const dirty = tryGit(['status', '--porcelain'], { cwd: target });
  if (dirty.ok && dirty.out === '') {
    const ff = tryGit(['merge', '--ff-only', `origin/${PREVIEW_BRANCH}`], { cwd: target });
    if (ff.ok) console.log(`dev: preview worktree up to date with origin/${PREVIEW_BRANCH}`);
  }
  // A dirty worktree is just leftover build output; the build overwrites it.
}

function runBuild() {
  const result = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'build-site.mjs'), target, `--brand=${brandId}`], {
    stdio: 'inherit',
  });
  if (result.status !== 0) fail('build failed');
}

function startServer(url) {
  const probe = spawnSync('aem', ['--version'], { encoding: 'utf8' });
  if (probe.error) {
    fail('the AEM CLI is not installed', 'install it with: npm install -g @adobe/aem-cli');
  }

  console.log(`dev: starting AEM dev server (content from ${url})`);
  return spawn('aem', ['up', '--no-open', '--url', url], { cwd: target, stdio: 'inherit' });
}

function main() {
  console.log(`dev: brand ${brandId} (${brandDir})`);
  ensureWorktree();
  refreshWorktree();
  runBuild();

  const server = startServer(previewUrl());
  const stopWatcher = startWatcher(target, brandDir);

  const shutdown = () => {
    stopWatcher();
    if (!server.killed) server.kill('SIGINT');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('exit', (code) => {
    stopWatcher();
    process.exit(code ?? 0);
  });
}

main();
