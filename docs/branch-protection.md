# Branch protection and the sync bot

How `source` and `develop` are protected, why the sync bot needs its own
credential, and what will bite you if you do not know it is there.

Last verified 2026-09-15.

## Branch model

| Branch | Role |
|---|---|
| `source` | Where humans author. Holds `brand-acme/`, the `shared` submodule, and `.github/`. |
| `develop` | Machine-generated and served by Edge Delivery. Rebuilt from scratch on every sync. |
| `main` | Not used by this pipeline. Deliberately excluded from all rules. |
| `automation-state` | Bot-only. Holds `.last-checked.json`, the sync poll state. |
| `preview-*` | Throwaway Lighthouse preview branches, reaped automatically. |

Never commit site code to `develop`. `build-and-sync.yml` deletes every tracked
file on that branch before republishing, so direct commits are destroyed on the
next run.

## What is protected

### `source` — ruleset 23465424

This is the gate that matters.

| Rule | Configuration |
|---|---|
| `pull_request` | `required_approving_review_count: 0` |
| `required_status_checks` | `Lint`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `CodeQL` |
| | `strict_required_status_checks_policy: false` |
| `deletion` | Branch cannot be deleted |
| `non_fast_forward` | History cannot be rewritten |

Direct pushes are refused. Changes go through a pull request, which needs no
approval but must have all four checks green.

`Lint` and `CodeQL` exist **only on pull requests** — `lint.yml` is
`on: pull_request`, and `CodeQL` is the GitHub Advanced Security results
context, which does not post on pushes. If you ever rebuild this ruleset, read
the context names off a pull request head commit, never off a commit on
`source`. A push commit will give you an incomplete list and the missing checks
will silently never be required.

`lighthouse` and `aem-psi-check` are deliberately **not** required. Lighthouse
is informational, and `aem-psi-check` (AEM Code Sync) fails routinely on this
repo. Both were red or pending during verification and correctly did not block.

### `develop` — ruleset 23465866

`deletion` and `non_fast_forward` only. No pull request requirement.

There is deliberately no push protection here. `develop` is regenerated on
every sync, so an accidental human push is overwritten anyway, and a
`pull_request` rule would block the bot's own push for no benefit. These two
rules cost nothing, do not touch the bot's push path, and stop the branch being
destroyed or rewritten.

One residue to be aware of: the publish step preserves `.github/` on `develop`,
so anything written there is *not* overwritten by a sync. Its blast radius is
small, because workflows are stripped from the generated branch and never run
from it.

## What bypasses, and why

Both rulesets carry one bypass actor:

```
actor_type:  RepositoryRole
actor_id:    5            # repository admin
bypass_mode: always
```

This is load-bearing, not decorative. The sync bot authenticates as the token
owner, a repository admin, so it inherits this bypass — and that is the only
reason the daily sync survives the `pull_request` rule on `source`. A bot push
logs:

```
remote: Bypassed rule violations for refs/heads/source:
remote: - Changes must be made through a pull request.
remote: - 4 of 4 required status checks are expected.
```

That message is normal and means the ruleset is working. "4 of 4" is also a
useful signal that every required context name still resolves.

The corollary: **the ruleset is not enforced against admins.** `gh pr merge
--admin` overrides it. On a small team this is a guardrail against mistakes,
not a control against a determined admin.

## The sync credential

`check-shared-updates.yml` pushes to `source` using the `SYNC_BOT_TOKEN`
repository secret, injected as an HTTP auth header rather than embedded in the
remote URL.

`GITHUB_TOKEN` cannot do this job, for two independent reasons:

1. It pushes as `github-actions[bot]`, which GitHub does not accept as a
   ruleset bypass actor.
2. Pushes made with it do not trigger other workflows, so `build-and-sync.yml`
   and `codeql.yml` would never fire off a sync commit.

The token is fine-grained, scoped to this repository only, with **Contents:
read and write** plus the mandatory **Metadata: read**. It needs nothing else —
the commit only moves the `shared` gitlink and never touches
`.github/workflows/`, so no Workflows permission is required.

### It never expires. Set a rotation reminder.

`SYNC_BOT_TOKEN` was created with **no expiry**. Nothing will force rotation
and nothing will warn you. Put a recurring calendar reminder somewhere durable
and rotate it manually.

