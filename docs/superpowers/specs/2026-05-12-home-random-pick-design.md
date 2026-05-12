# Home Page Random Pick Design

## Goal

Change the home page from showing all album covers to randomly selecting 200 album covers, excluding directories that have star ratings or liked images. Add a refresh button to re-randomize the selection.

## Scope

Only frontend files: `gallery/main.js`, `gallery/index.html`, `gallery/style.css`. No Rust backend changes.

## Changes

### 1. `renderHome()` random selection (`gallery/main.js`)

Current: iterates all `albums` and creates a cover card for each.

New logic:
1. Filter out directories present in `starsMap` (any star value 1-5)
2. Filter out directories present in `likedMap` (any liked image)
3. Fisher-Yates shuffle the remaining albums
4. Take first 200 (or all if fewer than 200)
5. Create cards for the selected albums using the exact same card rendering logic as today

### 2. Refresh button (`gallery/index.html`, `gallery/style.css`, `gallery/main.js`)

- Add a `🔄` button with `id="btnRefresh"` next to the existing `🎲` button in the toolbar
- Style: reuse `.btn` + `.btn-random` classes (same appearance as existing buttons)
- Click handler: call `renderHome()` — since `renderHome()` always re-shuffles, this produces a fresh random set
- Visibility: show only on home view; hide when navigating into an album (same pattern as breadcrumb behavior)

### 3. Unchanged

- `randomAlbum()` (🎲) behavior unchanged
- Album card click → navigate to `#/album/<dir>` unchanged
- Star rating UI on cards unchanged
- Like/heart interactions unchanged
- Viewer unchanged
- Column layout buttons unchanged

## Data Flow

```
albums[] + likedMap + starsMap
  → filter (remove starred dirs, remove liked dirs)
  → Fisher-Yates shuffle
  → take 200
  → render cover cards (existing card creation logic)
```

Refresh button → `renderHome()` → repeats the above with different random result.
