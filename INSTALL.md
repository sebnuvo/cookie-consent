# Install

One config object. No `init()` calls.

```html
<!-- 1. Config FIRST. Everything else self-wires from this. -->
<script>
  window.NUVO_CONSENT_CONFIG = {
    policyUrl: '/policies',
    ui: {},                                   // banner options; {} is fine
    google: {
      ga4Ids: ['G-CB83HRM5ZT', 'G-S94DL5K7BS'],
      adsIds: ['AW-362111133', 'AW-11055144811']
    },
    hubspot:  { portalId: '6484927' },
    linkedin: { partnerId: '2929228' }
    // omit any integration you are not using — omission is silent and intended
  };
</script>

<!-- 2. Styles -->
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/consent-styles.css">

<!-- 3. Manager, UI, integrations. Order between them does not matter. -->
<script src="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/consent-manager.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/consent-ui.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/integrations/google-analytics.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/integrations/hubspot.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sebnuvo/cookie-consent@v1.3.0/integrations/linkedin.js"></script>
```

Use SRI hashes in production. Regenerate them when you bump the version:

```bash
curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

## Verify it works — do this after every deploy

Open the console on the live page:

```js
NuvoConsent.status()
```

```js
{
  version: '1.3.0',
  initialized: true,            // false = config missing or not loaded
  configPresent: true,
  hasInteracted: false,         // true once the visitor chooses
  categories: null,
  configuredIntegrations: { ui: true, google: true, hubspot: true, linkedin: true,
                            unify: false, metaPixel: false, hotjar: false }
}
```

`initialized: false` means nothing is tracking. There will also be a `console.error` naming the fix.

Then accept the banner and confirm the tag fires:

```js
NuvoConsent.acceptAll();
dataLayer.filter(a => a[0] === 'config');   // expect your GA4 and Ads ids
```

## Migrating from ≤1.2.0

Delete your `init()` calls and add the config object. If you would rather not, keep them and set
`autoInit: false` — the manual API is unchanged.

## Tests

```bash
node --test test/boot.test.mjs
```
