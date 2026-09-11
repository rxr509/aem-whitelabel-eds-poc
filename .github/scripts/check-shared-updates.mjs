/**
 * Decides whether the shared submodule should be pulled for each subscriber.
 *
 * Reads SUBSCRIBERS.yml, resolves the upstream branch head, and compares it
 * against per-subscriber state held in .last-checked.json.
 *
 * State lives on a dedicated branch rather than on `source`. Writing it to
 * `source` would mean a commit on every poll - roughly 288 a day at a 5 minute
 * cadence - burying real history and racing with authoring pushes.
 *
 * Emits `decision` to GITHUB_OUTPUT for the self-subscriber, and writes the
 * next state to state.json for the caller to persist.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import yaml from 'js-yaml';

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  STATE_BRANCH = 'automation-state',
  STATE_FILE = '.last-checked.json',
  FORCE = 'false',
} = process.env;

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      ...(GITHUB_TOKEN ? { authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  return { ok: res.ok, status: res.status, body: res.status === 204 ? null : await res.json() };
};

const config = yaml.load(readFileSync('SUBSCRIBERS.yml', 'utf8'));
const { owner: upOwner, repo: upRepo, branch: upBranch } = config.shared_repo;

// Public repo, so this works unauthenticated; the token is sent only to lift
// the rate limit.
const head = await api(`/repos/${upOwner}/${upRepo}/commits/${upBranch}`);
if (!head.ok) {
  throw new Error(`cannot resolve ${upOwner}/${upRepo}@${upBranch}: HTTP ${head.status}`);
}
const upstreamSha = head.body.sha;
console.log(`upstream ${upOwner}/${upRepo}@${upBranch} = ${upstreamSha.slice(0, 12)}`);

// --- load state -------------------------------------------------------------
let state = {};
let stateSha = null;
const existing = await api(
  `/repos/${GITHUB_REPOSITORY}/contents/${STATE_FILE}?ref=${STATE_BRANCH}`,
);
if (existing.ok) {
  state = JSON.parse(Buffer.from(existing.body.content, 'base64').toString('utf8'));
  stateSha = existing.body.sha;
  console.log(`loaded state for ${Object.keys(state).length} subscriber(s)`);
} else {
  console.log(`no existing state (HTTP ${existing.status}) - treating as first run`);
}

// --- evaluate ---------------------------------------------------------------
const now = Date.now();
const nextState = { ...state };
let decision = { shouldUpdate: false, upstreamSha, reason: 'no matching subscriber' };

for (const sub of config.subscribers) {
  const key = `${sub.owner}/${sub.repo}`;
  const prev = state[key] ?? {};
  // Floor only - absent means no floor, since the cron sets the cadence.
  const minSpacingMs = (sub.min_spacing_minutes ?? 0) * 60_000;
  const lastProcessed = prev.lastProcessedAt ? Date.parse(prev.lastProcessedAt) : 0;
  const elapsed = now - lastProcessed;
  const due = FORCE === 'true' || elapsed >= minSpacingMs;

  if (!due) {
    const wait = Math.ceil((minSpacingMs - elapsed) / 60_000);
    console.log(`${key}: not due yet (${wait} more minute(s))`);
    if (key.toLowerCase() === (GITHUB_REPOSITORY ?? '').toLowerCase()) {
      decision = { shouldUpdate: false, upstreamSha, reason: `not due yet (${wait} more minute(s))` };
    }
    continue;
  }

  const changed = prev.lastSeenSha !== upstreamSha;
  // GITHUB_TOKEN is scoped to the repository running the workflow, so any other
  // subscriber cannot be pushed to from here.
  const isSelf = key.toLowerCase() === (GITHUB_REPOSITORY ?? '').toLowerCase();

  if (!changed) {
    console.log(`${key}: due, no update detected (still ${upstreamSha.slice(0, 12)})`);
    nextState[key] = { ...prev, lastSeenSha: upstreamSha, lastProcessedAt: new Date(now).toISOString() };
    if (isSelf) decision = { shouldUpdate: false, upstreamSha, reason: 'no update detected' };
    continue;
  }

  if (!isSelf) {
    console.log(`::warning::${key}: update available but this workflow cannot push to another repository with GITHUB_TOKEN - skipping`);
    continue;
  }

  console.log(`${key}: due and shared moved ${(prev.lastSeenSha ?? 'none').slice(0, 12)} -> ${upstreamSha.slice(0, 12)}`);
  decision = {
    shouldUpdate: true,
    upstreamSha,
    branch: sub.branch,
    reason: prev.lastSeenSha ? 'shared sha changed' : 'first run, recording baseline',
  };
  nextState[key] = { ...prev, lastSeenSha: upstreamSha, lastProcessedAt: new Date(now).toISOString() };
}

writeFileSync('state.json', JSON.stringify({ state: nextState, stateSha }, null, 2));
appendFileSync(process.env.GITHUB_OUTPUT ?? '/dev/stdout', `decision=${JSON.stringify(decision)}\n`);
appendFileSync(process.env.GITHUB_OUTPUT ?? '/dev/stdout', `should_update=${decision.shouldUpdate}\n`);

console.log(`decision: ${JSON.stringify(decision)}`);
