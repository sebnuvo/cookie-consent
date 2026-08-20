/**
 * Regression tests for the v1.3.0 auto-boot.
 *
 * These exist because of a real production failure: between May and August 2026
 * nuvocargo.com loaded all eight consent assets and called none of their init()
 * functions. No banner rendered, no consent was possible, and GA4, HubSpot,
 * LinkedIn, Meta and Unify were all dark for three months. Nothing failed loudly.
 *
 * Every test below asserts a link in the chain that was silently broken.
 */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDom, install } from './dom-shim.mjs';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const MANAGER = src('consent-manager.js');
const UI = src('consent-ui.js');
const GA = src('integrations/google-analytics.js');
const HS = src('integrations/hubspot.js');
const LI = src('integrations/linkedin.js');

const CONFIG = {
  policyUrl: '/policies',
  ui: {},
  google: { ga4Ids: ['G-TEST111'], adsIds: ['AW-999'] },
  hubspot: { portalId: '6484927' },
};

function boot({ config = CONFIG, order = ['manager', 'ga', 'hs', 'ui'], readyState = 'complete' } = {}) {
  const dom = makeDom({ readyState });
  install(dom);
  const errors = [];
  const realError = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  if (config) dom.win.NUVO_CONSENT_CONFIG = config;
  const files = { manager: MANAGER, ui: UI, ga: GA, hs: HS, li: LI };
  for (const k of order) new Function(files[k])();
  console.error = realError;
  return { dom, errors };
}

test('manager auto-initialises from window.NUVO_CONSENT_CONFIG', () => {
  const { dom } = boot();
  assert.equal(dom.win.NuvoConsent.isReady(), true, 'isReady() must be true after load');
});

test('config slices are readable by integrations', () => {
  const { dom } = boot();
  assert.deepEqual(dom.win.NuvoConsent.config('google').ga4Ids, ['G-TEST111']);
  assert.deepEqual(dom.win.NuvoConsent.config('hubspot').portalId, '6484927');
  assert.deepEqual(dom.win.NuvoConsent.config('nope'), {}, 'absent slice is {} not undefined');
});

test('nothing loads before consent — GA4 stays unconfigured on a fresh visit', () => {
  const { dom } = boot();
  const configured = (dom.win.dataLayer || []).map((a) => Array.from(a))
    .filter((a) => a[0] === 'config').map((a) => a[1]);
  assert.equal(configured.includes('G-TEST111'), false,
    'GA4 must not be configured before the visitor consents');
});

test('THE BUG: accepting consent configures GA4, with no per-page init() call', () => {
  const { dom } = boot();
  dom.win.NuvoConsent.acceptAll();          // what clicking "Accept All" does
  const configured = (dom.win.dataLayer || []).map((a) => Array.from(a))
    .filter((a) => a[0] === 'config').map((a) => a[1]);
  assert.ok(configured.includes('G-TEST111'),
    'consent was granted and GA4 still did not configure — the exact v1.2.0 failure');
  assert.ok(configured.includes('AW-999'), 'Google Ads id did not configure');
});

test('consent is honoured — rejecting leaves GA4 unconfigured', () => {
  const { dom } = boot();
  dom.win.NuvoConsent.rejectAll();
  const configured = (dom.win.dataLayer || []).map((a) => Array.from(a))
    .filter((a) => a[0] === 'config').map((a) => a[1]);
  assert.equal(configured.includes('G-TEST111'), false, 'rejected consent must not load GA4');
});

test('Consent Mode v2 defaults are set to denied before any tag loads', () => {
  const { dom } = boot();
  const pushed = (dom.win.dataLayer || []).map((a) => Array.from(a));
  const dflt = pushed.find((a) => a[0] === 'consent' && a[1] === 'default');
  assert.ok(dflt, 'no consent default was ever set');
  assert.equal(dflt[2].analytics_storage, 'denied');
  assert.equal(dflt[2].ad_storage, 'denied');
});

test('script order does not matter — integrations before the manager still boot', async () => {
  const { dom } = boot({ order: ['ga', 'hs', 'ui', 'manager'] });
  assert.equal(dom.win.NuvoConsent.isReady(), true);
  // `nuvo-consent-ready` is deferred one task so the UMD assignment lands first.
  await new Promise((r) => setTimeout(r, 5));
  dom.win.NuvoConsent.acceptAll();
  const configured = (dom.win.dataLayer || []).map((a) => Array.from(a))
    .filter((a) => a[0] === 'config').map((a) => a[1]);
  assert.ok(configured.includes('G-TEST111'), 'reverse load order broke the chain');
});

