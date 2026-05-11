# Gallery Album View Design

## Goal

Refactor the `g/` static gallery page from a flat image grid into a two-level album browser: album list (covers) → album detail (all images).

## Data Model (unchanged)

`data.js` stays the same:

```js
var metaData = {
  root: "res",
  tags: ["风景", "人像", ...],
};

var albums = [
    [10001, 10, "HP_0374"],
    [10002, 15, "HPN_274"],
];
// albums[i] = [directory, count, name]
```

Each directory `res/{directory}/` contains `c.avif` (cover) and numbered images `1.avif` through `{count}.avif`.

## Architecture

Single-page app with hash-based routing. Two views:

### View 1: Album List (Home)

- Route: `#/` or no hash
- Grid of album cover cards using existing masonry layout
- Each card: `<img src="res/{dir}/c.avif">`
- Floating label overlay on each card: `{dir}.{name}` (e.g. `10001.HP_0374`), styled like existing `.tags` spans
- Click card → navigate to `#/album/{dir}`

### View 2: Album Detail

- Route: `#/album/{dir}`
- Breadcrumb bar in toolbar: `首页 > {dir}.{name}` (clicking "首页" navigates back)
- Masonry grid of all images in the album: `res/{dir}/1.avif` through `res/{dir}/{count}.avif`
- Column toggle buttons (reuse existing 4/3/2 buttons)
- Click image → full-screen viewer (reuse existing viewer)

### Routing

- `window.onhashchange` drives view switching
- Parse hash: empty/slash → home, `#/album/NNNNN` → detail
- Browser back/forward buttons work naturally

## File Changes

### `data.js` — No changes

### `index.html`

- Add breadcrumb container inside `<header class="toolbar">` (initially hidden, shown only in detail view)

### `main.js`

- Add hash router: `onhashchange` handler that calls `renderHome()` or `renderAlbum(dir)`
- `renderHome()`: clear gallery, render one card per album with `c.avif` cover and floating label
- `renderAlbum(dir)`: clear gallery, look up album by dir, render numbered images, show breadcrumb
- Reuse existing: `openViewer()`, `closeViewer()`, column toggle, lazy loading, chunked rendering with IntersectionObserver

### `style.css`

- Add `.breadcrumb` styles (inline flex, muted separator, clickable "首页")
- Cover card labels reuse `.tags` positioning pattern
- Minor: hide breadcrumb on home view, show on detail view
