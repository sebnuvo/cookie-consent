# Nuvocargo Cookie Consent System

A portable, vanilla JavaScript cookie consent manager with Google Consent Mode v2 support. Designed for Nuvocargo's website — works on Webflow today, and migrates to any infrastructure with zero changes.

## Features

- ✅ **Google Consent Mode v2** — Proper `default` → `update` lifecycle
- ✅ **4 consent categories** — Essential, Personalization, Analytics, Marketing
- ✅ **Script gating** — Third-party scripts only load after consent
- ✅ **12-month consent duration** — Auto-expires and re-prompts
- ✅ **Animated UI** — Brand-aligned banner + preferences modal
- ✅ **Responsive** — Mobile-first, works on all screen sizes
- ✅ **Accessible** — Keyboard navigation, focus trapping, ARIA labels
- ✅ **Zero dependencies** — No jQuery, no frameworks, no CDN deps
- ✅ **Webhook-ready** — Optional server-side consent logging

## Integrations

| Service | Category | File |
|---|---|---|
| Google Analytics (GA4) | Analytics | `integrations/google-analytics.js` |
| Google Ads | Marketing | `integrations/google-analytics.js` |
| Hotjar | Analytics | `integrations/hotjar.js` |
| LinkedIn Insight Tag | Marketing | `integrations/linkedin.js` |
| HubSpot | Marketing | `integrations/hubspot.js` |
| Unify Intent | Analytics | `integrations/unify.js` |

## Quick Start

### Local Development

Open `demo.html` in your browser to preview and test:

```bash
# From this directory
open demo.html

# Or with a local server (recommended for full functionality)
npx serve .
```

### Production CDN URL

For Webflow, host the files in a **public GitHub repo** and load them through a pinned jsDelivr URL:

```text
https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/
```

Use a version tag like `@v1.0.0` or a commit SHA for production. Avoid `@latest` in Webflow because CDN caches can make urgent fixes unpredictable.

### Webflow Integration

Paste the following into **Project Settings → Custom Code → Head Code**:

```html
<!-- ═══ Cookie Consent — HEAD CODE ═══ -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/consent-styles.css">
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/consent-manager.js"></script>
<script>
  NuvoConsent.init({
    ttlDays: 365
    // webhookEndpoint: 'https://your-api.com/consent'  // Optional
  });
</script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/integrations/google-analytics.js"></script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/integrations/hotjar.js"></script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/integrations/linkedin.js"></script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/integrations/hubspot.js"></script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/integrations/unify.js"></script>
```

Then in **Project Settings → Custom Code → Footer Code**:

```html
<!-- ═══ Cookie Consent — FOOTER CODE ═══ -->
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0/consent-ui.js"></script>
<script>
  NuvoConsentUI.init({
    position: 'bottom-right',
    delay: 0,
    showStickyButton: true,
    policyUrl: 'https://www.nuvocargo.com/policies',
    termsUrl: 'https://www.nuvocargo.com/website-terms-and-conditions'
  });

  NuvoGoogleAnalytics.init({
    ga4Ids: ['G-CB83HRM5ZT', 'G-S94DL5K7BS'],
    adsIds: ['AW-362111133', 'AW-11055144811']
  });

  NuvoHotjar.init({ id: 'YOUR_HOTJAR_ID' });
  NuvoLinkedIn.init({ id: '2929228' });
  NuvoHubSpot.init({ portalId: '6484927' });
  NuvoUnify.init({ writeKey: 'YOUR_UNIFY_WRITE_KEY' });
</script>
```

> **Important:** Replace `YOUR_GITHUB_ORG_OR_USER/YOUR_REPO@v1.0.0` with the actual public repo and release tag/commit SHA. You can host for free using:
> - **GitHub repo** + jsDelivr (`https://cdn.jsdelivr.net/gh/your-org/repo@v1.0.0/`)
> - **Cloudflare Pages**
> - **AWS S3 + CloudFront**

### Remove Existing Tracking Scripts

**Critical:** Remove any existing tracking scripts (GA4, Hotjar, LinkedIn, HubSpot) from Webflow's custom code sections. The consent system now manages loading those scripts — having duplicates will cause them to fire without consent.

## API Reference

### NuvoConsent (Core Manager)

```javascript
// Initialize (call once, before anything else)
NuvoConsent.init({ ttlDays: 365 });

// Check if user has interacted with the banner
NuvoConsent.hasInteracted();  // → boolean

// Check consent for a specific category
NuvoConsent.hasConsent('analytics');  // → boolean

// Get all consent values
NuvoConsent.getConsent();  // → { essential: true, analytics: false, ... }

// Set consent programmatically
NuvoConsent.setConsent({
  essential: true,
  personalization: true,
  analytics: true,
  marketing: false
});

// Accept all / Reject all
NuvoConsent.acceptAll();
NuvoConsent.rejectAll();

// Reset (clear consent, show banner again)
NuvoConsent.reset();

// Subscribe to changes
const unsub = NuvoConsent.onChange(function (categories) {
  console.log('Consent changed:', categories);
});
unsub();  // unsubscribe
```

### NuvoConsentUI (Banner/Modal)

```javascript
// Initialize UI (call after NuvoConsent.init())
NuvoConsentUI.init({
  position: 'bottom-right',
  delay: 0,
  showStickyButton: true,
  policyUrl: '/policies',
  termsUrl: '/website-terms-and-conditions'
});

// Programmatically open preferences modal
NuvoConsentUI.showPreferences();
```

### Custom Events

```javascript
// Listen for any consent change
window.addEventListener('nuvo-consent-updated', function (e) {
  console.log(e.detail.categories);  // { essential, personalization, analytics, marketing }
  console.log(e.detail.isInitial);   // true if loaded from localStorage
});

// Listen for a specific category being granted
window.addEventListener('nuvo-consent-granted-analytics', function () {
  // Analytics consent was just granted
});

window.addEventListener('nuvo-consent-granted-marketing', function () {
  // Marketing consent was just granted
});

// Listen for consent reset
window.addEventListener('nuvo-consent-reset', function () {
  // All consent was cleared
});
```

## Migration Guide (Webflow → Own Infrastructure)

When you migrate away from Webflow:

1. **Move files** to your project's `public/` or `assets/` directory
2. **Update paths** from CDN URLs to local paths:
   ```html
   <script src="/assets/js/consent-manager.js"></script>
   ```
3. **Or use ES modules** if you're using a bundler:
   ```javascript
   // Future: can be refactored to ES modules
   import { NuvoConsent } from './consent-manager.js';
   ```
4. **No logic changes needed** — the code is 100% platform-agnostic

## File Structure

```
cookie-consent/
├── consent-manager.js          # Core logic (3KB gzipped)
├── consent-ui.js               # Banner + modal UI (4KB gzipped)
├── consent-styles.css          # All styles (3KB gzipped)
├── integrations/
│   ├── google-analytics.js     # GA4 + Google Ads
│   ├── hotjar.js               # Hotjar
│   ├── linkedin.js             # LinkedIn Insight Tag
│   ├── hubspot.js              # HubSpot
│   └── unify.js                # Unify Intent
├── demo.html                   # Interactive test page
└── README.md                   # This file
```

## Compliance Notes

- **Consent defaults to denied** — No tracking fires before user interaction
- **Essential cookies are always on** — Cannot be toggled off
- **12-month TTL** — Users are re-prompted annually (GDPR recommendation)
- **Google Consent Mode v2** — Proper signals sent for GA4 and Google Ads
- **Consent can be withdrawn** — Sticky button + footer link for re-opening preferences
