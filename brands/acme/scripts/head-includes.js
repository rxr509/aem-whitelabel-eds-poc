/*
 * Loads /scripts/head/<name>.js for each name in INTEGRATIONS whose key is
 * present in window.BRAND_CONFIG. To add an integration: 1) add
 * scripts/head/<name>.js, 2) add the name to INTEGRATIONS, 3) add the key
 * in the brand's config.js.
 */
const INTEGRATIONS = ['ketch'];

(() => {
  const config = window.BRAND_CONFIG;

  if (!config) {
    // eslint-disable-next-line no-console
    console.warn('head-includes: no brand config found');
    return;
  }

  const nonceSource = document.querySelector('script[nonce]');
  const nonce = nonceSource ? nonceSource.nonce : '';

  Object.keys(config).forEach((name) => {
    if (!INTEGRATIONS.includes(name)) {
      // eslint-disable-next-line no-console
      console.warn(`head-includes: ignoring unconfigured integration "${name}"`);
    }
  });

  INTEGRATIONS.forEach((name) => {
    if (!Object.prototype.hasOwnProperty.call(config, name)) return;
    const script = document.createElement('script');
    if (nonce) script.nonce = nonce;
    script.src = `/scripts/head/${name}.js`;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error(`head-includes: no /scripts/head/${name}.js for configured integration "${name}"`);
    };
    document.head.append(script);
  });
})();
