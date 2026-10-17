// Gallery tiles (Photography, Printmaking, Sketchbooks, Writing).
//
// Every tile is one big link. With a picture (<img>) inside, the tile is a square crop of it: black and white until
// you hover, when it lifts, goes to colour, and is framed in a colour taken from the picture itself.
//
//  - Where it goes: a tile whose <a> has data-link (an article, say) keeps its own href and opens in a new tab.
//    Any other tile with a picture opens the VIEWER: the picture large over a see-through backdrop, with previous / next
//    (looping), a counter, swipe or drag between pictures, swipe down or Esc to close, and the arrow keys. The viewer
//    steps through every such tile on the page. Add data-full="path/to/bigger.jpg" on the <img> for a larger version
//    than the thumbnail. Cmd/Ctrl-click, or no JavaScript, still opens the full picture in its own tab.
//    Placeholder tiles (no <img> yet) do nothing.
//  - A tile marked data-soon (on a <div>, with a .tile-soon label inside) is for something that is not out yet: it shows its picture,
//    title and frame colour, and does nothing when clicked. Drop data-soon and add an <a href> when it is published.
//  - Captions: data-caption="A short title" on the <a> shows that title over the tile on hover (and focus), and in the
//    viewer. data-meta="Place - year" adds a second line. Both are optional.
//  - The frame colour is worked out in the browser from the picture's colour histogram: every pixel votes for its
//    hue, weighted by how saturated and bright it is (so a vivid subject outvotes a big grey wall), and the winning
//    hue's average colour is lifted into a range that reads as a frame. Pictures with almost no colour get a dark
//    neutral from their tonal range instead.
//  - If the browser is not allowed to read the pixels (a picture hosted on another site that doesn't permit it), the
//    frame falls back to the site's lime accent and the tile says so in data-frame-source. Pictures on this site
//    always work. To pin a colour by hand, put data-frame="#RRGGBB" on the <img>.
// Beau.1 · v0.6.0
(function(){
  window.__galleryVersion = '0.6.0';
  function hex(r, g, b){ return '#' + [r, g, b].map(function(v){ v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('').toUpperCase(); }
  function hueOf(r, g, b){
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h;
    if (!d) return 0;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  }
  function toHsl(r, g, b){
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return { h: hueOf(r * 255, g * 255, b * 255), s: s, l: l };
  }
  function fromHsl(h, s, l){
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60){ r = c; g = x; } else if (h < 120){ r = x; g = c; } else if (h < 180){ g = c; b = x; }
    else if (h < 240){ g = x; b = c; } else if (h < 300){ r = x; b = c; } else { r = c; b = x; }
    return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  // The frame colour for a set of RGBA pixels (a flat array, as from getImageData).
  function frameColour(px){
    var BINS = 24, hist = [], recs = [], lum = [], n = 0, chroma = 0, i, k;
    for (k = 0; k < BINS; k++) hist.push(0);
    for (i = 0; i < px.length; i += 4){
      if (px[i + 3] < 128) continue;
      var r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
      n++; lum.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      if (v < 0.1 || s < 0.12 || (v > 0.95 && s < 0.08)) continue;      // black, white and greys carry no hue
      var h = hueOf(r, g, b), w = s * v;
      hist[Math.floor(h / 360 * BINS) % BINS] += w; chroma += w; recs.push([h, w, r, g, b]);
    }
    if (!n) return null;
    if (chroma / n < 0.012){   // black and white, more or less: a tone rather than a hue (a small vivid subject on a neutral wall still counts as colour)
      lum.sort(function(a, b){ return a - b; });
      var tone = Math.round(255 * Math.max(0.18, Math.min(0.42, (lum[lum.length >> 1] / 255) * 0.7)));
      return hex(tone, tone, tone);
    }
    var best = -1, peak = 0;
    for (k = 0; k < BINS; k++){   // smooth the histogram a little, then take its peak
      var sm = hist[(k + BINS - 1) % BINS] * 0.25 + hist[k] * 0.5 + hist[(k + 1) % BINS] * 0.25;
      if (sm > best){ best = sm; peak = k; }
    }
    var centre = (peak + 0.5) * 360 / BINS, R = 0, G = 0, B = 0, W = 0;
    recs.forEach(function(p){
      var d = Math.abs(((p[0] - centre + 540) % 360) - 180);
      if (d <= 360 / BINS * 1.5){ R += p[2] * p[1]; G += p[3] * p[1]; B += p[4] * p[1]; W += p[1]; }
    });
    var c = toHsl(R / W, G / W, B / W);
    return fromHsl(c.h, Math.max(0.5, Math.min(0.9, c.s * 1.1)), Math.max(0.38, Math.min(0.58, c.l)));   // lifted into a range that reads as a frame
  }
  window.frameColour = frameColour;

  // Read the picture's pixels (the square the tile shows). One of our own pictures is read straight from the tile's image, with no
  // second download. A picture on another site (a Medium thumbnail) is read from a separate copy fetched with CORS, so the tile's
  // own picture never depends on the other site's headers.
  function sameOrigin(src){ try { return new URL(src, window.location.href).origin === window.location.origin; } catch (e){ return false; } }
  function measure(img, done){
    var src = img.currentSrc || img.getAttribute('src');
    function sample(source){
      try {
        var N = 48, cv = document.createElement('canvas'), ctx;
        cv.width = N; cv.height = N; ctx = cv.getContext('2d');
        var side = Math.min(source.naturalWidth, source.naturalHeight), sx = (source.naturalWidth - side) / 2, sy = (source.naturalHeight - side) / 2;
        ctx.drawImage(source, sx, sy, side, side, 0, 0, N, N);
        done(frameColour(ctx.getImageData(0, 0, N, N).data));
      } catch (e){ done(null); }   // the pixels are off limits
    }
    if (sameOrigin(src) && img.complete && img.naturalWidth){ sample(img); return; }
    var probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = function(){ sample(probe); };
    probe.onerror = function(){ done(null); };
    probe.src = src;
  }
  function setFrame(tile, colour, source){
    if (colour) tile.style.setProperty('--tile-border', colour);
    tile.setAttribute('data-frame', colour || '');
    tile.setAttribute('data-frame-source', source);
  }

  var tiles = document.querySelectorAll('.gallery-grid .tile');
  var viewable = [];   // the tiles that open in the viewer: a picture, and no data-link
  Array.prototype.forEach.call(tiles, function(tile){
    var img = tile.querySelector('img');
    if (!img){
      tile.addEventListener('click', function(e){ e.preventDefault(); });   // a placeholder
      return;
    }
    tile.classList.add('has-img');
    if (tile.hasAttribute('data-soon')){   // not out yet: its picture and title, a "Coming soon" label, and nothing happens on a click
      tile.addEventListener('click', function(e){ e.preventDefault(); });
    } else if (!tile.hasAttribute('data-link')){
      tile.href = img.getAttribute('data-full') || img.getAttribute('src');   // the no-JavaScript fallback, and Cmd/Ctrl-click
      tile.target = '_blank';
      tile.rel = 'noopener';
      viewable.push(tile);
      var cap = tile.getAttribute('data-caption');
      if (cap && !tile.querySelector('.tile-caption')){   // a caption that appears on hover
        var c = document.createElement('span'), t = document.createElement('span'), m = tile.getAttribute('data-meta');
        c.className = 'tile-caption is-hover'; c.setAttribute('aria-hidden', 'true');
        t.className = 'tile-title'; t.textContent = cap; c.appendChild(t);
        if (m){ var ms = document.createElement('span'); ms.className = 'tile-meta'; ms.textContent = m; c.appendChild(ms); }
        tile.appendChild(c);
      }
    }
    var pinned = img.getAttribute('data-frame');
    if (pinned){ setFrame(tile, pinned, 'pinned'); return; }
    var run = function(){ measure(img, function(c){ setFrame(tile, c, c ? 'histogram' : 'fallback'); }); };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  });

  /* ---------------- The viewer ---------------- */
  var lb = null, lbFrame, lbImg, lbTitle, lbMeta, lbCount, lbFull, lbPrev, lbNext, lbClose, idx = 0, pushed = false, suppress = false;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ICON = function(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
  var fullOf = function(tile){ var im = tile.querySelector('img'); return im.getAttribute('data-full') || im.getAttribute('src'); };
  var titleOf = function(tile){ return tile.getAttribute('data-caption') || (tile.querySelector('img').alt || ''); };
  var shown = viewable;   // the tiles the current theme filter shows; the viewer steps through these only
  function labelTiles(){ shown.forEach(function(tile, i){ tile.setAttribute('aria-label', 'View ' + titleOf(tile) + ', photo ' + (i + 1) + ' of ' + shown.length); }); }
  labelTiles();

  function build(){
    lb = document.createElement('div');
    lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.setAttribute('data-no-swipe', '');   // the page's own swipe between pages must not fire in here
    lb.innerHTML = '<div class="lb-backdrop"></div>' +
      '<figure class="lb-fig"><div class="lb-frame"><img class="lb-img" alt=""></div>' +
      '<figcaption class="lb-cap"><span class="lb-text"><span class="lb-title"></span><span class="lb-meta"></span></span>' +
      '<span class="lb-tools"><a class="lb-full" target="_blank" rel="noopener">Open full size &#8599;</a><span class="lb-count" aria-live="polite"></span></span></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo">' + ICON('M15 5l-7 7 7 7') + '</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next photo">' + ICON('M9 5l7 7-7 7') + '</button>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close viewer">' + ICON('M6 6l12 12M18 6L6 18') + '</button>';
    if (window.makeSwipeHint){   // the same finger-and-arrows clue as on the pages; the stylesheet shows it on phones only
      var hint = window.makeSwipeHint('Swipe left or right for the previous or next photo', '#fff'); hint.className += ' lb-hint'; lb.appendChild(hint);
    }
    document.body.appendChild(lb);
    var q = function(s){ return lb.querySelector(s); };
    lbFrame = q('.lb-frame'); lbImg = q('.lb-img'); lbTitle = q('.lb-title'); lbMeta = q('.lb-meta'); lbCount = q('.lb-count'); lbFull = q('.lb-full'); lbPrev = q('.lb-prev'); lbNext = q('.lb-next'); lbClose = q('.lb-close');
    lbPrev.addEventListener('click', function(){ show(idx - 1, -1); });
    lbNext.addEventListener('click', function(){ show(idx + 1, 1); });
    lbClose.addEventListener('click', function(){ close(); });
    lb.addEventListener('click', function(e){
      if (suppress){ suppress = false; return; }
      if (e.target === lb || e.target.classList.contains('lb-backdrop')) close();   // a click on the see-through backdrop
    });
    lb.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });   // the page behind stays where it is
    // swipe or drag: sideways steps through the pictures, down closes
    var g = null;
    lb.addEventListener('pointerdown', function(e){
      if (e.target.closest('button, a')) return;
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null, dx: 0, dy: 0 };
    });
    lb.addEventListener('pointermove', function(e){
      if (!g || e.pointerId !== g.id) return;
      var dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.axis){ if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; try { lb.setPointerCapture(e.pointerId); } catch (x) {} lbFrame.style.transition = 'none'; }
      g.dx = dx; g.dy = dy; suppress = true;
      if (g.axis === 'x') lbFrame.style.transform = 'translateX(' + dx * 0.7 + 'px)';
      else if (dy > 0){ lbFrame.style.transform = 'translateY(' + dy * 0.6 + 'px)'; lbFrame.style.opacity = String(1 - Math.min(0.6, dy / 420)); }
    });
    var release = function(e){
      if (!g || e.pointerId !== g.id) return;
      var d = g; g = null; setTimeout(function(){ suppress = false; }, 0);
      lbFrame.style.transition = 'transform 0.22s var(--ease), opacity 0.22s var(--ease)';
      var fast = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t) > 0.5;
      lbFrame.style.transform = ''; lbFrame.style.opacity = '';
      setTimeout(function(){ lbFrame.style.transition = ''; }, 240);
      if (e.type !== 'pointerup' || !d.axis) return;
      if (d.axis === 'x' && (Math.abs(d.dx) > 60 || (fast && Math.abs(d.dx) > 30))) show(idx + (d.dx < 0 ? 1 : -1), d.dx < 0 ? 1 : -1);
      else if (d.axis === 'y' && d.dy > 100) close();
    };
    lb.addEventListener('pointerup', release); lb.addEventListener('pointercancel', release);
    document.addEventListener('keydown', function(e){
      if (!lb || !lb.classList.contains('is-open')) return;
      if (e.key === 'Escape'){ e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight'){ e.preventDefault(); show(idx + 1, 1); }
      else if (e.key === 'ArrowLeft'){ e.preventDefault(); show(idx - 1, -1); }
      else if (e.key === 'Tab'){   // keep the focus inside the viewer
        var f = [lbClose, lbPrev, lbNext, lbFull], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    window.addEventListener('popstate', function(){ if (lb && lb.classList.contains('is-open')){ pushed = false; close(); } });   // the browser's Back closes the viewer
  }
  function show(i, dir){
    var n = shown.length; idx = ((i % n) + n) % n;
    var tile = shown[idx], im = tile.querySelector('img'), full = fullOf(tile), meta = tile.getAttribute('data-meta') || '';
    lb.style.setProperty('--lb-accent', tile.getAttribute('data-frame') || '#ADD944');   // framed in the picture's own colour
    lbTitle.textContent = titleOf(tile); lbMeta.textContent = meta; lbMeta.hidden = !meta;
    lbCount.textContent = (idx + 1) + ' / ' + n; lbFull.href = full; lbImg.alt = im.alt || '';
    lbImg.src = im.currentSrc || im.getAttribute('src');   // the thumbnail is already in hand: show it at once...
    var big = new Image(); big.onload = function(){ if (shown[idx] === tile) lbImg.src = full; }; big.src = full;   // ...then the full picture
    if (dir && !reduce && lbFrame.animate) lbFrame.animate([{ opacity: 0, transform: 'translateX(' + (dir > 0 ? 36 : -36) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
    [1, -1].forEach(function(d){ var p = new Image(); p.src = fullOf(shown[(idx + d + n) % n]); });   // the neighbours, ready for the next step
  }
  function open(i){
    if (!lb) build();
    lb.hidden = false; document.documentElement.classList.add('lb-open');
    show(i, 0); void lb.offsetWidth; lb.classList.add('is-open'); lbClose.focus();
    try { history.pushState({ viewer: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }
  function close(){
    if (!lb || !lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open'); document.documentElement.classList.remove('lb-open');
    var tile = shown[idx]; setTimeout(function(){ if (!lb.classList.contains('is-open')) lb.hidden = true; }, reduce ? 0 : 240);
    if (pushed){ pushed = false; try { history.back(); } catch (e) {} }
    if (tile) tile.focus();
  }
  Array.prototype.forEach.call(viewable, function(tile){
    tile.addEventListener('click', function(e){
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // Cmd/Ctrl-click: the full picture in its own tab
      e.preventDefault(); open(shown.indexOf(tile));
    });
  });


  /* ---------------- Themes: filter the gallery ----------------
     Buttons in .gallery-filters carry data-filter; tiles carry data-tags (space-separated, a tile can have several).
     "all" shows everything. The choice lives in the address (photos.html#water) so a theme can be linked to, and the
     viewer only steps through the photos that are showing. */
  var bar = document.querySelector('.gallery-filters');
  if (bar){
    var buttons = Array.prototype.slice.call(bar.querySelectorAll('button[data-filter]'));
    var tagsOf = function(tile){ return (tile.getAttribute('data-tags') || '').split(/\s+/); };
    buttons.forEach(function(b){   // how many photos each theme holds
      var k = b.getAttribute('data-filter'), n = k === 'all' ? tiles.length : Array.prototype.filter.call(tiles, function(t){ return tagsOf(t).indexOf(k) >= 0; }).length;
      var c = b.querySelector('.filter-count'); if (c) c.textContent = String(n);
      if (!n && k !== 'all') b.hidden = true;
    });
    var apply = function(k, push){
      if (!buttons.some(function(b){ return b.getAttribute('data-filter') === k; })) k = 'all';
      buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === k)); });
      Array.prototype.forEach.call(tiles, function(t){ t.hidden = !(k === 'all' || tagsOf(t).indexOf(k) >= 0); });
      shown = viewable.filter(function(t){ return !t.hidden; });
      labelTiles();
      if (push){ try { history.replaceState(history.state, '', k === 'all' ? location.pathname + location.search : '#' + k); } catch (e) {} }
    };
    buttons.forEach(function(b){ b.addEventListener('click', function(){ apply(b.getAttribute('data-filter'), true); }); });
    apply(location.hash.replace('#', '') || 'all', false);
  }

  window.tileFrames = function(){   // handy in the console: what colour each tile settled on, and how
    return Array.prototype.map.call(tiles, function(t){ return { tile: (t.querySelector('img') || {}).alt || t.textContent.trim(), colour: t.getAttribute('data-frame'), source: t.getAttribute('data-frame-source') }; });
  };
})();
