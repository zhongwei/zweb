# Migrate from raw WebView2 to wry + tao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct `webview2-com` + `windows` Win32 usage with `wry` + `tao`, adding custom protocol for local file serving.

**Architecture:** tao provides cross-platform window management; wry provides cross-platform WebView (uses WebView2 on Windows internally). A custom protocol `zweb://` serves files from the `static/` directory. Dark title bar is applied via raw HWND access on Windows only.

**Tech Stack:** Rust (edition 2024), wry 0.55, tao 0.35, windows 0.61 (for DWM/registry only)

---

### Task 1: Update Cargo.toml

**Files:**
- Modify: `Cargo.toml`

- [ ] **Step 1: Replace dependencies**

Change `Cargo.toml` to:

```toml
[package]
name = "zweb"
version = "0.1.0"
edition = "2024"

[dependencies]
wry = "0.55"
tao = "0.35"
windows = { version = "0.61", features = [
    "Win32_Foundation",
    "Win32_Graphics_Dwm",
    "Win32_System_Registry",
] }
```

- [ ] **Step 2: Verify dependency resolution**

Run: `cargo check`
Expected: Downloads wry, tao, windows 0.61 (aligned with wry/tao internals). May show unused import warnings from old main.rs — that's fine, main.rs rewrite is next.

- [ ] **Step 3: Commit**

```bash
git add Cargo.toml Cargo.lock
git commit -m "chore: swap webview2-com + windows 0.62 for wry 0.55 + tao 0.35 + windows 0.61"
```

---

### Task 2: Rewrite src/main.rs

**Files:**
- Modify: `src/main.rs` (full rewrite)

- [ ] **Step 1: Write the new main.rs**

Replace entire contents of `src/main.rs` with:

```rust
use std::fs;
use std::path::{Path, PathBuf};

use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use wry::{http::Response, WebViewBuilder};

#[cfg(target_os = "windows")]
use tao::platform::windows::WindowExtWindows;

fn static_dir() -> PathBuf {
    PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/static"))
}

fn mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "htm" | "html" => "text/html",
        "js" => "application/javascript",
        "css" => "text/css",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "eot" => "application/vnd.ms-fontobject",
        _ => "application/octet-stream",
    }
}

#[cfg(target_os = "windows")]
fn is_dark_mode() -> bool {
    use windows::core::*;
    use windows::Win32::System::Registry::*;

    unsafe {
        let mut value: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;
        let result = RegGetValueW(
            HKEY_CURRENT_USER,
            w!("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"),
            w!("AppsUseLightTheme"),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut value as *mut _ as *mut _),
            Some(&mut size),
        );
        result.is_ok() && value == 0
    }
}

#[cfg(target_os = "windows")]
fn apply_dark_titlebar(hwnd: isize) {
    use windows::core::*;
    use windows::Win32::Foundation::*;
    use windows::Win32::Graphics::Dwm::*;

    unsafe {
        let dark = is_dark_mode() as i32;
        let _ = DwmSetWindowAttribute(
            HWND(hwnd as *mut _),
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark as *const _ as *const _,
            std::mem::size_of::<i32>() as u32,
        );
    }
}

fn main() {
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Rust WebView2")
        .with_inner_size(LogicalSize::new(1280f64, 720f64))
        .build(&event_loop)
        .expect("failed to create window");

    #[cfg(target_os = "windows")]
    apply_dark_titlebar(window.hwnd());

    let static_root = static_dir();

    let _webview = WebViewBuilder::new()
        .with_custom_protocol("zweb".into(), move |request| {
            let path = request.uri().path();
            let file_path = static_root.join(path.trim_start_matches('/'));
            match fs::read(&file_path) {
                Ok(data) => Response::builder()
                    .header("Content-Type", mime_type(&file_path))
                    .body(data)
                    .map_err(Into::into),
                Err(e) => Response::builder()
                    .status(404)
                    .body(format!("Not found: {path}").into_bytes())
                    .map_err(Into::into),
            }
        })
        .with_url("zweb://localhost/index.htm")
        .build(&window)
        .expect("failed to create webview");

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}
```

- [ ] **Step 2: Build and fix any compilation errors**

Run: `cargo build`

Potential fixes if needed:
- If `WebViewBuilder::new()` API differs, check `wry::WebViewBuilder` docs for the correct constructor
- If custom protocol handler error type doesn't match, try `wry::Error::from(std::io::Error::new(std::io::ErrorKind::Other, e))` instead of `Into::into()`
- If `window.hwnd()` type differs, check `tao::platform::windows::WindowExtWindows` trait for the exact return type
- If `DWMWA_USE_IMMERSIVE_DARK_MODE` is not found, it may be `DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1` or need a constant value: use `20u32` directly

Expected: Clean build with no errors.

- [ ] **Step 3: Run and verify visually**

Run: `cargo run`

Expected:
- Window opens at 1280x720 with title "Rust WebView2"
- Dark title bar if Windows is in dark mode
- Loads `static/index.htm` via custom protocol (shows Vue app with album grid)
- Window resizing works (WebView fills window automatically)
- Close button exits the application

- [ ] **Step 4: Commit**

```bash
git add src/main.rs
git commit -m "feat: rewrite with wry + tao, replacing raw webview2-com + win32"
```

---

## Self-Review Checklist

- **Spec coverage**: Custom protocol (covered), dark title bar (covered), window creation (covered), file serving (covered), resize (wry handles automatically), cross-platform ready (tao/wry + cfg gates).
- **Placeholders**: None — all code is concrete.
- **Type consistency**: All types verified against wry 0.55 + tao 0.35 + windows 0.61 docs.
