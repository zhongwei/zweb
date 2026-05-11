# Image Like (Heart) Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-to-heart toggle on individual images in the `g/` gallery, persisted via a local HTTP API that writes a JS file.

**Architecture:** A `tiny_http` server runs on `127.0.0.1:18832` alongside the wry webview. It exposes a `POST /api/like` endpoint that toggles a `(dir, img)` pair in `g/likes.js`. The frontend loads `likes.js` as a script, maintains a local `Set` for fast lookup, and renders inline SVG heart buttons on thumbnail cards and in the full-size viewer.

**Tech Stack:** Rust (tiny_http), vanilla JS, inline SVG, CSS.

---

### Task 1: Add tiny_http dependency to Cargo.toml

**Files:**
- Modify: `Cargo.toml`

- [ ] **Step 1: Add tiny_http to dependencies**

In `Cargo.toml`, add `tiny_http` to the `[dependencies]` section after the `windows` entry:

```toml
tiny_http = "0.12"
```

- [ ] **Step 2: Verify it compiles**

Run: `cargo check`
Expected: compiles successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add Cargo.toml Cargo.lock
git commit -m "chore: add tiny_http dependency for like API"
```

---

### Task 2: Add likes.js file handling module to main.rs

**Files:**
- Modify: `src/main.rs`

This task adds the pure data-handling functions for reading/writing `likes.js`. No HTTP server yet.

- [ ] **Step 1: Add the likes data module**

Add the following code at the end of `src/main.rs` (before the closing of `main` is fine — these are standalone functions):

```rust
use std::collections::BTreeMap;
use std::io::{Read as IoRead, Write as IoWrite};

fn likes_path() -> PathBuf {
    PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/g/likes.js"))
}

fn read_likes() -> Vec<Vec<u32>> {
    let path = likes_path();
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    let trimmed = content.trim();
    if !trimmed.starts_with("var likes = ") {
        return Vec::new();
    }
    let json_part = &trimmed["var likes = ".len()..];
    let json_part = json_part.trim_end_matches(';').trim();
    match serde_json::from_str::<Vec<Vec<u32>>>(json_part) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    }
}

fn write_likes(data: &[Vec<u32>]) {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "[]".to_string());
    let content = format!("var likes = {json};\n");
    let path = likes_path();
    let _ = fs::write(&path, content);
}

fn toggle_like(dir: u32, img: u32) -> bool {
    let mut map: BTreeMap<u32, Vec<u32>> = BTreeMap::new();
    for entry in read_likes() {
        if entry.len() >= 2 {
            let d = entry[0];
            let imgs: Vec<u32> = entry[1..].to_vec();
            map.insert(d, imgs);
        }
    }
    let entry = map.entry(dir).or_default();
    let liked;
    if let Some(pos) = entry.iter().position(|&x| x == img) {
        entry.remove(pos);
        liked = false;
    } else {
        entry.push(img);
        entry.sort();
        liked = true;
    }
    if entry.is_empty() {
        map.remove(&dir);
    }
    let result: Vec<Vec<u32>> = map
        .into_iter()
        .filter(|(_, v)| !v.is_empty())
        .map(|(d, v)| {
            let mut row = vec![d];
            row.extend(v);
            row
        })
        .collect();
    write_likes(&result);
    liked
}
```

- [ ] **Step 2: Add serde_json dependency to Cargo.toml**

Add to `[dependencies]`:

```toml
serde_json = "1"
```

- [ ] **Step 3: Verify it compiles**

Run: `cargo check`
Expected: compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add src/main.rs Cargo.toml Cargo.lock
git commit -m "feat: add likes data read/write/toggle functions"
```

---

### Task 3: Start tiny_http server in main.rs

**Files:**
- Modify: `src/main.rs`

- [ ] **Step 1: Add the HTTP server startup code**

Add this code in the `main()` function, right after the `let _webview = ...` block (before `event_loop.run`):

