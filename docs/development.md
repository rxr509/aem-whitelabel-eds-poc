# Development

How this repository is put together, and how to work in it day to day.

For branch protection, the sync bot and the `SYNC_BOT_TOKEN` credential, see
[branch-protection.md](branch-protection.md). For documented quirks of the build,
see [known-issues.md](known-issues.md).

## Quick start

```sh
git clone --recurse-submodules https://github.com/rxr509/aem-whitelabel-eds-poc.git
cd aem-whitelabel-eds-poc
npm install
npm run dev
```

Then open **http://localhost:3845/**.

If you cloned without `--recurse-submodules`, run `git submodule update --init`
first — `shared/` will be empty otherwise, and both the build and the lint
configs live there.

`npm run dev` handles everything else itself. You do not need to create
anything, or know how the preview is wired up.

## How the site is assembled

The site is a two-layer overlay. Nothing is compiled; it is a flatten-and-copy.

| Layer | Contents | Wins conflicts |
|---|---|---|
| `shared/` | git submodule tracking `kxs692/aem-whitelabel-boilerplate@demo` | no |
| `brand-acme/` | this brand's overrides | **yes** |

`shared/` is copied first, then `brand-acme/` is overlaid on top, so a file
present in both comes from `brand-acme/`. Today exactly three paths collide:

```
README.md
styles/styles.css
styles/theme.css
```

The overlay **merges** directories rather than replacing them: if `shared/` has
five files under `styles/` and `brand-acme/` has two, the result has five, with
two overwritten. A brand can override or add files, but cannot delete a file
that `shared/` ships — see known-issues.md #1, which matters for the
white-label model generally.

Git and CI scaffolding is stripped from the output: `.git` at any depth,
`.gitmodules`, and `.github/`.

## Branches

| Branch | Role |
|---|---|
| `source` | where humans author. Holds `brand-acme/`, the `shared` submodule, `scripts/`, `docs/` and `.github/`. |
| `develop` | machine-generated, served by Edge Delivery. Rebuilt from scratch on every sync. |
| `main` | not part of this pipeline. |
| `automation-state` | bot-only. Holds `.last-checked.json`, the sync poll state. |
| `preview-*` | throwaway Lighthouse preview branches, reaped automatically. |

**Never commit site code to `develop`.** Every publish deletes its tracked files
and rewrites them, so direct commits are destroyed on the next sync.

## The build

One script, two callers. GitHub Actions invokes the build; it does not own it.

```sh
npm run build:site            # assemble into ../aem-poc-preview (default)
npm run build:site -- <dir>   # assemble into <dir>
```

`scripts/build-site.mjs` performs the overlay described above, strips the
scaffolding, then writes into the target — clearing everything there except
`.git` and `.github` first. It has **no dependencies** (`node:fs` only) and does
no git operations: it produces an assembled tree and stops.

It refuses to write into the repository root, or into any directory that
contains the repository, since it deletes the target's contents.

`.github/workflows/build-and-sync.yml` calls this same script, then commits and
pushes the result to `develop`. Because both paths run identical code, what you
see locally is what gets published.

## Local preview

```sh
npm run dev
```

This will:

1. create a git worktree at `../aem-poc-preview` checked out to `develop`, if it
   does not already exist — fetching first, so it does not preview a stale branch
2. run the full build into it
3. start the AEM CLI against the correct content origin
4. start the file watcher

The preview is served at **http://localhost:3845/**. The AEM CLI detects the
worktree and picks a per-branch port automatically, so two branches can be
previewed at once without colliding.

Code is served from your local worktree; **content** is proxied from
`https://develop--aem-whitelabel-eds-poc--rxr509.aem.page`. The origin is derived
from the `origin` remote, so it follows the repository rather than being
hardcoded. Passing it explicitly matters: the CLI would otherwise default to a
`main--` origin, which is not this pipeline's branch, and the mismatch is silent.

Ctrl+C stops the server and the watcher together.

### The watcher

While `npm run dev` runs, edits to `shared/` or `brand-acme/` are copied into the
preview automatically — an incremental copy, not a full rebuild.

Override precedence is preserved. The watcher resolves which layer owns a path on
every event, checking `brand-acme/` first regardless of which tree changed, so:

- editing a `shared/` file that `brand-acme/` shadows leaves the preview alone —
  the override is not clobbered
- deleting a `brand-acme/` override falls back to the `shared/` version
- creates, deletes and whole-directory removals are all handled

The watcher can also be run on its own against an already-built target:

```sh
npm run watch:site            # ../aem-poc-preview
npm run watch:site -- <dir>
```

It uses Node's built-in recursive `fs.watch` — no `chokidar`, no dependencies —
with a short debounce, because editors save via temp-file-then-rename and fire
several events per save.

### If the preview misbehaves

Rebuild it from scratch:

```sh
git worktree remove ../aem-poc-preview --force
npm run dev
```

A leftover `npm run dev` from an earlier session will keep writing to the
worktree and can look like phantom file changes. Check with
`pgrep -fl dev.mjs` before debugging further.

## What is tracked: the gitignore whitelist

`.gitignore` is a **whitelist**, not a blacklist:

```gitignore
/*

!/.github/
!/brand-acme/
!/docs/
!/scripts/
!/shared
...
```

Everything at the repository root is ignored unless explicitly un-ignored. A new
tool that drops `dist/`, `.cache/` or `coverage/` is therefore excluded by
default, instead of needing a new rule each time someone notices.

**If you add a new top-level file or folder that should be committed, you must
add a `!` line for it.** Otherwise git will silently not see it — `git status`
will show nothing and the file will never be committed.

Two details worth knowing:

- `/*` matches dotfiles too, which is why `.gitignore` explicitly un-ignores
  itself. A whitelist that ignores the ignore file is an easy way to lose it.
- Un-ignoring a directory un-ignores everything inside it, including nested
  dotfiles. `**/.DS_Store` is listed separately because a root-only rule would
  not catch one dropped inside `brand-acme/` or `docs/`.

## Linting

```sh
npm run lint        # stylelint over brand-acme CSS, eslint over brand-acme JS
npm run lint:fix
```

Configs come from the `shared` submodule, so it must be checked out. `Lint` is a
required check on pull requests into `source`.

## Publishing

Pushing to `source` triggers `build-and-sync.yml`, which assembles and force-writes
`develop`. Edge Delivery serves `develop`, so **a merge to `source` reaches the
live site without further action.**

A separate scheduled workflow, `check-shared-updates.yml`, polls the upstream
boilerplate daily and pulls the submodule forward when it moves, which in turn
triggers a publish. See branch-protection.md for how that is credentialed and how
to test it.
