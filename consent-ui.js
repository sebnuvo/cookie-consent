/**
 * Nuvocargo Cookie Consent — UI Component
 *
 * Renders the cookie consent banner and preferences modal.
 * Injects itself into the DOM and wires up to NuvoConsent manager.
 *
 * @version 1.0.0
 * @requires consent-manager.js
 */
;(function (root) {
  'use strict';

  // ─── SVG Icons ─────────────────────────────────────────────────────
  var ICONS = {
    cookie: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
  };

  // ─── i18n — Translations ────────────────────────────────────────────
  var TRANSLATIONS = {
    en: {
      bannerTitle: 'We value your privacy',
      bannerText: 'We use cookies and similar tracking technologies to analyze site traffic, personalize content, and serve targeted advertising. Some of these technologies transmit data \u2014 including your IP address and device identifiers \u2014 to third-party services. These technologies will not activate until you provide your consent. You can accept all, reject all, or customize your preferences below.',
      modalTitle: 'Cookie Preferences',
      modalDesc: 'Manage your cookie preferences below. Essential cookies are always active as they are required for the website to function.',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      customize: 'Customize',
      savePreferences: 'Save Preferences',
      privacyPolicy: 'Privacy Policy',
      alwaysOn: 'Always on',
      categories: {
        essential: { label: 'Essential', description: 'Required for the website to function properly. These cannot be disabled.' },
        personalization: { label: 'Personalization', description: 'Allow us to remember your preferences and customize your experience.' },
        analytics: { label: 'Analytics', description: 'Help us understand how visitors interact with our website to improve it.' },
        marketing: { label: 'Marketing', description: 'Used to deliver relevant ads and track campaign performance.' }
      }
    },
    es: {
      bannerTitle: 'Valoramos tu privacidad',
      bannerText: 'Utilizamos cookies y tecnolog\u00edas de rastreo similares para analizar el tr\u00e1fico del sitio, personalizar contenido y mostrar publicidad relevante. Algunas de estas tecnolog\u00edas transmiten datos \u2014 incluyendo tu direcci\u00f3n IP e identificadores de dispositivo \u2014 a servicios de terceros. Estas tecnolog\u00edas no se activar\u00e1n hasta que proporciones tu consentimiento. Puedes aceptar todas, rechazar todas o personalizar tus preferencias a continuaci\u00f3n.',
      modalTitle: 'Preferencias de Cookies',
      modalDesc: 'Administra tus preferencias de cookies a continuaci\u00f3n. Las cookies esenciales siempre est\u00e1n activas ya que son necesarias para el funcionamiento del sitio web.',
      acceptAll: 'Aceptar Todas',
      rejectAll: 'Rechazar Todas',
      customize: 'Personalizar',
      savePreferences: 'Guardar Preferencias',
      privacyPolicy: 'Pol\u00edtica de Privacidad',
      alwaysOn: 'Siempre activa',
      categories: {
        essential: { label: 'Esenciales', description: 'Necesarias para el funcionamiento del sitio web. No se pueden desactivar.' },
        personalization: { label: 'Personalizaci\u00f3n', description: 'Nos permiten recordar tus preferencias y personalizar tu experiencia.' },
        analytics: { label: 'An\u00e1lisis', description: 'Nos ayudan a entender c\u00f3mo los visitantes interact\u00faan con nuestro sitio web para mejorarlo.' },
        marketing: { label: 'Marketing', description: 'Se utilizan para mostrar anuncios relevantes y medir el rendimiento de campa\u00f1as.' }
      }
    }
  };

  // ─── Language detection ───────────────────────────────────────────
  function detectLanguage() {
    // Check URL path first (Webflow localization uses /es/ prefix)
    if (typeof window !== 'undefined') {
      var path = window.location.pathname;
      if (path.indexOf('/es/') === 0 || path === '/es') return 'es';
    }
    // Check <html lang> attribute
    if (typeof document !== 'undefined') {
      var htmlLang = (document.documentElement.lang || '').toLowerCase();
      if (htmlLang.indexOf('es') === 0) return 'es';
    }
    return 'en';
  }

  function t(key) {
    var lang = _detectedLang || 'en';
    var strings = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return strings[key] || TRANSLATIONS.en[key] || key;
  }

  function tCategory(categoryId, field) {
    var lang = _detectedLang || 'en';
    var strings = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (strings.categories && strings.categories[categoryId]) {
      return strings.categories[categoryId][field];
    }
    return TRANSLATIONS.en.categories[categoryId][field];
  }

  var _detectedLang = 'en';

  // ─── Default Config ────────────────────────────────────────────────
  var defaults = {
    position: 'bottom-right',  // 'bottom-right' | 'bottom-left' | 'bottom-center'
    delay: 0,                  // ms before showing banner
    showStickyButton: false,   // use footer link instead of floating button
    policyUrl: '/policies',
    termsUrl: '/website-terms-and-conditions',
    lang: null,                // null = auto-detect, or force 'en' | 'es'
    onAcceptAll: null,
    onRejectAll: null,
    onSave: null
  };

  // ─── State ─────────────────────────────────────────────────────────
  var _cfg = {};
  var _bannerEl = null;
  var _overlayEl = null;
  var _stickyEl = null;
  var _uiInitialized = false;
  var _handleModalKeydown = null;

  // ─── Helpers ───────────────────────────────────────────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') {
          node.className = attrs[key];
        } else if (key === 'innerHTML') {
          node.innerHTML = attrs[key];
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else if (key === 'htmlFor') {
          node.setAttribute('for', attrs[key]);
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (typeof child === 'string') {
          node.appendChild(document.createTextNode(child));
        } else if (child && child.nodeType) {
          node.appendChild(child);
        }
      });
    }
    return node;
  }

  function show(element) {
    // Force reflow to ensure transition fires
    void element.offsetHeight;
    element.classList.add('nuvo-cc-visible');
    element.classList.remove('nuvo-cc-hiding');
  }

  function hide(element, callback) {
    element.classList.add('nuvo-cc-hiding');
    element.classList.remove('nuvo-cc-visible');
    setTimeout(function () {
      element.classList.remove('nuvo-cc-hiding');
      if (callback) callback();
    }, 320);
  }

  function getBannerPositionClass(position) {
    var allowed = {
      'bottom-right': true,
      'bottom-left': true,
      'bottom-center': true
    };
    var value = allowed[position] ? position : defaults.position;
    return 'nuvo-cc-banner--' + value;
  }

  function removeModalKeydownListener() {
    if (_handleModalKeydown) {
      document.removeEventListener('keydown', _handleModalKeydown);
      _handleModalKeydown = null;
    }
  }

  function getFocusableElements(container) {
    return Array.prototype.slice.call(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (node) {
      return node.offsetParent !== null || node === document.activeElement;
    });
  }

  // ─── Build Banner ──────────────────────────────────────────────────
  function buildBanner() {
    var banner = el('div', {
      className: 'nuvo-cc nuvo-cc-banner ' + getBannerPositionClass(_cfg.position),
      role: 'dialog',
      'aria-label': 'Cookie consent',
      id: 'nuvo-cookie-banner'
    });

    var inner = el('div', { className: 'nuvo-cc-banner__inner' });

    // Icon
    var icon = el('div', { className: 'nuvo-cc-banner__icon', innerHTML: ICONS.cookie });

    // Title
    var title = el('h3', { className: 'nuvo-cc-banner__title' }, t('bannerTitle'));

    // Text
    var text = el('p', { className: 'nuvo-cc-banner__text' });
    text.innerHTML = t('bannerText') + '<br><a href="' + _cfg.policyUrl + '" target="_blank" rel="noopener">' + t('privacyPolicy') + '</a>';

    // Actions
    var actions = el('div', { className: 'nuvo-cc-banner__actions' });

    var acceptBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--primary',
      id: 'nuvo-cc-accept-all',
      onClick: function () { handleAcceptAll(); }
    }, t('acceptAll'));

    var rejectBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--secondary',
      id: 'nuvo-cc-reject-all',
      onClick: function () { handleRejectAll(); }
    }, t('rejectAll'));

    var customizeBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--ghost',
      id: 'nuvo-cc-customize',
      onClick: function () { showPreferences(); }
    }, t('customize'));

    actions.appendChild(acceptBtn);
    actions.appendChild(rejectBtn);
    actions.appendChild(customizeBtn);

    inner.appendChild(icon);
    inner.appendChild(title);
    inner.appendChild(text);
    inner.appendChild(actions);
    banner.appendChild(inner);

    return banner;
  }

  // ─── Build Preferences Modal ───────────────────────────────────────
  function buildPreferences() {
    var overlay = el('div', {
      className: 'nuvo-cc nuvo-cc-overlay',
      id: 'nuvo-cookie-preferences',
      onClick: function (e) {
        if (e.target === overlay) hidePreferences();
      }
    });

    var modal = el('div', {
      className: 'nuvo-cc-modal',
      role: 'dialog',
      'aria-label': 'Cookie preferences',
      'aria-modal': 'true'
    });

    // Header
    var header = el('div', { className: 'nuvo-cc-modal__header' });
    var title = el('h2', { className: 'nuvo-cc-modal__title' }, t('modalTitle'));
    var desc = el('p', { className: 'nuvo-cc-modal__desc' });
    var readOur = _detectedLang === 'es' ? 'Lee nuestra ' : 'Read our ';
    desc.innerHTML = t('modalDesc') + ' ' + readOur + '<a href="' + _cfg.policyUrl + '" target="_blank" rel="noopener">' + t('privacyPolicy') + '</a>.';
    header.appendChild(title);
    header.appendChild(desc);

    // Categories
    var categories = el('div', { className: 'nuvo-cc-categories' });
    var currentConsent = NuvoConsent.getConsent();
    var cats = NuvoConsent.CATEGORIES;

    Object.keys(cats).forEach(function (key) {
      var cat = cats[key];
      var isChecked = currentConsent ? currentConsent[key] : cat.defaultValue;

      var row = el('div', { className: 'nuvo-cc-category' });

      var info = el('div', { className: 'nuvo-cc-category__info' });
      var label = el('div', { className: 'nuvo-cc-category__label' }, tCategory(key, 'label'));
      var catDesc = el('div', { className: 'nuvo-cc-category__desc' }, tCategory(key, 'description'));
      info.appendChild(label);
      info.appendChild(catDesc);

      if (cat.required) {
        var badge = el('span', { className: 'nuvo-cc-badge' }, t('alwaysOn'));
        var toggle = el('div', { className: 'nuvo-cc-toggle' });
        var input = el('input', {
          type: 'checkbox',
          checked: 'checked',
          disabled: 'disabled',
          id: 'nuvo-cc-cat-' + key,
          'data-category': key
        });
        var track = el('label', { className: 'nuvo-cc-toggle__track', htmlFor: 'nuvo-cc-cat-' + key });
        toggle.appendChild(input);
        toggle.appendChild(track);

        row.appendChild(info);
        var rightCol = el('div', { style: 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;' });
        rightCol.appendChild(badge);
        rightCol.appendChild(toggle);
        row.appendChild(rightCol);
      } else {
        var toggle = el('div', { className: 'nuvo-cc-toggle' });
        var input = el('input', {
          type: 'checkbox',
          id: 'nuvo-cc-cat-' + key,
          'data-category': key
        });
        if (isChecked) input.checked = true;
        var track = el('label', { className: 'nuvo-cc-toggle__track', htmlFor: 'nuvo-cc-cat-' + key });
        toggle.appendChild(input);
        toggle.appendChild(track);

        row.appendChild(info);
        row.appendChild(toggle);
      }

      categories.appendChild(row);
    });

    // Footer
    var footer = el('div', { className: 'nuvo-cc-modal__footer' });

    var acceptAllBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--primary',
      id: 'nuvo-cc-modal-accept',
      onClick: function () { handleAcceptAll(); }
    }, t('acceptAll'));

    var saveBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--secondary',
      id: 'nuvo-cc-modal-save',
      onClick: function () { handleSavePreferences(); }
    }, t('savePreferences'));

    var rejectAllBtn = el('button', {
      className: 'nuvo-cc-btn nuvo-cc-btn--ghost',
      id: 'nuvo-cc-modal-reject',
      onClick: function () { handleRejectAll(); }
    }, t('rejectAll'));

    footer.appendChild(acceptAllBtn);
    footer.appendChild(saveBtn);
    footer.appendChild(rejectAllBtn);

    modal.appendChild(header);
    modal.appendChild(categories);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    return overlay;
  }

  // ─── Build Sticky Button ───────────────────────────────────────────
  function buildStickyButton() {
    var btn = el('button', {
      className: 'nuvo-cc nuvo-cc-sticky',
      id: 'nuvo-cc-sticky-btn',
      'aria-label': 'Cookie settings',
      title: 'Cookie settings',
      onClick: function () { showPreferences(); }
    });
    btn.innerHTML = ICONS.settings;
    return btn;
  }

  // ─── Handlers ──────────────────────────────────────────────────────
  function handleAcceptAll() {
    NuvoConsent.acceptAll();
    closeBanner();
    hidePreferences();
    showSticky();
    if (typeof _cfg.onAcceptAll === 'function') _cfg.onAcceptAll();
  }

  function handleRejectAll() {
    NuvoConsent.rejectAll();
    closeBanner();
    hidePreferences();
    showSticky();
    if (typeof _cfg.onRejectAll === 'function') _cfg.onRejectAll();
  }

  function handleSavePreferences() {
    var cats = {};
    var inputs = _overlayEl.querySelectorAll('input[data-category]');
    inputs.forEach(function (input) {
      cats[input.getAttribute('data-category')] = input.checked;
    });
    NuvoConsent.setConsent(cats);
    closeBanner();
    hidePreferences();
    showSticky();
    if (typeof _cfg.onSave === 'function') _cfg.onSave(cats);
  }

  function closeBanner() {
    if (_bannerEl) {
      hide(_bannerEl);
    }
  }

  function showBanner() {
    if (_bannerEl) {
      show(_bannerEl);
    }
  }

  function showPreferences() {
    // If overlay was previously built, rebuild it to reflect current state
    if (_overlayEl) {
      _overlayEl.remove();
    }
    removeModalKeydownListener();
    _overlayEl = buildPreferences();
    document.body.appendChild(_overlayEl);
    // Force reflow
    void _overlayEl.offsetHeight;
    show(_overlayEl);
    closeBanner();

    var firstBtn = _overlayEl.querySelector('.nuvo-cc-btn');
    if (firstBtn) firstBtn.focus();

    _handleModalKeydown = function (e) {
      if (e.key === 'Escape') {
        hidePreferences();
        return;
      }

      if (e.key !== 'Tab' || !_overlayEl) {
        return;
      }

      var focusable = getFocusableElements(_overlayEl);
      if (!focusable.length) {
        return;
      }

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', _handleModalKeydown);
  }

  function hidePreferences() {
    if (_overlayEl) {
      var overlay = _overlayEl;
      removeModalKeydownListener();
      hide(overlay, function () {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (_overlayEl === overlay) {
          _overlayEl = null;
        }
        // Don't show banner again if user has already consented
        if (!NuvoConsent.hasInteracted()) {
          showBanner();
        }
      });
    }
  }

  function showSticky() {
    if (_cfg.showStickyButton && _stickyEl) {
      setTimeout(function () {
        show(_stickyEl);
      }, 500);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────
  root.NuvoConsentUI = {
    /**
     * Initialize the UI.
     * Call this after NuvoConsent.init().
     *
     * @param {Object} config
     */
    init: function (config) {
      if (_uiInitialized) return;
      _cfg = Object.assign({}, defaults, config || {});

      // Detect language
      _detectedLang = _cfg.lang || detectLanguage();

      // Build elements
      _bannerEl = buildBanner();
      _stickyEl = buildStickyButton();

      // Inject into DOM
      document.body.appendChild(_bannerEl);
      document.body.appendChild(_stickyEl);

      // If user hasn't interacted yet, show the banner
      if (!NuvoConsent.hasInteracted()) {
        if (_cfg.delay > 0) {
          setTimeout(function () { showBanner(); }, _cfg.delay);
        } else {
          // Defer to next frame for animation
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              showBanner();
            });
          });
        }
      } else {
        // User has already consented — show sticky button
        showSticky();
      }

      // Listen for reset events (if user calls NuvoConsent.reset())
      window.addEventListener('nuvo-consent-reset', function () {
        // Hide sticky, show banner
        if (_stickyEl) _stickyEl.classList.remove('nuvo-cc-visible');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            showBanner();
          });
        });
      });

      _uiInitialized = true;
    },

    /**
     * Programmatically show the preferences modal
     */
    showPreferences: showPreferences,

    /**
     * Programmatically show the banner
     */
    showBanner: showBanner
  };

  // ────────────────────────────────────────────────────────────────
  // Auto-boot. Renders the banner without a per-page init() call.
  // Runs immediately if NuvoConsent is already initialised, otherwise waits
  // for `nuvo-consent-ready` — so script order does not matter.
  // ────────────────────────────────────────────────────────────────
  function autoBoot() {
    var mgr = root.NuvoConsent;
    if (!mgr || typeof mgr.isReady !== 'function' || !mgr.isReady()) return false;
    if (mgr.config('autoInit') === false) return true;
    // The DOM must exist before we can append the banner.
    if (!root.document || !root.document.body) {
      root.document.addEventListener('DOMContentLoaded', function () {
        root.NuvoConsentUI.init(mgr.config('ui'));
      }, { once: true });
      return true;
    }
    root.NuvoConsentUI.init(mgr.config('ui'));
    return true;
  }

  if (typeof root !== 'undefined' && root.addEventListener) {
    if (!autoBoot()) root.addEventListener('nuvo-consent-ready', autoBoot, { once: true });
  }

})(typeof window !== 'undefined' ? window : this);
