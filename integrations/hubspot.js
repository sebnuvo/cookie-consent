/**
 * Nuvocargo Cookie Consent — HubSpot Integration
 *
 * Loads HubSpot tracking code and collected forms only after
 * Marketing consent is granted.
 * Portal ID: 6484927
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadHubSpot(portalId) {
    if (_loaded || !portalId) return;
    _loaded = true;

    // HubSpot tracking code
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'hs-script-loader';
    script.async = true;
    script.defer = true;
    script.src = 'https://js.hs-scripts.com/' + portalId + '.js';
    document.head.appendChild(script);
  }

  function init(config) {
    config = config || {};
    var portalId = config.portalId;

    if (!portalId) {
      console.warn('[NuvoConsent:HubSpot] No HubSpot portal ID provided.');
      return;
    }

    // If already consented to marketing, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('marketing')) {
      loadHubSpot(portalId);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-marketing', function () {
      loadHubSpot(portalId);
    });
  }

  window.NuvoHubSpot = { init: init };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot from window.NUVO_CONSENT_CONFIG.hubspot
  // No per-page init() call required. Order-independent: boots now if the
  // consent manager is ready, otherwise on `nuvo-consent-ready`.
  // A missing config slice is legitimate (this tag simply is not in use) and
  // stays silent; a missing config *object* is reported by consent-manager.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('hubspot');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
