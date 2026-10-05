/*
 * TRANSITIONAL - delete this file once shared/scripts/head-includes.js
 * exists upstream (see the diff handed to Kevin). Until then, shared/head.html
 * doesn't load config.js or head-includes.js yet, so every brand using this
 * pattern carries an identical copy. Not a brand customisation point - do not
 * diverge this file between brands; fork shared/scripts/head/<name>.js
 * instead if brand-specific behaviour is needed.
 *
 * Reads window.BRAND_CONFIG and loads one /scripts/head/<name>.js per
 * top-level key present in it. Intentionally generic - it does not hardcode
 * integration names, so a brand can add a new integration by adding a config
 * key and a /scripts/head/<name>.js file, without ever needing to change
 * this file.
 *
 * Each head/<name>.js validates its own config and decides what, if
 * anything, to do - this file only decides *whether to request* that
 * integration's file. A brand with no config at all (or an empty
 * BRAND_CONFIG) causes this loop to do nothing - no requests, no errors.
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
