/* ============================================================
   WLP — ADA Accessibility Upgrades · SEM landing
   Both forms are loader-driven iframes from the WLP form library, so this
   file owns no form logic at all: the loader validates, captures attribution
   (utm/gclid/first-touch), auto-sizes the frame and redirects to the
   server-chosen thank-you. What is left here is view/click tracking, the
   sticky-header behaviour, the seal, and the in-page CTAs.
   ============================================================ */

/* ---------- Tracking ---------- */
window.dataLayer = window.dataLayer || [];
const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

/* ---------- View events ----------
   Anchored on the wrappers, never on .wlpquote-here itself, which the loader
   replaces with the iframe. Start/submit belong to the loader — re-firing them
   here would double-count the Google Ads conversion. */
if ('IntersectionObserver' in window) {
  const viewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      track(entry.target.dataset.trackView);
      viewObserver.unobserve(entry.target); // fire once
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('[data-track-view]').forEach((el) => viewObserver.observe(el));
}

/* ---------- Holographic warranty seal ----------
   Desktop pointer only: the tilt and the glare are both derived from where the
   cursor sits on the seal, so there is nothing to drive them on touch. The CSS
   holds a static iridescence on its own, which is what mobile and
   reduced-motion users get. */
const seal = document.querySelector('.warranty-seal');
const sealDesktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1080px)');
const sealStill = window.matchMedia('(prefers-reduced-motion: reduce)');

if (seal && sealDesktop.matches && !sealStill.matches) {
  const MAX_TILT = 12; // degrees at the edge

  const reset = () => {
    seal.classList.remove('is-tracking');
    seal.style.setProperty('--px', '50%');
    seal.style.setProperty('--py', '50%');
    seal.style.setProperty('--tilt-x', '0deg');
    seal.style.setProperty('--tilt-y', '0deg');
  };

  seal.addEventListener('pointermove', (e) => {
    const r = seal.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;   // 0..1
    const y = (e.clientY - r.top) / r.height;
    seal.classList.add('is-tracking');
    seal.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
    seal.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
    // Tilt away from the cursor: top of the seal leans back as you move up.
    seal.style.setProperty('--tilt-x', `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
    seal.style.setProperty('--tilt-y', `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
  });

  // Drop .is-tracking first so the transform eases back instead of snapping.
  seal.addEventListener('pointerleave', reset);
}

/* ---------- Header CTA reveal ----------
   While the hero form is on screen the header CTA would only scroll to a form
   the visitor is already looking at, so it stays collapsed until the form has
   moved up past the sticky header. */
const headerEl = document.querySelector('.site-header');
const heroCard = document.getElementById('hero-form');

/* Publish the measured chrome heights:
   --header-h  lets the sticky trust strip park flush beneath the header.
   --utility-h lets the hero fill exactly the leftover first screen, so the
               trust strip stays below the fold until the visitor scrolls.
   Both are re-read on resize — the header shrinks with the logo under 560,
   and the utility bar rewraps to 2 rows under 900. */
const utilityEl = document.querySelector('.utility-bar');
if (headerEl) {
  const publishChromeHeights = () => {
    const root = document.documentElement.style;
    root.setProperty('--header-h', `${headerEl.offsetHeight}px`);
    if (utilityEl) root.setProperty('--utility-h', `${utilityEl.offsetHeight}px`);
  };
  publishChromeHeights();
  window.addEventListener('resize', publishChromeHeights);
}

if (headerEl && heroCard && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(([entry]) => {
    // Only "scrolled past" counts — the form sitting below the fold must not
    // trigger the CTA on first paint.
    const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    headerEl.classList.toggle('show-cta', scrolledPast);
  }, { rootMargin: `-${headerEl.offsetHeight}px 0px 0px 0px`, threshold: 0 });
  revealObserver.observe(heroCard);
}

/* ---------- Click to call ---------- */
document.querySelectorAll('[data-track-call]').forEach((link) => {
  link.addEventListener('click', () => {
    // Not `location` — that shadows window.location inside this handler.
    const placement = link.dataset.trackCall;
    track('click_to_call', { link_location: placement });
    track('wlp_sem_phone_click', { link_location: placement }); // documented SEM key event
    // The sticky bar is call-only now, so this event no longer needs an
    // action param to say which of its two buttons was hit.
    if (placement === 'sticky') track('sticky_mobile_cta', { action: 'call' });
  });
});

// The pledge seal scrolling into view is the closest signal we have that the
// warranty offer was actually seen. (There is no warranty_terms_open event any
// more — the terms accordion went away with the pledge card.)
const pledge = document.getElementById('panda-pledge');
if (pledge && 'IntersectionObserver' in window) {
  const pledgeObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      track('panda_pledge_open');
      pledgeObserver.disconnect();
    }
  }, { threshold: 0.5 });
  pledgeObserver.observe(pledge);
}

