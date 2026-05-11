var root = metaData.root;
var albumTags = metaData ? metaData.tags : [];

var gallery = document.getElementById('gallery');
var viewer = document.getElementById('viewer');
var viewerImage = document.getElementById('viewerImage');
var viewerClose = document.getElementById('viewerClose');
var bcHome = document.getElementById('bcHome');
var bcSep = document.getElementById('bcSep');
var bcCurrent = document.getElementById('bcCurrent');
var buttons = document.querySelectorAll('.btn');

var currentView = null;
var currentAlbumDir = null;
var rendered = 0;
var galleryData = [];
var loadMoreObserver = null;
var sentinel = null;

buttons.forEach(function(btn) {
  btn.addEventListener('click', function() {
    buttons.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.documentElement.style.setProperty('--cols', btn.dataset.cols);
  });
});

function openViewer(src) {
  viewerImage.src = src;
  viewer.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  viewer.classList.remove('show');
  viewerImage.src = '';
  document.body.style.overflow = '';
}

viewerClose.addEventListener('click', closeViewer);
viewer.addEventListener('click', function(e) {
  if (e.target === viewer) closeViewer();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeViewer();
});

bcHome.addEventListener('click', function() {
  location.hash = '#/';
});

function clearGallery() {
  gallery.innerHTML = '';
  rendered = 0;
  galleryData = [];
  if (loadMoreObserver && sentinel) {
    loadMoreObserver.unobserve(sentinel);
    loadMoreObserver.disconnect();
  }
  if (sentinel && sentinel.parentNode) {
    sentinel.parentNode.removeChild(sentinel);
  }
  sentinel = null;
  loadMoreObserver = null;
}

function showBreadcrumb(albumDir, albumName) {
  bcSep.style.display = '';
  bcCurrent.style.display = '';
  bcCurrent.textContent = albumDir + '.' + albumName;
}

function hideBreadcrumb() {
  bcSep.style.display = 'none';
  bcCurrent.style.display = 'none';
  bcCurrent.textContent = '';
}

function renderHome() {
  currentView = 'home';
  currentAlbumDir = null;
  clearGallery();
  hideBreadcrumb();
  albums.forEach(function(album) {
    var dir = album[0];
    var name = album[2];
    var card = document.createElement('div');
    card.className = 'item';
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = root + '/' + dir + '/c.avif';
    card.appendChild(img);
    var label = document.createElement('div');
    label.className = 'cover-label';
    label.textContent = dir + '.' + name;
    card.appendChild(label);
    var tags = document.createElement('div');
    tags.className = 'tags';
    albumTags.forEach(function(t, idx) {
      var s = document.createElement('span');
      s.textContent = t;
      s.setAttribute('data-color', idx % 5);
      tags.appendChild(s);
    });
    card.appendChild(tags);
    card.addEventListener('click', function() {
      location.hash = '#/album/' + dir;
    });
    gallery.appendChild(card);
  });
}

var PAGE_SIZE = 120;

function renderAlbum(dir) {
  var album = null;
  for (var i = 0; i < albums.length; i++) {
    if (albums[i][0] === dir) { album = albums[i]; break; }
  }
  if (!album) { location.hash = '#/'; return; }
  var count = album[1];
  var name = album[2];

  currentView = 'album';
  currentAlbumDir = dir;
  clearGallery();
  showBreadcrumb(dir, name);

  galleryData = [];
  for (var j = 1; j <= count; j++) {
    galleryData.push(root + '/' + dir + '/' + j + '.avif');
  }

  renderNextChunk();

  sentinel = document.createElement('div');
  sentinel.style.height = '1px';
  document.body.appendChild(sentinel);
  loadMoreObserver = new IntersectionObserver(function(entries) {
    for (var k = 0; k < entries.length; k++) {
      if (entries[k].isIntersecting && rendered < galleryData.length) {
        renderNextChunk();
      }
    }
  }, { rootMargin: '3000px 0px' });
  loadMoreObserver.observe(sentinel);
}

function renderNextChunk() {
  var end = Math.min(rendered + PAGE_SIZE, galleryData.length);
  var fragment = document.createDocumentFragment();
  for (var i = rendered; i < end; i++) {
    var card = document.createElement('div');
    card.className = 'item';
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = galleryData[i];
    card.appendChild(img);
    card.addEventListener('click', (function(idx) {
      return function() { openViewer(galleryData[idx]); };
    })(i));
    fragment.appendChild(card);
  }
  gallery.appendChild(fragment);
  rendered = end;
}

function route() {
  var hash = location.hash || '#/';
  if (hash.indexOf('#/album/') === 0) {
    var dir = parseInt(hash.substring('#/album/'.length), 10);
    if (currentView === 'album' && currentAlbumDir === dir) return;
    renderAlbum(dir);
  } else {
    if (currentView === 'home') return;
    renderHome();
  }
}

window.addEventListener('hashchange', route);
route();
