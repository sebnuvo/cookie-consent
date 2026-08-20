# Changelog

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
