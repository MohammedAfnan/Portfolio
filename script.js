/* ============================================================
   Mohammed Afnan — case-file portfolio
   GSAP + ScrollTrigger choreography.

   Three modes, chosen with gsap.matchMedia:
     desktop  (min-width 901px, motion allowed)  pinned openers, pinned spine,
                                                  gist punch-ins, parallax
     mobile   (max-width 900px)                  sequential reveals, no pins
     reduced  (prefers-reduced-motion)           cross-fades only, no scrub
   ============================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  var body = document.body;

  /* If GSAP failed to load, fall back to a static page. */
  if (!window.gsap || !window.ScrollTrigger) {
    html.classList.remove('js');
    initSlider();
    initCompareTables();
    initLightbox();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var INK = '#1c1a17', ACCENT = '#a4441c', PAPER = '#faf6f0';
  var BAR_H = 52;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skimming = false;

  initSlider();
  initCompareTables();
  initLightbox();
  initBar();
  initAnchors();
  initProgress();
  initHero();
  initSkim();

  /* --------------------------------------------------------------
     Responsive / motion contexts
     -------------------------------------------------------------- */
  var mm;
  function setupMotion() {
    mm = gsap.matchMedia();
    mm.add({
      desktop: '(min-width: 901px)',
      mobile: '(max-width: 900px)',
      motion: '(prefers-reduced-motion: no-preference)',
      still: '(prefers-reduced-motion: reduce)'
    }, function (ctx) {
      var c = ctx.conditions;
      body.classList.toggle('mobile', c.mobile);

      var chapters = gsap.utils.toArray('.chapter');
      if (c.desktop) moveGistsToSpine(true);

      chapters.forEach(function (chapter) {
        initOpener(chapter, c);
        initDossier(chapter, c);
      });

      if (c.desktop && c.motion) initParallax();
      initReveals(c);
      initNavAndTicks();
      initCounters();
      initClosing();

      return function cleanup() {
        moveGistsToSpine(false);
        body.classList.remove('mobile');
      };
    });
  }
  setupMotion();

  /* An element already on screen (or above it) must never be hidden for a
     reveal that may not fire; only things below the fold get staged. */
  function belowFold(el, ratio) {
    return el.getBoundingClientRect().top > window.innerHeight * (ratio || .95);
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* --------------------------------------------------------------
     Gists live inside their beat in the HTML. On desktop they move into
     the pinned spine so they can punch on as the beat arrives.
     -------------------------------------------------------------- */
  function moveGistsToSpine(toSpine) {
    gsap.utils.toArray('.chapter').forEach(function (chapter) {
      var stage = chapter.querySelector('.gist-stage');
      if (toSpine) {
        chapter.querySelectorAll('.beat .gists').forEach(function (g) {
          ensureSkimLabel(g);
          stage.appendChild(g);
        });
      } else {
        chapter.querySelectorAll('.gist-stage .gists').forEach(function (g) {
          var beat = chapter.querySelector('.beat[data-beat="' + g.dataset.beat + '"]');
          if (beat) beat.insertBefore(g, beat.firstChild);
          g.classList.remove('active');
          gsap.set(g, { clearProps: 'all' });
        });
      }
    });
    /* mobile also wants the skim label available */
    document.querySelectorAll('.gists').forEach(ensureSkimLabel);
  }

  function ensureSkimLabel(g) {
    if (g.querySelector('.skim-label')) return;
    var l = document.createElement('p');
    l.className = 'skim-label';
    l.textContent = g.dataset.label || '';
    g.insertBefore(l, g.firstChild);
  }

  /* --------------------------------------------------------------
     In-page links: smooth scroll (CSS scroll-behavior is off on purpose)
     -------------------------------------------------------------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var el = id ? document.getElementById(id) : document.body;
        if (!el) return;
        e.preventDefault();
        var top = id ? el.getBoundingClientRect().top + window.scrollY - BAR_H : 0;
        window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        history.replaceState(null, '', id ? '#' + id : ' ');
      });
    });
  }

  /* --------------------------------------------------------------
     Top bar: hairline once scrolled
     -------------------------------------------------------------- */
  function initBar() {
    var bar = document.getElementById('bar');
    ScrollTrigger.create({
      id: 'bar', start: 40, end: 'max',
      onToggle: function (self) { bar.classList.toggle('scrolled', self.isActive); }
    });
  }

  /* --------------------------------------------------------------
     Reading progress: bar + readout, 0 → 100 across the whole page
     -------------------------------------------------------------- */
  function initProgress() {
    var bar = document.querySelector('#progress b');
    var readout = document.getElementById('readout');
    var closingReadout = document.getElementById('closing-readout');
    var last = -1;
    ScrollTrigger.create({
      id: 'progress', start: 0, end: 'max',
      onUpdate: function (self) {
        var pc = Math.round(self.progress * 100);
        if (pc === last) return;
        last = pc;
        bar.style.width = pc + '%';
        readout.textContent = 'read ' + pc + '%';
        if (closingReadout) closingReadout.textContent = 'read ' + pc + '%';
        if (pc >= 98) document.querySelectorAll('.toc li').forEach(function (li) { li.classList.add('done'); });
      }
    });
  }

  /* --------------------------------------------------------------
     Hero: one orchestrated load sequence, then a slow parallax drift
     -------------------------------------------------------------- */
  function initHero() {
    var lines = gsap.utils.toArray('.hero-name .line > span');
    var kicker = document.querySelector('.hero-kicker');
    var row = document.querySelector('.hero-row');

    var name = document.querySelector('.hero-name');
    var run = function () {
      if (reduced) {
        gsap.to([name, kicker, row], { opacity: 1, duration: .6, stagger: .1 });
        return;
      }
      gsap.set(lines, { yPercent: 110 });
      gsap.set(name, { opacity: 1 });
      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(lines, { yPercent: 0, duration: 1.4, stagger: .14 }, .1)
        .to(kicker, { opacity: 1, duration: .8 }, .5)
        .fromTo(row, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, .9);
    };

    /* wait for the display face so the reveal happens in the right font */
    var started = false;
    var start = function () { if (!started) { started = true; run(); } };
    /* fonts are same-origin and preloaded, so this normally resolves within
       a frame or two; the timer is only a safety net */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    setTimeout(start, 350);

    if (reduced) return;
    gsap.to('.hero-inner', {
      yPercent: -12, opacity: .35, ease: 'none',
      scrollTrigger: { trigger: '.hero-inner', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* --------------------------------------------------------------
     Chapter opener: full-bleed accent card, pinned; the title punches
     in word by word, then paper wipes up from the bottom and the type
     turns to ink. Mobile / reduced-motion: a single reveal, no pin.
     -------------------------------------------------------------- */
  function initOpener(chapter, c) {
    var opener = chapter.querySelector('.opener');
    var pin = chapter.querySelector('.opener-pin');
    var content = chapter.querySelector('.opener-content');
    var num = chapter.querySelector('.file-num');
    var word = chapter.querySelector('.file-word');
    var subject = chapter.querySelector('.opener-subject');
    var title = chapter.querySelector('.opener-title');
    var meta = chapter.querySelector('.opener-meta');
    var dts = chapter.querySelectorAll('.opener-meta dt');
    var wipe = chapter.querySelector('.wipe-paper');

    if (c.still) {
      if (belowFold(opener, .7)) {
        gsap.from(content, { opacity: 0, duration: .8, scrollTrigger: { trigger: opener, start: 'top 70%', once: true } });
      }
      return;
    }

    var words = splitWords(title);

    if (c.mobile) {
      gsap.set(wipe, { display: 'none' });
      if (!belowFold(opener, .65)) return;
      var tlm = gsap.timeline({ scrollTrigger: { trigger: opener, start: 'top 65%', once: true } });
      tlm.from(num, { yPercent: 40, opacity: 0, duration: 1, ease: 'expo.out' })
        .from([word, subject], { opacity: 0, duration: .5 }, '<.2')
        .from(words, { yPercent: 110, duration: .9, stagger: .025, ease: 'expo.out' }, '<')
        .from(meta, { opacity: 0, y: 14, duration: .6 }, '-=.4');
      return;
    }

    /* desktop: the file number rides in with the accent block as it enters... */
    gsap.fromTo(num, { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none',
      scrollTrigger: { id: 'entry', trigger: pin, start: 'top bottom', end: 'top top', scrub: true } });
    gsap.fromTo([word, subject], { opacity: 0 }, { opacity: 1, ease: 'none',
      scrollTrigger: { id: 'entry', trigger: pin, start: 'top 40%', end: 'top top', scrub: true } });

    /* ...then the card pins and the title, meta and paper wipe scrub through */
    var tl = gsap.timeline({
      scrollTrigger: {
        id: 'pin', trigger: pin, start: 'top top', end: '+=170%',
        pin: true, scrub: .8, anticipatePin: 1
      }
    });
    tl.from(words, { yPercent: 110, duration: 1, stagger: .035, ease: 'power3.out' })
      /* the meta arrives with the title, not after it, so it is never left
         half-faded on the rust card while the reader scrolls */
      .from(meta, { opacity: 0, y: 20, duration: .35 }, '<.25')
      .to({}, { duration: .9 })                                  /* hold on accent */
      .to(wipe, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.inOut' })
      .to(content, { color: INK, duration: .5 }, '-=.9')
      .to([subject].concat(Array.prototype.slice.call(dts)), { color: ACCENT, opacity: 1, duration: .5 }, '<')
      .to(chapter.querySelectorAll('.opener-meta dd'), { color: INK, duration: .5 }, '<')
      .to({}, { duration: .5 });                                 /* settle before unpin */
  }

  function splitWords(el) {
    if (el.dataset.split) return gsap.utils.toArray(el.querySelectorAll('.w > span'));
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span'); outer.className = 'w';
      var inner = document.createElement('span'); inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = '1';
    return gsap.utils.toArray(el.querySelectorAll('.w > span'));
  }

  /* --------------------------------------------------------------
     Dossier: as each beat scrolls through on the right, the spine on the
     left swaps in that beat's gist lines at full typographic scale.
     -------------------------------------------------------------- */
  function initDossier(chapter, c) {
    var beats = gsap.utils.toArray(chapter.querySelectorAll('.beat'));
    var navItems = chapter.querySelectorAll('.beat-nav li');
    var stage = chapter.querySelector('.gist-stage');
    var current = null;

    function setNav(n) {
      navItems.forEach(function (li) {
        var i = +li.dataset.beat;
        li.classList.toggle('active', i === n);
        li.classList.toggle('done', i < n);
      });
    }

    function show(n) {
      setNav(n);
      if (!c.desktop) return;
      var target = stage.querySelector('.gists[data-beat="' + n + '"]');
      if (!target || (target === current && target.classList.contains('active'))) return;
      var prev = current;
      current = target;

      if (prev) {
        gsap.killTweensOf([prev, prev.querySelectorAll('.gist')]);
        if (c.still) {
          gsap.to(prev, { opacity: 0, duration: .3, onComplete: function () { prev.classList.remove('active'); } });
        } else {
          gsap.to(prev, { opacity: 0, y: -28, duration: .32, ease: 'power2.in',
            onComplete: function () { prev.classList.remove('active'); } });
        }
      }

      target.classList.add('active');
      var gists = target.querySelectorAll('.gist');
      gsap.killTweensOf([target, gists]);
      if (c.still) {
        gsap.fromTo(target, { opacity: 0, y: 0 }, { opacity: 1, duration: .5, delay: prev ? .2 : 0 });
        gsap.set(gists, { clearProps: 'all' });
        return;
      }
      var d = prev ? .18 : 0;
      gsap.fromTo(target, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out', delay: d });
      gsap.fromTo(gists,
        { y: 34, opacity: 0, scale: 1.14, transformOrigin: '0% 100%' },
        { y: 0, opacity: 1, scale: 1, duration: .9, stagger: .13, ease: 'expo.out', delay: d });
    }

    function clear() {
      setNav(0);
      if (!current) return;
      var prev = current; current = null;
      gsap.killTweensOf([prev, prev.querySelectorAll('.gist')]);
      gsap.to(prev, { opacity: 0, y: 20, duration: .3, onComplete: function () { prev.classList.remove('active'); } });
    }

    beats.forEach(function (beat, i) {
      var n = i + 1;
      ScrollTrigger.create({
        id: 'beat', trigger: beat, start: 'top 58%', end: 'bottom 58%',
        onEnter: function () { show(n); },
        onEnterBack: function () { show(n); },
        onLeaveBack: function () { if (n === 1) clear(); },
        onLeave: function () { if (n === beats.length) setNav(n + 1); }
      });
    });
  }

  /* --------------------------------------------------------------
     Evidence images: layered parallax inside their frames
     -------------------------------------------------------------- */
  function initParallax() {
    /* the whole figure drifts a few pixels; nothing inside the frame is
       scaled or cropped, so every screenshot stays fully visible */
    gsap.utils.toArray('.evidence').forEach(function (fig) {
      var depth = +(fig.dataset.depth || 0);
      var amt = 14 + depth * 4;
      gsap.fromTo(fig, { y: amt }, { y: -amt, ease: 'none',
        scrollTrigger: { id: 'plx', trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* --------------------------------------------------------------
     Staggered reveals for the beat content (and compare rows).
     Reduced motion: opacity only.
     -------------------------------------------------------------- */
  function initReveals(c) {
    var items = [];
    document.querySelectorAll('.beat-body').forEach(function (b) {
      Array.prototype.forEach.call(b.children, function (el) {
        if (el.classList.contains('compare')) {
          items = items.concat(gsap.utils.toArray(el.querySelectorAll('.compare-row')));
        } else if (el.classList.contains('screens')) {
          items = items.concat(gsap.utils.toArray(el.children));
        } else {
          items.push(el);
        }
      });
    });
    items = items.concat(gsap.utils.toArray('.hero-approach > *, .hero-contents > *, .about > *'));
    if (c.mobile) items = items.concat(gsap.utils.toArray('.beats .gists'));

    items = items.filter(function (el) { return belowFold(el, .9); });
    if (!items.length) return;
    var fromVars = c.still ? { opacity: 0 } : { opacity: 0, y: 26 };
    var toVars = c.still
      ? { opacity: 1, duration: .6, stagger: .06, overwrite: true }
      : { opacity: 1, y: 0, duration: .9, stagger: .09, ease: 'power3.out', overwrite: true };

    gsap.set(items, fromVars);
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, toVars); }
    });
  }

  /* --------------------------------------------------------------
     Bar nav highlight + contents ticks
     -------------------------------------------------------------- */
  function initNavAndTicks() {
    gsap.utils.toArray('.chapter').forEach(function (chapter) {
      var file = chapter.dataset.file;
      var link = document.querySelector('.bar-files a[data-file="' + file + '"]');
      var toc = document.querySelector('.toc a[href="#' + chapter.id + '"]');
      ScrollTrigger.create({
        trigger: chapter, start: 'top 50%', end: 'bottom 50%',
        onToggle: function (self) { if (link) link.classList.toggle('active', self.isActive); },
        onLeave: function () { if (toc) toc.parentElement.classList.add('done'); }
      });
    });
  }

  /* --------------------------------------------------------------
     Stat counters
     -------------------------------------------------------------- */
  function initCounters() {
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var target = el.dataset.count;
      var m = target.match(/^(\d+)(.*)$/);
      if (!m || reduced || !belowFold(el, .85)) { el.textContent = target; return; }
      var num = +m[1], suffix = m[2];
      var obj = { v: 0 };
      el.textContent = '0' + suffix;
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(obj, { v: num, duration: Math.min(1.6, .5 + num * .15), ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; },
            onComplete: function () { el.textContent = target; } });
        }
      });
    });
  }

  /* --------------------------------------------------------------
     Closing: the two lines rise when the file ends
     -------------------------------------------------------------- */
  function initClosing() {
    var lines = gsap.utils.toArray('.closing-big .line > span');
    var rest = gsap.utils.toArray('.closing-sub, .contact-row');
    if (!belowFold(document.querySelector('.closing-inner'), .62)) return;
    if (reduced) {
      gsap.from(lines.concat(rest), { opacity: 0, duration: .8, stagger: .1,
        scrollTrigger: { trigger: '.closing', start: 'top 60%', once: true } });
      return;
    }
    gsap.set(lines, { yPercent: 110 });
    gsap.set(rest, { opacity: 0, y: 16 });
    var tl = gsap.timeline({ scrollTrigger: { trigger: '.closing-inner', start: 'top 62%', once: true } });
    tl.to(lines, { yPercent: 0, duration: 1.3, stagger: .16, ease: 'expo.out' })
      .to(rest, { opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power3.out' }, '-=.7');
  }

  /* --------------------------------------------------------------
     Skim mode: the page folds down to file numbers and gist lines.
     Every .beat-body collapses (staggered), the spine unpins, and the
     gists stack as a list. Unfold reverses it.
     -------------------------------------------------------------- */
  function initSkim() {
    var btn = document.getElementById('skim');
    var bodies = gsap.utils.toArray('.beat-body');
    var busy = false;

    function currentChapter() {
      var y = window.scrollY + window.innerHeight * .4;
      var found = null;
      document.querySelectorAll('.chapter').forEach(function (ch) {
        if (ch.offsetTop <= y) found = ch;
      });
      return found;
    }

    function jumpTo(el) {
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY - BAR_H;
      window.scrollTo({ top: top, behavior: 'auto' });
    }
    function nextFrame(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

    function enter() {
      var chapter = currentChapter();

      var finish = function () {
        /* tear down every scroll-driven animation; revert() also restores
           anything a reveal had hidden, so nothing is left invisible */
        mm.revert();
        if (window.matchMedia('(min-width: 901px)').matches) moveGistsToSpine(true);
        body.classList.add('skim');
        nextFrame(function () {
          ScrollTrigger.refresh();
          jumpTo(chapter);
          var groups = gsap.utils.toArray('.skim .gist-stage .gists, .skim.mobile .beats .gists');
          if (!reduced) {
            gsap.from(groups, { opacity: 0, y: 18, duration: .55, stagger: .04, ease: 'power2.out', clearProps: 'all' });
          }
          btn.setAttribute('aria-pressed', 'true');
          btn.textContent = 'full mode';
          btn.disabled = false; busy = false; skimming = true;
        });
      };

      if (reduced) { finish(); return; }

      bodies.forEach(function (b) {
        b.style.height = b.offsetHeight + 'px';
        b.style.overflow = 'hidden';
      });
      gsap.to(bodies, {
        height: 0, opacity: 0, duration: .75, ease: 'power3.inOut',
        stagger: { each: .015, from: 'start' },
        onComplete: finish
      });
    }

    function exit() {
      var chapter = currentChapter();
      body.classList.remove('skim');
      document.querySelectorAll('.gists').forEach(function (g) {
        g.classList.remove('active');
        gsap.set([g, g.querySelectorAll('.gist')], { clearProps: 'all' });
      });

      var finish = function () {
        bodies.forEach(function (b) { b.style.height = ''; b.style.overflow = ''; b.style.opacity = ''; });
        moveGistsToSpine(false);
        jumpTo(chapter);
        /* let the browser settle the new layout and scroll position before
           the scroll-driven animations are rebuilt against it */
        nextFrame(function () {
          setupMotion();
          ScrollTrigger.refresh();
          jumpTo(chapter);
          nextFrame(function () { ScrollTrigger.refresh(); jumpTo(chapter); });
          btn.setAttribute('aria-pressed', 'false');
          btn.textContent = 'skim mode';
          btn.disabled = false; busy = false; skimming = false;
        });
      };

      if (reduced) { finish(); return; }

      gsap.to(bodies, {
        height: 'auto', opacity: 1, duration: .75, ease: 'power3.inOut',
        stagger: { each: .015, from: 'start' },
        onComplete: finish
      });
    }

    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true; btn.disabled = true;
      if (skimming) exit(); else enter();
    });
  }

  /* --------------------------------------------------------------
     Before/after compare slider (File 01)
     -------------------------------------------------------------- */
  function initSlider() {
    var root = document.getElementById('compareSlider');
    if (!root) return;
    var frame = root.querySelector('.compare-slider-frame');
    var overlay = root.querySelector('.compare-slider-overlay');
    var overlayImg = overlay.querySelector('img');
    var handle = root.querySelector('.compare-slider-handle');
    var input = root.querySelector('.compare-slider-input');
    var dragging = false;

    function syncWidth() { overlayImg.style.width = frame.clientWidth + 'px'; }
    function setPos(pct) {
      pct = Math.min(100, Math.max(0, pct));
      overlay.style.width = pct + '%';
      handle.style.left = pct + '%';
      input.value = pct;
    }
    function pctFromEvent(e) {
      var r = frame.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    }
    frame.addEventListener('pointerdown', function (e) {
      dragging = true; frame.classList.add('dragging');
      frame.setPointerCapture && frame.setPointerCapture(e.pointerId);
      setPos(pctFromEvent(e));
    });
    frame.addEventListener('pointermove', function (e) { if (dragging) setPos(pctFromEvent(e)); });
    var stop = function () { dragging = false; frame.classList.remove('dragging'); };
    frame.addEventListener('pointerup', stop);
    frame.addEventListener('pointercancel', stop);
    input.addEventListener('input', function () { setPos(+input.value); });
    window.addEventListener('resize', syncWidth);
    if (overlayImg.complete) syncWidth(); else overlayImg.addEventListener('load', syncWidth);
    syncWidth();
    setPos(50);
  }

  /* --------------------------------------------------------------
     Lightbox: every evidence frame opens at full size. First click
     fits the image to the viewport; clicking the image toggles 1:1
     (scrollable). Esc, the close button, or the backdrop closes it.
     Built lazily on first use, so it costs nothing at load.
     -------------------------------------------------------------- */
  function initLightbox() {
    var frames = Array.prototype.slice.call(document.querySelectorAll('.evidence .frame'));
    if (!frames.length) return;
    var lb = null, img = null, cap = null, meta = null, zoomBtn = null, opener = null, index = -1;
    var reducedLB = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    frames.forEach(function (frame, i) {
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('role', 'button');
      var fig = frame.closest('.evidence');
      var fc = fig && fig.querySelector('figcaption');
      frame.setAttribute('aria-label', 'Enlarge: ' + ((fc && fc.textContent.trim()) || 'figure'));
      if (fc && !fc.querySelector('.lb-hint')) {
        var hint = document.createElement('span');
        hint.className = 'lb-hint'; hint.setAttribute('aria-hidden', 'true'); hint.textContent = '⤢ enlarge';
        fc.appendChild(hint);
      }
      frame.addEventListener('click', function () { open(i); });
      frame.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    function build() {
      lb = document.createElement('div');
      lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Figure viewer');
      lb.innerHTML =
        '<div class="lb-bar"><span class="lb-meta"></span><div class="lb-actions">' +
        '<button type="button" class="lb-prev" aria-label="Previous figure">←<span class="lb-long"> prev</span></button>' +
        '<button type="button" class="lb-next" aria-label="Next figure"><span class="lb-long">next </span>→</button>' +
        '<button type="button" class="lb-zoom" aria-pressed="false" aria-label="Toggle actual size">1:1</button>' +
        '<button type="button" class="lb-close" aria-label="Close"><span class="lb-long">close </span>✕</button></div></div>' +
        '<div class="lb-stage"><img alt=""></div><p class="lb-cap"></p>';
      document.body.appendChild(lb);
      img = lb.querySelector('img'); cap = lb.querySelector('.lb-cap'); meta = lb.querySelector('.lb-meta'); zoomBtn = lb.querySelector('.lb-zoom');
      lb.querySelector('.lb-close').addEventListener('click', close);
      lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
      lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
      zoomBtn.addEventListener('click', toggleZoom);
      img.addEventListener('click', toggleZoom);
      lb.querySelector('.lb-stage').addEventListener('click', function (e) { if (e.target === e.currentTarget) close(); });
      lb.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'Tab') trapFocus(e);
      });
    }

    function trapFocus(e) {
      var f = lb.querySelectorAll('button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function show(i) {
      index = (i + frames.length) % frames.length;
      var frame = frames[index];
      var src = frame.querySelector('img');
      var fig = frame.closest('.evidence');
      var fc = fig && fig.querySelector('figcaption');
      var chapter = frame.closest('.chapter');
      var file = chapter ? chapter.querySelector('.spine-file').textContent.trim() : '';
      lb.classList.remove('zoomed'); zoomBtn.setAttribute('aria-pressed', 'false');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt || '';
      img.width = src.getAttribute('width'); img.height = src.getAttribute('height');
      var text = fc ? fc.textContent.replace(/⤢ enlarge/, '').trim() : '';
      cap.textContent = text;
      meta.innerHTML = '<b>' + file + '</b>&nbsp;&nbsp;·&nbsp;&nbsp;fig ' + (index + 1) + ' / ' + frames.length +
        '<span class="lb-dims">&nbsp;&nbsp;·&nbsp;&nbsp;' + src.getAttribute('width') + ' × ' + src.getAttribute('height') + '</span>';
      lb.querySelector('.lb-stage').scrollTo(0, 0);
    }

    function open(i) {
      if (!lb) build();
      opener = document.activeElement;
      show(i);
      body.classList.add('lb-lock');
      lb.classList.add('open');
      /* opacity transition needs a frame after insertion */
      if (!reducedLB) { lb.classList.remove('open'); requestAnimationFrame(function () { lb.classList.add('open'); }); }
      lb.querySelector('.lb-close').focus();
    }

    function close() {
      if (!lb) return;
      lb.classList.remove('open');
      body.classList.remove('lb-lock');
      var done = function () { lb.remove(); lb = null; if (opener && opener.focus) opener.focus(); };
      if (reducedLB) done(); else setTimeout(done, 260);
    }

    function step(d) { show(index + d); }

    function toggleZoom() {
      var z = lb.classList.toggle('zoomed');
      zoomBtn.setAttribute('aria-pressed', z ? 'true' : 'false');
      if (z) {
        /* centre the scroll position so the middle of the image stays in view */
        var st = lb.querySelector('.lb-stage');
        requestAnimationFrame(function () {
          st.scrollTo((st.scrollWidth - st.clientWidth) / 2, (st.scrollHeight - st.clientHeight) / 2);
        });
      }
    }
  }

  /* --------------------------------------------------------------
     Compare tables: copy the column headers onto each cell so the
     stacked mobile layout still labels which side is which.
     -------------------------------------------------------------- */
  function initCompareTables() {
    document.querySelectorAll('.compare').forEach(function (table) {
      var heads = table.querySelectorAll('.compare-head > div');
      if (heads.length < 2) return;
      var a = heads[0].textContent.trim(), b = heads[1].textContent.trim();
      table.querySelectorAll('.compare-row:not(.compare-head)').forEach(function (row) {
        var cells = row.children;
        if (cells[0]) cells[0].setAttribute('data-col-a', a);
        if (cells[1]) cells[1].setAttribute('data-col-b', b);
      });
    });
  }
})();
