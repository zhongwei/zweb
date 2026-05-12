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

var API = 'http://127.0.0.1:18832';

var likedMap = {};
function initLikes() {
  likedMap = {};
  if (typeof likes === 'undefined') return;
  for (var i = 0; i < likes.length; i++) {
    var entry = likes[i];
    var dir = entry[0];
    var set = {};
    for (var j = 1; j < entry.length; j++) {
      set[entry[j]] = true;
    }
    likedMap[dir] = set;
  }
}
function isLiked(dir, img) {
  return likedMap[dir] && likedMap[dir][img];
}
function setLiked(dir, img, liked) {
  if (!likedMap[dir]) likedMap[dir] = {};
  if (liked) {
    likedMap[dir][img] = true;
  } else {
    delete likedMap[dir][img];
  }
}

var heartSvg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
  + '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 '
  + '2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 '
  + '14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 '
  + '11.54L12 21.35z"/></svg>';

function updateHeartAppearance(btn, liked) {
  if (liked) {
    btn.classList.add('liked');
    btn.querySelector('svg path').setAttribute('fill', '#ff4757');
    btn.querySelector('svg path').setAttribute('stroke', '#ff4757');
  } else {
    btn.classList.remove('liked');
    btn.querySelector('svg path').setAttribute('fill', 'none');
    btn.querySelector('svg path').setAttribute('stroke', '#fff');
  }
}

function createHeartBtn(dir, img) {
  var btn = document.createElement('button');
  btn.className = 'heart-btn' + (isLiked(dir, img) ? ' liked' : '');
  btn.innerHTML = heartSvg;
  btn.setAttribute('data-dir', dir);
  btn.setAttribute('data-img', img);
  updateHeartAppearance(btn, isLiked(dir, img));
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleLikeApi(dir, img);
  });
  return btn;
}

function toggleLikeApi(dir, img) {
  var newLiked = !isLiked(dir, img);
  setLiked(dir, img, newLiked);
  refreshAllHearts(dir, img);
  fetch(API + '/api/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: dir, img: img })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.liked !== newLiked) {
      setLiked(dir, img, data.liked);
      refreshAllHearts(dir, img);
    }
  }).catch(function() {});
}

function refreshAllHearts(dir, img) {
  var liked = isLiked(dir, img);
  var allBtns = document.querySelectorAll('.heart-btn[data-dir="' + dir + '"][data-img="' + img + '"]');
  for (var k = 0; k < allBtns.length; k++) {
    updateHeartAppearance(allBtns[k], liked);
  }
  var vh = document.getElementById('viewerHeart');
  if (vh && vh.style.display !== 'none'
      && parseInt(vh.getAttribute('data-dir')) === dir
      && parseInt(vh.getAttribute('data-img')) === img) {
    updateHeartAppearance(vh, liked);
  }
}

initLikes();

function randomAlbum() {
  var likedDirs = {};
  for (var d in likedMap) {
    if (likedMap.hasOwnProperty(d)) likedDirs[d] = true;
  }
  var candidates = [];
  for (var i = 0; i < albums.length; i++) {
    if (!likedDirs[albums[i][0]]) candidates.push(albums[i]);
  }
  if (candidates.length === 0) return;
  var pick = candidates[Math.floor(Math.random() * candidates.length)];
  var dir = pick[0];
  if (currentView === 'album' && currentAlbumDir === dir && candidates.length > 1) {
    var other = candidates.filter(function(a) { return a[0] !== dir; });
    pick = other[Math.floor(Math.random() * other.length)];
    dir = pick[0];
  }
  currentView = null;
  location.hash = '#/album/' + dir;
}

buttons.forEach(function(btn) {
  btn.addEventListener('click', function() {
    buttons.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.documentElement.style.setProperty('--cols', btn.dataset.cols);
  });
});
document.getElementById('btnRandom').addEventListener('click', randomAlbum);

function openViewer(src) {
  viewerImage.src = src;
  viewer.classList.add('show');
  document.body.style.overflow = 'hidden';
  var parts = src.split('/');
  var dir = parseInt(parts[parts.length - 2], 10);
  var img = parseInt(parts[parts.length - 1], 10);
  var vh = document.getElementById('viewerHeart');
  vh.style.display = '';
  vh.setAttribute('data-dir', dir);
  vh.setAttribute('data-img', img);
  vh.innerHTML = heartSvg;
  updateHeartAppearance(vh, isLiked(dir, img));
  vh.onclick = function(e) {
    e.stopPropagation();
    toggleLikeApi(dir, img);
  };
}

function closeViewer() {
  viewer.classList.remove('show');
  viewerImage.src = '';
  document.body.style.overflow = '';
  var vh = document.getElementById('viewerHeart');
  vh.style.display = 'none';
  vh.onclick = null;
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

function setColBtns(n) {
  buttons.forEach(function(b) {
    b.classList.toggle('active', b.dataset.cols === String(n));
  });
  document.documentElement.style.setProperty('--cols', n);
}

function renderHome() {
  currentView = 'home';
  currentAlbumDir = null;
  clearGallery();
  hideBreadcrumb();
  setColBtns(4);
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
  setColBtns(2);

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
    var parts = galleryData[i].split('/');
    var dir = parseInt(parts[parts.length - 2], 10);
    var img = parseInt(parts[parts.length - 1], 10);
    var card = document.createElement('div');
    card.className = 'item';
    var imgEl = document.createElement('img');
    imgEl.alt = '';
    imgEl.loading = 'lazy';
    imgEl.decoding = 'async';
    imgEl.src = galleryData[i];
    card.appendChild(imgEl);
    card.appendChild(createHeartBtn(dir, img));
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

function checkServerStatus() {
  var dot = document.getElementById('statusDot');
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, 100);
  fetch(API + '/api/likes', { method: 'GET', signal: ctrl.signal })
    .then(function(r) {
      clearTimeout(timer);
      if (r.ok) {
        dot.className = 'status-dot online';
      } else {
        dot.className = 'status-dot offline';
        showToast();
      }
    })
    .catch(function() {
      clearTimeout(timer);
      dot.className = 'status-dot offline';
      showToast();
    });
}

function showToast() {
  var toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
  }, 3000);
}

checkServerStatus();
