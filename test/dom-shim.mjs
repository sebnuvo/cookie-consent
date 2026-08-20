// Minimal DOM shim — just enough to exercise the consent boot chain in node.
// Not a browser. Deliberately small so a failure points at our code, not jsdom.
export function makeDom({ readyState = 'complete' } = {}) {
  const listeners = new Map();
  const store = new Map();

  const el = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild() {}, addEventListener() {},
    removeEventListener() {}, remove() {}, querySelector: () => null,
    innerHTML: '', textContent: '', className: '', id: '',
  });

  // LinkedIn's snippet does getElementsByTagName('script')[0].parentNode.insertBefore(...),
  // so the first script needs a parent that accepts an insert. Records what was
  // inserted so tests can assert the tag actually went in.
  const inserted = [];
  const firstScript = { ...el(), parentNode: { insertBefore: (node) => inserted.push(node) } };

  const doc = {
    readyState,
    body: el(),
    head: el(),
    getElementsByTagName: (tag) => (tag === 'script' ? [firstScript] : []),
    _inserted: inserted,
    documentElement: { lang: 'en' },
    createElement: el,
    createTextNode: (t) => ({ textContent: t }),
    querySelector: () => null,
    getElementById: () => null,
    addEventListener(type, fn) { (listeners.get('doc:' + type) ?? listeners.set('doc:' + type, []).get('doc:' + type)).push(fn); },
    dispatchEvent(e) { (listeners.get('doc:' + e.type) || []).forEach((f) => f(e)); return true; },
  };

  const win = {
    document: doc,
    navigator: { userAgent: 'node-test', language: 'en-US', languages: ['en-US'] },
    location: { href: 'https://example.test/', hostname: 'example.test', pathname: '/', search: '' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    addEventListener(type, fn, opts) {
      const arr = listeners.get(type) || [];
      arr.push({ fn, once: !!(opts && opts.once) });
      listeners.set(type, arr);
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) || []).filter((l) => l.fn !== fn));
    },
    dispatchEvent(e) {
      const arr = listeners.get(e.type) || [];
      listeners.set(e.type, arr.filter((l) => !l.once));
      arr.forEach((l) => l.fn(e));
      return true;
    },
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    setTimeout, clearTimeout,
  };

  class Ev { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }

  return { win, doc, CustomEvent: Ev, _listeners: listeners };
}

export function install(dom) {
  // Node 25 makes several globals getter-only, so define rather than assign.
  const def = (k, v) => Object.defineProperty(globalThis, k, {
    configurable: true, writable: true, value: v,
  });
  def('window', dom.win);
  def('document', dom.doc);
  def('navigator', dom.win.navigator);
  def('location', dom.win.location);
  def('localStorage', dom.win.localStorage);
  def('CustomEvent', dom.CustomEvent);
  def('addEventListener', dom.win.addEventListener.bind(dom.win));
  def('dispatchEvent', dom.win.dispatchEvent.bind(dom.win));
  def('requestAnimationFrame', dom.win.requestAnimationFrame);

  // The UMD wrapper attaches to globalThis, but our code reads `window.*`.
  // Alias them so both surfaces see the same values.
  for (const k of ['NuvoConsent', 'NuvoConsentUI', 'NuvoGoogleAnalytics', 'NuvoHubSpot',
                   'NuvoLinkedIn', 'NuvoUnify', 'NuvoMetaPixel', 'NuvoHotjar',
                   'dataLayer', 'gtag', 'NUVO_CONSENT_CONFIG']) {
    delete dom.win[k];
    Object.defineProperty(globalThis, k, {
      configurable: true,
      get: () => dom.win[k],
      set: (v) => { dom.win[k] = v; },
    });
  }
}