Because it cannot lapse, a `403` from the push means the token was **revoked or
had its permissions changed** — not that it expired. The workflow says so at the
failure point.

### Safeguards in the push step

Three, in order:

- An empty-token guard that fails with a clear message rather than a bare 403.
- `::add-mask::` on the base64-encoded header. The runner masks the raw secret
  automatically but **not** values derived from it, so the encoded form is
  registered explicitly. Do not add `set -x` to this step.
- An assertion that exactly one auth header is configured, so a failure to
  override the checkout credential fails loudly instead of silently pushing
  with the wrong identity.

## Bot commit attribution

Bot commits are authored as:

```
name:  github-actions[bot]
email: 41898282+github-actions[bot]@users.noreply.github.com
```

The ruleset has `require_extra_approval_for_unattributed_changes: true` — a
default GitHub applies on its own. Commits whose email maps to no GitHub
account count as unattributed and can demand an approval even though the
required count is zero. On a small team that is a self-lock.

The previous identity, `eds-sync-bot@users.noreply.github.com`, resolved to no
account. `41898282` is the real numeric ID of `github-actions[bot]`, so commits
now attribute properly and the setting can stay on doing useful work rather
than being switched off. The same identity is used in `build-and-sync.yml` and
`lighthouse.yml` for consistency.

## Fixed: state advanced on a failed push

`check-shared-updates.mjs` computes `lastSeenSha` at evaluation time, and the
"Persist state" step originally ran on `always()`. A failed push therefore still
recorded the upstream SHA as seen, marking the update done. No later run would
retry it, and the submodule bump was silently abandoned until upstream next
moved. Every log line still said success.

This is not hypothetical — it happened during setup.

"Persist state" is now gated on `steps.pull.outcome != 'failure'`. Skipped
still persists, because a no-update poll should record that it ran.

## Why zero approvals, and when to raise it

`required_approving_review_count: 0` is set because this repository currently
has effectively one active maintainer. A non-zero count on a solo repository
blocks every pull request permanently, since you cannot approve your own.

The `pull_request` rule still earns its place at zero: it forces changes
through a pull request, which is what makes the four status checks run and
block on failure. Without it, direct pushes would skip CI entirely.

**Raise it to 1 when a second person can review** — a second maintainer joins,
or the repository moves into an organisation with a review culture. At that
point also reconsider:

- `dismiss_stale_reviews_on_push: true`, so approvals do not survive new commits
- `require_last_push_approval: true`, so an author cannot approve their own
  final push
- whether `main` should come under a ruleset at all

## Working in this repo without tripping the gates

Author on `source`, in `brand-acme/` or the `shared` submodule. Open a pull
request into `source`. Four checks must pass; no approval is needed.

See [development.md](development.md) for the build, local preview and the
gitignore whitelist.

Run `npm run lint` locally before pushing. `Lint` runs `stylelint` over
`brand-acme/**/*.css` and `eslint` over `brand-acme/**/*.js`, using configs from
the `shared` submodule — so clone with `--recurse-submodules` or the configs
will be missing.

Do not commit to `develop`. Do not commit to `automation-state`.

### Testing the sync end to end

The push is behind **two independent gates**, and both must be open or the run
skips and reports success while verifying nothing:

1. Recorded `lastSeenSha` on `automation-state` differs from upstream `HEAD`
2. The `shared` gitlink on `source` differs from upstream `HEAD`

A throwaway commit on `source` opens **neither**. `workflow_dispatch` with
`force: true` only bypasses `min_spacing_minutes`; it does not touch either gate.

To force a real sync without mutating the upstream repository: pin `shared`
back one upstream commit on `source` (gate 2), rewrite `lastSeenSha` on
`automation-state` to that same older SHA (gate 1), then dispatch with
`force: true`. The run pulls forward, pushes, and restores both — it is
self-healing and leaves no cleanup.

A skipped "Pull shared submodule forward" step is **not** a pass.

### If the scheduled sync stops

Check in this order:

1. Is the workflow disabled? GitHub disables scheduled workflows after 60 days
   of repository inactivity and tells nobody. Re-enable with
   `gh workflow enable check-shared-updates.yml`.
2. Was `SYNC_BOT_TOKEN` revoked? It cannot have expired.
3. Did a push fail and leave `lastSeenSha` stale? Should no longer happen since
   the persist-state fix, but worth confirming.
