# Random Album Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a random album button to the gallery toolbar that navigates to a random album excluding directories with liked images.

**Architecture:** Pure front-end change. A new `randomAlbum()` function in `main.js` filters out liked directories and picks a random candidate. One button added to `index.html`, styled in `style.css`.

**Tech Stack:** Vanilla JavaScript, HTML, CSS (existing gallery stack)

---

### Task 1: Add random button to HTML

**Files:**
- Modify: `g/index.html:16-20` (`.controls` div)

- [ ] **Step 1: Add the random button inside `.controls`**

In `g/index.html`, inside the `.controls` div, after the existing column buttons, add:

```html
      <button class="btn btn-random" id="btnRandom" title="Random album">🎲</button>
```

The `.controls` div should look like:

```html
    <div class="controls">
      <button class="btn active" data-cols="4">4列</button>
      <button class="btn" data-cols="3">3列</button>
      <button class="btn" data-cols="2">2列</button>
      <button class="btn btn-random" id="btnRandom" title="Random album">🎲</button>
    </div>
```

- [ ] **Step 2: Verify the file looks correct**

The full `<header>` section should be:

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
      <button class="btn btn-random" id="btnRandom" title="Random album">🎲</button>
    </div>
  </header>
```

---

### Task 2: Style the random button

**Files:**
- Modify: `g/style.css:40-51` (`.btn` rules area)

- [ ] **Step 1: Add `.btn-random` styles**

After the existing `.btn.active` rule (line 51), add:

```css
.btn-random {
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
}
```

- [ ] **Step 2: Verify no visual regression**

The existing `.btn` styles already provide base styling (border, background, color, border-radius, cursor, transitions). `.btn-random` only overrides size/line-height for the emoji.

---

### Task 3: Implement `randomAlbum()` function and wire up click handler

**Files:**
- Modify: `g/main.js:110-118` (after `initLikes()` call, near button event listeners)

- [ ] **Step 1: Add `randomAlbum()` function**

After the `initLikes();` call on line 110, add the following function:

```javascript
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
```

- [ ] **Step 2: Wire up the button click handler**

Add after the existing `buttons.forEach` block (after line 118):

```javascript
document.getElementById('btnRandom').addEventListener('click', randomAlbum);
```

- [ ] **Step 3: Verify the full JS change area**

The code around lines 110-120 should now read:

```javascript
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
```

---

### Task 4: Manual verification

- [ ] **Step 1: Build the project**

Run: `cargo build`
Expected: Compiles successfully (no Rust changes, but verify no breakage)

- [ ] **Step 2: Run the app**

Run: `cargo run -- -d g`
Expected: Gallery opens in WebView. Random button (🎲) visible in toolbar top-right.

- [ ] **Step 3: Test random button**

Click 🎲 → should navigate to album 10001 (since 10002 has a like). Click again → should stay on 10001 or refresh it (only one unliked candidate).
