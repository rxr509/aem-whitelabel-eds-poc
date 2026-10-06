/*
 * Brand config for acme. Keys here must match a name in head-includes.js's
 * INTEGRATIONS list to load; unlisted keys are ignored with a warning.
 * Omit a listed key to turn that integration off.
 */
window.BRAND_CONFIG = {
  ketch: {
    // QA property - swap this for the PROD id.
    propertyId: 'qa_only_cabotstain_com',
    organizationId: 'sherwin_williams',
    // Footer link hash that reopens the preferences modal.
    privacyLinkHash: '#privacy-choices',
  },
};
