/**
 * Turns raw Lighthouse CI output into a PR comment with deltas.
 *
 * There is no database. The previous run's scores arrive one of two ways:
 *   1. PREVIOUS_JSON - a file downloaded from the last run's workflow artifact
 *   2. PREVIOUS_INLINE - JSON embedded in the existing PR comment
 * The artifact is authoritative; the inline copy is the fallback for when the
 * artifact has expired or the download failed.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LHCI_DIR = process.env.LHCI_DIR || '.lighthouseci';
const OUT_SCORES = process.env.OUT_SCORES || 'lighthouse-scores.json';
const OUT_COMMENT = process.env.OUT_COMMENT || 'lighthouse-comment.md';

// "more than 5 points" - so a 6 point drop is the first one that warns.
const REGRESSION_THRESHOLD = 5;

const CATEGORIES = [
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['best-practices', 'Best Practices'],
  ['seo', 'SEO'],
];

const METRICS = [
  ['largest-contentful-paint', 'LCP', (v) => `${(v / 1000).toFixed(2)}s`],
  ['cumulative-layout-shift', 'CLS', (v) => v.toFixed(3)],
  ['total-blocking-time', 'TBT', (v) => `${Math.round(v)}ms`],
];

// --- read this run's results ------------------------------------------------
const manifestPath = join(LHCI_DIR, 'manifest.json');
if (!existsSync(manifestPath)) {
  throw new Error(`no Lighthouse manifest at ${manifestPath} - did \`lhci collect\` run?`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
// LHCI marks the median of N runs as representative; using it keeps deltas from
// tracking run-to-run jitter.
const run = manifest.find((r) => r.isRepresentativeRun) ?? manifest[0];
if (!run) throw new Error('Lighthouse manifest is empty');

const lhrFile = run.jsonPath && existsSync(run.jsonPath)
  ? run.jsonPath
  : join(LHCI_DIR, readdirSync(LHCI_DIR).find((f) => f.startsWith('lhr-') && f.endsWith('.json')));
const lhr = JSON.parse(readFileSync(lhrFile, 'utf8'));

const scores = Object.fromEntries(
  CATEGORIES.map(([key]) => [key, Math.round((lhr.categories?.[key]?.score ?? 0) * 100)]),
);

const metrics = Object.fromEntries(
  METRICS.map(([id]) => [id, lhr.audits?.[id]?.numericValue ?? null]),
);

const current = {
  url: run.url ?? lhr.finalDisplayedUrl ?? process.env.TARGET_URL ?? '',
  sha: process.env.GITHUB_SHA ?? '',
  runUrl: process.env.RUN_URL ?? '',
  timestamp: new Date().toISOString(),
  scores,
  metrics,
};

writeFileSync(OUT_SCORES, `${JSON.stringify(current, null, 2)}\n`);

// --- locate the baseline ----------------------------------------------------
const loadPrevious = () => {
  const file = process.env.PREVIOUS_JSON;
  if (file && existsSync(file)) {
    try {
      return { data: JSON.parse(readFileSync(file, 'utf8')), source: 'artifact' };
    } catch { /* fall through to the inline copy */ }
  }
  const inline = process.env.PREVIOUS_INLINE;
  if (inline && inline.trim()) {
    try {
      return { data: JSON.parse(inline), source: 'previous comment' };
    } catch { /* no baseline */ }
  }
  return { data: null, source: null };
};

const { data: previous, source } = loadPrevious();

// --- format -----------------------------------------------------------------
const deltaCell = (cur, prev) => {
  if (prev == null || Number.isNaN(prev)) return '`new`';
  const d = cur - prev;
  if (d === 0) return '–';
  const sign = d > 0 ? `+${d}` : `${d}`;
  if (d < -REGRESSION_THRESHOLD) return `⚠️ **${sign}**`;
  if (d < 0) return `🔻 ${sign}`;
  return `🔼 ${sign}`;
};

const metricDelta = (cur, prev, fmt) => {
  if (cur == null) return '–';
  if (prev == null) return `${fmt(cur)} \`new\``;
  const d = cur - prev;
  // Lower is better for all three of these.
  const arrow = Math.abs(d) < 1e-9 ? '' : (d < 0 ? ' 🔼' : ' 🔻');
  return `${fmt(cur)}${arrow}`;
};

const regressions = CATEGORIES.filter(([key]) => {
  const prev = previous?.scores?.[key];
  return prev != null && current.scores[key] - prev < -REGRESSION_THRESHOLD;
});

const lines = [
  '<!-- lighthouse-report -->',
  '## Lighthouse',
  '',
  `\`${current.url}\``,
  '',
];

if (regressions.length) {
  lines.push(
    `> ⚠️ **${regressions.length} score${regressions.length > 1 ? 's' : ''} dropped by more than ${REGRESSION_THRESHOLD} points:** `
    + `${regressions.map(([, label]) => label).join(', ')}`,
    '',
  );
}

lines.push(
  '| Category | Score | Previous | Δ |',
  '| --- | --- | --- | --- |',
  ...CATEGORIES.map(([key, label]) => {
    const cur = current.scores[key];
    const prev = previous?.scores?.[key] ?? null;
    return `| ${label} | **${cur}** | ${prev ?? '–'} | ${deltaCell(cur, prev)} |`;
  }),
  '',
  '| Metric | Value |',
  '| --- | --- |',
  ...METRICS.map(([id, label, fmt]) => {
    const cur = current.metrics[id];
    const prev = previous?.metrics?.[id] ?? null;
    return `| ${label} | ${metricDelta(cur, prev, fmt)} |`;
  }),
  '',
);

lines.push(
  previous
    ? `<sub>Compared against the previous run on this branch (${source}), `
      + `\`${(previous.sha || '').slice(0, 7)}\` at ${previous.timestamp}.</sub>`
    : '<sub>First run on this branch — no baseline to compare against yet.</sub>',
  '',
  `<sub>Median of ${manifest.length} run${manifest.length > 1 ? 's' : ''}. `
  + 'Informational only; this check does not fail on low scores.'
  + (current.runUrl ? ` [Workflow run](${current.runUrl})` : '')
  + '</sub>',
  '',
  // The baseline for the next run, in case the artifact is gone by then.
  `<!-- lh-data:${JSON.stringify(current)} -->`,
);

writeFileSync(OUT_COMMENT, `${lines.join('\n')}\n`);

process.stdout.write(
  `${CATEGORIES.map(([k, l]) => `${l}: ${current.scores[k]}`).join('  ')}\n`
  + `baseline: ${source ?? 'none'}\n`,
);
