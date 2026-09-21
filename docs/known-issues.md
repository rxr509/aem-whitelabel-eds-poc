# Known issues

Documented current behaviour of the build pipeline. These are **not bugs that
were introduced** — they exist in `.github/workflows/build-and-sync.yml` today
and were deliberately preserved when the assembly logic was extracted into
`scripts/build-site.mjs`, so that the extraction stayed a faithful port.

Fixing any of these is a behaviour change and should be decided on its own
merits, not folded into a refactor.

## 1. A brand can override files but cannot delete them

**Affects: the white-label model itself. Worth raising with Kevin.**

The assembly copies `shared/` first, then overlays the active brand's folder
under `brands/` on top. Both copies *merge* into the output tree rather than
replacing directories, so the overlay can only add files or overwrite files at
colliding paths.

There is no mechanism for a brand to **suppress** a file that `shared/` ships.
If the boilerplate adds `blocks/newsletter/`, every brand inherits it. A brand
that does not want it has no way to express that — the only options are
overwriting it with an empty stub, or changing the shared repo for everyone.

Today exactly three paths collide, and `brands/acme` correctly wins all three:

```
./README.md
./styles/styles.css
./styles/theme.css
```

This is fine at one brand. It becomes a real constraint as brands multiply,
because the shared layer can only ever grow from each brand's perspective.

If this needs solving, the usual approach is a deletion manifest — an ignore
list in the brand folder that the build honours after the overlay. That is a
deliberate feature, not a bug fix.

## 2. `.git` is matched by name anywhere in the tree

The strip step removes **any** entry named `.git`, at any depth, whether it is a
file or a directory:

```sh
find "$MERGED" -name '.git' -exec rm -rf {} +
```

This is load-bearing and must not be narrowed casually: `shared/.git` is a
31-byte gitlink *file*, not a directory, because `shared/` is a submodule. A
check that only looked for directories would leak it into `develop`.

The consequence is that a legitimate content directory or file named `.git`
would be silently destroyed. Vanishingly unlikely in a site codebase, and the
alternative — leaking git scaffolding to a published branch — is worse. Noted
so the behaviour is intentional rather than surprising.

## 3. `.github` is stripped from the build but preserved in the target

Asymmetry between the two phases:

- the merged tree has `.github` removed (`rm -rf "$MERGED/.github"`)
- the publish step preserves `.github` when clearing the target
  (`find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.github' ...`)

So `.github` on `develop` is effectively **write-once**: never updated by a
sync, never cleaned up, and immune to the wipe that regenerates everything else.

Harmless today — `develop` has no `.github` directory — but anything that ever
lands there persists indefinitely and will not be noticed, because every sync
reports success while leaving it untouched.

## 4. `.gitmodules` is stripped only at the root

`.git` is removed recursively; `.gitmodules` is removed only at the top level:

```sh
rm -f "$MERGED/.gitmodules"
```

A nested `.gitmodules` would survive into `develop`. Not reachable today, since
only the superproject defines submodules, but the inconsistency looks
unintentional and would matter if `shared/` ever gained its own submodule.

## 5. The watcher flattens symlinks; the full build preserves them

The two copy paths differ:

- `build-site.mjs` uses `fs.cpSync` with `dereference: false`, so a symlink is
  copied as a symlink
- `watch-site.mjs` uses `fs.copyFileSync`, which follows the link and writes a
  regular file containing the target's contents

So the same input can produce a different target depending on whether it arrived
via `npm run build:site` or via a watch event. Verified:

```
source _alias.css is symlink?  YES
after WATCHER (incremental) :  REGULAR FILE (symlink flattened)
after FULL BUILD            :  symlink (preserved)
```

Not reachable today - `shared/` and `brands/acme/` contain zero symlinks - and
the divergence self-corrects on the next full build, which `npm run dev` runs at
startup. It would only bite if the boilerplate started shipping symlinks, and
then only until the next restart. Fixing it means teaching the watcher to detect
and recreate links rather than copy through them.

## Verification

The extraction was validated byte-for-byte against `develop` at commit
`aff1ede17d402203d011328d2130a3cfeed978c2`:

- 87 files, identical MD5 checksums, empty `diff`
- full tree comparison (110 entries including directories) identical
- file permissions identical across all 87 files
- brand override precedence confirmed on all three colliding paths
- `.git`, `.gitmodules` and `.github` confirmed absent from output

The watcher was verified separately against a running preview server:

| Case | Result |
|---|---|
| edit a brand file | served, no rebuild |
| edit a `shared` file that the brand folder shadows | preview byte-identical; override held |
| edit a `shared`-only file | synced |
| create a new file | synced |
| delete a file | removed from target |
| create an override shadowing a shared file | brand version served |
| delete that override | falls back to the shared version |
| create a new directory with files | synced |
| `rm -rf` a directory | removed from target |
| write to `brands/acme/.github/` | not synced (excluded) |
