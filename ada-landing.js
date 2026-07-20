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

/* Utility-bar marquee (mobile). The four badges don't fit one phone-width row,
   so on mobile the bar scrolls them past. Duplicating the list gives the CSS a
   seamless loop: the track holds two identical copies and slides left by one
   copy's width, so the second copy takes the first's place with no jump. On
   desktop the track is display:contents and the clone is hidden, so the bar
   stays the centred row it always was. */
if (utilityEl) {
  const list = utilityEl.querySelector('ul');
  if (list) {
    const track = document.createElement('div');
    track.className = 'util-track';
    const clone = list.cloneNode(true);
    clone.classList.add('util-clone');
    clone.setAttribute('aria-hidden', 'true'); // the copy is decorative
    list.replaceWith(track);
    track.append(list, clone);
  }
}

/* On mobile the address bar collapsing while you scroll fires resize repeatedly,
   so anything that measures on resize runs far more often than the name suggests.
   Batch those handlers into one call per frame. */
const onResize = (fn) => {
  let queued = false;
  window.addEventListener('resize', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  });
};

if (headerEl) {
  const publishChromeHeights = () => {
    // Measure both first, then write. Setting a custom property on the root
    // invalidates styles, so reading the second offsetHeight after that write
    // would force a synchronous reflow.
    const headerH = headerEl.offsetHeight;
    const utilityH = utilityEl ? utilityEl.offsetHeight : null;
    const root = document.documentElement.style;
    root.setProperty('--header-h', `${headerH}px`);
    if (utilityH !== null) root.setProperty('--utility-h', `${utilityH}px`);
  };
  publishChromeHeights();
  onResize(publishChromeHeights);
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

/* ---------- Defer the S6 background art ----------
   The .why-section backgrounds (222KB mobile / 303KB desktop) sit below the fold
   but were loading during initial paint and starving the hero's background — the
   mobile LCP resource. Load them only as the section nears the viewport. */
const whySection = document.querySelector('.why-section');
if (whySection) {
  if ('IntersectionObserver' in window) {
    const bgObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        whySection.classList.add('bg-in');
        bgObserver.disconnect();
      }
    }, { rootMargin: '400px 0px' });
    bgObserver.observe(whySection);
  } else {
    whySection.classList.add('bg-in');
  }
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
const heroTwoCol = window.matchMedia('(min-width: 1080px)');
const condLinks = document.querySelectorAll('a[href="#hero-form"]');

