# aem-whitelabel-eds-poc

AEM Edge Delivery Services white-label proof of concept. A shared boilerplate is
combined with brand-specific overrides and published to the branch Edge Delivery
serves.

```sh
git clone --recurse-submodules https://github.com/rxr509/aem-whitelabel-eds-poc.git
cd aem-whitelabel-eds-poc
npm install
npm run dev        # http://localhost:3845/
```

## Layout

| Path | Purpose |
|---|---|
| `brands/<id>/` | one brand's overrides per folder — wins over `shared/`. `acme` is the default and only active brand today. |
| `shared/` | submodule tracking the upstream boilerplate |
| `scripts/` | build, watch and dev tooling |
| `.github/` | workflows and CI scripts |
| `docs/` | documentation |

Author on the `source` branch. `develop` is machine-generated and rewritten on
every publish — never commit to it.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | full local preview: worktree, build, AEM CLI, file watcher |
| `npm run dev -- --brand=<id>` | same, for a brand other than the default |
| `npm run build:site` | assemble the site once |
| `npm run watch:site` | watch and incrementally copy into an existing build |
| `npm run lint` | stylelint + eslint over `brands/acme/` |

## Documentation

- [docs/development.md](docs/development.md) — how the build works, local preview,
  the watcher, and the gitignore whitelist. **Start here.**
- [docs/branch-protection.md](docs/branch-protection.md) — branch rulesets, the
  sync bot and its credential.
- [docs/known-issues.md](docs/known-issues.md) — documented quirks of the build,
  deliberately not fixed.
