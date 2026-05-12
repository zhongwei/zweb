# Directory Star Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 1-5 star ratings to album cards on the gallery home view, persisted in `likes.js` alongside likes.

**Architecture:** Refactor Rust file I/O to handle two variables (`var likes` and `var stars`) in one file. Add `/api/star` and `/api/stars` endpoints. Frontend renders interactive star widgets on each album card in `renderHome()`.

**Tech Stack:** Rust (tiny_http, serde_json), vanilla JS, CSS.

---

### Task 1: Rust backend — refactor file I/O for dual-variable likes.js

**Files:**
- Modify: `src/main.rs` (lines 139-162: replace `read_likes` + `write_likes` block)

- [ ] **Step 1: Replace `read_likes()` and `write_likes()` with refactored shared I/O**

Replace the block from line 139 through line 162 (the two functions `read_likes` and `write_likes`) with the following code. This introduces `read_file_raw`, `parse_var_json`, refactored `read_likes`, new `read_stars`, `write_likes_and_stars`, refactored `write_likes`, and new `set_star`:

```rust
fn read_file_raw() -> String {
    let path = likes_path();
    fs::read_to_string(&path).unwrap_or_default()
}

fn parse_var_json(content: &str, var_name: &str) -> Option<String> {
    let prefix = format!("var {} = ", var_name);
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix(&prefix) {
            let json = rest.trim_end_matches(';').trim();
            if !json.is_empty() {
                return Some(json.to_string());
            }
        }
    }
    None
}

fn read_likes() -> Vec<Vec<u32>> {
    let content = read_file_raw();
    let json = match parse_var_json(&content, "likes") {
        Some(j) => j,
        None => return Vec::new(),
    };
    serde_json::from_str(&json).unwrap_or_default()
}

fn read_stars() -> BTreeMap<u32, u8> {
    let content = read_file_raw();
    let json = match parse_var_json(&content, "stars") {
        Some(j) => j,
        None => return BTreeMap::new(),
    };
    serde_json::from_str(&json).unwrap_or_default()
}

fn write_likes_and_stars(likes: &[Vec<u32>], stars: &BTreeMap<u32, u8>) {
    let likes_json = serde_json::to_string(likes).unwrap_or_else(|_| "[]".to_string());
    let stars_json = if stars.is_empty() {
        "{}".to_string()
    } else {
        let entries: Vec<String> = stars.iter().map(|(k, v)| format!("{k}:{v}")).collect();
        format!("{{{}}}", entries.join(","))
    };
    let content = format!("var likes = {likes_json};\nvar stars = {stars_json};\n");
    let path = likes_path();
    let _ = fs::write(&path, content);
}

fn write_likes(data: &[Vec<u32>]) {
    let stars = read_stars();
    write_likes_and_stars(data, &stars);
}

fn set_star(dir: u32, star: u8) -> u8 {
    let likes = read_likes();
    let mut stars = read_stars();
    if (1..=5).contains(&star) {
        stars.insert(dir, star);
    } else {
        stars.remove(&dir);
    }
    write_likes_and_stars(&likes, &stars);
    star
}
```

- [ ] **Step 2: Build to verify**

Run: `cargo build`
Expected: compiles with no errors.

---

### Task 2: Rust backend — add star API endpoints

**Files:**
- Modify: `src/main.rs` (inside `run_http_server`, the match block starting at line 200)

- [ ] **Step 1: Add `GET /api/stars` and `POST /api/star` match arms**

Insert two new arms into the `match (request.method(), request.url())` block in `run_http_server`, between the existing `/api/likes` GET arm and the `Options` arm (i.e., just before the `(&tiny_http::Method::Options, _) =>` arm at line 282):

```rust
            (&tiny_http::Method::Get, "/api/stars") => {
                let data = read_stars();
                let resp_body =
                    serde_json::to_string(&data).unwrap_or_else(|_| "{}".to_string());
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
            (&tiny_http::Method::Post, "/api/star") => {
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
                let star_val = match parsed.get("star") {
                    Some(&s) if s >= 1 && s <= 5 => s as u8,
                    _ => {
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
                let result = set_star(dir, star_val);
                let resp_body = format!("{{\"star\":{result}}}");
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
```