/* ---------- Every in-page CTA that routes to the form ----------
   Selected by destination rather than by class, so the header button, the S4
   planning card, the six S5 condition cards, the S7 button and the mobile
   sticky bar all behave identically and a new one needs no wiring.
   They send the visitor back up to the whole hero and hand the keyboard to
   the form.
   It stops at focusing the iframe, not its first field: the form is a
   cross-origin iframe, so the browser forbids reaching inside it, and the
   loader is receive-only — it never accepts a message from the host page.
   Putting the caret in Name needs quote.welovepaving.com to listen for a
   focus message on its side; there is no way to force it from here.
   The href stays a real anchor, so with JS off the link still lands. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const condLinks = document.querySelectorAll('a[href="#hero-form"]');

if (condLinks.length) {
  const focusForm = () => {
    const frame = document.querySelector('.wlpquote-here iframe');
    if (frame) frame.focus();
  };

  condLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Already at the top: no scroll will happen, so scrollend never fires.
      if (window.scrollY === 0) { focusForm(); return; }

      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });

      // Focus only once the scroll settles — focusing mid-flight cancels it.
      if ('onscrollend' in window && !reducedMotion.matches) {
        window.addEventListener('scrollend', focusForm, { once: true });
      } else {
        setTimeout(focusForm, reducedMotion.matches ? 0 : 650);
      }
    });
  });
}

/* ---------- Video testimonial (S8) ----------
   Self-hosted, so there is no player to build. The cover only handles the
   first click: it turns the native controls on and hands playback to the
   browser, which already does scrubbing, volume, fullscreen and captions
   better than anything worth writing here. */
const videoWrap = document.querySelector('[data-video]');
const video = videoWrap && videoWrap.querySelector('.video-local');
const videoCover = videoWrap && videoWrap.querySelector('.video-cover');
if (video && videoCover) {
  videoCover.addEventListener('click', async () => {
    video.controls = true;
    videoWrap.classList.add('is-playing');
    video.focus(); // the cover is about to vanish — don't strand the keyboard
    try {
      await video.play();
    } catch (err) {
      // play() rejects on an unloadable source or a blocked gesture. The cover
      // is already gone by then, so put it back rather than leaving a dead
      // player the visitor can't retry.
      videoWrap.classList.remove('is-playing');
      video.controls = false;
      videoCover.focus();
    }
  });

  video.addEventListener('play', () => {
    videoWrap.classList.add('is-playing');
    if (video.dataset.tracked) return;
    video.dataset.tracked = '1'; // once per page, not on every unpause
    track('video_testimonial_play', { video: 'doctor-medical-office' });
  });
}

/* ---------- Before/after wipe (S8) ----------
   The range input is the source of truth: it carries the value, the keyboard
   support and the AT semantics. This only mirrors it into the CSS vars the
   clip and the divider read. */
const ba = document.querySelector('[data-ba]');
if (ba) {
  const range = ba.querySelector('.ba-range');
  const clip = ba.querySelector('.ba-after-clip');

  const paint = () => {
    const pct = range.value;
    ba.style.setProperty('--ba', pct + '%');
    // The clipped image must stay the width of the FRAME, not of its shrinking
    // container, or it squashes instead of being revealed.
    clip.style.setProperty('--ba-w', ba.clientWidth + 'px');
  };

  range.addEventListener('input', paint);
  window.addEventListener('resize', paint);
  paint();
}

/* ---------- Input modality ----------
   Whether the last interaction came from a pointer (tap/click) or the keyboard.
   A native <dialog> moves focus programmatically — onto its first control when
   it opens, back onto the invoker when it closes — and the browser treats that
   restore as keyboard-like, so :focus-visible lights up a blue ring on a card
   the user only tapped. We use this flag to drop that ring for pointer users
   while keeping it for keyboard users, who need it. */
let lastInputWasKeyboard = false;
document.addEventListener('pointerdown', () => { lastInputWasKeyboard = false; }, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') lastInputWasKeyboard = true;
}, true);

