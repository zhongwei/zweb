# Random Album Feature Design

## Summary

Add a random button to the gallery toolbar that navigates to a random album, excluding directories that have any liked images. Pure front-end implementation, no Rust changes.

## Requirements

- Random button in toolbar (right side, next to column controls)
- On click: pick a random album from those NOT appearing in `likes.js`, then navigate to `#/album/<dir>`
- Exclude any directory that has an entry in the `likes` array (i.e., `likedMap[dir]` exists)
- If all albums are excluded, do nothing
- If random picks the current album, re-roll to pick a different one

## Implementation

### Files changed (3)

1. **`g/index.html`** — Add a `<button class="btn btn-random">🎲</button>` inside `.controls`
2. **`g/style.css`** — Style `.btn-random` to match existing button style
3. **`g/main.js`** — Add `randomAlbum()` function and bind click handler

### `randomAlbum()` logic

```
1. Collect liked dir IDs from likedMap keys
2. Filter albums to exclude liked dirs
3. If no candidates, return
4. Pick random index, if same as currentAlbumDir re-pick
5. Set location.hash = '#/album/' + selectedDir
```

### Edge cases

- All albums liked → button click does nothing
- Only one unliked album and it's current → still navigate (force reload via clearing currentView)
- No albums at all → no-op

## Acceptance criteria

- Random button visible in toolbar on all views
- Click navigates to a random unliked album
- Liked albums are never selected
