/**
 * Nuvocargo Cookie Consent — Unify Intent Integration
 *
 * Loads the Unify Intent analytics script only after Analytics consent
 * is granted. The page view API is called once loaded.
 *
 * Endpoint: https://api.unifyintent.com/analytics/v1/page
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadUnify(writeKey) {
    if (_loaded || !writeKey) return;
    _loaded = true;

    // Unify Intent analytics snippet
    // This loads the Unify script and sends an initial page view
    !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Unify snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://cdn.unifyintent.com/analytics.js/v1/"+key+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=e};analytics._writeKey=writeKey;analytics.SNIPPET_VERSION="5.2.1";analytics.load(writeKey);analytics.page()}}();
  }

  function init(config) {
    config = config || {};
    var writeKey = config.writeKey;

    if (!writeKey) {
      console.warn('[NuvoConsent:Unify] No Unify write key provided.');
      return;
    }

    // If already consented to analytics, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('analytics')) {
      loadUnify(writeKey);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-analytics', function () {
      loadUnify(writeKey);
    });
  }

  window.NuvoUnify = { init: init };
})();
