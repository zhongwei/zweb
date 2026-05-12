# Server Status Indicator

## Summary

Add a visual status indicator to the `g/index.html` toolbar that shows whether the backend HTTP server (`127.0.0.1:18832`) is reachable. When the server is offline, display an auto-dismissing toast warning.

## Scope

Only changes to `g/` frontend files: `index.html`, `main.js`, `style.css`. No Rust/backend changes.

## Behavior

1. On page load, send a single `GET /api/likes` request to `http://127.0.0.1:18832`.
2. Based on the result:
   - **Success (HTTP 200)**: set indicator to green (online).
   - **Failure (network error / timeout)**: set indicator to red (offline) and show a toast warning that auto-dismisses after 3 seconds.
3. No periodic polling. One-time check only.

## UI Components

### Status Dot

- Position: inside the toolbar, left of the breadcrumb (`#breadcrumb`).
- Size: 8px circle.
- States:
  - Gray (`#666`) — checking (initial state).
  - Green (`#4caf50`) — online.
  - Red (`#ff4757`) — offline.
- Subtle pulse animation on state change.

### Toast Warning

- Position: fixed, top-center, below the toolbar.
- Style: dark panel matching existing `--panel` background, with border and rounded corners.
- Content: "Server offline" text with a small icon/indicator.
- Animation: slides down from top on appear, slides up on dismiss.
- Auto-dismiss: 3 seconds after appearing.
- Pure CSS animation, no external dependencies.

## Implementation Plan

### `g/index.html`

- Add a `<span class="status-dot" id="statusDot"></span>` element before the breadcrumb div inside the toolbar.
- Add a `<div class="toast" id="toast"></div>` element inside `<body>`.

### `g/main.js`

- Add a `checkServerStatus()` function that fetches `API + '/api/likes'`.
- On success: set `#statusDot` class to `online`.
- On failure: set `#statusDot` class to `offline`, show toast with auto-dismiss.
- Call `checkServerStatus()` at the end of the script, after `route()`.

### `g/style.css`

- `.status-dot` styling (8px circle, transitions).
- `.status-dot.online` / `.status-dot.offline` / `.status-dot.checking` color states.
- `.toast` styling (fixed position, slide animation, auto-dismiss via CSS animation).
- `@keyframes` for toast slide-in and slide-out.
