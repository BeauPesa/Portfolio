// Site-wide helpers.
// 1. Morse breaks: the single "BP" pattern stretched to fill the break exactly, so the line always ends on the
//    pinstripe it is stretched to (pinstripe 2 -> 4).
// 2. Phones: a thin lime progress bar beside the Creative Endeavors card, which scrolls inside a fixed height.
// 3. Every page: cards fade in, and every element rises into place as it enters (and as you scroll to it).
// 4. Case-study pages: the card is one long sheet. From the homepage it keeps going where the homepage card
//    left off and unrolls downwards; "Back to home" rolls it back up to the homepage card's size first.
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
  var flight = root.classList.contains('flight') && !!caseCard;   // arriving from the homepage card
  if (flight){ try { sessionStorage.removeItem('cardFlight'); } catch (e) {} }

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
    }, { root: scroller || null, rootMargin: '0px 0px -8% 0px' });
    list.forEach(function(el){ io.observe(el); });
  }

  if (flight){
    // The homepage card was on screen a moment ago and must not vanish: everything on the first screen is simply
    // there, the sheet unrolls from the card's bottom edge, and only what is further down arrives as you scroll.
    var vh = window.innerHeight, below = [];
    targets.forEach(function(el){
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) show(el, 0, 0, true);
      else { el.classList.add('rv-hide'); below.push(el); }
    });
    watch(below, null);
    var cr = caseCard.getBoundingClientRect();
    caseCard.style.setProperty('--roll-stop', Math.max(60, vh - cr.bottom + 12) + 'px');
    caseCard.classList.add('is-unrolling');
  } else {
    whenFontsReady(function(){
      requestAnimationFrame(function(){
        if (cardEl) cardEl.classList.add('is-in');
        baseDelay = cardEl ? 0.35 : 0.1;                     // with a card, wait for it to appear first
        var scroller = (pageCard && window.getComputedStyle(pageCard).overflowY === 'auto') ? pageCard : null;   // phones: the card scrolls
        watch(targets, scroller);
      });
    });
  }

  /* ---------------- 4. Case-study pages: heading back home ---------------- */
  if (caseCard){
    var nav = document.getElementById('case-nav'), leaving = false;
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="index.html"]'), function(a){
      a.addEventListener('click', function(e){
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (reduce) return;
        var rollUp = a.getAttribute('href').indexOf('#to-') > -1;     // "Back to home" returns to the card; the Home icon doesn't
        if (!rollUp && (!nav || isPhone.matches)) return;
        e.preventDefault();
        if (leaving) return;
        leaving = true;
        var href = a.href;
        if (nav && !isPhone.matches) nav.classList.remove('collapsed');   // the nav plays its animation in reverse
        if (!rollUp){ setTimeout(function(){ window.location.href = href; }, 950); return; }
        var roll = function(){
          var r = caseCard.getBoundingClientRect();
          caseCard.style.setProperty('--roll-stop', Math.max(60, window.innerHeight - r.bottom + 4) + 'px');
          caseCard.classList.remove('is-unrolling');
          caseCard.classList.add('is-rolling-up');
          setTimeout(function(){ window.location.href = href; }, 950);
        };
        if (window.scrollY > 4){   // back to the top first, so the roll-up happens where you can see it
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(roll, Math.min(900, 250 + window.scrollY * 0.3));
        } else roll();
      });
    });
    window.addEventListener('pageshow', function(ev){
      if (ev.persisted){ leaving = false; caseCard.classList.remove('is-rolling-up'); if (nav) nav.classList.add('collapsed'); }
    });
  }

  /* ---------------- 2. Phones: progress bar ---------------- */
  var card = document.querySelector('.page-card');
  if (card){
    var bar = document.createElement('div');
    bar.className = 'card-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div class="card-progress-thumb"></div>';
    document.body.appendChild(bar);
    var thumb = bar.firstChild, phone = isPhone;
    var layout = function(){
      var scrollable = phone.matches && card.scrollHeight > card.clientHeight + 1;
      bar.style.display = scrollable ? 'block' : 'none';
      if (!scrollable) return;
      var r = card.getBoundingClientRect();
      bar.style.top = r.top + 'px';
      bar.style.height = r.height + 'px';
      bar.style.left = (r.right + 10) + 'px';
      var h = Math.max(28, r.height * card.clientHeight / card.scrollHeight);
      var max = card.scrollHeight - card.clientHeight, p = max > 0 ? card.scrollTop / max : 0;
      thumb.style.height = h + 'px';
      thumb.style.transform = 'translateY(' + ((r.height - h) * p) + 'px)';
    };
    card.addEventListener('scroll', layout, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    if (window.ResizeObserver){
      var ro = new ResizeObserver(layout);
      ro.observe(card);
      Array.prototype.forEach.call(card.children, function(c){ ro.observe(c); });
    }
    layout();
  }
})();
