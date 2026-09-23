# Changelog

## [1.4.0] — 2026-09-23

### Added — region regimes (opt-in where required, notice-and-opt-out where allowed)

Opt-in for every visitor threw away analytics the law does not ask us to throw away. Most visitors
never touch the banner, so on an opt-in-only site most sessions are invisible.

- **`regions` config.** `{ notice: ['US', 'MX'], noticeDefaults: { analytics: true } }`. In a notice
  country the listed categories run from the first page (Consent Mode updated to `granted` for them)
  and the banner shows `noticeText` instead of the "nothing activates until you consent" text.
  Everywhere else, and whenever the country is unknown, nothing changes.
- **Country from Cloudflare's `/cdn-cgi/trace`** (`countryEndpoint`, `timeoutMs`), or pass `country`.
- **Opt-outs always win.** A stored choice skips the lookup. Reject/Customize work as before.
  **Global Privacy Control** is treated as an opt-out in every country.
- **A default is not a choice.** Nothing is stored for it, `hasInteracted()` stays false, and it is
  re-derived on every page.
- **`NuvoConsent.region()`** and `status().region` / `status().noticeDefaults` for diagnosis.
- `nuvo-consent-ready` now fires once the region is known, so integrations and the UI boot already
  knowing it. Without `regions` it fires exactly as in 1.3.0.
- Preferences modal shows what is actually running when no choice has been made.
- 8 tests (`test/regions.test.mjs`).

Legal basis for the Nuvocargo defaults: US state privacy laws (CCPA/CPRA and others) are
notice-and-opt-out for first-party analytics and require honouring GPC; Mexico's LFPDPPP requires a
privacy notice that discloses tracking technologies and how to disable them.

## [1.3.0] — 2026-08-20

### Fixed — silent total failure of every integration

**Every consumer had to make eight `init()` calls, and forgetting any of them failed silently.**
`nuvocargo.com` loaded all eight assets and called none of them from May to August 2026. The banner
never rendered, so no consent was possible, so Google Consent Mode stayed at its `denied` default —
and **GA4, HubSpot, LinkedIn, Meta Pixel and Unify were all dark for three months.** Nothing in the
browser console said so.

Root cause was a design flaw, not a typo: each file ended with `window.NuvoX = { init: init }` and
never called `init` itself. The failure mode was the default outcome.

### Added

- **Auto-boot from `window.NUVO_CONSENT_CONFIG`.** Declare one object; the manager, the UI and every
  integration wire themselves up. No per-page `init()` calls.
- **Order independence.** Scripts may load in any order, `async` or `defer`. An integration that
  loads before the manager waits for `nuvo-consent-ready`; one that loads after boots immediately.
- **`NuvoConsent.status()`** — a console-callable diagnostic answering "is this actually wired up?"
  Returns version, initialised, configPresent, hasInteracted, categories, configuredIntegrations.
- **`NuvoConsent.isReady()`** and **`NuvoConsent.config(key)`** — the surface integrations self-configure from.
- **A loud failure.** No config now produces a `console.error` naming the exact fix. Silence was the
  expensive part.
- **13 regression tests** (`node --test test/boot.test.mjs`) covering every link that broke, including
  both load orders, consent granted, consent rejected, and the no-config case.

### Changed

- `nuvo-consent-ready` is dispatched one task after `init()`. It has to be: the announcement fires
  inside the UMD factory, before `window.NuvoConsent` is assigned. Announcing synchronously left
  first-loading integrations waking to an undefined global and consuming their one-shot listener.
  `init()` itself stays synchronous, so Consent Mode defaults are still set before any tag can load.

### Compatibility

Fully backwards compatible. Existing manual `init()` calls keep working, and `{ autoInit: false }`
disables auto-boot for anyone who wants to drive it by hand.

## [1.2.0] — 2026-05-08
- Meta (Facebook) Pixel integration

## [1.1.0] — 2026-05-08
- i18n support, updated Unify snippet

## [1.0.1] — 2026-05-07
- Banner copy, sticky button hidden by default

## [1.0.0] — 2026-05-07
- Initial release
