/**
 * Tests for the v1.4.0 region regimes: analytics on by default where the law
 * is notice-and-opt-out (US, MX), opt-in everywhere else, and every opt-out
 * (Reject, Customize, Global Privacy Control) winning.
 *
 *   node --test test/
 */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDom, install } from './dom-shim.mjs';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const FILES = {
  gtm: src('integrations/gtm.js'),
  unify: src('integrations/unify.js'),
  manager: src('consent-manager.js'),
  ui: src('consent-ui.js'),
  ga: src('integrations/google-analytics.js'),
  hs: src('integrations/hubspot.js'),
};

const CONFIG = {
  policyUrl: '/policies',
  ui: {},
  google: { ga4Ids: ['G-TEST111'], adsIds: ['AW-999'] },
  hubspot: { portalId: '6484927' },
  regions: { notice: ['US', 'MX'], noticeDefaults: { analytics: true } },
};

/* country: what Cloudflare's trace answers, or null for a failed lookup. */
async function boot({ country = 'US', gpc = false, stored = null, config = CONFIG } = {}) {
  const dom = makeDom();
  dom.win.navigator.globalPrivacyControl = gpc;
  if (stored) {
    dom.win.localStorage.setItem('nuvo_cookie_consent', JSON.stringify({
      categories: stored, timestamp: new Date().toISOString(), version: '1.0',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }));
  }
  install(dom);
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true, writable: true,
    value: () => country
      ? Promise.resolve({ ok: true, text: () => Promise.resolve(`fl=1\nloc=${country}\n`) })
      : Promise.reject(new Error('offline')),
  });
  dom.win.NUVO_CONSENT_CONFIG = config;
  for (const k of ['manager', 'ga', 'hs', 'gtm', 'unify', 'ui']) new Function(FILES[k])();
  await new Promise((r) => setTimeout(r, 10));
  return dom;
}

const configured = (dom) => (dom.win.dataLayer || []).map((a) => Array.from(a))
  .filter((a) => a[0] === 'config').map((a) => a[1]);
const lastConsentUpdate = (dom) => (dom.win.dataLayer || []).map((a) => Array.from(a))
  .filter((a) => a[0] === 'consent' && a[1] === 'update').pop()?.[2];

test('US visitor: analytics runs from the first page, advertising does not', async () => {
  const dom = await boot({ country: 'US' });
  const c = dom.win.NuvoConsent;
  assert.equal(c.region().mode, 'notice');
  assert.equal(c.hasConsent('analytics'), true);
  assert.equal(c.hasConsent('marketing'), false);
  assert.equal(c.hasInteracted(), false, 'a default is not a choice');
  assert.ok(configured(dom).includes('G-TEST111'), 'GA4 should run by default in the US');
  assert.equal(configured(dom).includes('AW-999'), false, 'Google Ads must still wait for Accept');
  assert.equal(lastConsentUpdate(dom).analytics_storage, 'granted');
  assert.equal(lastConsentUpdate(dom).ad_storage, 'denied');
});

test('Mexico is treated the same as the US', async () => {
  const dom = await boot({ country: 'MX' });
  assert.equal(dom.win.NuvoConsent.region().mode, 'notice');
  assert.ok(configured(dom).includes('G-TEST111'));
});

test('everywhere else stays opt-in', async () => {
  const dom = await boot({ country: 'DE' });
  assert.equal(dom.win.NuvoConsent.region().mode, 'consent');
  assert.equal(dom.win.NuvoConsent.hasConsent('analytics'), false);
  assert.equal(configured(dom).includes('G-TEST111'), false);
});

test('an unknown country stays opt-in', async () => {
  const dom = await boot({ country: null });
  assert.equal(dom.win.NuvoConsent.region().mode, 'consent');
  assert.equal(configured(dom).includes('G-TEST111'), false);
});