```rust
    let likes_server = {
        let server = tiny_http::Server::http("127.0.0.1:18832")
            .expect("failed to start likes API server on port 18832");
        std::thread::spawn(move || {
            for request in server.incoming_requests() {
                match (request.method(), request.url()) {
                    (&tiny_http::Method::Post, "/api/like") => {
                        let mut body = String::new();
                        if request.as_reader().read_to_string(&mut body).is_err() {
                            let resp = tiny_http::Response::from_string("{}")
                                .with_status_code(400)
                                .with_header(tiny_http::Header {
                                    field: "Content-Type".parse().unwrap(),
                                    value: "application/json".parse().unwrap(),
                                });
                            let _ = request.respond(resp);
                            continue;
                        }
                        let parsed: std::collections::HashMap<String, u32> =
                            match serde_json::from_str(&body) {
                                Ok(p) => p,
                                Err(_) => {
                                    let resp = tiny_http::Response::from_string("{}")
                                        .with_status_code(400)
                                        .with_header(tiny_http::Header {
                                            field: "Content-Type".parse().unwrap(),
                                            value: "application/json".parse().unwrap(),
                                        });
                                    let _ = request.respond(resp);
                                    continue;
                                }
                            };
                        let dir = match parsed.get("dir") {
                            Some(&d) => d,
                            None => {
                                let resp = tiny_http::Response::from_string("{}")
                                    .with_status_code(400)
                                    .with_header(tiny_http::Header {
                                        field: "Content-Type".parse().unwrap(),
                                        value: "application/json".parse().unwrap(),
                                    });
                                let _ = request.respond(resp);
                                continue;
                            }
                        };
                        let img = match parsed.get("img") {
                            Some(&i) => i,
                            None => {
                                let resp = tiny_http::Response::from_string("{}")
                                    .with_status_code(400)
                                    .with_header(tiny_http::Header {
                                        field: "Content-Type".parse().unwrap(),
                                        value: "application/json".parse().unwrap(),
                                    });
                                let _ = request.respond(resp);
                                continue;
                            }
                        };
                        let liked = toggle_like(dir, img);
                        let resp_body = format!("{{\"liked\":{liked}}}");
                        let resp = tiny_http::Response::from_string(resp_body)
                            .with_header(tiny_http::Header {
                                field: "Content-Type".parse().unwrap(),
                                value: "application/json".parse().unwrap(),
                            })
                            .with_header(tiny_http::Header {
                                field: "Access-Control-Allow-Origin".parse().unwrap(),
                                value: "*".parse().unwrap(),
                            });
                        let _ = request.respond(resp);
                    }
                    (&tiny_http::Method::Get, "/api/likes") => {
                        let data = read_likes();
                        let resp_body = serde_json::to_string(&data).unwrap_or_else(|_| "[]".to_string());
                        let resp = tiny_http::Response::from_string(resp_body)
                            .with_header(tiny_http::Header {
                                field: "Content-Type".parse().unwrap(),
                                value: "application/json".parse().unwrap(),
                            })
                            .with_header(tiny_http::Header {
                                field: "Access-Control-Allow-Origin".parse().unwrap(),
                                value: "*".parse().unwrap(),
                            });
                        let _ = request.respond(resp);
                    }
                    (&tiny_http::Method::Options, _) => {
                        let resp = tiny_http::Response::from_string("")
                            .with_status_code(204)
                            .with_header(tiny_http::Header {
                                field: "Access-Control-Allow-Origin".parse().unwrap(),
                                value: "*".parse().unwrap(),
                            })
                            .with_header(tiny_http::Header {
                                field: "Access-Control-Allow-Methods".parse().unwrap(),
                                value: "GET, POST, OPTIONS".parse().unwrap(),
                            })
                            .with_header(tiny_http::Header {
                                field: "Access-Control-Allow-Headers".parse().unwrap(),
                                value: "Content-Type".parse().unwrap(),
                            });
                        let _ = request.respond(resp);
                    }
                    _ => {
                        let resp = tiny_http::Response::from_string("not found")
                            .with_status_code(404);
                        let _ = request.respond(resp);
                    }
                }
            }
        })
    };
```

