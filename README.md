# We Love Paving · ADA Accessibility Upgrades (SEM landing)

Standalone, static SEM landing page for We Love Paving's ADA accessibility
upgrade service (Northern California commercial properties).

**This is the production repo.** The landing ships exactly as it is here, with
this code. It is not rebuilt in a page builder: the HTML, CSS and JS in this repo
are what goes live. Deployment goes through WordPress, but the page is not
reconstructed with GeneratePress or GenerateBlocks.

It lives in its own repo, separate from the main site, so it can be published and
updated without touching anything else.

## Structure

```
index.html          the landing (11 sections)
ada-landing.css     self-contained styles, no build step
ada-landing.js      tracking, sticky header, lightbox, before/after, legal modals
legal/              flattened copies of the 3 legal pages, opened in modals
images/  video/     only the assets this page references
tools/              build-time only (excluded from deploy via .vercelignore)
vercel.json         security headers (see the caveat below)
```

No build, no dependencies: it is served as-is.

## Running locally

Any static server from the repo root:

```
npx serve .
```

Note: both lead forms are cross-origin iframes from `quote.welovepaving.com`,
whose CSP only allows `welovepaving` domains and `*.vercel.app`. On `localhost`
they render blank. **This is expected, not a bug**: they load correctly once
deployed to a welovepaving domain.

## Where this actually gets deployed

Production is `welovepaving.com/lp/<slug>/`, alongside the other landings
(`/lp/parking-lot-striping/`, `/lp/concrete-services/`, and so on). That stack is
**WordPress on Pressidium behind Cloudflare**, with Rank Math handling SEO. Two
consequences worth knowing before handoff:

- **`vercel.json` is never read there.** It is only honoured if the page is
  served from Vercel. On the real host the headers have to be set at Cloudflare
  or the origin (see below).
- **Rank Math owns `robots` and `canonical`.** It generates its own tags, so the
  ones in this `index.html` can be overridden or duplicated. The `noindex` has to
  be configured **in Rank Math for that page**; do not rely on our markup alone.
  The other landings use `nofollow, noindex, noimageindex`, so match that.

The forms need no changes: `welovepaving.com` is already allowed by their CSP.

## Security

### Headers

`vercel.json` sets five headers for preview deploys:

| Header | What it does |
|---|---|
| `X-Content-Type-Options: nosniff` | Stops the browser guessing a file's type and executing something that is not a script as one. |
| `Referrer-Policy: strict-origin-when-cross-origin` | On outbound clicks only the origin is sent, not the full URL with its campaign parameters. |
| `X-Frame-Options: SAMEORIGIN` | Stops a third party putting the page in an iframe to harvest clicks (clickjacking). |
| `Permissions-Policy` | Turns off camera, microphone, geolocation, payments and USB. The page never uses them, so they are denied up front. |
| `Strict-Transport-Security` | Forces HTTPS on later visits. |

Two deliberate choices: `SAMEORIGIN` rather than `DENY`, so a same-domain
WordPress template or preview can still frame the page while third parties stay
blocked; and HSTS without `includeSubDomains`, because the production domain is
shared with `quote.welovepaving.com` and forcing that whole subtree is not this
repo's call.

### What production is actually missing

Checked against the live headers on `welovepaving.com/lp/`:

| Header | Status in production |
|---|---|
| `X-Content-Type-Options` | already set site-wide |
| `Strict-Transport-Security` | already set site-wide (180 days) |
| `Referrer-Policy` | **missing** |
| `X-Frame-Options` | **missing**, so there is no clickjacking protection |
| `Permissions-Policy` | one exists, but only for Cloudflare/reCAPTCHA tokens; it does not disable device features |

These are missing **site-wide, not just on this landing**, so the efficient fix
is a single Cloudflare Transform Rule covering every `/lp/` page rather than
patching one repo.

