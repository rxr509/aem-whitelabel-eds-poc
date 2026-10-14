# Consent and Third-Party Scripts

## How consent works

This project follows Adobe's recommended delayed-phase CMP pattern:
https://www.aem.live/developer/cmp-integration

Flow:
1. `scripts.js` loads `delayed.js` in the delayed phase.
2. `delayed.js` imports `consent-check.js`.
3. `consent-check.js` loads Ketch and listens for the visitor's choice.
4. `consented.js` is imported only when the purposes in `gatePurposes` are
   granted.

The consent banner appears a few seconds after the page loads. This is
intentional, to keep it off the critical rendering path.

## Turning Ketch on for a brand

By default, Ketch stays off. Do nothing and nothing loads.

To turn Ketch on, override `scripts/config.js` with a ketch block, for
example:

```js
window.BRAND_CONFIG = {
  ketch: {
    propertyId: 'your_property_id',
    organizationId: 'your_organization_id',
    privacyLinkHash: '#privacy-choices',
    gatePurposes: ['your_purpose_code'],
  },
};
```

`gatePurposes` lists every purpose that must be granted before
`consented.js` loads. A purpose that is missing counts as not granted. The
actual purpose codes are a privacy-team decision.

A ketch block without `propertyId` throws an error on purpose, so a
misconfigured brand is noticed.

## Adding a third-party script

Put it in `scripts/consented.js` (a brand overrides that file). It loads
only after consent.

## Where to load a script

| Location | Use for |
|---|---|
| `scripts/delayed.js` → `consented.js` | Default for all third-party scripts (analytics, tag managers, pixels, chat). Gated by consent. |
| `scripts/scripts.js` | Builds the page (blocks, header, footer). Do not add integrations here. |
| `head.html` | Only for a script that must run before the page renders. Exception only, reviewed case by case. |

See also: https://www.aem.live/developer/keeping-it-100

## If we need to change approach later

Adobe's doc says that if compliance requires the banner immediately, the
CMP script can be loaded earlier while consent-gated code stays in
`consented.js`: https://www.aem.live/developer/cmp-integration

Ketch's own guidance is to load its tag high in the head:
https://developers.ketch.com/docs/web-implementation

## Ketch API used

- `ketch('on', 'consent', ...)`
- `ketch('showPreferences')`

Reference: https://www.npmjs.com/package/@ketch-sdk/ketch-tag
