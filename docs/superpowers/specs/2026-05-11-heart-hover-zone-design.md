# Heart Button Hover Zone Enlargement

## Problem

1. **Gallery list**: The like button (`.heart-btn`) is only 32x32px, too small to click comfortably.
2. **Viewer**: The heart (`.viewer-heart`) is in the top-left corner; should be bottom-right.

## Design

### Gallery list (`.heart-btn`)

Expand `.heart-btn` to cover the bottom-right 1/4 of the card. The SVG icon stays small and positioned at the actual bottom-right corner of the card.

CSS changes in `g/style.css`:

```css
.heart-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 50%;
  height: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.15s, background 0.2s;
  z-index: 10;
}
.heart-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.heart-btn.liked { opacity: 1; }
.heart-btn.liked svg { filter: drop-shadow(0 0 4px rgba(255,71,87,0.5)); }
.item:hover .heart-btn { opacity: 1; }
.heart-btn:hover svg { transform: scale(1.2); }
.heart-btn.liked:hover svg { filter: drop-shadow(0 0 6px rgba(255,71,87,0.7)); }
```

No JS changes needed. The existing `e.stopPropagation()` on the button prevents the card click from opening the viewer.

### Viewer (`.viewer-heart`)

Move `.viewer-heart` from top-left to bottom-right, double the icon size (22px -> 44px), and make the button cover the bottom-right 1/4 of the viewport.

CSS changes in `g/style.css`:

```css
.viewer-heart {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 50%;
  height: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 18px;
  transition: background 0.2s, transform 0.15s;
  z-index: 10;
}
.viewer-heart svg { width: 44px; height: 44px; flex-shrink: 0; }
.viewer-heart:hover { background: rgba(255,255,255,0.05); }
.viewer-heart:hover svg { transform: scale(1.1); }
```

No JS changes needed.

## Files changed

- `g/style.css` only — pure CSS change, no JS or HTML modifications.

## What stays the same

- `g/main.js`: `createHeartBtn()` logic, `openViewer()`, `refreshAllHearts()` unchanged.
- `g/index.html`: DOM structure unchanged.
- Like state persistence (API + localStorage) unchanged.
