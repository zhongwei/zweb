# Server Status Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a status dot to the gallery toolbar showing whether the backend server is reachable, plus an auto-dismissing toast when offline.

**Architecture:** Pure frontend change. On page load, `main.js` sends one `GET /api/likes` to detect server status. A CSS dot in the toolbar reflects the result (gray→green/red). On failure, a toast slides in from top and auto-dismisses after 3 seconds.

**Tech Stack:** Vanilla JS, CSS animations, no dependencies.

---

### Task 1: Add HTML elements

**Files:**
- Modify: `g/index.html`

- [ ] **Step 1: Add status dot element**

Insert a `<span class="status-dot checking" id="statusDot"></span>` inside the toolbar `<header>`, immediately before the `<div class="breadcrumb">` element.

- [ ] **Step 2: Add toast element**

Insert a `<div class="toast" id="toast"><span class="toast-icon"></span><span class="toast-msg">Server offline</span></div>` inside `<body>`, after the viewer div.

---

### Task 2: Add CSS styles

**Files:**
- Modify: `g/style.css`

- [ ] **Step 1: Add status dot styles**

Append at the end of `g/style.css`:

```css
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  margin-right: 8px;
  flex-shrink: 0;
  transition: background 0.3s;
}
.status-dot.online { background: #4caf50; }
.status-dot.offline { background: #ff4757; animation: pulse-dot 2s infinite; }
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(255, 71, 87, 0); }
}
```

- [ ] **Step 2: Add toast styles**

Append after the dot styles:

```css
.toast {
  position: fixed;
  top: calc(var(--toolbar-height) + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(-120%);
  background: var(--panel);
  border: 1px solid #ff4757;
  color: var(--text);
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
.toast-icon {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4757;
  flex-shrink: 0;
}
```

---

### Task 3: Add JS logic

**Files:**
- Modify: `g/main.js`

- [ ] **Step 1: Add checkServerStatus function**

Append at the end of `g/main.js`, after the `route()` call at the bottom:

```javascript
function checkServerStatus() {
  var dot = document.getElementById('statusDot');
  fetch(API + '/api/likes', { method: 'GET' })
    .then(function(r) {
      if (r.ok) {
        dot.className = 'status-dot online';
      } else {
        dot.className = 'status-dot offline';
        showToast();
      }
    })
    .catch(function() {
      dot.className = 'status-dot offline';
      showToast();
    });
}

function showToast() {
  var toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
  }, 3000);
}

checkServerStatus();
```