test('the UI renders a banner without a per-page init() call', () => {
  const { dom } = boot();
  assert.ok(dom.win.NuvoConsentUI, 'NuvoConsentUI missing');
  assert.equal(typeof dom.win.NuvoConsentUI.showBanner, 'function');
});

test('no config fails LOUDLY — the silent-death case', async () => {
  const dom = makeDom({ readyState: 'complete' });
  install(dom);
  const errors = [];
  const realError = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  new Function(MANAGER)();
  await new Promise((r) => setTimeout(r, 5)); // the warning is deferred one tick
  console.error = realError;
  assert.equal(dom.win.NuvoConsent.isReady(), false);
  assert.ok(errors.some((e) => e.includes('NOT INITIALISED')),
    'missing config must be reported, never silent');
  assert.ok(errors.some((e) => e.includes('NUVO_CONSENT_CONFIG')),
    'the error must name the fix');
});

test('an unconfigured integration stays silent (legitimately unused)', () => {
  const { dom, errors } = boot({ config: { policyUrl: '/p', ui: {}, google: { ga4Ids: ['G-X'] } } });
  assert.equal(dom.win.NuvoConsent.isReady(), true);
  assert.equal(errors.length, 0, 'a missing hubspot slice is not an error');
});

test('autoInit:false leaves everything to the caller', () => {
  const { dom } = boot({ config: { autoInit: false, google: { ga4Ids: ['G-NO'] } } });
  assert.equal(dom.win.NuvoConsent.isReady(), false, 'autoInit:false must not self-start');
});

test('status() answers "is this actually wired up?"', () => {
  const { dom } = boot();
  const st = dom.win.NuvoConsent.status();
  assert.equal(st.initialized, true);
  assert.equal(st.configPresent, true);
  assert.equal(st.configuredIntegrations.google, true);
  assert.equal(st.configuredIntegrations.hotjar, false);
  assert.match(st.version, /^\d+\.\d+\.\d+$/);
});

test('a LATE-loading integration still boots after the manager is ready', async () => {
  const { dom } = boot({ order: ['manager', 'ui'] });
  await new Promise((r) => setTimeout(r, 5));
  new Function(GA)();                       // arrives after everything settled
  dom.win.NuvoConsent.acceptAll();
  const configured = (dom.win.dataLayer || []).map((a) => Array.from(a))
    .filter((a) => a[0] === 'config').map((a) => a[1]);
  assert.ok(configured.includes('G-TEST111'), 'a late script must still self-wire');
});

// ── LinkedIn config key ─────────────────────────────────────────────────────
// integrations/linkedin.js reads `config.id`, but every other slice in this
// library names its identifier after the vendor's own term (portalId, pixelId,
// ga4Ids) — so `partnerId` is what a reader writes, and it used to be what
// INSTALL.md told them to write. The result was a config that looked complete,
// raised no error the deployer would see, and left the tag off. Both spellings
// are accepted now; these tests keep it that way.

const liIds = () => window._linkedin_data_partner_ids || [];

test('LinkedIn boots from the documented `id` key', () => {
  const { dom } = boot({
    config: { ...CONFIG, linkedin: { id: '2929228' } },
    order: ['manager', 'li'],
  });
  window.NuvoConsent.acceptAll();
  assert.deepEqual(liIds(), ['2929228']);
  assert.equal(dom.doc._inserted.length, 1, 'insight tag script was inserted');
});

test('LinkedIn also boots from `partnerId` — the name people reach for', () => {
  boot({
    config: { ...CONFIG, linkedin: { partnerId: '2929228' } },
    order: ['manager', 'li'],
  });
  window.NuvoConsent.acceptAll();
  assert.deepEqual(liIds(), ['2929228'], 'partnerId must not fail silently');
});

test('LinkedIn stays off until marketing consent is granted', () => {
  boot({ config: { ...CONFIG, linkedin: { id: '2929228' } }, order: ['manager', 'li'] });
  assert.deepEqual(liIds(), [], 'no tag before the visitor chooses');
  window.NuvoConsent.rejectAll();
  assert.deepEqual(liIds(), [], 'rejecting marketing keeps it off');
});

test('status() reports LinkedIn configured under either key', () => {
  for (const slice of [{ id: '2929228' }, { partnerId: '2929228' }]) {
    boot({ config: { ...CONFIG, linkedin: slice }, order: ['manager', 'li'] });
    assert.equal(window.NuvoConsent.status().configuredIntegrations.linkedin, true);
  }
});
