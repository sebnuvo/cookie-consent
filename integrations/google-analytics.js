/**
 * Nuvocargo Cookie Consent — Google Analytics & Ads Integration
 *
 * Loads GA4 and Google Ads conversion tags only after analytics/marketing
 * consent is granted. Works with Google Consent Mode v2 (already set up
 * by consent-manager.js).
 *
 * GA4 Properties:  G-CB83HRM5ZT, G-S94DL5K7BS
 * Google Ads:      AW-362111133, AW-11055144811
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;
  var _configuredGa4 = {};
  var _configuredAds = {};

  /**
   * Load the Google tag (gtag.js) script.
   * Google Consent Mode v2 defaults are already set by consent-manager.js,
   * so gtag.js will respect consent state automatically.
   */
  function ensureGoogleTag(config) {
    if (_loaded) return true;

    var primaryId = config.ga4Ids[0] || config.adsIds[0];
    if (!primaryId) {
      console.warn('[NuvoConsent:Google] No GA4 or Google Ads IDs provided.');
      return false;
    }

    _loaded = true;

    // Load gtag.js
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + primaryId;
    document.head.appendChild(script);

    // Configure all properties
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    return true;
  }

  function configureGa4(config) {
    if (!ensureGoogleTag(config)) return;
    config.ga4Ids.forEach(function (id) {
      if (_configuredGa4[id]) return;
      _configuredGa4[id] = true;
      window.gtag('config', id, {
        send_page_view: true
      });
    });
  }

  function configureAds(config) {
    if (!ensureGoogleTag(config)) return;
    config.adsIds.forEach(function (id) {
      if (_configuredAds[id]) return;
      _configuredAds[id] = true;
      window.gtag('config', id);
    });
  }

  function syncGoogleTag(config) {
    if (typeof NuvoConsent === 'undefined') return;

    if (NuvoConsent.hasConsent('analytics')) {
      configureGa4(config);
    }

    if (NuvoConsent.hasConsent('marketing')) {
      configureAds(config);
    }
  }

  /**
   * Register the integration.
   * Google tag loads regardless of consent (Consent Mode v2 handles blocking),
   * but we only load the script after initial consent check.
   */
  function init(config) {
    config = config || {};
    config.ga4Ids = config.ga4Ids || [];
    config.adsIds = config.adsIds || [];

    // If the user has already consented, configure only the allowed tags.
    syncGoogleTag(config);

    // Listen for consent changes
    window.addEventListener('nuvo-consent-granted-analytics', function () {
      configureGa4(config);
    });

    window.addEventListener('nuvo-consent-granted-marketing', function () {
      configureAds(config);
    });
  }

  // Expose for manual initialization
  window.NuvoGoogleAnalytics = { init: init };
})();
