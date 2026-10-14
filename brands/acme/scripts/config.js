/*
 * Brand config for acme. Read by scripts/consent-check.js (delayed phase).
 * No ketch key: no gate, nothing loads. ketch key without propertyId throws.
 * gatePurposes is required: consented.js only loads once every purpose code
 * listed here is strictly true in Ketch's consent.purposes. Without it (or
 * with an empty list) nothing is ever treated as consented - Ketch reports
 * some purposes (e.g. always_allowed) as true before the user has chosen,
 * so there's no safe default list to fall back to.
 */
window.BRAND_CONFIG = {
  ketch: {
    // QA property - swap this for the PROD id.
    propertyId: 'qa_only_cabotstain_com',
    organizationId: 'sherwin_williams',
    // Footer link hash that reopens the preferences modal.
    privacyLinkHash: '#privacy-choices',
    // POC placeholder - the real purpose list is a privacy-team decision.
    gatePurposes: ['targeted_advertising'],
  },
};