- [ ] **Step 2: Build to verify**

Run: `cargo build`
Expected: compiles with no errors.

---

### Task 3: Frontend — data layer + star UI

**Files:**
- Modify: `g/meta/likes.js`
- Modify: `g/main.js`

- [ ] **Step 1: Add `var stars` line to `likes.js`**

Change `g/meta/likes.js` from:

```js
var likes = [[10002,4],[11143,2,96]];
```

to:

```js
var likes = [[10002,4],[11143,2,96]];
var stars = {};
```

- [ ] **Step 2: Add stars data layer and star UI functions to `main.js`**

Insert the following block after the `initLikes();` call on line 110, before `function randomAlbum()`:

```js
var starsMap = {};
function initStars() {
  starsMap = {};
  if (typeof stars === 'undefined') return;
  for (var key in stars) {
    if (stars.hasOwnProperty(key)) {
      starsMap[parseInt(key, 10)] = stars[key];
    }
  }
}
function getStar(dir) {
  return starsMap[dir] || 0;
}
function setStarLocal(dir, count) {
  if (count >= 1 && count <= 5) {
    starsMap[dir] = count;
  } else {
    delete starsMap[dir];
  }
}
initStars();

function updateStarAppearance(container, count) {
  var els = container.querySelectorAll('.star');
  for (var i = 0; i < els.length; i++) {
    var val = parseInt(els[i].getAttribute('data-value'), 10);
    if (val <= count) {
      els[i].classList.add('active');
    } else {
      els[i].classList.remove('active');
    }
  }
}

function createStarRating(dir) {
  var container = document.createElement('div');
  container.className = 'star-rating';
  if (getStar(dir) > 0) container.classList.add('has-rating');
  container.setAttribute('data-dir', dir);
  for (var i = 1; i <= 5; i++) {
    var s = document.createElement('span');
    s.className = 'star';
    s.setAttribute('data-value', i);
    s.textContent = '\u2605';
    container.appendChild(s);
  }
  updateStarAppearance(container, getStar(dir));
  container.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('star')) {
      updateStarAppearance(container, parseInt(e.target.getAttribute('data-value'), 10));
    }
  });
  container.addEventListener('mouseout', function() {
    updateStarAppearance(container, getStar(dir));
  });
  container.addEventListener('click', function(e) {
    if (e.target.classList.contains('star')) {
      e.stopPropagation();
      var val = parseInt(e.target.getAttribute('data-value'), 10);
      setStarLocal(dir, val);
      updateStarAppearance(container, val);
      container.classList.add('has-rating');
      fetch(API + '/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: dir, star: val })
      }).catch(function() {});
    }
  });
  return container;
}
```

- [ ] **Step 3: Add star widget to `renderHome()` cards**

In `renderHome()`, after the line `card.appendChild(tags);` (line 245), insert:

```js
    card.appendChild(createStarRating(dir));
```

The relevant section should look like:

```js
    card.appendChild(tags);
    card.appendChild(createStarRating(dir));
    card.addEventListener('click', function() {
```

---

### Task 4: CSS — star rating styles

**Files:**
- Modify: `g/style.css`

- [ ] **Step 1: Add star rating CSS at the end of style.css (before the media queries at line 227)**

Insert before `@media (max-width: 1200px)`:

```css
.star-rating {
  position: absolute;
  bottom: 6px;
  right: 8px;
  display: flex;
  gap: 1px;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: auto;
}
.item:hover .star-rating,
.star-rating.has-rating {
  opacity: 1;
}
.star {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
.star.active {
  color: #ffc107;
}
.star:hover {
  transform: scale(1.2);
}

```

---

### Task 5: Build and verify

- [ ] **Step 1: Run cargo build**

Run: `cargo build`
Expected: compiles with no errors.

- [ ] **Step 2: Commit**

```bash
git add src/main.rs g/meta/likes.js g/main.js g/style.css
git commit -m "feat: add star rating to directory listing"
```
