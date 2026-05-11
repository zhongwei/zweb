# Gallery Album View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `g/` gallery from a flat grid into a two-level album browser with cover thumbnails on the home page and detail view per album.

**Architecture:** Single-page app using hash-based routing (`#/` for home, `#/album/{dir}` for detail). Two render functions swap content in the same `#gallery` element. Reuse existing masonry layout, viewer, and column toggle.

**Tech Stack:** Vanilla HTML/CSS/JS (no build tools, no framework).

---

### Task 1: Update `index.html` — add breadcrumb container

**Files:**
- Modify: `g/index.html`

- [ ] **Step 1: Add breadcrumb and adjust toolbar**

Replace the `<header class="toolbar">` section with:

```html
<header class="toolbar">
  <div class="breadcrumb" id="breadcrumb">
    <span class="bc-link" id="bcHome">Gallery</span>
    <span class="bc-sep" id="bcSep" style="display:none"> › </span>
    <span class="bc-current" id="bcCurrent" style="display:none"></span>
  </div>
  <div class="controls">
    <button class="btn active" data-cols="4">4列</button>
    <button class="btn" data-cols="3">3列</button>
    <button class="btn" data-cols="2">2列</button>
  </div>
</header>
```

The full file becomes:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gallery</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="toolbar">
    <div class="breadcrumb" id="breadcrumb">
      <span class="bc-link" id="bcHome">Gallery</span>
      <span class="bc-sep" id="bcSep" style="display:none"> › </span>
      <span class="bc-current" id="bcCurrent" style="display:none"></span>
    </div>
    <div class="controls">
      <button class="btn active" data-cols="4">4列</button>
      <button class="btn" data-cols="3">3列</button>
      <button class="btn" data-cols="2">2列</button>
    </div>
  </header>
  <main class="gallery" id="gallery"></main>
  <div class="viewer" id="viewer">
    <button class="viewer-close" id="viewerClose">✕</button>
    <img id="viewerImage" src="" alt="" />
  </div>
  <script src="data.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add g/index.html
git commit -m "feat(gallery): add breadcrumb container to toolbar"
```

---

### Task 2: Add breadcrumb and cover label styles to `style.css`

**Files:**
- Modify: `g/style.css`

- [ ] **Step 1: Add breadcrumb styles after `.btn.active` rule**

Append after line 51 (`.btn.active { outline: 2px solid #4f8cff; }`):

```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.bc-link {
  cursor: pointer;
  color: var(--muted);
  transition: color 0.2s;
}
.bc-link:hover {
  color: var(--text);
}
.bc-sep {
  color: var(--muted);
}
.bc-current {
  color: var(--text);
}
.cover-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 0 0 var(--radius) var(--radius);
}
```

- [ ] **Step 2: Commit**

```bash
git add g/style.css
git commit -m "feat(gallery): add breadcrumb and cover label styles"
```

---

### Task 3: Rewrite `main.js` with routing, home view, and album detail view

**Files:**
- Modify: `g/main.js`

- [ ] **Step 1: Replace entire `main.js`**

Write the complete new `main.js`:

```js
var root = metaData.root;

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
```

- [ ] **Step 2: Commit**

```bash
git add g/main.js
git commit -m "feat(gallery): add album routing with home/detail views"
```