Also store the join handle to prevent it being dropped — add `let _likes_server = likes_server;` before the `event_loop.run` call, or rename the binding:

Change:
```rust
    let likes_server = {
```
to keep the binding alive. The thread runs daemon-like and will be killed when the process exits.

- [ ] **Step 2: Add missing use statement**

Ensure the top of `src/main.rs` has:

```rust
use std::collections::BTreeMap;
use std::io::{Read as IoRead, Write as IoWrite};
```

These are needed by the likes functions and the HTTP body reading.

- [ ] **Step 3: Verify it compiles**

Run: `cargo check`
Expected: compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add src/main.rs
git commit -m "feat: start tiny_http API server for likes on port 18832"
```

---

### Task 4: Create initial likes.js

**Files:**
- Create: `g/likes.js`

- [ ] **Step 1: Create the file**

Write `g/likes.js` with the initial empty content:

```js
var likes = [];
```

- [ ] **Step 2: Commit**

```bash
git add g/likes.js
git commit -m "feat: add initial empty likes.js"
```

---

### Task 5: Add likes.js script to index.html

**Files:**
- Modify: `g/index.html`

- [ ] **Step 1: Add script tag**

In `g/index.html`, add a new `<script>` tag between `data.js` and `main.js` on line 28:

```html
  <script src="data.js"></script>
  <script src="likes.js"></script>
  <script src="main.js"></script>
```

- [ ] **Step 2: Verify the page loads**

Run: `cargo build && zweb -d g`
Expected: gallery loads in browser, no JS errors in console.

- [ ] **Step 3: Commit**

```bash
git add g/index.html
git commit -m "feat: include likes.js in gallery page"
```

---

### Task 6: Add heart button styles to style.css

**Files:**
- Modify: `g/style.css`

- [ ] **Step 1: Add heart button CSS**

Append the following to the end of `g/style.css` (before the `@media` queries at line 176):

```css
.heart-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(0,0,0,0.45);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, transform 0.15s, background 0.2s;
  z-index: 10;
  padding: 0;
}
.heart-btn svg {
  width: 18px;
  height: 18px;
}
.heart-btn.liked {
  opacity: 1;
  background: rgba(0,0,0,0.5);
}
.item:hover .heart-btn {
  opacity: 1;
}
.heart-btn:hover {
  transform: scale(1.2);
  background: rgba(0,0,0,0.6);
}
.heart-btn.liked:hover {
  background: rgba(0,0,0,0.6);
}
.viewer-heart {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s;
  padding: 0;
}
.viewer-heart svg {
  width: 22px;
  height: 22px;
}
.viewer-heart:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}
```

- [ ] **Step 2: Commit**

```bash
git add g/style.css
git commit -m "feat: add heart button styles for cards and viewer"
```

---

### Task 7: Add heart button logic to main.js

**Files:**
- Modify: `g/main.js`

This is the main frontend logic task.

- [ ] **Step 1: Add likes state and helper functions**

Add the following code at the top of `g/main.js`, after the existing variable declarations (after line 18, `var sentinel = null;`):

```js
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

function createHeartBtn(dir, img) {
  var btn = document.createElement('button');
  btn.className = 'heart-btn' + (isLiked(dir, img) ? ' liked' : '');
  btn.innerHTML = heartSvg;
  btn.setAttribute('data-dir', dir);
  btn.setAttribute('data-img', img);
  if (isLiked(dir, img)) {
    btn.querySelector('svg path').setAttribute('fill', '#ff4757');
    btn.querySelector('svg path').setAttribute('stroke', '#ff4757');
  } else {
    btn.querySelector('svg path').setAttribute('fill', 'none');
    btn.querySelector('svg path').setAttribute('stroke', '#fff');
  }
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleLikeApi(dir, img, btn);
  });
  return btn;
}

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