/* ---------- Condition photo lightbox (S5) ----------
   The card body opens the photo; the button keeps routing to the form. */
const lightbox = document.getElementById('condLightbox');
if (lightbox && typeof lightbox.showModal === 'function') {
  const lbImg = document.getElementById('lightboxImg');
  const lbCaption = document.getElementById('lightboxCaption');

  document.querySelectorAll('[data-cond-card]').forEach((card) => {
    const img = card.querySelector('.cond-media img');
    if (!img) return;

    card.addEventListener('click', (e) => {
      // The CTA owns its own click — it goes to the form, not the photo.
      if (e.target.closest('.cond-link')) return;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCaption.textContent = card.querySelector('h3').textContent;
      lightbox.showModal();
      // Hold focus on the dialog itself (tabindex="-1"), not the close button:
      // the dialog would otherwise autofocus that button and paint a ring on it.
      lightbox.focus();
      track('cond_photo_open', { condition: card.querySelector('h3').textContent });
    });

    // Keyboard parity: the card is a real control, so it needs a tab stop and
    // the usual activation keys.
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'View photo: ' + card.querySelector('h3').textContent);
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  // Click on the backdrop = click on the dialog itself, never on its contents.
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('close', () => {
    lbImg.src = ''; // drop the src so a reopen can't flash the previous photo
    // The dialog restores focus to the card that opened it. Keep the ring for
    // keyboard users; strip it for a tap, where a lingering blue border just
    // reads as a stuck selection.
    const restored = document.activeElement;
    if (!lastInputWasKeyboard && restored && restored.hasAttribute('data-cond-card')) {
      restored.blur();
    }
  });
}

/* ---------- Legal modals (S11) ----------
   Reads a flattened copy of each document from legal/, not the live page.
   Fetching welovepaving.com directly fails twice over: it is cross-origin
   anywhere but production, and those pages are GenerateBlocks builds whose text
   lives inside collapsed .gb-accordion__content — injected here, stripped of
   GB's own JS, they would render as headings that open nothing.
   The copies are generated by scratchpad/extract-legal.js and must be
   regenerated when Legal edits a page. Any failure falls back to the real link,
   which was never removed from the href. */
const legalModal = document.getElementById('legalModal');
if (legalModal && typeof legalModal.showModal === 'function') {
  const legalTitle = document.getElementById('legalTitle');
  const legalBody = document.getElementById('legalBody');

  const legalCache = new Map();

  const showFallback = (href) => {
    legalBody.innerHTML =
      '<p>This document could not be loaded here. ' +
      '<a href="' + href + '" target="_blank" rel="noopener">Open it in a new tab</a>.</p>';
  };

  const render = (html) => {
    legalBody.innerHTML = html;
    legalBody.scrollTop = 0;
    legalBody.focus();
  };

  document.querySelectorAll('[data-legal]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const src = link.dataset.legalSrc;
      legalTitle.textContent = link.dataset.legal;
      legalModal.showModal();
      track('legal_open', { document: link.dataset.legal });

      // Reopening a document shouldn't flash a loading state at a cached hit.
      if (legalCache.has(src)) { render(legalCache.get(src)); return; }
      legalBody.innerHTML = '<p class="legal-loading">Loading…</p>';

      try {
        if (!src) throw new Error('no data-legal-src');
        const res = await fetch(src);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        // Pre-flattened, but still untrusted markup as far as this page is
        // concerned — strip anything executable before it reaches the DOM.
        doc.body.querySelectorAll('script, style, link, iframe, form, noscript, object, embed')
          .forEach((el) => el.remove());
        if (!doc.body.textContent.trim()) throw new Error('empty document');
        // Guard against a stale response landing after the user moved on.
        if (legalTitle.textContent !== link.dataset.legal) return;
        legalCache.set(src, doc.body.innerHTML);
        render(doc.body.innerHTML);
      } catch (err) {
        showFallback(link.href);
      }
    });
  });

  legalModal.querySelector('.legal-close').addEventListener('click', () => legalModal.close());
  legalModal.addEventListener('click', (e) => { if (e.target === legalModal) legalModal.close(); });
  legalModal.addEventListener('close', () => { legalBody.innerHTML = ''; });
}

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
    if (!open) track('faq_open', { faq_question: btn.textContent.trim() });
  });
});
