/*
 * Brand-level configuration for acme.
 *
 * Kept separate from head.html on purpose: head.html is a whole-file copy of
 * shared/head.html (see docs/known-issues.md #6), so changing a value here
 * never touches the forked file.
 *
 * Loaded as a classic script before anything that reads it, so no build step
 * or module resolution is involved.
 */
window.BRAND_CONFIG = {
  ketch: {
    // QA property. The PROD id is a swap of this one line.
    propertyId: 'qa_only_cabotstain_com',
    organizationId: 'sherwin_williams',
    // Footer link that reopens the consent preferences modal. Matched on the
    // URL fragment rather than link text, which is authored in DA and can change.
    privacyLinkHash: '#privacy-choices',
  },
};
