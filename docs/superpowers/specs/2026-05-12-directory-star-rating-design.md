# Directory Star Rating

## Goal

Add 1-5 star ratings to album cards on the home view, persisted via the existing Rust HTTP API into `likes.js`.

## Data Format

`likes.js` gains a second line:

```js
var likes = [[10002,4],[11143,2,96]];
var stars = {10001: 3, 10002: 5};
```

`stars` is a JSON object mapping directory ID (u32) to star count (1-5).

## Rust Backend

### File I/O

`read_file_content()` returns the raw file text. Two new helpers extract each variable:

- `parse_likes_raw(text) -> Vec<Vec<u32>>`
- `parse_stars_raw(text) -> BTreeMap<u32, u8>`
- `write_file(likes: &[Vec<u32>], stars: &BTreeMap<u32, u8>)` writes both lines

Existing `read_likes()` and `write_likes()` are refactored to use the shared file I/O, preserving the `stars` line.

### New Functions

- `set_star(dir: u32, star: u8)` — upsert or remove (if star == 0) the entry, then rewrite the file.

### New API Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/stars` | — | `{10001: 3, 10002: 5}` |
| POST | `/api/star` | `{"dir": 11102, "star": 4}` | `{"star": 4}` |

`star` value must be 1-5; return 400 otherwise.

## Frontend

### Data Layer

- `starsMap` object: `{dirId: starCount}`
- `initStars()` — parse the `stars` global from the script tag
- `getStar(dir)`, `setStar(dir, count)` helpers

### Star Component

In `renderHome()`, each album card gets a star widget appended after the tags:

```html
<div class="star-rating" data-dir="10001">
  <span class="star" data-value="1">★</span>
  <span class="star" data-value="2">★</span>
  <span class="star" data-value="3">★</span>
  <span class="star" data-value="4">★</span>
  <span class="star" data-value="5">★</span>
</div>
```

Positioned absolutely in the bottom-right corner of the card.

### Interaction

- **Hover**: highlight stars 1..N where N is the hovered star's data-value. On mouseleave, revert to the saved rating.
- **Click**: call `POST /api/star` with `{dir, star}`, optimistically update `starsMap`, re-render the widget.
- **Rated cards**: filled stars up to the saved count, remaining stars dimmed.

### API Call

`setStarApi(dir, count)` — POST to `/api/star`, update `starsMap` on success.

## CSS

- `.star-rating` — absolute positioned bottom-right of `.item`, with a semi-transparent dark background pill for contrast against images.
- `.star` — inline star character, color gold when active, dimmed when inactive.
- Hover state brightens stars up to the hovered position.
