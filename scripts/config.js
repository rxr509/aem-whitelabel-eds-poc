/*
 * Shared default brand config. A brand overrides this file with its own
 * /scripts/config.js to enable integrations. The default below is empty, so
 * consent-check.js treats Ketch as not configured and nothing loads.
 *
 * To turn on Ketch, a brand replaces this file with a config.js that sets a
 * ketch block, for example:
 *
 * window.BRAND_CONFIG = {
 *   ketch: {
 *     propertyId: 'your_property_id',
 *     organizationId: 'your_organization_id',
 *     privacyLinkHash: '#privacy-choices',
 *     // every code here must be strictly true in Ketch's consent.purposes
 *     // before scripts/consented.js loads - decide this with your privacy team.
 *     gatePurposes: ['your_purpose_code'],
 *   },
 * };
 *
 * See docs/consent.md.
 */
window.BRAND_CONFIG = {};
