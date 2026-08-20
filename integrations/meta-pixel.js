/**
 * Nuvocargo Cookie Consent — Meta (Facebook) Pixel Integration
 * 
 * Loads the Meta Pixel script and sends a PageView only after
 * Marketing consent is granted.
 * 
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadMetaPixel(pixelId) {
    if (_loaded || !pixelId) return;
    _loaded = true;

    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', pixelId);
    fbq('track', 'PageView');
  }

  function init(config) {
    config = config || {};
    var pixelId = config.pixelId;

    if (!pixelId) {
      console.warn('[NuvoConsent:MetaPixel] Missing pixelId.');
      return;
    }

    // If already consented to marketing, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('marketing')) {
      loadMetaPixel(pixelId);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-marketing', function () {
      loadMetaPixel(pixelId);
    });
  }

  window.NuvoMetaPixel = { init: init };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot from window.NUVO_CONSENT_CONFIG.metaPixel
  // No per-page init() call required. Order-independent: boots now if the
  // consent manager is ready, otherwise on `nuvo-consent-ready`.
  // A missing config slice is legitimate (this tag simply is not in use) and
  // stays silent; a missing config *object* is reported by consent-manager.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('metaPixel');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
