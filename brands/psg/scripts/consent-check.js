/*
 * Ketch cookie consent - delayed-phase entry point (Adobe CMP pattern).
 * Loaded by delayed.js after the delayed-phase timer. Injects Ketch and
 * gates scripts/consented.js behind an explicit consent decision.
 */

const config = (window.BRAND_CONFIG || {}).ketch;
let consentedLoaded = false;
let gatePurposesWarned = false;

// Fail closed: without an explicit gatePurposes list there is no safe way to
// tell Ketch's pre-interaction defaults (e.g. always_allowed) apart from a
// real user decision, so nothing is ever treated as consented.
function decideConsented(purposes) {
  if (!Array.isArray(config.gatePurposes) || config.gatePurposes.length === 0) {
    if (!gatePurposesWarned) {
      gatePurposesWarned = true;
      // eslint-disable-next-line no-console
      console.warn('consent-check: ketch.gatePurposes is not configured; treating as not consented');
    }
    return false;
  }
  return config.gatePurposes.every((code) => purposes[code] === true);
}

function onConsent(consent) {
  const purposes = (consent && consent.purposes) || {};
  const consented = decideConsented(purposes);
  window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented, purposes } }));
  if (consented && !consentedLoaded) {
    consentedLoaded = true;
    import('./consented.js');
  }
}

function init() {
  if (!config) {
    // eslint-disable-next-line no-console
    console.warn('consent-check: no ketch config found');
    window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented: false, purposes: {} } }));
    return;
  }

  if (!config.propertyId) {
    // Misconfigured brand: no consent gate is a compliance problem, not a silent one.
    throw new Error('ketch: window.BRAND_CONFIG.ketch.propertyId is not set');
  }

  const { organizationId, propertyId, privacyLinkHash } = config;

  const nonceSource = document.querySelector('script[nonce]');
  const nonce = nonceSource ? nonceSource.nonce : '';
  const script = document.createElement('script');
  if (nonce) script.nonce = nonce;
  script.src = `https://global.ketchcdn.com/web/v3/config/${organizationId}/${propertyId}/block_script.js`;
  script.onload = () => {
    window.ketch('on', 'consent', onConsent);
  };
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
}

init();