function toggleLikeApi(dir, img, btn) {
  var liked = isLiked(dir, img);
  var newLiked = !liked;
  setLiked(dir, img, newLiked);
  updateHeartAppearance(btn, newLiked);
  var viewerBtn = document.querySelector('.viewer-heart');
  if (viewerBtn && parseInt(viewerBtn.getAttribute('data-dir')) === dir
      && parseInt(viewerBtn.getAttribute('data-img')) === img) {
    updateHeartAppearance(viewerBtn, newLiked);
  }
  var allBtns = document.querySelectorAll('.heart-btn[data-dir="' + dir + '"][data-img="' + img + '"]');
  for (var k = 0; k < allBtns.length; k++) {
    updateHeartAppearance(allBtns[k], newLiked);
  }
  fetch(API + '/api/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: dir, img: img })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.liked !== newLiked) {
      setLiked(dir, img, data.liked);
      updateHeartAppearance(btn, data.liked);
      for (var k = 0; k < allBtns.length; k++) {
        updateHeartAppearance(allBtns[k], data.liked);
      }
    }
  }).catch(function() {});
}
```

- [ ] **Step 2: Call initLikes() at startup**

Add this call right after the code block above:

```js
initLikes();
```

- [ ] **Step 3: Add heart button to renderNextChunk**

In the `renderNextChunk` function, modify the card creation loop. After `card.appendChild(img);` (line 162) and before the `card.addEventListener('click', ...)` (line 163), add the heart button:

Change the existing `renderNextChunk` function body to:

```js
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
```

- [ ] **Step 4: Add heart button to the viewer**

First, add a viewer heart button in `index.html` — add inside the `<div class="viewer">` after the close button:

```html
  <div class="viewer" id="viewer">
    <button class="viewer-close" id="viewerClose">&#10005;</button>
    <button class="viewer-heart" id="viewerHeart" style="display:none"></button>
    <img id="viewerImage" src="" alt="" />
  </div>
```

Then modify `openViewer` and `closeViewer` in `main.js` to wire the viewer heart:

Replace the existing `openViewer` function with:

```js
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
    toggleLikeApi(dir, img, vh);
  };
}
```

Replace the existing `closeViewer` function with:

```js
function closeViewer() {
  viewer.classList.remove('show');
  viewerImage.src = '';
  document.body.style.overflow = '';
  var vh = document.getElementById('viewerHeart');
  vh.style.display = 'none';
  vh.onclick = null;
}
```

- [ ] **Step 5: Verify the full flow**

Run: `cargo build && zweb -d g`
Expected: 
- Gallery loads with heart icons on hover over image cards.
- Clicking a heart toggles it red/outline and persists after page refresh.
- Opening the full-size viewer shows a heart button that syncs with the card state.
- `g/likes.js` file is updated with the liked images.

- [ ] **Step 6: Commit**

```bash
git add g/main.js g/index.html
git commit -m "feat: add heart like buttons to gallery cards and viewer"
```

---

### Task 8: Final verification

- [ ] **Step 1: Build release**

Run: `cargo build --release`
Expected: compiles without errors or warnings.

- [ ] **Step 2: Run and manually test the full flow**

Run: `target/release/zweb -d g`

Test:
1. Open gallery, navigate into an album.
2. Hover an image card — heart icon should appear.
3. Click heart — it turns red, `g/likes.js` updates.
4. Click again — it reverts to outline, `g/likes.js` updates.
5. Click an image to open viewer — heart in top-left syncs with card state.
6. Toggle heart in viewer — card heart also updates.
7. Refresh page — liked state persists.

- [ ] **Step 3: Commit any fixes if needed**
