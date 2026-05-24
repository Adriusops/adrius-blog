(function () {
  if (typeof GLightbox === 'undefined') return;

  // Wrap toutes les images de contenu article dans un lien pour GLightbox
  document.querySelectorAll('.content img:not(.no-zoom)').forEach(function (img) {
    if (img.closest('a')) return; // déjà dans un lien
    var src = img.currentSrc || img.src;
    if (!src) return;

    var a = document.createElement('a');
    a.href = src;
    a.setAttribute('data-gallery', 'article');
    a.setAttribute('data-alt', img.alt || '');
    a.setAttribute('class', 'glightbox');
    img.parentNode.insertBefore(a, img);
    a.appendChild(img);
  });

  var lightbox = GLightbox({
    selector: '.glightbox',
    touchNavigation: true,
    loop: false,
    zoomable: true,
    draggable: true,
    openEffect: 'fade',
    closeEffect: 'fade',
    slideEffect: 'slide',
  });

})();
