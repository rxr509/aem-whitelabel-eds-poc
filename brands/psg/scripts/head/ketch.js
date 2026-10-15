/*
 * Ketch cookie consent. Loaded by head-includes.js when config.ketch is set.
 * Injects the Ketch script and wires the footer link to reopen preferences.
 */
(() => {
  const config = (window.BRAND_CONFIG || {}).ketch;

  if (!config || !config.propertyId) {
    // Fail loudly - a brand silently shipping with no consent gate is worse.
    throw new Error('ketch: window.BRAND_CONFIG.ketch.propertyId is not set');
  }

  const { organizationId, propertyId, privacyLinkHash } = config;

  const nonceSource = document.querySelector('script[nonce]');
  const nonce = nonceSource ? nonceSource.nonce : '';
  const script = document.createElement('script');
  if (nonce) script.nonce = nonce;
  script.src = `https://global.ketchcdn.com/web/v3/config/${organizationId}/${propertyId}/block_script.js`;
  document.head.append(script);

  // block_script installs window.ketch as a queue stub, safe to call early.
  const showPreferences = () => {
    if (typeof window.ketch === 'function') window.ketch('showPreferences');
  };

  // Delegated listener - footer is rendered async, so no direct binding.
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
