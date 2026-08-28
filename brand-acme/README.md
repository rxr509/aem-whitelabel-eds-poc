# AEM Whitelabel EDS POC - brand-acme

Generated site code. **Do not edit this branch directly** - it is rebuilt from
scratch by the `Build and Sync to develop` workflow on every push to `source`.

Author changes in the `source` branch:

- `/brand-acme` - brand-specific overrides (wins on conflicts)
- `/shared` - submodule pointing at [kxs692/aem-whitelabel-boilerplate](https://github.com/kxs692/aem-whitelabel-boilerplate) (`demo` branch)

## Environments

- Content source (Document Authoring): https://da.live/#/kxs692/aem-whitelabel-boilerplate
- Preview: https://develop--aem-whitelabel-eds-poc--rxr509.aem.page/
- Live: https://develop--aem-whitelabel-eds-poc--rxr509.aem.live/

`develop` is the default branch, so it also resolves without a branch prefix once
the site is configured.

## Site setup

1. Install the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync/installations/new) on `rxr509/aem-whitelabel-eds-poc` (`Only select repositories`).
2. Set `develop` as the repository default branch in GitHub settings.
3. Content is mounted from Document Authoring via [fstab.yaml](fstab.yaml).
4. Install the [AEM Sidekick extension](https://chromewebstore.google.com/detail/aem-sidekick/igkmdomcgoebiipaifhmpfjhbjccggml) to preview and publish pages.

## Local development

```sh
npm install -g @adobe/aem-cli
aem up
```
