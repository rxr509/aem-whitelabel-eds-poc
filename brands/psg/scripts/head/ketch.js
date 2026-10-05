/*
 * TRANSITIONAL - delete this file once shared/scripts/head/ketch.js exists
 * upstream (see the diff handed to Kevin). Byte-identical across brands
 * today on purpose: it's brand-agnostic, everything comes from
 * window.BRAND_CONFIG.ketch. Do not diverge between brands without good
 * reason - that's what overriding this one file is for once shared ships it.
 *
 * Ketch cookie consent.
 *
 * Loaded by head-includes.js whenever window.BRAND_CONFIG.ketch is present.
 * A brand wanting no Ketch at all simply omits the `ketch` key from its
 * config - no file changes needed.
 *
 * Injects the Ketch block script and wires the footer "Your Privacy Choices"
 * link to reopen the preferences modal.
 *
 * The injected tag carries no nonce of its own: the CSP in head.html uses
 * 'strict-dynamic', so trust propagates from this nonce'd script to the script
 * it appends. Host allowlisting is disabled under 'strict-dynamic', so a plain
 * tag with no nonce anywhere in the chain is blocked.
 */
(() => {
  const config = (window.BRAND_CONFIG || {}).ketch;

  if (!config || !config.propertyId) {
    // Misconfigured brand: no consent gate is a compliance problem, not a silent one.
    throw new Error('ketch: window.BRAND_CONFIG.ketch.propertyId is not set');
  }

  const { organizationId, propertyId, privacyLinkHash } = config;

  const nonceSource = document.querySelector('script[nonce]');
  const nonce = nonceSource ? nonceSource.nonce : '';
  const script = document.createElement('script');
  if (nonce) script.nonce = nonce;
  script.src = `https://global.ketchcdn.com/web/v3/config/${organizationId}/${propertyId}/block_script.js`;
  document.head.append(script);

  // block_script installs window.ketch as a queue stub that buffers calls until
  // the SDK is ready, so this is safe to call before it has finished loading.
  const showPreferences = () => {
    if (typeof window.ketch === 'function') window.ketch('showPreferences');
  };

  // Delegated on document rather than bound to the footer: the footer is a
  // fragment rendered asynchronously by shared/blocks/footer/footer.js, and
  // delegation keeps this working without forking that block.
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    let hash;
    try {
      hash = new URL(link.href, window.location.href).hash;
    } catch {
      return;
    }
    if (hash !== privacyLinkHash) return;

    event.preventDefault();
    showPreferences();
  });
})();
