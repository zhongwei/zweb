# Migrate from raw WebView2 to wry + tao

## Motivation

- **Simplify code**: Remove manual COM initialization, nested callbacks, global static controller, and Win32 boilerplate. Expected reduction from ~179 lines to ~80 lines.
- **Cross-platform readiness**: wry + tao abstract over platform differences, enabling future Linux/macOS support with minimal changes.

## Approach

Full replacement of `windows` (window management) and `webview2-com` with `wry` + `tao`. The `windows` crate is retained only for dark title bar support (DWM + registry).

## Dependencies

```toml
[dependencies]
wry = "0.52"
tao = "0.33"
windows = { version = "0.62", features = [
    "Win32_Foundation",
    "Win32_Graphics_Dwm",
    "Win32_System_Registry",
] }
dunce = "1"
```

Removed: `webview2-com`. Windows features reduced from 7 to 3.

## Architecture

```
main()
  +-- tao::EventLoop          (replaces GetMessageW loop)
  +-- tao::Window             (replaces CreateWindowExW)
  +-- wry::WebView            (replaces manual WebView2 env + controller)
  +-- custom protocol "zweb"  (loads files from static/ directory)
```

Single file `src/main.rs`. No module split needed at this size.

## Features

### Window

- 1280x720 default size, title "Rust WebView2"
- Created via `tao::WindowBuilder`
- Auto-resize handled by wry (no manual WM_SIZE)

### Dark title bar

- On startup, read `HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme` registry value
- Apply via `DwmSetWindowAttribute(DWMWA_USE_IMMERSIVE_DARK_MODE)` using HWND from `window.raw_window_handle()`
- Platform-gated with `#[cfg(target_os = "windows")]`
- Runtime theme change monitoring is **not** included in this migration (tao does not expose WM_SETTINGCHANGE). Can be added later via a hidden window + RegisterWindowMessage if needed.

### Static file loading

- Custom protocol `zweb://localhost/<path>` serves files from the `static/` directory
- MIME type detection by file extension (htm/html, js, css, json, png, jpg, svg, woff2, etc.)
- Uses `dunce::canonicalize` to resolve the static directory path at build time
- Default URL: `zweb://localhost/index.htm`

### What is removed

- `CoInitializeEx` / COM initialization (handled by wry internally)
- `WNDCLASSW` / `RegisterClassW` / `CreateWindowExW` (handled by tao)
- `SyncCell<Option<ICoreWebView2Controller>>` global static
- Manual `WM_SIZE` / `WM_DESTROY` handler
- Nested `CreateCoreWebView2EnvironmentCompletedHandler` / `CreateCoreWebView2ControllerCompletedHandler` callbacks

## File changes

| File | Change |
|------|--------|
| `Cargo.toml` | Remove `webview2-com`, add `wry`, `tao`, `dunce`, reduce `windows` features |
| `src/main.rs` | Full rewrite (~80 lines) |

## Out of scope

- Runtime system theme change detection (can be added later)
- IPC / JS-Rust bridge (not needed for current functionality)
- Linux/macOS builds (architecture supports it, but not part of this migration)
