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
})();