test('Global Privacy Control opts out of sale and sharing, not analytics (v1.5.0)', async () => {
  const dom = await boot({ country: 'US', gpc: true, config: { ...CONFIG, regions: { notice: ['US', 'MX'], noticeDefaults: { analytics: true, marketing: true } } } });
  const c = dom.win.NuvoConsent;
  assert.equal(c.region().mode, 'notice');
  assert.equal(c.hasConsent('analytics'), true);
  assert.equal(c.hasConsent('marketing'), false, 'GPC must switch off sale/sharing');
  assert.ok(configured(dom).includes('G-TEST111'));
  assert.equal(configured(dom).includes('AW-999'), false);
});

test('a stored Reject wins over the notice default', async () => {
  const dom = await boot({ country: 'US', stored: { essential: true, personalization: false, analytics: false, marketing: false } });
  assert.equal(dom.win.NuvoConsent.hasConsent('analytics'), false);
  assert.equal(configured(dom).includes('G-TEST111'), false);
});

test('rejecting on the page turns analytics off in Consent Mode', async () => {
  const dom = await boot({ country: 'US' });
  dom.win.NuvoConsent.rejectAll();
  assert.equal(dom.win.NuvoConsent.hasConsent('analytics'), false);
  assert.equal(lastConsentUpdate(dom).analytics_storage, 'denied');
});

test('without `regions`, behaviour is exactly v1.3.0', async () => {
  const { regions, ...plain } = CONFIG;
  const dom = await boot({ country: 'US', config: plain });
  assert.equal(dom.win.NuvoConsent.region().mode, 'consent');
  assert.equal(configured(dom).includes('G-TEST111'), false);
});

/* ── v1.5.0: marketing by default, the opt-out of sale, category overrides ── */

const FULL = {
  ...CONFIG,
  gtm: { id: 'GTM-TEST1' },
  unify: { workspaceId: 'W', apiKey: 'K', category: 'marketing' },
  regions: { notice: ['US', 'MX'], noticeDefaults: { analytics: true, marketing: true } },
};
const gtmLoaded = (dom) => (dom.win.dataLayer || []).some((e) => e && e.event === 'gtm.js');

test('US with marketing defaults: ads configure and GTM loads without a click', async () => {
  const dom = await boot({ country: 'US', config: FULL });
  assert.equal(dom.win.NuvoConsent.hasConsent('marketing'), true);
  assert.ok(configured(dom).includes('AW-999'), 'Google Ads should configure by default in the US');
  assert.ok(gtmLoaded(dom), 'GTM should load under analytics');
  assert.equal(lastConsentUpdate(dom).ad_storage, 'granted');
});

test('Germany with the same config: nothing loads, GTM included', async () => {
  const dom = await boot({ country: 'DE', config: FULL });
  assert.equal(gtmLoaded(dom), false);
  assert.equal(configured(dom).length, 0);
});

test('"Do Not Sell or Share" turns marketing off, keeps analytics, and is stored', async () => {
  const dom = await boot({ country: 'US', config: FULL });
  dom.win.NuvoConsent.optOutOfSale();
  const c = dom.win.NuvoConsent;
  assert.equal(c.hasConsent('marketing'), false);
  assert.equal(c.hasConsent('analytics'), true);
  assert.equal(c.hasInteracted(), true, 'the opt-out is a stored choice');
  assert.equal(lastConsentUpdate(dom).ad_storage, 'denied');
  assert.equal(lastConsentUpdate(dom).analytics_storage, 'granted');
});

test('an integration can be moved to another category', async () => {
  // Unify set to marketing: a GPC browser in the US must not load it.
  const dom = await boot({ country: 'US', gpc: true, config: FULL });
  assert.equal(dom.win.NuvoConsent.hasConsent('marketing'), false);
  assert.equal(typeof dom.win.unifyBrowser, 'undefined', 'Unify must not load when marketing is off');
});

test('the same Unify loads when marketing is on', async () => {
  const dom = await boot({ country: 'US', config: FULL });
  assert.notEqual(typeof dom.win.unifyBrowser, 'undefined');
});
