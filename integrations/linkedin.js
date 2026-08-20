/**
 * Nuvocargo Cookie Consent — LinkedIn Insight Tag Integration
 *
 * Loads LinkedIn Insight Tag only after Marketing consent is granted.
 * Partner ID: 2929228
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadLinkedIn(partnerId) {
    if (_loaded || !partnerId) return;
    _loaded = true;

    // LinkedIn Insight Tag snippet
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(partnerId);

    (function (l) {
      if (!l) {
        window.lintrk = function (a, b) {
          window.lintrk.q.push([a, b]);
        };
        window.lintrk.q = [];
      }
      var s = document.getElementsByTagName('script')[0];
      var b = document.createElement('script');
      b.type = 'text/javascript';
      b.async = true;
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);

    // Also inject the noscript pixel as an img (for completeness)
    var img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.alt = '';
    img.src = 'https://px.ads.linkedin.com/collect/?pid=' + partnerId + '&fmt=gif';
    document.body.appendChild(img);
  }

  function init(config) {
    config = config || {};
    var partnerId = config.id;

    if (!partnerId) {
      console.warn('[NuvoConsent:LinkedIn] No LinkedIn partner ID provided.');
      return;
    }

    // If already consented to marketing, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('marketing')) {
      loadLinkedIn(partnerId);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-marketing', function () {
      loadLinkedIn(partnerId);
    });
  }

  window.NuvoLinkedIn = { init: init };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot from window.NUVO_CONSENT_CONFIG.linkedin
  // No per-page init() call required. Order-independent: boots now if the
  // consent manager is ready, otherwise on `nuvo-consent-ready`.
  // A missing config slice is legitimate (this tag simply is not in use) and
  // stays silent; a missing config *object* is reported by consent-manager.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('linkedin');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
