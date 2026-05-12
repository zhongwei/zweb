# Home Page Random Pick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the home page to randomly show 200 album covers (excluding starred/liked directories) with a refresh button to re-randomize.

**Architecture:** Pure frontend change. `renderHome()` filters out starred/liked directories from `albums[]`, shuffles the remainder via Fisher-Yates, takes the first 200, and renders cover cards. A new `🔄` button in the toolbar calls `renderHome()` to re-randomize.

**Tech Stack:** Vanilla JS (no frameworks), existing HTML/CSS patterns in `gallery/`.

---

### Task 1: Add refresh button to HTML

**Files:**
- Modify: `gallery/index.html:16` (toolbar, next to `🎲` button)

- [ ] **Step 1: Add refresh button element**

In `gallery/index.html`, insert a new button after the existing `btnRandom` button (line 16):

```html
    <button class="btn btn-random" id="btnRefresh" title="Refresh">🔄</button>
```

The surrounding context should look like:

```html
    <button class="btn btn-random" id="btnRandom" title="Random album">🎲</button>
    <button class="btn btn-random" id="btnRefresh" title="Refresh">🔄</button>
```

---

### Task 2: Add refresh button show/hide logic in JS

**Files:**
- Modify: `gallery/main.js:288-324` (`renderHome` function)

- [ ] **Step 1: Show refresh button on home view, hide on album view**

In `renderHome()` (line 288), after `setColBtns(4);` (line 293), add:

```js
  document.getElementById('btnRefresh').style.display = '';
```

In `renderAlbum()` (line 328), after `setColBtns(2);` (line 341), add:

```js
  document.getElementById('btnRefresh').style.display = 'none';
```

- [ ] **Step 2: Bind refresh button click handler**

After line 212 (`document.getElementById('btnRandom').addEventListener('click', randomAlbum);`), add:

```js
document.getElementById('btnRefresh').addEventListener('click', function() {
  if (currentView === 'home') {
    currentView = null;
    location.hash = '#/';
  }
});
```

This forces `route()` to re-render because `currentView` is cleared before `renderHome()` sets it to `'home'`.

- [ ] **Step 3: Hide refresh button on initial page load**

At the end of the file, after `checkServerStatus();` (line 432), the initial `route()` call on line 401 will handle showing/hiding based on the current hash. No extra initialization needed — the `renderHome()`/`renderAlbum()` calls already set the display. But we should set initial `display:none` on the button so it doesn't flash before route runs. In `gallery/index.html`, change the refresh button to:

```html
    <button class="btn btn-random" id="btnRefresh" title="Refresh" style="display:none">🔄</button>
```

---

### Task 3: Modify `renderHome()` to filter, shuffle, and limit to 200

**Files:**
- Modify: `gallery/main.js:294-323` (the `albums.forEach` loop inside `renderHome`)

- [ ] **Step 1: Replace the `albums.forEach` block with filtered/shuffled logic**

Replace the `albums.forEach` block inside `renderHome()` (lines 294-323). The current code is:

```js
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
    card.appendChild(createStarRating(dir));
    card.addEventListener('click', function() {
      location.hash = '#/album/' + dir;
    });
    gallery.appendChild(card);
  });
```

Replace with:

```js
  var excluded = {};
  for (var d in starsMap) {
    if (starsMap.hasOwnProperty(d)) excluded[d] = true;
  }
  for (var d in likedMap) {
    if (likedMap.hasOwnProperty(d)) excluded[d] = true;
  }
  var candidates = [];
  for (var i = 0; i < albums.length; i++) {
    if (!excluded[albums[i][0]]) candidates.push(albums[i]);
  }
  for (var i = candidates.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  var picked = candidates.slice(0, 200);

  picked.forEach(function(album) {
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
    card.appendChild(createStarRating(dir));
    card.addEventListener('click', function() {
      location.hash = '#/album/' + dir;
    });
    gallery.appendChild(card);
  });
```

The card rendering logic is identical to the original — only the array being iterated changes from `albums` to `picked`.

---

### Task 4: Verify and commit

- [ ] **Step 1: Build the project**

Run: `cargo build`
Expected: compiles successfully (no Rust changes, but verify nothing is broken)

- [ ] **Step 2: Manual verification checklist**

Open the gallery in browser and verify:
1. Home page shows album covers (fewer than total if star/like filters apply)
2. Clicking 🔄 re-randomizes the home page selection
3. Clicking 🎲 still opens a random album (existing behavior)
4. Clicking a cover card navigates to the album detail page
5. Navigating into an album hides the 🔄 button
6. Navigating back to home shows the 🔄 button again

- [ ] **Step 3: Commit**

```bash
git add gallery/index.html gallery/main.js
git commit -m "feat: home page shows random 200 albums, excluding starred/liked, with refresh button"
```
