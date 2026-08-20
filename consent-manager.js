/**
 * Nuvocargo Cookie Consent Manager
 *
 * Platform-agnostic consent management system.
 * Handles consent state, localStorage persistence, Google Consent Mode v2,
 * and CustomEvent dispatching for third-party script gating.
 *
 * @version 1.0.0
 * @license MIT
 */
;(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.NuvoConsent = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY = 'nuvo_cookie_consent';
  var CONSENT_VERSION = '1.0';
  var DEFAULT_TTL_DAYS = 365; // 12 months

  // ─── Category definitions ──────────────────────────────────────────
  var CATEGORIES = {
    essential: {
      id: 'essential',
      label: 'Essential',
      description: 'Required for the website to function properly. These cannot be disabled.',
      required: true,
      defaultValue: true
    },
    personalization: {
      id: 'personalization',
      label: 'Personalization',
      description: 'Allow us to remember your preferences and customize your experience.',
      required: false,
      defaultValue: false
    },
    analytics: {
      id: 'analytics',
      label: 'Analytics',
      description: 'Help us understand how visitors interact with our website to improve it.',
      required: false,
      defaultValue: false
    },
    marketing: {
      id: 'marketing',
      label: 'Marketing',
      description: 'Used to deliver relevant ads and track campaign performance.',
      required: false,
      defaultValue: false
    }
  };

  // ─── Google Consent Mode v2 mapping ────────────────────────────────
  // Maps our consent categories to Google's consent types
  function mapToGoogleConsent(categories) {
    return {
      'analytics_storage': categories.analytics ? 'granted' : 'denied',
      'ad_storage': categories.marketing ? 'granted' : 'denied',
      'ad_user_data': categories.marketing ? 'granted' : 'denied',
      'ad_personalization': categories.marketing ? 'granted' : 'denied',
      'personalization_storage': categories.personalization ? 'granted' : 'denied',
      'functionality_storage': categories.essential ? 'granted' : 'denied',
      'security_storage': 'granted' // always granted — essential security
    };
  }

  // ─── Ensure gtag is available ──────────────────────────────────────
  function ensureGtag() {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  // ─── Set Google Consent Mode defaults (must fire before gtag.js) ──
  function setGoogleConsentDefaults() {
    ensureGtag();
    window.gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'personalization_storage': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted',
      'wait_for_update': 500
    });
  }

  // ─── Update Google Consent Mode ────────────────────────────────────
  function updateGoogleConsent(categories) {
    ensureGtag();
    var googleConsent = mapToGoogleConsent(categories);
    window.gtag('consent', 'update', googleConsent);
  }

  // ─── localStorage helpers ──────────────────────────────────────────
  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);

      // Check version compatibility
      if (data.version !== CONSENT_VERSION) return null;

      // Check expiration
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    } catch (e) {
      return null;
    }
  }

  function writeStorage(categories) {
    var now = new Date();
    var expiresAt = new Date(now.getTime() + (DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000));

    var data = {
      categories: categories,
      timestamp: now.toISOString(),
      version: CONSENT_VERSION,
      expiresAt: expiresAt.toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage may be unavailable (private browsing, etc.)
      console.warn('[NuvoConsent] Unable to persist consent to localStorage.');
    }

    return data;
  }

  // ─── Event dispatching ─────────────────────────────────────────────
  function dispatchConsentEvent(categories, isInitial) {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;

    window.dispatchEvent(new CustomEvent('nuvo-consent-updated', {
      detail: {
        categories: Object.assign({}, categories),
        isInitial: !!isInitial,
        timestamp: new Date().toISOString()
      }
    }));

    // Also dispatch per-category events for granular listening
    Object.keys(categories).forEach(function (cat) {
      if (categories[cat]) {
        window.dispatchEvent(new CustomEvent('nuvo-consent-granted-' + cat, {
          detail: { category: cat }
        }));
      }
    });
  }

  // ─── Webhook (optional) ────────────────────────────────────────────
  function sendWebhook(endpoint, categories) {
    if (!endpoint) return;
    try {
      var payload = JSON.stringify({
        categories: categories,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, payload);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () { /* silent fail */ });
      }
    } catch (e) {
      // Silent fail — webhook is optional
    }
  }

  // ─── Main API ──────────────────────────────────────────────────────
  var VERSION = '1.3.0';

  var _config = {};
  var _state = null;
  var _initialized = false;
  var _listeners = [];

  var NuvoConsent = {
    /**
     * Get the category definitions
     */
    CATEGORIES: CATEGORIES,

    /**
     * Initialize the consent manager.
     * Must be called before any other method.
     *
     * @param {Object} config
     * @param {string} [config.webhookEndpoint] — Optional URL to POST consent data
     * @param {string} [config.storageEndpoint] — Optional URL to store consent server-side
     * @param {number} [config.ttlDays=365] — Days until consent expires
     */
    init: function (config) {
      if (_initialized) return NuvoConsent;

      _config = config || {};

      if (_config.ttlDays) {
        DEFAULT_TTL_DAYS = _config.ttlDays;
      }

      // Set Google Consent Mode defaults FIRST (before any gtag.js loads)
      setGoogleConsentDefaults();

      // Check for existing consent
      var stored = readStorage();

      if (stored) {
        _state = stored;
        // Restore Google Consent Mode from stored preferences
        updateGoogleConsent(stored.categories);
        // Dispatch events for integrations
        dispatchConsentEvent(stored.categories, true);
      }

      _initialized = true;
      return NuvoConsent;
    },


    /**
     * True once init() has run. Integrations use this to decide whether to
     * boot immediately or wait for the `nuvo-consent-ready` event.
     * @returns {boolean}
     */
    isReady: function () {
      return _initialized;
    },

    /**
     * Read one integration's slice of the global config.
     * Lets integrations self-configure instead of requiring a per-page init call.
     *
     * @param {string} key — e.g. 'google', 'hubspot', 'ui'
     * @returns {Object} the slice, or {} when absent
     */
    config: function (key) {
      if (!key) return _config;
      return _config[key] || {};
    },

    /**
     * Diagnostic snapshot. Safe to call from a browser console at any time.
     * Use this to answer "is consent actually wired up?" in one step.
     * @returns {Object}
     */
    status: function () {
      var integrations = {};
      ['ui', 'google', 'hubspot', 'linkedin', 'unify', 'metaPixel', 'hotjar'].forEach(function (k) {
        integrations[k] = !!(_config && _config[k]);
      });
      return {
        version: VERSION,
        initialized: _initialized,
        configPresent: !!(typeof window !== 'undefined' && window.NUVO_CONSENT_CONFIG),
        hasInteracted: _state !== null,
        categories: _state ? _state.categories : null,
        configuredIntegrations: integrations
      };
    },

    /**
     * Check if consent has been given (i.e., the user has interacted with the banner)
     */
    hasInteracted: function () {
      return _state !== null;
    },

    /**
     * Get consent status for a specific category
     * @param {string} category — 'essential' | 'personalization' | 'analytics' | 'marketing'
     * @returns {boolean}
     */
    hasConsent: function (category) {
      if (!_state || !_state.categories) return CATEGORIES[category] && CATEGORIES[category].required;
      return !!_state.categories[category];
    },

    /**
     * Get all current consent values
     * @returns {Object|null}
     */
    getConsent: function () {
      if (!_state) return null;
      return Object.assign({}, _state.categories);
    },

    /**
     * Get the full stored consent data (including metadata)
     * @returns {Object|null}
     */
    getConsentData: function () {
      if (!_state) return null;
      return JSON.parse(JSON.stringify(_state));
    },

    /**
     * Set consent for all categories at once.
     * This is the main method called by the UI.
     *
     * @param {Object} categories — e.g., { essential: true, analytics: true, marketing: false, personalization: false }
     */
    setConsent: function (categories) {
      // Essential is always true
      categories.essential = true;

      // Persist to localStorage
      _state = writeStorage(categories);

      // Update Google Consent Mode v2
      updateGoogleConsent(categories);

      // Dispatch events
      dispatchConsentEvent(categories, false);

      // Notify listeners
      _listeners.forEach(function (fn) {
        try { fn(Object.assign({}, categories)); } catch (e) { /* silent */ }
      });

      // Webhooks
      if (_config.webhookEndpoint) {
        sendWebhook(_config.webhookEndpoint, categories);
      }
      if (_config.storageEndpoint) {
        sendWebhook(_config.storageEndpoint, categories);
      }

      return NuvoConsent;
    },

    /**
     * Accept all categories
     */
    acceptAll: function () {
      var categories = {};
      Object.keys(CATEGORIES).forEach(function (key) {
        categories[key] = true;
      });
      return NuvoConsent.setConsent(categories);
    },

    /**
     * Reject all non-essential categories
     */
    rejectAll: function () {
      var categories = {};
      Object.keys(CATEGORIES).forEach(function (key) {
        categories[key] = CATEGORIES[key].required;
      });
      return NuvoConsent.setConsent(categories);
    },

    /**
     * Reset consent — clears stored preferences and forces re-prompt
     */
    reset: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) { /* silent */ }
      _state = null;

      // Reset Google Consent Mode to denied for any already-loaded Google tag.
      setGoogleConsentDefaults();
      updateGoogleConsent({
        essential: true,
        personalization: false,
        analytics: false,
        marketing: false
      });

      // Dispatch reset event
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nuvo-consent-reset'));
      }

      return NuvoConsent;
    },

    /**
     * Subscribe to consent changes
     * @param {Function} fn — Callback receiving categories object
     * @returns {Function} unsubscribe function
     */
    onChange: function (fn) {
      _listeners.push(fn);
      return function () {
        _listeners = _listeners.filter(function (l) { return l !== fn; });
      };
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot
  //
  // Before 1.3.0 every consumer had to call NuvoConsent.init(), then
  // NuvoConsentUI.init(), then one init() per integration. Forgetting any of
  // them failed silently — the banner never rendered and nothing was ever
  // tracked. That is what happened on nuvocargo.com between May and August 2026.
  //
  // Now: define window.NUVO_CONSENT_CONFIG and every piece wires itself up.
  // Order-independent — the config object may appear before or after this file.
  // Set { autoInit: false } to opt out and drive it manually.
  // ────────────────────────────────────────────────────────────────
  function readGlobalConfig() {
    return (typeof window !== 'undefined' && window.NUVO_CONSENT_CONFIG) || null;
  }

  function announceReady(cfg) {
    if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
    // Deferred by one task on purpose. This code runs INSIDE the UMD factory,
    // so `window.NuvoConsent` is not assigned until the factory returns.
    // Announcing synchronously would let integrations that loaded first wake up
    // to a `window.NuvoConsent` that does not exist yet, and — because they
    // listen with { once: true } — never get a second chance.
    // init() itself stays synchronous, so Consent Mode defaults are still set
    // before any tag can load.
    setTimeout(function () {
      window.dispatchEvent(new CustomEvent('nuvo-consent-ready', { detail: cfg }));
    }, 0);
  }

  function tryAutoBoot() {
    if (_initialized) return true;
    var cfg = readGlobalConfig();
    if (!cfg) return false;
    if (cfg.autoInit === false) return true; // deliberate manual mode
    NuvoConsent.init(cfg);
    announceReady(cfg);
    return true;
  }

  function warnNotConfigured() {
    if (_initialized || readGlobalConfig()) return;
    // Loud on purpose. A silent consent layer is indistinguishable from no
    // analytics at all, and that is expensive to discover late.
    var msg = [
      '[NuvoConsent] NOT INITIALISED — no banner will render and nothing will be tracked.',
      '',
      'Add this BEFORE the consent-manager script tag:',
      '',
      '  <script>',
      '    window.NUVO_CONSENT_CONFIG = {',
      '      policyUrl: "/policies",',
      '      ui: {},',
      '      google:   { ga4Ids: ["G-XXXXXXX"], adsIds: ["AW-XXXXXXXXX"] },',
      '      hubspot:  { portalId: "0000000" }',
      '    };',
      '  <\/script>',
      '',
      'Then check NuvoConsent.status() in the console.'
    ].join('\n');
    if (typeof console !== 'undefined') console.error(msg);
  }

  if (typeof window !== 'undefined') {
    if (!tryAutoBoot()) {
      // Config may be declared after this script. Retry at the two points
      // where late-declared config becomes visible, then complain.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          if (!tryAutoBoot()) warnNotConfigured();
        }, { once: true });
      } else {
        setTimeout(function () {
          if (!tryAutoBoot()) warnNotConfigured();
        }, 0);
      }
    }
  }

  return NuvoConsent;
});
