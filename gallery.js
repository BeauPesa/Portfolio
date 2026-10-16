// Gallery tiles (Photography, Screen Printing, Sketchbooks, Writing).
//
// Every tile is one big link. With a picture (<img>) inside, the tile is a square crop of it: black and white until
// you hover, when it lifts, goes to colour, and is framed in a colour taken from the picture itself.
//
//  - Where it goes: a tile whose <a> has data-link (an article, say) keeps its own href and opens in a new tab.
//    Any other tile with a picture opens that picture full size in a new tab (add data-full="path/to/bigger.jpg"
//    on the <img> to open a larger version than the thumbnail). Placeholder tiles (no <img> yet) do nothing.
//  - The frame colour is worked out in the browser from the picture's colour histogram: every pixel votes for its
//    hue, weighted by how saturated and bright it is (so a vivid subject outvotes a big grey wall), and the winning
//    hue's average colour is lifted into a range that reads as a frame. Pictures with almost no colour get a dark
//    neutral from their tonal range instead.
//  - If the browser is not allowed to read the pixels (a picture hosted on another site that doesn't permit it), the
//    frame falls back to the site's lime accent and the tile says so in data-frame-source. Pictures on this site
//    always work. To pin a colour by hand, put data-frame="#RRGGBB" on the <img>.
(function(){
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

  // Read the picture's pixels (the square the tile shows) on a separate copy, so the tile's own picture never depends on it.
  function measure(img, done){
    var probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = function(){
      try {
        var N = 48, cv = document.createElement('canvas'), ctx;
        cv.width = N; cv.height = N; ctx = cv.getContext('2d');
        var side = Math.min(probe.naturalWidth, probe.naturalHeight), sx = (probe.naturalWidth - side) / 2, sy = (probe.naturalHeight - side) / 2;
        ctx.drawImage(probe, sx, sy, side, side, 0, 0, N, N);
        done(frameColour(ctx.getImageData(0, 0, N, N).data));
      } catch (e){ done(null); }   // the pixels are off limits
    };
    probe.onerror = function(){ done(null); };
    probe.src = img.currentSrc || img.getAttribute('src');
  }
  function setFrame(tile, colour, source){
    if (colour) tile.style.setProperty('--tile-border', colour);
    tile.setAttribute('data-frame', colour || '');
    tile.setAttribute('data-frame-source', source);
  }

  var tiles = document.querySelectorAll('.gallery-grid .tile');
  Array.prototype.forEach.call(tiles, function(tile){
    var img = tile.querySelector('img');
    if (!img){
      tile.addEventListener('click', function(e){ e.preventDefault(); });   // a placeholder
      return;
    }
    tile.classList.add('has-img');
    if (!tile.hasAttribute('data-link')){
      tile.href = img.getAttribute('data-full') || img.getAttribute('src');
      tile.target = '_blank';
      tile.rel = 'noopener';
      tile.setAttribute('aria-label', img.alt ? 'Open ' + img.alt + ' full size' : 'Open image full size');
    }
    var pinned = img.getAttribute('data-frame');
    if (pinned){ setFrame(tile, pinned, 'pinned'); return; }
    var run = function(){ measure(img, function(c){ setFrame(tile, c, c ? 'histogram' : 'fallback'); }); };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  });
  window.tileFrames = function(){   // handy in the console: what colour each tile settled on, and how
    return Array.prototype.map.call(tiles, function(t){ return { tile: (t.querySelector('img') || {}).alt || t.textContent.trim(), colour: t.getAttribute('data-frame'), source: t.getAttribute('data-frame-source') }; });
  };
})();
