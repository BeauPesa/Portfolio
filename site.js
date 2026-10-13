// Site-wide helpers.
// 1. Morse breaks: a single "BP" (dash-dot-dot-dot, dot-dash-dash-dot), stretched so the line runs the full
//    width of the break (pinstripe 2 -> 4). Dots, dashes and gaps all lengthen in proportion (a dot stays a
//    third of a dash); the thickness of the line stays 3px.
// 2. Phones: a thin lime progress bar beside the Creative Endeavors card, which scrolls inside a fixed height.
// 3. Case-study pages: the card's parts arrive in turn, and anything further down arrives as you scroll to it.
(function(){
  // One "BP" (dash-dot-dot-dot, dot-dash-dash-dot, even gaps = 21 units), stretched along the line so it runs the
  // full width of the break. The stroke stays 3px thick with round ends; only the lengths stretch.
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

  // 3. Case-study pages: the card's parts arrive in turn, like the homepage, and anything further down arrives as you
  //    scroll to it. Everything directly inside the card takes part, and so does anything marked data-reveal.
  var cc = document.querySelector('.case-page-card');
  if (cc){
    window.__rvReady = true;   // tells the page's safety timer that this script loaded
    var targets = Array.prototype.slice.call(cc.children);
    Array.prototype.forEach.call(cc.querySelectorAll('[data-reveal]'), function(el){ if (targets.indexOf(el) < 0) targets.push(el); });
    var firstBatch = true;
    var beginReveal = function(){
      if (!('IntersectionObserver' in window)){
        targets.forEach(function(el){ el.classList.add('is-shown'); });
        return;
      }
      var io = new IntersectionObserver(function(entries){
        var batch = entries.filter(function(e){ return e.isIntersecting; })
          .sort(function(a, b){ return a.boundingClientRect.top - b.boundingClientRect.top; });
        batch.forEach(function(e, i){
          var el = e.target;
          el.style.setProperty('--d', i);                           // order within the group that arrives together
          el.style.setProperty('--b', firstBatch ? '0.35s' : '0s'); // the first screen waits for the card to appear
          el.classList.add('is-shown');
          io.unobserve(el);
        });
        if (batch.length) firstBatch = false;
      }, { rootMargin: '0px 0px -8% 0px' });
      targets.forEach(function(el){ io.observe(el); });
    };
    if (cc.classList.contains('is-in')) beginReveal();
    else {
      var cardWatch = new MutationObserver(function(){
        if (cc.classList.contains('is-in')){ cardWatch.disconnect(); beginReveal(); }
      });
      cardWatch.observe(cc, { attributes: true, attributeFilter: ['class'] });
    }
  }

  var card = document.querySelector('.page-card');
  if (card){
    var bar = document.createElement('div');
    bar.className = 'card-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div class="card-progress-thumb"></div>';
    document.body.appendChild(bar);
    var thumb = bar.firstChild, phone = window.matchMedia('(max-width: 720px)');
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
