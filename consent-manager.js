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

  return NuvoConsent;
});
