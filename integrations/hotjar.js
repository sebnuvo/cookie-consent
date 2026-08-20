/**
 * Nuvocargo Cookie Consent — Hotjar Integration
 *
 * Loads Hotjar tracking script only after Analytics consent is granted.
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadHotjar(hjid) {
    if (_loaded || !hjid) return;
    _loaded = true;

    (function (h, o, t, j, a, r) {
      h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments); };
      h._hjSettings = { hjid: hjid, hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script');
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  }

  function init(config) {
    config = config || {};
    var hjid = config.id;

    if (!hjid) {
      console.warn('[NuvoConsent:Hotjar] No Hotjar ID provided.');
      return;
    }

    // If already consented to analytics, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('analytics')) {
      loadHotjar(hjid);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-analytics', function () {
      loadHotjar(hjid);
    });
  }

  window.NuvoHotjar = { init: init };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot from window.NUVO_CONSENT_CONFIG.hotjar
  // No per-page init() call required. Order-independent: boots now if the
  // consent manager is ready, otherwise on `nuvo-consent-ready`.
  // A missing config slice is legitimate (this tag simply is not in use) and
  // stays silent; a missing config *object* is reported by consent-manager.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('hotjar');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
