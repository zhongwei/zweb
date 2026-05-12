# Heart Button Hover Zone Enlargement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the heart button click zone to cover the bottom-right 1/4 of the image in both gallery list and viewer.

**Architecture:** Pure CSS change — expand the button element to cover 50% width × 50% height from the bottom-right corner, with the SVG icon positioned at the actual corner. No JS or HTML changes needed.

**Tech Stack:** CSS only (file: `g/style.css`)

---

### Task 1: Update gallery list heart button (`.heart-btn`)

**Files:**
- Modify: `g/style.css:176-198`

- [ ] **Step 1: Replace `.heart-btn` rules in `g/style.css`**

Replace the entire `.heart-btn` block (lines 176-198) with:

```css
.heart-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 50%;
  height: 50%;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.15s;
  z-index: 10;
}
.heart-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.heart-btn.liked { opacity: 1; }
.item:hover .heart-btn { opacity: 1; }
.heart-btn:hover svg { transform: scale(1.2); }
.heart-btn.liked:hover svg { transform: scale(1.2); }
```

- [ ] **Step 2: Verify gallery list renders correctly**

Open the app, navigate to an album. Confirm:
- Heart icon appears at bottom-right corner when hovering anywhere in the right 50% / bottom 50% of a card
- Clicking anywhere in that zone toggles like (card does not open viewer)
- Clicking outside that zone (top-left 3/4) opens the viewer as before
- Liked hearts remain visible without hover

---

### Task 2: Update viewer heart button (`.viewer-heart`)

**Files:**
- Modify: `g/style.css:199-216` (after Task 1 changes, the viewer-heart block)

- [ ] **Step 1: Replace `.viewer-heart` rules in `g/style.css`**

Replace the entire `.viewer-heart` block with:

```css
.viewer-heart {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 50%;
  height: 50%;
  border: none;
  border-radius: 0;
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

- [ ] **Step 2: Verify viewer renders correctly**

Open the app, click an image to open the viewer. Confirm:
- Heart icon appears at bottom-right corner of the viewport (44x44, doubled)
- Hovering over the bottom-right 1/4 of the screen shows the heart
- Clicking anywhere in that zone toggles like (does not close viewer)
- Clicking outside that zone or pressing Escape closes the viewer

---

### Task 3: Commit

- [ ] **Step 1: Commit changes**

```bash
git add g/style.css
git commit -m "feat: enlarge heart button hover zone to bottom-right 1/4 in gallery and viewer"
```
