/**
 * Nuvocargo Cookie Consent — Unify Intent Integration
 * 
 * Loads the Unify Intent analytics script only after Analytics consent
 * is granted. The new snippet loads the script using workspaceId and apiKey.
 * 
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function () {
  'use strict';

  var _loaded = false;

  function loadUnify(workspaceId, apiKey) {
    if (_loaded || !workspaceId || !apiKey) return;
    _loaded = true;

    // Unify Intent analytics snippet
    !function(){var e=["identify","page","startAutoPage","stopAutoPage","startAutoIdentify","stopAutoIdentify"];function t(o){return Object.assign([],e.reduce(function(r,n){return r[n]=function(){return o.push([n,[].slice.call(arguments)]),o},r},{}))}window.unify||(window.unify=t(window.unify)),window.unifyBrowser||(window.unifyBrowser=t(window.unifyBrowser));var n=document.createElement("script");n.async=!0,n.setAttribute("src","https://tag.unifyintent.com/v1/"+workspaceId+"/script.js"),n.setAttribute("data-api-key",apiKey),n.setAttribute("id","unifytag"),(document.body||document.head).appendChild(n)}();
  }

  function init(config) {
    config = config || {};
    var workspaceId = config.workspaceId;
    var apiKey = config.apiKey;

    if (!workspaceId || !apiKey) {
      console.warn('[NuvoConsent:Unify] Missing workspaceId or apiKey.');
      return;
    }

    // If already consented to analytics, load immediately
    if (typeof NuvoConsent !== 'undefined' && NuvoConsent.hasConsent('analytics')) {
      loadUnify(workspaceId, apiKey);
    }

    // Listen for future consent
    window.addEventListener('nuvo-consent-granted-analytics', function () {
      loadUnify(workspaceId, apiKey);
    });
  }

  window.NuvoUnify = { init: init };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot from window.NUVO_CONSENT_CONFIG.unify
  // No per-page init() call required. Order-independent: boots now if the
  // consent manager is ready, otherwise on `nuvo-consent-ready`.
  // A missing config slice is legitimate (this tag simply is not in use) and
  // stays silent; a missing config *object* is reported by consent-manager.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = window.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    var slice = mgr.config('unify');
    if (!slice || !Object.keys(slice).length) return true; // not configured, by design
    init(slice);
    return true;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    if (!autoBoot()) window.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }
})();
