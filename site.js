// Beau.1 · v0.8.4
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

  /* ---------------- Versioning: which release is this page really running? ----------------
     In the console, siteVersion() compares the page, this script, the stylesheet (and gallery.js where it is used) and
     names any part that is not on the same version: an old copy being served from a cache, or a file that wasn't uploaded.
     On a phone, add ?version to any page's address and the same verdict appears as a small pill. */
  var SITE = { release: 'Beau.1', version: '0.8.4' };
  window.__siteVersion = SITE.version;
  function versionReport(){
    var meta = document.querySelector('meta[name="site-version"]');
    var css = String(window.getComputedStyle(root).getPropertyValue('--site-version') || '').replace(/["'\s]/g, '');
    var parts = { 'this page (html)': meta ? meta.getAttribute('content') : '(missing)', 'site.js': SITE.version, 'stylesheet': css || '(missing)' };
    if (document.querySelector('script[src^="gallery.js"]')) parts['gallery.js'] = window.__galleryVersion || '(missing)';
    var bad = Object.keys(parts).filter(function(k){ return parts[k] !== SITE.version; });
    var said = Object.keys(parts).map(function(k){ return k + ' ' + parts[k]; }).join(', ');   // each part's own claim: whichever differs is the one that is behind
    return { parts: parts, bad: bad, text: SITE.release + ' v' + SITE.version + (bad.length ? ' - MISMATCH: ' + said + ' (an old copy is being served, or a file was not uploaded)' : ' - every part matches') };
  }
  window.siteVersion = function(){ var r = versionReport(); if (window.console && console.table) console.table(r.parts); return r.text; };
  if (window.console && console.info) console.info('%c' + SITE.release + '%c v' + SITE.version + '  (siteVersion() checks this page)', 'font-weight:700;color:#4F7A10', 'color:inherit');
  if (/[?&]version(=|&|$)/.test(window.location.search)){
    var pill = document.createElement('div'), vr = versionReport();
    pill.textContent = vr.text;
    pill.style.cssText = 'position:fixed; top:6px; left:50%; transform:translateX(-50%); z-index:99999; max-width:92vw; padding:6px 14px; border-radius:999px; font:600 12px/1.3 "IBM Plex Sans", sans-serif; text-align:center; color:#fff; background:#101114; border:2px solid ' + (vr.bad.length ? '#E62600' : '#ADD944') + '; box-shadow:0 4px 16px rgba(0,0,0,0.35);';
    pill.addEventListener('click', function(){ pill.remove(); });
    setTimeout(function(){ if (pill.parentNode) pill.parentNode.removeChild(pill); }, 9000);
    (document.body || root).appendChild(pill);
  }
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
  // NDA case studies (section 12): until the password is in, the card stays rolled up at the homepage card's size and
  // the page doesn't scroll. window.__ndaRelease (called by section 12 on a good password) lets the unroll play.
  var ndaHold = !!(caseCard && caseCard.querySelector('.case-text[data-locked]'));
  try { if (ndaHold && sessionStorage.getItem('bp-case-pass')) ndaHold = false; } catch (e) {}
  if (ndaHold) root.classList.add('nda-held');
  window.__ndaRelease = function(){
    if (!root.classList.contains('nda-held')) return;
    root.classList.remove('nda-held');                        // desktop: the sheet's own unroll animation now plays from the top
    if (isPhone.matches && caseCard && !framed) revealBar(enterFrame());   // phones: the card expands into its frame now
  };

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
  function makeSwipeHint(label, colour){   // a finger between a left and a right arrow (the hand is Lucide's "pointer" icon, ISC licence)
    var hint = document.createElement('div');
    hint.className = 'swipe-hint is-shown rv-static';   // shown at once: it is added after the reveal engine has made its list
    hint.setAttribute('role', 'img');
    hint.setAttribute('aria-label', label);
    if (colour) hint.style.color = colour;
    hint.innerHTML = '<svg class="sh-arrow sh-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>' +
      '<svg class="sh-hand" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>' +
      '<svg class="sh-arrow sh-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    return hint;
  }
  window.makeSwipeHint = makeSwipeHint;   // gallery.js uses the same clue inside the photo viewer
  function enterFrame(){
    if (framed || !caseCard || !isPhone.matches) return null;
    var circle = document.querySelector('#icon-nav a'), pill = document.getElementById('case-dots');
    if (!circle || !pill) return null;
    var vh = window.innerHeight, r = caseCard.getBoundingClientRect(), cr = circle.getBoundingClientRect(), pr = pill.getBoundingClientRect();
    var up = cr.top < pr.top ? cr : pr, down = up === cr ? pr : cr;   // whichever row is on top (the dots, these days) and whichever is below
    var T = up.bottom + up.top;                          // as far below the top row as it is from the top of the screen
    var B = 2 * (vh - down.bottom) + down.height;        // as far above the bottom row as it is from the bottom of the screen
    var basePad = parseFloat(window.getComputedStyle(caseCard).paddingTop);
    var finalPad = Math.max(0, basePad + (r.top - T));   // the paper grows above the content, so the content stays where it is
    homeRect = { top: r.top, bottom: vh - r.bottom };    // where the homepage card is, for the roll-up
    frameInfo = { T: T, B: B, basePad: basePad, finalPad: finalPad };
    root.style.setProperty('--frame-top', T + 'px');
    root.style.setProperty('--frame-bottom', B + 'px');
    caseCard.style.paddingTop = finalPad + 'px';
    root.classList.add('frame');
    framed = true;
    if (!caseCard.querySelector('.swipe-hint')){
      var ctaStyle = (caseCard.querySelector('.case-page-cta') || {}).style;
      caseCard.appendChild(makeSwipeHint('Swipe left or right for the previous or next case study', ctaStyle && ctaStyle.getPropertyValue('--cta-rest')));   // the case study's own colour
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
      pendingFrameAnim = ndaHold ? null : enterFrame();   // (case studies only; it does nothing without a case-study card)
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
        var anim = (caseCard && !ndaHold) ? enterFrame() : null;   // measured after the fonts, since the card's height depends on them
        var scroller = (cardEl && window.getComputedStyle(cardEl).overflowY === 'auto') ? cardEl : null;   // phones: the card scrolls
        watch(targets, scroller);
        if (framed) revealBar(anim);
      });
    });
  }

  /* ---------------- 5. The "Back to home" / "Back to Endeavors" button docks into a circle ----------------
     On the case studies and on every Creative Endeavors page. (The heading below says desktop because that is where it began; phones dock too.) */
  // When the button scrolls up to the height of the Home nav circle it stops there and morphs: it shrinks to a circle
  // the size of the nav buttons (the label gives way to an arrow) while travelling to the column that pinstripes 6 and 7
  // make, and stays fixed there. Scrolling back up reverses it into the button's own place in the card.
  var DOCK_COLUMN = 'pinstripes';   // 'pinstripes': the middle of the column pinstripes 6 and 7 make (the card's right edge)
                                    // 'gutter': the middle of the space beyond the card, between its edge and pinstripe 7
  var dock = null, dockLabel = null, dockArrow = null, dockState = 'idle', dockMix = 0, dockRaf = 0, dockBrand = [27, 28, 30], dockInk = '#F2F1EC', dockRest = null;
  var dockCard = caseCard || pageCard;   // the card whose button docks: a case study, or a Creative Endeavors page
  var cta = dockCard ? dockCard.querySelector('.case-page-cta') : null;
  var ctaName = cta ? cta.textContent.replace(/\s*\u2190\s*$/, '').trim() : '';   // "Back to home" or "Back to Endeavors": the button's own words, without its arrow
  if (cta){
    dock = document.createElement('a');
    dock.className = 'case-page-cta back-dock';
    dock.href = cta.getAttribute('href');
    dock.setAttribute('aria-label', ctaName);
    dock.setAttribute('style', cta.getAttribute('style') || '');   // carries the case study's colors (--cta-rest, --cta-fill)
    dock.innerHTML = '<span class="dock-label">' + cta.innerHTML + '</span>' +
      '<svg class="dock-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      '<span class="tooltip tip-right"></span>';   // the same bubble as the right-hand nav buttons: on the left of the button, arrow pointing at it
    dock.querySelector('.tooltip').textContent = ctaName;
    dock.style.display = 'none';
    document.body.appendChild(dock);   // created before the click handlers below are attached, so it gets the roll-up too
    dockLabel = dock.querySelector('.dock-label');
    dockArrow = dock.querySelector('.dock-arrow');
    var hexBrand = /^#([0-9a-f]{6})$/i.exec((cta.style.getPropertyValue('--dock-bg') || cta.style.getPropertyValue('--cta-rest') || '').trim());   // the circle's fill: --dock-bg if the page sets one (Creative Endeavors: lime), else the case study's own colour (the No. button's)
    dockInk = (cta.style.getPropertyValue('--dock-fg') || '').trim() || dockInk;
    var hexRest = /^#([0-9a-f]{6})$/i.exec((cta.style.getPropertyValue('--cta-rest') || '').trim());   // the button's outline, which blends into the circle's fill as it morphs
    dockRest = hexRest ? [0, 2, 4].map(function(i){ return parseInt(hexRest[1].substr(i, 2), 16); }) : dockBrand;   // the arrow's colour on that fill
    if (hexBrand) dockBrand = [0, 2, 4].map(function(i){ return parseInt(hexBrand[1].substr(i, 2), 16); });
  }
  function homeCircle(){ return document.querySelector('#icon-nav a').getBoundingClientRect(); }
  // Phones: the gap between the card's top and the row of controls above it (the dots; the nav lives at the bottom now).
  // With nothing above the card, the frame's own 0.9rem.
  function frameGap(pc){
    var row = document.getElementById('case-dots'), rr = row && row.getBoundingClientRect(), h = homeCircle();
    if (rr && rr.height && rr.bottom < pc.top) return pc.top - rr.bottom;
    if (h.bottom < pc.top) return pc.top - h.bottom;
    return 0.9 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  }
  function circleRect(){
    var h = homeCircle(), size = h.width;
    if (isPhone.matches){   // phones: on the card's left edge, as far below the card's top as the card's top is below the row above it
      var pc = dockCard.getBoundingClientRect();   // on a phone both kinds of card are a fixed frame that scrolls inside itself
      return { left: pc.left - size / 2, top: pc.top + frameGap(pc), width: size, height: size };
    }
    var lines = Array.prototype.map.call(document.querySelectorAll('#grid-lines-global span'), function(e){ return e.getBoundingClientRect().x; });
    var cx = DOCK_COLUMN === 'gutter' ? (dockCard.getBoundingClientRect().right + lines[6]) / 2 : (lines[5] + lines[6]) / 2;
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
    dock.style.borderColor = (mix > 0 && dockRest) ? 'rgb(' + dockRest.map(function(v, i){ return Math.round(v + (dockBrand[i] - v) * mix); }).join(',') + ')' : '';   // outline to fill colour: no ring left on the circle
    dock.style.backgroundColor = mix > 0 ? 'rgba(' + dockBrand.join(',') + ',' + mix.toFixed(3) + ')' : '';   // the fill grows into the case study's colour...
    dockArrow.style.color = (mix < 1 || dockState === 'idle') ? dockInk : '';                                 // ...and the arrow is paper-coloured while it does (the CSS takes over once it is a circle)
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
  function settleCircle(){ dock.classList.add('is-circle'); dock.style.backgroundColor = ''; dock.style.borderColor = ''; dockArrow.style.color = ''; }
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
    if (isPhone.matches){   // phones: when the button's top is as far below the card's top as the card's top is below the row above it
      if (caseCard && !framed) return;   // (a Creative Endeavors card is always a frame on a phone; a case study only once it has settled into one)
      var fr = dockCard.getBoundingClientRect(), gap = frameGap(fr), off = r.top - fr.top;
      if (dockState === 'idle' && off <= gap) dockIn(false);
      else if (dockState === 'docked' && off > gap + 8) dockOut();
      return;
    }
    if (dockState === 'idle' && cy <= hy) dockIn(false);
    else if (dockState === 'docked' && cy > hy + 8) dockOut();   // a little slack, so it can't flicker at the threshold
  }
  if (dock){
    window.addEventListener('scroll', checkDock, { passive: true });
    dockCard.addEventListener('scroll', checkDock, { passive: true });   // phones, on a case study: the card scrolls, not the page
    window.addEventListener('resize', function(){
      if (isPhone.matches && caseCard && !framed){ dock.style.display = 'none'; cta.style.visibility = ''; dockState = 'idle'; return; }
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
  var CASE_BG = { liteload: '#C2C2C2', walgreens: '#AFBFFD', ebay: '#B1CC72', cisco: '#80CCEC', urban: '#2C2A2F' };
  var swipeEl = caseCard || (document.getElementById('case-dots') ? pageCard : null);   // the case studies, and the Creative Endeavors pages that have the dots (not the hub)
  if (swipeEl){
    var dotLinks = Array.prototype.slice.call(document.querySelectorAll('#case-dots a'));   // the order of the dots is the order of the loop
    var hereIdx = -1; dotLinks.forEach(function(d, i){ if (d.classList.contains('active')) hereIdx = i; });
    var prevLink = hereIdx < 0 ? null : dotLinks[(hereIdx - 1 + dotLinks.length) % dotLinks.length];
    var nextLink = hereIdx < 0 ? null : dotLinks[(hereIdx + 1) % dotLinks.length];
    var canSwipe = function(){ return caseCard ? framed : isPhone.matches; };
    if (!caseCard && isPhone.matches && !swipeEl.querySelector('.swipe-hint')) swipeEl.appendChild(makeSwipeHint('Swipe left or right for the previous or next page'));   // Creative Endeavors: the hint ends the card
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
      var barPick = badge && badge.style.getPropertyValue('--bar-color').trim();   // a page may pick a lighter colour for the bar when it sits on a dark ground
      if (badge) bar.style.setProperty('--bar', barPick || window.getComputedStyle(badge).backgroundColor);
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


/* ---------------- 9. Phones: the fade under the nav on pages without a card ----------------
   A band in the page's background color sits between the scrolling content and the nav, solid to the bottom
   of the icons, then fading out over two icon diameters (sizes in shared.css). On the homepage the background
   changes color from section to section, so the band reads the live color of #bg-layer every frame. The
   pinstripes would vanish under the band, so a copy of them sits on top of it: same padding, same dashed
   border, offset by the scroll position so its dashes line up exactly with the real lines below. */
(function(){
  if (document.querySelector('.page-card, .case-page-card')) return;   // card pages clip their own content
  var lines = document.getElementById('grid-lines-global');
  if (!lines) return;
  var hasTopRow = !!document.getElementById('progress-nav');          // only the homepage has a row of controls up top now
  makeBand('bottom');
  if (!hasTopRow) return;
  function makeBand(side){   // the band and pinstripe copy under the bottom nav: the top band below, mirrored
    var phoneQ = window.matchMedia('(max-width: 720px)');
    var b = document.createElement('div'); b.id = side + '-fade'; b.setAttribute('aria-hidden', 'true');
    var t = document.createElement('div'); t.id = side + '-fade-lines'; t.setAttribute('aria-hidden', 'true');
    var inn = document.createElement('div'); t.appendChild(inn);
    t.style.webkitMaskImage = t.style.maskImage = 'linear-gradient(to top, #000 0, #000 calc(100% - 8px), transparent 100%)';
    var sp = Array.prototype.map.call(lines.children, function(){ var x = document.createElement('span'); inn.appendChild(x); return x; });
    document.body.appendChild(b); document.body.appendChild(t);
    var bg = document.getElementById('bg-layer'), lastC = '', lastY = -1, lastH = -1, lastV = -1, lastW2 = -1;
    function copy(){
      var ls = getComputedStyle(lines);
      inn.style.paddingLeft = ls.paddingLeft; inn.style.paddingRight = ls.paddingRight;
      Array.prototype.forEach.call(lines.children, function(src, i){
        var cs = getComputedStyle(src);
        sp[i].style.display = cs.display;
        sp[i].style.borderLeft = cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor;
        sp[i].style.mixBlendMode = cs.mixBlendMode;
      });
    }
    function tick(){
      if (phoneQ.matches){
        var c = getComputedStyle(bg || document.body).backgroundColor;
        if (window.innerWidth !== lastW2){ lastW2 = window.innerWidth; copy(); }   // a resized window moves the pinstripes: follow them
        if (c !== lastC){
          lastC = c;
          var m = c.match(/\d+(\.\d+)?/g) || [16, 17, 20];
          b.style.background = 'linear-gradient(to top, ' + c + ' 0, ' + c + ' calc(100% - 8px), rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',0) 100%)';   // content fades over a few pixels at the circles' top edge, then is hidden behind the nav
          copy();
        }
        var y = window.scrollY, h = lines.offsetHeight, v = window.innerHeight - t.offsetHeight;
        if (y !== lastY || h !== lastH || v !== lastV){ inn.style.top = (lines.offsetTop - y - v) + 'px'; inn.style.height = h + 'px'; lastY = y; lastH = h; lastV = v; }
      }
      requestAnimationFrame(tick);
    }
    copy(); requestAnimationFrame(tick);
  }
  var phone = window.matchMedia('(max-width: 720px)');
  var band = document.createElement('div'); band.id = 'top-fade'; band.setAttribute('aria-hidden', 'true');
  var top = document.createElement('div'); top.id = 'top-fade-lines'; top.setAttribute('aria-hidden', 'true');
  var inner = document.createElement('div'); top.appendChild(inner);
  top.style.webkitMaskImage = top.style.maskImage = 'linear-gradient(to bottom, #000 0, #000 calc(100% - 8px), transparent 100%)';   // the copy fades with the band, so the real lines and the copy never double up
  var spans = Array.prototype.map.call(lines.children, function(){ var s = document.createElement('span'); inner.appendChild(s); return s; });
  document.body.appendChild(band); document.body.appendChild(top);
  var bgLayer = document.getElementById('bg-layer');
  var lastColor = '', lastY = -1, lastH = -1, lastWidth = -1;
  function copyLines(){
    var ls = getComputedStyle(lines);
    inner.style.paddingLeft = ls.paddingLeft; inner.style.paddingRight = ls.paddingRight;
    Array.prototype.forEach.call(lines.children, function(src, i){
      var cs = getComputedStyle(src), s = spans[i];
      s.style.display = cs.display;
      s.style.borderLeft = cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor;
      s.style.mixBlendMode = cs.mixBlendMode;
    });
  }
  function frame(){
    if (phone.matches){
      var c = getComputedStyle(bgLayer || document.body).backgroundColor;
      if (window.innerWidth !== lastWidth){ lastWidth = window.innerWidth; copyLines(); }   // a resized window moves the pinstripes: follow them
      if (c !== lastColor){
        lastColor = c;
        var m = c.match(/\d+(\.\d+)?/g) || [16, 17, 20];
        var clear = 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',0)';
        band.style.background = 'linear-gradient(to bottom, ' + c + ' 0, ' + c + ' calc(100% - 8px), ' + clear + ' 100%)';   // content is hidden behind the dots pill and fades out over its last few pixels
        copyLines();   // the homepage recolors its lines with the background, so follow along
      }
      var y = window.scrollY, h = lines.offsetHeight;
      if (y !== lastY || h !== lastH){ inner.style.top = (lines.offsetTop - y) + 'px'; inner.style.height = h + 'px'; lastY = y; lastH = h; }
    }
    requestAnimationFrame(frame);
  }
  copyLines();
  requestAnimationFrame(frame);
})();

/* ---------------- 11. Phones: Endeavors watermarks sized to the No. badge ----------------
   Measures each tilted icon's actual drawn extent, then scales and places it: as tall as the tile's No. badge and
   level with it, its rightmost point as far in from the tile's right edge as the badge is from the left. A wide icon
   (the roller and its long handle) is held to under half the tile's width instead, centred on the badge's height.
   The tilt is applied in the maths here, not read back from the browser: Safari leaves CSS transforms out of
   getScreenCTM. Desktop and tablet are untouched. */
(function(){
  var marks = document.querySelectorAll('.page-card .card .card-mark');
  if (!marks.length) return;
  var phone = window.matchMedia('(max-width: 720px)');
  var S = Math.SQRT1_2;   // sin and cos of 45 degrees
  function extent(svg){   // [top, bottom, left, right] in px from the icon's centre, after the -45 degree tilt
    var w = parseFloat(getComputedStyle(svg).width) || 44, h = parseFloat(getComputedStyle(svg).height) || w;
    var e = [Infinity, -Infinity, Infinity, -Infinity];
    svg.querySelectorAll('path, rect, circle, line, polyline').forEach(function(el){
      if (el.closest('defs') || !el.getTotalLength) return;
      var m = el.getCTM(), len, n, i, p, x, y, ty, tx;
      if (!m) return;
      try { len = el.getTotalLength(); } catch (err){ return; }
      n = Math.max(8, Math.ceil(len * 2));
      for (i = 0; i <= n; i++){
        p = el.getPointAtLength(len * i / n);
        x = m.a * p.x + m.c * p.y + m.e - w / 2;
        y = m.b * p.x + m.d * p.y + m.f - h / 2;
        ty = S * (y - x); tx = S * (x + y);     // after rotate(-45deg)
        if (ty < e[0]) e[0] = ty; if (ty > e[1]) e[1] = ty;
        if (tx < e[2]) e[2] = tx; if (tx > e[3]) e[3] = tx;
      }
    });
    return e;
  }
  function fit(){
    marks.forEach(function(svg){
      ['--mk-k', '--mk-dy', '--mk-dx'].forEach(function(v){ svg.style.removeProperty(v); });
      if (!phone.matches) return;
      var card = svg.parentNode, badge = card.querySelector('.badge-link'); if (!badge) return;
      var b = badge.getBoundingClientRect(), cr = card.getBoundingClientRect(), e = extent(svg);
      if (!(e[1] > e[0]) || !(e[3] > e[2])) return;
      var box = svg.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;   // the tilt turns about the centre
      var k = Math.min(b.height / (e[1] - e[0]), (cr.width * 0.45) / (e[3] - e[2]));
      var dy = (b.top + b.height / 2) - (cy + k * (e[0] + e[1]) / 2);       // level with the badge
      var dx = (cr.right - (b.left - cr.left)) - (cx + k * e[3]) + 5;       // mirrored inset from the right edge, nudged 5px further right
      svg.style.setProperty('--mk-k', k.toFixed(4));
      svg.style.setProperty('--mk-dy', dy.toFixed(2) + 'px');
      svg.style.setProperty('--mk-dx', dx.toFixed(2) + 'px');
    });
  }
  var t; function soon(){ clearTimeout(t); t = setTimeout(fit, 120); }
  window.addEventListener('load', fit); window.addEventListener('resize', soon);
  if (document.readyState === 'complete') fit();
})();

/* ---------------- 12. NDA case studies: the password veil ----------------
   Walgreens, eBay and Cisco are under NDA. Their homepage teasers stay open to everyone; their own pages hold only
   ciphertext (tools/lock.mjs writes it). This veils the page's card and decrypts with Web Crypto once the right password is entered (PBKDF2-SHA256 key, AES-256-GCM, so a
   wrong password simply fails to open). The homepage checks a small sealed token in <meta name="case-lock">. A good
   password is kept for the rest of the browser session, so it's typed once. */
(function(){
  var homeCards = document.querySelectorAll('.case-card[data-nda]');
  var sealed = document.querySelector('.case-text[data-locked]');
  var token = document.querySelector('meta[name="case-lock"]');
  if (!homeCards.length && !sealed) return;
  var KEY = 'bp-case-pass', te = new TextEncoder(), td = new TextDecoder();
  function b64(s){ var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function open(blob, pass){   // resolves to the plain text, or rejects if the password is wrong
    var p = blob.split('.'), rounds = parseInt(p[0], 10);
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('no-crypto'));
    return crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey'])
      .then(function(base){ return crypto.subtle.deriveKey({ name:'PBKDF2', salt:b64(p[1]), iterations:rounds, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['decrypt']); })
      .then(function(key){ return crypto.subtle.decrypt({ name:'AES-GCM', iv:b64(p[2]) }, key, b64(p[3])); })
      .then(function(buf){ return td.decode(buf); });
  }
  function check(pass){ return open(sealed ? sealed.getAttribute('data-locked') : token.getAttribute('content'), pass); }
  function reveal(pass, text){
    try { sessionStorage.setItem(KEY, pass); } catch (e){}
    if (sealed && typeof text === 'string'){ sealed.innerHTML = text; sealed.removeAttribute('data-locked'); }
    document.querySelectorAll('.lock-veil').forEach(function(v){ v.classList.add('is-open'); v.setAttribute('aria-hidden', 'true'); });
    if (window.__ndaRelease) window.__ndaRelease();
  }
  function colours(card){
    var badge = card.querySelector('.badge-link'), thread = card.querySelector('.thread');
    var ink = (badge && badge.style.getPropertyValue('--badge-color').trim()) || '#1B1C1E';
    var accent = thread ? getComputedStyle(thread).color : ink;
    if (card.getAttribute('data-lock-rule') === 'page') accent = getComputedStyle(document.body).backgroundColor;   // Walgreens, Cisco: the page's own light colour
    return [ink, accent];
  }
  function veil(card, name, onPage){
    var c = colours(card), v = document.createElement('div');
    v.className = 'lock-veil is-shown rv-static';   // added after the reveal engine has made its list, so it shows at once
    v.style.setProperty('--lock-ink', c[0]); v.style.setProperty('--lock-accent', c[1]);
    var hx = /^#([0-9a-f]{6})$/i.exec(c[0]);   // the badge's hover ring: its colour at 30%, as on the No. badges
    v.style.setProperty('--lock-ink-30', hx ? 'rgba(' + [0, 2, 4].map(function(i){ return parseInt(hx[1].substr(i, 2), 16); }).join(',') + ',0.3)' : 'rgba(0,0,0,0.3)');
    var id = 'lock-' + Math.random().toString(36).slice(2, 8);
    v.innerHTML = '<form class="lock-form" novalidate>' +
      '<span class="lock-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>' +
      '<svg class="lock-rule" viewBox="0 0 78 6" width="78" height="6" aria-hidden="true"><line x1="3" y1="3" x2="75" y2="3" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="12,4,4,4,4,4,4,4,12,4,4,4,8,40"/></svg>' +   // seven dashes, unevenly
      '<p class="lock-title">' + name + ' is under NDA</p>' +
      '<p class="lock-note">Enter the password to see the work, or <a href="about.html">get in touch</a> for access.</p>' +
      '<div class="lock-row"><label class="sr-only" for="' + id + '">Password</label>' +
      '<input id="' + id + '" type="password" autocomplete="current-password" placeholder="Password" required>' +
      '<button type="submit">Unlock</button></div>' +
      '<p class="lock-error" role="status" aria-live="polite"></p>' +
      (onPage ? '<a class="lock-back" href="index.html#to-' + location.pathname.split('/').pop().replace(/\.html$/, '') + '">Back to home ←</a>' : '') +
      '</form>';
    v.classList.add('is-arriving');
    card.appendChild(v);
    setTimeout(function(){ requestAnimationFrame(function(){ v.classList.remove('is-arriving'); }); }, onPage ? 350 : 0);   // fade in once the card has landed
    var back = v.querySelector('.lock-back');
    if (back) back.addEventListener('click', function(e){   // back to this card on the homepage, exactly as the page's own button goes:
      var cta = card.querySelector('.case-page-card > .case-page-cta, .case-page-cta:not(.back-dock)');
      if (!cta || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      v.classList.add('is-open');                                   // the veil fades off the card first
      setTimeout(function(){ cta.click(); }, 300);                  // then the usual hand-off: the homepage picks the card up where it is
    });
    var form = v.querySelector('form'), input = v.querySelector('input'), err = v.querySelector('.lock-error');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var pass = input.value; if (!pass) { input.focus(); return; }
      form.querySelector('button').disabled = true; err.textContent = '';
      check(pass).then(function(text){ reveal(pass, text); })
        .catch(function(x){
          err.textContent = (x && x.message === 'no-crypto') ? 'This browser can’t unlock it. Try a recent Chrome, Safari or Firefox.' : 'That’s not it. Try again.';
          form.classList.remove('is-wrong'); void form.offsetWidth; form.classList.add('is-wrong');
          input.select();
        })
        .then(function(){ form.querySelector('button').disabled = false; });
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function(t){ v.addEventListener(t, function(e){ e.stopPropagation(); }, { passive:true }); });   // typing here never triggers the card's swipe or scroll-snap
    return v;
  }
  homeCards.forEach(function(card){ var h = card.querySelector('h2'); veil(card, h ? h.textContent.trim() : 'This case study', false); });
  if (sealed){
    var card = sealed.closest('.case-page-card'); card.classList.add('is-nda');
    var h = card.querySelector('h2'), pv = veil(card, h ? h.textContent.trim() : 'This case study', true);

  }
  var saved = null; try { saved = sessionStorage.getItem(KEY); } catch (e){}
  if (saved) check(saved).then(function(text){ reveal(saved, text); }).catch(function(){ try { sessionStorage.removeItem(KEY); } catch (e){} });
})();

/* ---------------- 13. Tooltip accent on case-study pages: the case study's own colour ---------------- */
(function(){
  var card = document.querySelector('.case-page-card'), th = card && card.querySelector('.thread'), bd = card && card.querySelector('.badge-link');
  var tip = (card && card.getAttribute('data-tip-accent') === 'badge' && bd) ? bd.style.getPropertyValue('--badge-color').trim() : (th ? getComputedStyle(th).color : '');
  if (tip) document.documentElement.style.setProperty('--tip-accent', tip);
})();
