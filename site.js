// Site-wide helpers.
// 1. Morse breaks: the single "BP" pattern stretched to fill the break exactly, so the line always ends on the
//    pinstripe it is stretched to (pinstripe 2 -> 4).
// 2. Phones: a thin progress bar beside the card (lime on Creative Endeavors, the No. button's color on a case study).
// 3. Every page: cards fade in, and every element rises into place as it enters (and as you scroll to it).
// 4. Case-study pages: from the homepage the card keeps going where the homepage card left off. On desktop it unrolls
//    into one long sheet; on phones it expands around its content into a fixed frame that its content scrolls inside.
//    "Back to home" rolls it back up to the homepage card's size first.
(function(){
  window.__siteReady = 2;   // the page's <head> script checks this; without it everything is simply shown
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isPhone = window.matchMedia('(max-width: 720px)');

  var BP = [3,1,1,1,1,1,1,1,1,1,3,1,3,1,1];
  var SW = 3;

  function drawThread(el){
    var W = el.getBoundingClientRect().width;
    if (W < 40) return;
    var u = (W - SW) / 21, dash = [];
    for (var j = 0; j < BP.length; j++) dash.push((BP[j] * u).toFixed(2));
    el.innerHTML = '<svg width="' + W.toFixed(1) + '" height="6" viewBox="0 0 ' + W.toFixed(1) + ' 6" aria-hidden="true">' +
      '<line x1="' + (SW / 2) + '" y1="3" x2="' + (SW / 2 + 21 * u).toFixed(2) + '" y2="3" stroke="currentColor" stroke-width="' + SW +
      '" stroke-linecap="round" stroke-dasharray="' + dash.join(',') + '"/></svg>';
  }
  function drawAll(){
    var t = document.querySelectorAll('.thread');
    for (var i = 0; i < t.length; i++) drawThread(t[i]);
  }
  var drawRaf;
  function queueDraw(){ cancelAnimationFrame(drawRaf); drawRaf = requestAnimationFrame(drawAll); }
  drawAll();
  window.addEventListener('load', drawAll);
  window.addEventListener('resize', queueDraw);


  /* ---------------- 3. Cards and the reveal engine ---------------- */
  var caseCard = document.querySelector('.case-page-card');
  var pageCard = document.querySelector('.page-card');
  var cardEl = caseCard || pageCard;
  var flight = root.classList.contains('flight') && !!cardEl;   // arriving with the card already on screen: from the homepage card, or by a swipe
  if (flight){ try { sessionStorage.removeItem('cardFlight'); } catch (e) {} }
  var bar = null;                    // the progress bar (section 2)
  var framed = false, homeRect = null, frameInfo = null, pendingFrameAnim = null;

  function whenFontsReady(cb){   // wait for the web fonts (0.8s at most) so text never visibly swaps typefaces
    var done = false;
    function go(){ if (!done){ done = true; cb(); } }
    if (document.fonts && document.fonts.load){
      var loads = ['800 1em "Big Shoulders Display"', '400 1em "IBM Plex Sans"', '600 1em "IBM Plex Sans"', '700 1em "Playfair Display"']
        .map(function(f){ return document.fonts.load(f); });
      Promise.race([Promise.all(loads), new Promise(function(r){ setTimeout(r, 800); })]).then(go, go);
    } else go();
  }

  // What takes part: everything directly inside a page's container, the tiles inside a grid, and [data-reveal].
  var GRIDS = '.gallery-grid, .card-grid';
  var targets = [];
  function addTarget(el){ if (targets.indexOf(el) < 0) targets.push(el); }
  Array.prototype.forEach.call(document.querySelectorAll('.page-hero > div, .bookend > div'), function(c){
    Array.prototype.forEach.call(c.children, function(ch){ if (!ch.matches(GRIDS)) addTarget(ch); });
  });
  Array.prototype.forEach.call(document.querySelectorAll(GRIDS), function(g){ Array.prototype.forEach.call(g.children, addTarget); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), addTarget);

  var firstBatch = true, baseDelay = 0.1;
  function show(el, order, delay, instant){
    el.classList.remove('rv-hide');
    el.style.setProperty('--d', order);
    el.style.setProperty('--b', delay + 's');
    if (instant) el.classList.add('rv-static');
    el.classList.add('is-shown');
  }
  function watch(list, scroller){
    if (!('IntersectionObserver' in window)){ list.forEach(function(el){ show(el, 0, 0, true); }); return; }
    var io = new IntersectionObserver(function(entries){
      var batch = entries.filter(function(e){ return e.isIntersecting; })
        .sort(function(a, b){ return a.boundingClientRect.top - b.boundingClientRect.top; });
      batch.forEach(function(e, i){
        show(e.target, i, firstBatch ? baseDelay : 0, false);   // the first screen waits for the card; later ones don't
        io.unobserve(e.target);
      });
      if (batch.length) firstBatch = false;
    }, { root: scroller || null, rootMargin: scroller ? '0px' : '0px 0px -8% 0px' });   // a card that scrolls inside itself: its own edge is the boundary, so a button at its foot is revealed at once
    list.forEach(function(el){ io.observe(el); });
  }

  /* ---- phones: the case-study card becomes a fixed frame ---- */
  var FRAME_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  function enterFrame(){
    if (framed || !caseCard || !isPhone.matches) return null;
    var circle = document.querySelector('#icon-nav a'), pill = document.getElementById('case-dots');
    if (!circle || !pill) return null;
    var vh = window.innerHeight, r = caseCard.getBoundingClientRect(), cr = circle.getBoundingClientRect(), pr = pill.getBoundingClientRect();
    var T = cr.bottom + cr.top;                          // as far below the nav circles as they are from the top of the screen
    var B = 2 * (vh - pr.bottom) + pr.height;            // as far above the dots as they are from the bottom of the screen
    var basePad = parseFloat(window.getComputedStyle(caseCard).paddingTop);
    var finalPad = Math.max(0, basePad + (r.top - T));   // the paper grows above the content, so the content stays where it is
    homeRect = { top: r.top, bottom: vh - r.bottom };    // where the homepage card is, for the roll-up
    frameInfo = { T: T, B: B, basePad: basePad, finalPad: finalPad };
    root.style.setProperty('--frame-top', T + 'px');
    root.style.setProperty('--frame-bottom', B + 'px');
    caseCard.style.paddingTop = finalPad + 'px';
    root.classList.add('frame');
    framed = true;
    if (!caseCard.querySelector('.swipe-hint')){   // the hint at the foot of the card: the move from here is sideways (the hand is Lucide's "pointer" icon, ISC licence)
      var hint = document.createElement('div'), rest = (caseCard.querySelector('.case-page-cta') || {}).style;
      hint.className = 'swipe-hint is-shown rv-static';   // (shown at once: it is added after the reveal engine has made its list)
      hint.setAttribute('role', 'img');
      hint.setAttribute('aria-label', 'Swipe left or right for the previous or next case study');
      if (rest && rest.getPropertyValue('--cta-rest')) hint.style.color = rest.getPropertyValue('--cta-rest');   // the case study's own color
      hint.innerHTML = '<svg class="sh-arrow sh-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>' +
        '<svg class="sh-hand" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>' +
        '<svg class="sh-arrow sh-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
      caseCard.appendChild(hint);
    }
    if (reduce || !caseCard.animate) return null;
    return caseCard.animate([
      { top: r.top + 'px', bottom: homeRect.bottom + 'px', paddingTop: basePad + 'px' },
      { top: T + 'px', bottom: B + 'px', paddingTop: finalPad + 'px' }
    ], { duration: 750, easing: FRAME_EASE, delay: 80, fill: 'backwards' });
  }
  function rollUpFrame(done){
    if (bar) bar.classList.remove('is-in');
    if (Math.abs(frameInfo.T - homeRect.top) < 1 && Math.abs(frameInfo.B - homeRect.bottom) < 1 && Math.abs(frameInfo.finalPad - frameInfo.basePad) < 1){
      setTimeout(done, 200);   // already exactly the homepage's card: nothing to roll up
      return;
    }
    caseCard.animate([
      { top: frameInfo.T + 'px', bottom: frameInfo.B + 'px', paddingTop: frameInfo.finalPad + 'px' },
      { top: homeRect.top + 'px', bottom: homeRect.bottom + 'px', paddingTop: frameInfo.basePad + 'px' }
    ], { duration: 700, easing: FRAME_EASE, fill: 'forwards' });
    if (bar) bar.classList.remove('is-in');
    setTimeout(done, 750);
  }
  function revealBar(anim){   // the bar arrives once the card has settled into its frame
    var go = function(){ if (bar){ bar.classList.add('is-in'); layoutBar(); } };
    if (anim && anim.finished){
      (function tick(){ layoutBar(); if (anim.playState === 'running' || anim.playState === 'pending') requestAnimationFrame(tick); })();
      anim.finished.then(go, go);
    } else go();
  }

  if (flight){
    // The homepage card was on screen a moment ago and must not vanish: everything on the first screen is simply
    // there, the card expands from where it is, and only what is further down arrives as you scroll.
    var vh0 = window.innerHeight, below = [], scroller0 = null;
    targets.forEach(function(el){
      var r = el.getBoundingClientRect();
      if (r.top < vh0 * 0.92 && r.bottom > 0) show(el, 0, 0, true);
      else { el.classList.add('rv-hide'); below.push(el); }
    });
    if (isPhone.matches){
      pendingFrameAnim = enterFrame();   // (case studies only; it does nothing without a case-study card)
      scroller0 = cardEl;
      var arrived = null;   // arrived by a swipe: slide in from the side it came from
      try { arrived = JSON.parse(sessionStorage.getItem('caseSwipe') || 'null'); sessionStorage.removeItem('caseSwipe'); } catch (e) {}
      if (arrived && arrived.dir && Date.now() - arrived.t < 5000 && !reduce && cardEl.animate){
        var inAnim = cardEl.animate([{ transform: 'translateX(' + (arrived.dir === 'next' ? '110vw' : '-110vw') + ')' }, { transform: 'none' }],
          { duration: 400, easing: FRAME_EASE, fill: 'both' });
        inAnim.finished.then(function(){ inAnim.cancel(); }, function(){});
      }
    } else if (caseCard){
      var cr0 = caseCard.getBoundingClientRect();
      caseCard.style.setProperty('--roll-stop', Math.max(60, vh0 - cr0.bottom + 12) + 'px');
      caseCard.classList.add('is-unrolling');
    }
    watch(below, scroller0);
  } else {
    whenFontsReady(function(){
      requestAnimationFrame(function(){
        if (cardEl) cardEl.classList.add('is-in');
        baseDelay = cardEl ? 0.35 : 0.1;                     // with a card, wait for it to appear first
        var anim = caseCard ? enterFrame() : null;           // measured after the fonts, since the card's height depends on them
        var scroller = (cardEl && window.getComputedStyle(cardEl).overflowY === 'auto') ? cardEl : null;   // phones: the card scrolls
        watch(targets, scroller);
        if (framed) revealBar(anim);
      });
    });
  }

  /* ---------------- 5. Desktop: the "Back to home" button docks into a circle ---------------- */
  // When the button scrolls up to the height of the Home nav circle it stops there and morphs: it shrinks to a circle
  // the size of the nav buttons (the label gives way to an arrow) while travelling to the column that pinstripes 6 and 7
  // make, and stays fixed there. Scrolling back up reverses it into the button's own place in the card.
  var DOCK_COLUMN = 'pinstripes';   // 'pinstripes': the middle of the column pinstripes 6 and 7 make (the card's right edge)
                                    // 'gutter': the middle of the space beyond the card, between its edge and pinstripe 7
  var dock = null, dockLabel = null, dockArrow = null, dockState = 'idle', dockMix = 0, dockRaf = 0;
  var cta = caseCard ? caseCard.querySelector('.case-page-cta') : null;
  if (cta){
    dock = document.createElement('a');
    dock.className = 'case-page-cta back-dock';
    dock.href = cta.getAttribute('href');
    dock.setAttribute('aria-label', 'Back to home');
    dock.setAttribute('style', cta.getAttribute('style') || '');   // carries the case study's colors (--cta-rest, --cta-fill)
    dock.innerHTML = '<span class="dock-label">' + cta.innerHTML + '</span>' +
      '<svg class="dock-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      '<span class="tooltip tip-right">Back to home</span>';   // the same bubble as the right-hand nav buttons: on the left of the button, arrow pointing at it
    dock.style.display = 'none';
    document.body.appendChild(dock);   // created before the click handlers below are attached, so it gets the roll-up too
    dockLabel = dock.querySelector('.dock-label');
    dockArrow = dock.querySelector('.dock-arrow');
  }
  function homeCircle(){ return document.querySelector('#icon-nav a').getBoundingClientRect(); }
  function circleRect(){
    var h = homeCircle(), size = h.width;
    if (isPhone.matches){   // phones: on the card's left edge, as far below the card's top as the card's top is below the nav
      var pc = caseCard.getBoundingClientRect();
      return { left: pc.left - size / 2, top: pc.top + (pc.top - h.bottom), width: size, height: size };
    }
    var lines = Array.prototype.map.call(document.querySelectorAll('#grid-lines-global span'), function(e){ return e.getBoundingClientRect().x; });
    var cx = DOCK_COLUMN === 'gutter' ? (caseCard.getBoundingClientRect().right + lines[6]) / 2 : (lines[5] + lines[6]) / 2;
    return { left: cx - size / 2, top: (h.top + h.bottom) / 2 - size / 2, width: size, height: size };
  }
  function ctaRect(){ var r = cta.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  function dockRect(){ return { left: parseFloat(dock.style.left), top: parseFloat(dock.style.top), width: parseFloat(dock.style.width), height: parseFloat(dock.style.height) }; }
  function paintDock(rc, mix){   // mix: 0 = the button, 1 = the circle
    dockMix = mix;
    dock.style.left = rc.left + 'px';
    dock.style.top = rc.top + 'px';
    dock.style.width = rc.width + 'px';
    dock.style.height = rc.height + 'px';
    dockLabel.style.opacity = String(Math.max(0, 1 - mix / 0.4));                      // the label gives way to the arrow with a short
    dockArrow.style.opacity = String(Math.max(0, Math.min(1, (mix - 0.25) / 0.45)));   // overlap, so the outline is never empty
    dock.style.backgroundColor = mix > 0 ? 'rgba(242,241,236,' + mix.toFixed(3) + ')' : '';
  }
  function morphDock(to, mix1, ms, done){   // `to` can be a function, so the target is followed live (the button keeps scrolling)
    cancelAnimationFrame(dockRaf);
    var from = dockRect(), mix0 = dockMix, t0 = null;
    dock.style.transition = 'color 0.25s var(--ease), border-color 0.25s var(--ease)';   // the fill follows the morph frame by frame, not 0.25s late
    (function step(now){
      if (t0 === null) t0 = now;
      var p = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - p, 3), tg = typeof to === 'function' ? to() : to;
      paintDock({ left: from.left + (tg.left - from.left) * e, top: from.top + (tg.top - from.top) * e,
                  width: from.width + (tg.width - from.width) * e, height: from.height + (tg.height - from.height) * e }, mix0 + (mix1 - mix0) * e);
      if (p < 1) dockRaf = requestAnimationFrame(step); else { dock.style.transition = ''; if (done) done(); }
    })(performance.now());
  }
  function settleCircle(){ dock.classList.add('is-circle'); dock.style.backgroundColor = ''; }
  function dockIn(instant){
    if (dockState === 'docked') return;
    dockState = 'docked';
    if (dock.style.display === 'none'){ dock.style.display = 'flex'; paintDock(ctaRect(), 0); }   // it appears exactly over the button...
    cta.style.visibility = 'hidden';                                                               // ...which steps aside
    dock.classList.remove('is-circle');
    if (instant || reduce){ paintDock(circleRect(), 1); settleCircle(); return; }
    morphDock(circleRect, 1, 650, settleCircle);
  }
  function dockOut(){
    if (dockState !== 'docked') return;
    dockState = 'idle';
    dock.classList.remove('is-circle');
    var finish = function(){ dock.style.display = 'none'; cta.style.visibility = ''; };
    if (reduce){ finish(); return; }
    morphDock(ctaRect, 0, 450, finish);
  }
  function checkDock(){
    if (!dock || leaving) return;
    var r = cta.getBoundingClientRect(), cy = r.top + r.height / 2, hr = homeCircle(), hy = (hr.top + hr.bottom) / 2;
    if (isPhone.matches){   // phones: when the button's top is as far below the card's top as the card's top is below the nav
      if (!framed) return;
      var fr = caseCard.getBoundingClientRect(), gap = fr.top - hr.bottom, off = r.top - fr.top;
      if (dockState === 'idle' && off <= gap) dockIn(false);
      else if (dockState === 'docked' && off > gap + 8) dockOut();
      return;
    }
    if (dockState === 'idle' && cy <= hy) dockIn(false);
    else if (dockState === 'docked' && cy > hy + 8) dockOut();   // a little slack, so it can't flicker at the threshold
  }
  if (dock){
    window.addEventListener('scroll', checkDock, { passive: true });
    caseCard.addEventListener('scroll', checkDock, { passive: true });   // phones: the card scrolls, not the page
    window.addEventListener('resize', function(){
      if (isPhone.matches && !framed){ dock.style.display = 'none'; cta.style.visibility = ''; dockState = 'idle'; return; }
      if (dockState === 'docked' && dockMix === 1) paintDock(circleRect(), 1);
      checkDock();
    });
    if (!isPhone.matches) (function(){   // arrived already scrolled down (e.g. a reload): dock straight away
      var r = cta.getBoundingClientRect(), hr = homeCircle();
      if (r.top + r.height / 2 <= (hr.top + hr.bottom) / 2) dockIn(true);
    })();
  }

  root.classList.remove('swipe-next', 'swipe-prev');   // the animation (or nothing, for a normal arrival) takes over from here

  /* ---------------- 6. Phones: swipe between case studies ---------------- */
  // Swipe left for the next case study and right for the previous one (the order of the dots and of the desktop
  // arrows). The card follows the finger while the background color blends toward the next case study's; let go
  // past a quarter of the screen (or flick) and the card slides away and the next one slides in. Let go early and it
  // springs back. The outer 24px of the screen are left to the browser's own back/forward swipe.
  var CASE_BG = { liteload: '#C2C2C2', walgreens: '#AFBFFD', ebay: '#B1CC72', cisco: '#80CCEC', urban: '#D0C267' };
  var swipeEl = caseCard || (document.getElementById('case-dots') ? pageCard : null);   // the case studies, and the Creative Endeavors pages that have the dots (not the hub)
  if (swipeEl){
    var dotLinks = Array.prototype.slice.call(document.querySelectorAll('#case-dots a'));   // the order of the dots is the order of the loop
    var hereIdx = -1; dotLinks.forEach(function(d, i){ if (d.classList.contains('active')) hereIdx = i; });
    var prevLink = hereIdx < 0 ? null : dotLinks[(hereIdx - 1 + dotLinks.length) % dotLinks.length];
    var nextLink = hereIdx < 0 ? null : dotLinks[(hereIdx + 1) % dotLinks.length];
    var canSwipe = function(){ return caseCard ? framed : isPhone.matches; };
    var origBg = document.body.style.backgroundColor, gesture = null, swallowClick = false;
    var hexRgb = function(h){ return [1, 3, 5].map(function(i){ return parseInt(h.substr(i, 2), 16); }); };
    var mixBg = function(a, b, t){
      var x = hexRgb(a), y = hexRgb(b);
      return 'rgb(' + x.map(function(v, i){ return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
    };
    var pageIdOf = function(link){ return link.getAttribute('href').split('/').pop().replace(/\.html.*$/, ''); };
    var hereId = window.location.pathname.split('/').pop().replace(/\.html$/, '');
    var hereBg = CASE_BG[hereId];
    var targetFor = function(dx){ var l = dx < 0 ? nextLink : prevLink; return l ? CASE_BG[pageIdOf(l)] : null; };
    var drag = function(dx){
      var w = window.innerWidth, p = Math.min(1, Math.abs(dx) / w), tgt = targetFor(dx);
      swipeEl.style.transform = 'translateX(' + dx + 'px)';
      swipeEl.style.opacity = String(1 - p * 0.35);
      if (tgt && hereBg) document.body.style.backgroundColor = mixBg(hereBg, tgt, Math.min(1, p / 0.6));
    };
    var springBack = function(dx){
      document.body.style.transition = 'background-color 0.26s ease';
      document.body.style.backgroundColor = origBg;
      if (reduce || !swipeEl.animate){ swipeEl.style.transform = ''; swipeEl.style.opacity = ''; return; }
      var a = swipeEl.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 280, easing: FRAME_EASE });
      swipeEl.style.transform = ''; swipeEl.style.opacity = '';
      a.finished.then(function(){ document.body.style.transition = ''; }, function(){});
    };
    var commit = function(dx, link, dir){
      leaving = true;
      if (dock) dock.style.display = 'none';
      if (bar) bar.classList.remove('is-in');
      try {
        sessionStorage.setItem('cardFlight', JSON.stringify({ id: pageIdOf(link), t: Date.now() }));   // the next page arrives with its card already on screen
        sessionStorage.setItem('caseSwipe', JSON.stringify({ dir: dir, t: Date.now() }));
      } catch (e) {}
      var go = function(){ window.location.href = link.href; };
      var tgt = CASE_BG[pageIdOf(link)];
      document.body.style.transition = 'background-color 0.24s linear';
      if (tgt) document.body.style.backgroundColor = tgt;
      if (reduce || !swipeEl.animate){ go(); return; }
      var off = (dx < 0 ? -1 : 1) * window.innerWidth * 1.1;
      var a = swipeEl.animate([{ transform: 'translateX(' + dx + 'px)', opacity: swipeEl.style.opacity || 1 }, { transform: 'translateX(' + off + 'px)', opacity: 0.4 }],
        { duration: 240, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
      a.finished.then(go, go);
      setTimeout(go, 400);   // belt and braces
    };
    document.addEventListener('pointerdown', function(e){
      if (!canSwipe() || leaving || e.pointerType !== 'touch' || !e.isPrimary) return;
      if (e.clientX < 24 || e.clientX > window.innerWidth - 24) return;
      if (e.target.closest && e.target.closest('[data-no-swipe], input, textarea, select')) return;   // e.g. a future carousel inside the card
      gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, dx: 0, axis: null };
    }, { passive: true });
    document.addEventListener('pointermove', function(e){
      if (!gesture || e.pointerId !== gesture.id) return;
      var dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
      if (gesture.axis === null){
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';   // decided once, in the first few pixels
        if (gesture.axis === 'x'){ document.body.style.transition = ''; if (swipeEl.getAnimations) swipeEl.getAnimations().forEach(function(an){ an.cancel(); }); }
      }
      if (gesture.axis !== 'x') return;
      gesture.dx = dx;
      drag(dx);
    }, { passive: true });
    var finish = function(e){
      if (!gesture || e.pointerId !== gesture.id) return;
      var g = gesture; gesture = null;
      if (g.axis !== 'x') return;
      swallowClick = true; setTimeout(function(){ swallowClick = false; }, 400);   // a drag that ends on a link is not a tap on it
      var v = g.dx / Math.max(1, e.timeStamp - g.t0);
      var go = Math.abs(g.dx) > window.innerWidth * 0.25 || (Math.abs(v) > 0.5 && Math.abs(g.dx) > 40);
      var link = g.dx < 0 ? nextLink : prevLink;
      if (e.type === 'pointerup' && go && link) commit(g.dx, link, g.dx < 0 ? 'next' : 'prev'); else springBack(g.dx);
    };
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    window.addEventListener('pageshow', function(ev){ if (ev.persisted){ swipeEl.style.transform = ''; swipeEl.style.opacity = ''; document.body.style.transition = ''; document.body.style.backgroundColor = origBg; } });
    document.addEventListener('click', function(e){ if (swallowClick){ e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ---------------- 4. Case-study pages: heading back home ---------------- */
  if (caseCard){
    var nav = document.getElementById('case-nav'), leaving = false;
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="index.html"]'), function(a){
      a.addEventListener('click', function(e){
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (reduce) return;
        var here = window.location.pathname.split('/').pop().replace(/\.html$/, '');
        var rollUp = a.getAttribute('href') === 'index.html#to-' + here;   // "Back to home" returns to this card; the Home icon and the contact dot don't
        if (!rollUp && (!nav || isPhone.matches)) return;
        e.preventDefault();
        if (leaving) return;
        leaving = true;
        if (dock){ cancelAnimationFrame(dockRaf); dock.style.transition = 'opacity 0.3s ease'; dock.style.opacity = '0'; }
        var href = a.href;
        if (nav && !isPhone.matches) nav.classList.remove('collapsed');   // the nav plays its animation in reverse
        if (!rollUp){ setTimeout(function(){ window.location.href = href; }, 950); return; }
        var roll = function(){
          if (framed){ rollUpFrame(function(){ window.location.href = href; }); return; }
          var r = caseCard.getBoundingClientRect();
          caseCard.style.setProperty('--roll-stop', Math.max(60, window.innerHeight - r.bottom + 4) + 'px');
          caseCard.classList.remove('is-unrolling');
          caseCard.classList.add('is-rolling-up');
          setTimeout(function(){ window.location.href = href; }, 950);
        };
        var y = framed ? caseCard.scrollTop : window.scrollY;
        if (y > 4){   // back to the top first, so the roll-up happens where you can see it
          (framed ? caseCard : window).scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(roll, Math.min(900, 250 + y * 0.3));
        } else roll();
      });
    });
    window.addEventListener('pageshow', function(ev){
      if (ev.persisted){
        leaving = false;
        if (dock){ dock.style.opacity = ''; }
        caseCard.style.transform = ''; caseCard.style.opacity = '';
        document.body.style.transition = ''; if (typeof origBg !== 'undefined') document.body.style.backgroundColor = origBg;
        caseCard.classList.remove('is-rolling-up');
        if (framed) caseCard.getAnimations().forEach(function(an){ an.cancel(); });
        if (nav) nav.classList.add('collapsed');
        if (bar) bar.classList.add('is-in');
      }
    });
  }

  /* ---------------- 2. Phones: a scroll progress bar beside the card ---------------- */
  // Creative Endeavors, and the case studies on phones: the card scrolls inside its frame. On a desktop-sized
  // case study the page scrolls. Either way a thin bar to the right of the card shows how far through you are:
  // lime on Creative Endeavors, and the color of the case study's No. button on a case study.
  var barHost = pageCard || caseCard;
  function layoutBar(){
    if (!bar) return;
    var scroller = pageCard || (framed ? caseCard : null);
    var r = barHost.getBoundingClientRect(), vh = window.innerHeight, top, h, p, max, scrollable;
    if (scroller){
      max = scroller.scrollHeight - scroller.clientHeight;
      scrollable = isPhone.matches && max > 1;
      top = r.top;
      p = max > 0 ? scroller.scrollTop / max : 0;
      h = r.height * scroller.clientHeight / scroller.scrollHeight;
    } else {
      var docH = document.documentElement.scrollHeight;
      max = docH - vh;
      scrollable = isPhone.matches && max > 4;
      top = r.top + window.scrollY;                       // the bar stays where the card's first screen is
      p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      h = r.height * vh / docH;
    }
    bar.style.display = scrollable ? 'block' : 'none';
    if (!scrollable) return;
    h = Math.max(28, h);
    bar.style.top = top + 'px';
    bar.style.height = r.height + 'px';
    bar.style.left = (r.right + 10) + 'px';
    var thumb = bar.firstChild;
    thumb.style.height = h + 'px';
    thumb.style.transform = 'translateY(' + ((r.height - h) * Math.max(0, Math.min(1, p))) + 'px)';
  }
  if (barHost){
    bar = document.createElement('div');
    bar.className = 'card-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div class="card-progress-thumb"></div>';
    document.body.appendChild(bar);
    if (caseCard){
      var badge = caseCard.querySelector('.badge-link');
      if (badge) bar.style.setProperty('--bar', window.getComputedStyle(badge).backgroundColor);
    }
    (pageCard || window).addEventListener('scroll', layoutBar, { passive: true });
    if (caseCard) caseCard.addEventListener('scroll', layoutBar, { passive: true });
    window.addEventListener('resize', layoutBar);
    window.addEventListener('load', layoutBar);
    if (window.ResizeObserver){
      var ro = new ResizeObserver(layoutBar);
      ro.observe(barHost);
      if (pageCard) Array.prototype.forEach.call(pageCard.children, function(c){ ro.observe(c); });
    }
    if (framed) revealBar(pendingFrameAnim);                         // arrived from the homepage: the frame is already set
    else if (flight || barHost.classList.contains('is-in')) revealBar(null);
    else {
      var barWatch = new MutationObserver(function(){ if (barHost.classList.contains('is-in')){ barWatch.disconnect(); if (!caseCard || !isPhone.matches) revealBar(null); } });
      barWatch.observe(barHost, { attributes: true, attributeFilter: ['class'] });
    }
    layoutBar();
  }
})();
