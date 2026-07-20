# We Love Paving — ADA Accessibility Upgrades (SEM landing)

Standalone, static SEM landing page for We Love Paving's ADA accessibility
upgrade service (Northern California commercial properties). Deployed on its own
so the team can review it without touching the main site prototype.

Extracted from `welovepaving-prototype` and moved to the repo root: the page that
lived at `/lp/ada-accessibility-upgrades/` now serves at `/`, with its `images/`
and `video/` assets alongside it. Nothing about the page itself changed — only
the `../../images/` asset prefixes were rewritten to `images/`.

## Structure

```
index.html          the landing (11 sections)
ada-landing.css      self-contained styles, no build step
ada-landing.js       tracking, sticky header, lightbox, before/after, legal modals
legal/               flattened copies of the 3 legal pages, opened in modals
images/  video/      only the assets this page references
tools/               build-time only (excluded from deploy via .vercelignore)
```

## Running locally

Any static server from the repo root:

```
npx serve .
```

Note: the two lead forms are cross-origin iframes from `quote.welovepaving.com`,
whose CSP only allows `welovepaving` domains and `*.vercel.app`. On `localhost`
they render blank — this is expected, not a bug. They render correctly once
deployed to Vercel.

## Notable decisions

- **`noindex`**: this is a paid-traffic landing. The `<meta name="robots">` tag
  keeps it out of search so it can't cannibalize the main site's ADA pages. The
  `canonical` still points to `welovepaving.com/lp/ada-accessibility-upgrades/`,
  the page's eventual production home — not this preview.
- **Forms**: loader-driven iframes from the WLP form library. The loader owns
  validation, attribution (utm/gclid/first-touch) and the thank-you redirect.
  The `sem_*` form_source is what fires the Google Ads conversion.
- **Legal modals**: the live legal pages are GenerateBlocks builds whose text
  sits inside collapsed accordions, so they can't be fetched and injected as-is.
  `tools/extract-legal.js` flattens them into `legal/`; see `tools/README.md`.
- **Hero photo**: wrapped in `<picture>` so mobile (where it is `display:none`)
  never downloads the 118KB it doesn't show.
- **Security headers** (`vercel.json`): `nosniff`, a strict-origin referrer
  policy, `SAMEORIGIN` framing, a `Permissions-Policy` that turns off features
  the page never uses, and HSTS. `SAMEORIGIN` rather than `DENY` because this
  page is destined to be rebuilt inside WordPress and may need to be previewed
  in a frame; it still blocks third-party clickjacking. HSTS is set without
  `includeSubDomains` on purpose — the eventual home shares a domain with
  `quote.welovepaving.com`, and forcing that subtree is not this repo's call.
  A full `Content-Security-Policy` is **not** set: the page loads Google Fonts
  and a cross-origin form iframe, so a CSP needs to be written and tested
  against those before it can be enforced without breaking the lead forms.

Destined for WordPress (GeneratePress/GenerateBlocks); this repo is the review
prototype, not the production home.