Only one of the three can be fixed from the page itself, and it already is:
`<meta name="referrer">` is in the `<head>`. `X-Frame-Options` and
`Permissions-Policy` have no working `<meta>` equivalent (a meta-delivered CSP
ignores `frame-ancestors` by specification), so they can only come from the
server or CDN. A JavaScript frame-buster is **not** a substitute: a sandboxed
iframe defeats it, which buys the appearance of protection without the protection.

**None of this is required for the page to work.** These are defence-in-depth
layers; nothing breaks without them. Realistic exposure is low: modern browsers
already default to `strict-origin-when-cross-origin`, and the page never requests
camera, microphone or location. `X-Frame-Options` is the one with a real, if
small, gap.

### CSP: deliberately not set

There is **no** `Content-Security-Policy` yet, and that is a decision rather than
an oversight. The page loads Google Fonts and a cross-origin form iframe, so a
CSP has to be written and tested against those origins first. **A wrong CSP
breaks the forms silently**: the page still looks fine while leads quietly stop
arriving.

When it is written it must allow at least `quote.welovepaving.com` (frame),
`fonts.googleapis.com` and `fonts.gstatic.com`. Start it in `Report-Only` and
confirm an end-to-end test submission before enforcing it.

### What was audited

Reviewed across the working tree and the full git history:

- **No credentials**: no API keys, tokens, private keys or passwords, in current
  files or in earlier commits.
- **No personal data**: the only contacts are public and corporate
  (`contact@welovepaving.com` and the campaign phone number).
- **No local paths** or machine usernames.
- **No debug output** in what ships. The `console.log` calls live in `tools/`,
  which is excluded from deploy.
- **XSS**: every `innerHTML` write takes data that is hardcoded in this repo
  (`data-legal-src`, `href`), fetched same-origin. None of it comes from user
  input.
- **Outbound links**: all `target="_blank"` links carry `rel="noopener"`, so the
  destination tab cannot manipulate ours.

**External origins** (all necessary): `welovepaving.com`,
`quote.welovepaving.com` (forms), Google Fonts, and a link to the public warranty
PDF hosted on Elfsight. That last one is a link, not a third-party script loaded
into the page.

### Repo guards

`.gitignore` blocks `.env*`, `*.local`, `*.pem` and `*.key` so a secret cannot be
committed by accident. `tools/` is kept out of the deploy via `.vercelignore`.

## Decisions worth knowing

- **`noindex`**: this is a paid-traffic landing, kept out of search so it cannot
  cannibalise the main site's ADA pages. The `canonical` points at
  `welovepaving.com/lp/ada-accessibility-upgrades/`. **If organic traffic is ever
  expected, the `noindex` has to be removed deliberately**, and remember Rank
  Math, not this file, is what production will honour.
- **No way out**: this is a paid-traffic landing with no navigation by design.
  The header logo is **not** a link, on purpose, so a visitor cannot bounce to
  the main site. The only exits are the phone, the form and the legal modals
  (which are intercepted by JS and opened in place; their `href` is only a
  fallback if JS fails). Do not turn the logo back into a link.
- **Forms**: loader-injected iframes from the WLP form library. The loader owns
  validation, attribution (utm/gclid/first-touch) and the thank-you redirect. The
  `sem_*` `form_source` prefix is what fires the Google Ads conversion; do not
  change it.
- **Legal modals**: the live legal pages are GenerateBlocks builds whose copy
  sits inside collapsed accordions, so they cannot be fetched and injected as-is.
  `tools/extract-legal.js` flattens them into `legal/`; see `tools/README.md`.
  **When Legal edits a page these copies must be regenerated**, they do not
  update themselves.
- **Hero photo**: wrapped in `<picture>` so mobile, where it is `display:none`,
  never downloads the 118KB it does not show.

## Before publishing

1. Confirm the `noindex` decision, and set it in Rank Math for the page.
2. Verify the forms load and submit on the final domain (they are always blank on
   `localhost`).
3. Add the three missing headers at Cloudflare, ideally for the whole `/lp/` path
   rather than this page alone.
4. Check the `legal/` copies still match what Legal has published.
