// Gallery tiles (Photography, Screen Printing, Sketchbooks).
// Every tile is one big link to its picture. When you add a real photo, put an
// <img> inside the tile and this makes the whole tile open that image full size
// in a new tab (add data-full="path/to/bigger.jpg" on the <img> to open a larger
// version than the thumbnail). Placeholder tiles (no <img> yet) do nothing on click.
(function(){
  var tiles = document.querySelectorAll('.gallery-grid .tile');
  Array.prototype.forEach.call(tiles, function(tile){
    var img = tile.querySelector('img');
    if (img){
      tile.classList.add('has-img');
      tile.href = img.getAttribute('data-full') || img.getAttribute('src');
      tile.target = '_blank';
      tile.rel = 'noopener';
      tile.setAttribute('aria-label', img.alt ? 'Open ' + img.alt + ' full size' : 'Open image full size');
    } else {
      tile.addEventListener('click', function(e){ e.preventDefault(); });
    }
  });
})();
