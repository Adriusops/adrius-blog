// Image zoom — articles uniquement, exclut GIFs et images de UI
if (typeof mediumZoom !== 'undefined') {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var zoom = mediumZoom('.content img:not(.no-zoom)', {
    margin: 16,
    background: isDark ? 'rgba(15,15,15,0.96)' : 'rgba(245,240,232,0.96)',
    scrollOffset: 80,
  });

  var observer = new MutationObserver(function() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    zoom.update({ background: dark ? 'rgba(15,15,15,0.96)' : 'rgba(245,240,232,0.96)' });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
