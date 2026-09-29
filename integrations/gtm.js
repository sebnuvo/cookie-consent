/**
 * Nuvocargo Cookie Consent — Google Tag Manager Integration (v1.5.0)
 *
 * Loads a GTM container only once its consent category is granted.
 * Default category is 'analytics'; set `category: 'marketing'` for a
 * container that fires advertising tags. Google tags inside the container
 * also respect Consent Mode v2, which consent-manager.js sets first.
 *
 * Config slice:  gtm: { id: 'GTM-XXXXXXX', category: 'analytics' }
 *
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadGtm(id) {
    if (_loaded || !id) return;
    _loaded = true;
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var j = d.createElement(s);
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
      (d.head || d.documentElement).appendChild(j);
    })(window, document, 'script', 'dataLayer', id);
  }

  function init(config) {
    config = config || {};
    var category = config.category || 'analytics';
    if (!config.id) {
      console.warn('[NuvoConsent:GTM] No container id provided.');
      return;
    }
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent(category)) {
      loadGtm(config.id);
    }
    window.addEventListener('nuvo-consent-granted-' + category, function () {
      loadGtm(config.id);
    });
  }

  window.NuvoGTM = { init: init };

  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('gtm');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
