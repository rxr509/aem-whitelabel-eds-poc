/*
 * Brand config for psg. Keys here map to /scripts/head/<name>.js files -
 * head-includes.js loads one per key present. Omit a key to turn it off.
 */
window.BRAND_CONFIG = {
  ketch: {
    // Same QA property as acme for this POC - swap for the PROD id.
    propertyId: 'qa_only_cabotstain_com',
    organizationId: 'sherwin_williams',
    // Footer link hash that reopens the preferences modal.
    privacyLinkHash: '#privacy-choices',
  },
};
