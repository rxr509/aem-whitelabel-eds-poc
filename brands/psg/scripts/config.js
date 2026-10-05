/*
 * Brand-level configuration for psg.
 *
 * Read by head-includes.js, which loads one /scripts/head/<name>.js per key
 * present here - e.g. the `ketch` key below causes head/ketch.js to load.
 * Omitting a key turns that integration off; no file changes needed either way.
 *
 * Loaded as a classic script before anything that reads it, so no build step
 * or module resolution is involved.
 */
window.BRAND_CONFIG = {
  ketch: {
    // Same QA property as acme for this POC. The PROD id is a swap of this one line.
    propertyId: 'qa_only_cabotstain_com',
    organizationId: 'sherwin_williams',
    // Footer link that reopens the consent preferences modal. Matched on the
    // URL fragment rather than link text, which is authored in DA and can change.
    privacyLinkHash: '#privacy-choices',
  },
};