if (condLinks.length) {
  const heroForm = document.getElementById('hero-form');

  const focusForm = () => {
    const frame = document.querySelector('.wlpquote-here iframe');
    if (frame) frame.focus();
  };

  // Where a CTA should land the visitor.
  //  Desktop (≥1080): the whole hero fits one screen with the form on the right,
  //    so the top of the page already frames the form.
  //  Below that the hero is stacked (copy → form → trust), so scrolling to the
  //    top shows the copy and skips the form. Land on the form card itself,
  //    parked just under the sticky header instead of overshooting to the top.
  const targetScrollY = () => {
    if (heroTwoCol.matches || !heroForm) return 0;
    // The sticky chrome the form has to clear. The header is always sticky; on
    // mobile the utility bar is sticky above it too, so measure whatever is
    // actually stuck rather than assuming a single bar.
    let stickyH = headerEl ? headerEl.offsetHeight : 0;
    if (utilityEl && getComputedStyle(utilityEl).position === 'sticky') {
      stickyH += utilityEl.offsetHeight;
    }
    const y = heroForm.getBoundingClientRect().top + window.scrollY - stickyH - 12;
    return Math.max(0, Math.round(y));
  };

  condLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const y = targetScrollY();

      // Already there (or close enough): no scroll fires, so scrollend never
      // would either — just focus.
      if (Math.abs(y - window.scrollY) < 4) { focusForm(); return; }

      window.scrollTo({ top: y, behavior: reducedMotion.matches ? 'auto' : 'smooth' });

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

  // The clipped image must stay the width of the FRAME, not of its shrinking
  // container, or it squashes instead of being revealed. That width only changes
  // on resize, so it is cached: dragging the handle then writes styles without
  // ever reading layout back, which is what was forcing a reflow per input event.
  let frameW = 0;

  const paint = () => {
    ba.style.setProperty('--ba', range.value + '%');
    clip.style.setProperty('--ba-w', frameW + 'px');
  };

  const measureAndPaint = () => { frameW = ba.clientWidth; paint(); };

  range.addEventListener('input', paint);

  // Set it once up front. Leaving the first measurement to the observer leaves a
  // window where --ba-w is unset and the clipped image renders squashed, and in a
  // background tab that window lasts until the tab is looked at.
  measureAndPaint();

  if ('ResizeObserver' in window) {
    // Better than a resize listener on two counts: the width arrives in the
    // entry, so nothing has to read layout back, and it only fires when the
    // frame itself changes size rather than on every address-bar collapse.
    new ResizeObserver((entries) => {
      frameW = Math.round(entries[0].contentRect.width);
      paint();
    }).observe(ba);
  } else {
    onResize(measureAndPaint);
  }
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
    const media = card.querySelector('.cond-media');
    const img = media && media.querySelector('img');
    if (!img) return;

    const openPhoto = () => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCaption.textContent = card.querySelector('h3').textContent;
      lightbox.showModal();
      // Hold focus on the dialog itself (tabindex="-1"), not the close button:
      // the dialog would otherwise autofocus that button and paint a ring on it.
      lightbox.focus();
      track('cond_photo_open', { condition: card.querySelector('h3').textContent });
    };

    // Pointer: tapping anywhere on the card body opens the photo; the CTA owns
    // its own click and routes to the form instead.
    card.addEventListener('click', (e) => {
      if (e.target.closest('.cond-link')) return;
      openPhoto();
    });

    // The keyboard/AT control is the image, not the whole card. A card is a
    // container with a heading and a link inside it, so role="button" on the
    // <article> is an invalid nesting (a button can't wrap those). The media
    // holds only the <img>, so it's a valid button — and the photo is exactly
    // the thing worth activating.
    media.setAttribute('role', 'button');
    media.tabIndex = 0;
    media.setAttribute('aria-label', 'View photo: ' + card.querySelector('h3').textContent);
    media.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(); }
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
    if (!lastInputWasKeyboard && restored && restored.closest('[data-cond-card]')) {
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
   The copies are generated by tools/extract-legal.js and must be
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

/* ---------- Hero photo gallery (S2, desktop) ----------
   Slide 0 is in the HTML (a <picture> that loads eagerly on desktop and nothing
   on mobile). The other nine are built here on demand, gated on the same >=768
   media query — so mobile loads none of them and desktop never fetches all ten
   at once: each slide loads just before it is shown, and the next one preloads
   during idle so the first fade doesn't stall. */
const heroGallery = document.querySelector('[data-hero-gallery]');
const galleryDesktop = window.matchMedia('(min-width: 768px)');
if (heroGallery) {
  const data = JSON.parse(heroGallery.querySelector('.hero-gallery-slides').textContent);
  const slides = [heroGallery.querySelector('.hero-gallery-slide')]; // index 0 (the <picture>)
  const total = data.length + 1;
  let idx = 0, timer = null, started = false;
  const dots = [];

  const buildSlide = (i) => {
    if (slides[i]) return slides[i];
    const img = document.createElement('img');
    img.className = 'hero-gallery-slide';
    img.alt = data[i - 1].alt;
    img.width = 1400; img.height = 788;
    img.decoding = 'async';
    img.draggable = false;
    img.src = data[i - 1].src;
    heroGallery.appendChild(img); // dots keep their own z-index above the slides
    slides[i] = img;
    return img;
  };

  const paintDots = () => dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));

  const show = (i) => {
    i = (i + total) % total;
    if (i === idx) return;
    const next = buildSlide(i);
    const swap = () => {
      slides[idx].classList.remove('is-active');
      next.classList.add('is-active');
      idx = i;
      paintDots();
    };
    // A freshly built <img> may still be decoding; wait so we never fade to a
    // blank layer. The <picture> first slide is already loaded.
    if (next.tagName === 'PICTURE' || next.complete) swap();
    else next.addEventListener('load', swap, { once: true });
  };

  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const play = () => {
    stop();
    if (reducedMotion.matches) return;
    timer = setInterval(() => { if (!document.hidden) show(idx + 1); }, 4800);
  };

  const start = () => {
    if (started || !galleryDesktop.matches) return;
    started = true;
    const dotWrap = document.createElement('div');
    dotWrap.className = 'hero-gallery-dots';
    for (let i = 0; i < total; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero-gallery-dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', 'Show project photo ' + (i + 1));
      b.addEventListener('click', () => { show(i); play(); });
      dotWrap.appendChild(b);
      dots.push(b);
    }
    heroGallery.appendChild(dotWrap);
    // Preload the next slide so the first transition is instant.
    (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => buildSlide(1));
    play();
    heroGallery.addEventListener('pointerenter', stop);
    heroGallery.addEventListener('pointerleave', play);
  };

  start();
  galleryDesktop.addEventListener('change', start); // resize mobile -> desktop
  reducedMotion.addEventListener('change', () => { reducedMotion.matches ? stop() : (started && play()); });
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (started && play()); });
}

/* ---------- Border glow on the Panda Pledge cards (S6) ----------
   Ported from React Bits <BorderGlow>: the pointer's proximity to the nearest
   edge and its angle around the card centre drive two CSS vars the gradient/glow
   layers read. Desktop pointer only, and not under reduced motion — the CSS layers
   sit inert until this runs, and .edge-light (the outer glow) is injected here, so
   with JS off or on touch the cards stay plain. */
const glowFine = window.matchMedia('(hover: hover) and (pointer: fine)');
if (glowFine.matches && !reducedMotion.matches) {
  document.querySelectorAll('.why-card').forEach((card) => {
    if (!card.querySelector('.edge-light')) {
      const layer = document.createElement('span');
      layer.className = 'edge-light';
      layer.setAttribute('aria-hidden', 'true');
      card.prepend(layer);
    }
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const dx = (e.clientX - r.left) - cx;
      const dy = (e.clientY - r.top) - cy;
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      card.style.setProperty('--cursor-angle', deg.toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

/* ---------- Scrolling browser-tab title ----------
   Marquees the page title in the tab so it advances on its own, rotating one
   character per tick. Off under reduced motion; restores the real title so the
   tab never reads mid-scroll there. */
if (!reducedMotion.matches) {
  const marqueeTitle = document.title + '   •   ';
  let titlePos = 0;
  setInterval(() => {
    titlePos = (titlePos + 1) % marqueeTitle.length;
    document.title = marqueeTitle.slice(titlePos) + marqueeTitle.slice(0, titlePos);
  }, 280);
}
