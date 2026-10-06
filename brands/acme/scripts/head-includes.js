/*
 * Loads /scripts/head/<name>.js for each key present in window.BRAND_CONFIG.
 * No hardcoded integration names, so adding one needs no edit to this file.
 */
(() => {
  const config = window.BRAND_CONFIG || {};
  const nonceSource = document.querySelector('script[nonce]');
  const nonce = nonceSource ? nonceSource.nonce : '';

  Object.keys(config).forEach((name) => {
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
