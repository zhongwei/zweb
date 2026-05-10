# AGENTS.md

## Build

```
cargo build
```

Single binary, no workspace. The crate name is `webview2-demo`.

## Key facts

- **Rust edition 2024** — `static mut` references are banned; use raw pointer access or a wrapper type.
- **windows crate 0.62** — `WNDCLASSW` and `RegisterClassW` require the `Win32_Graphics_Gdi` feature flag. `GetModuleHandleW` returns `HMODULE`, not `HINSTANCE`; convert with `HINSTANCE(h.0)`.
- **webview2-com 0.39** — handler types are `CreateCoreWebView2EnvironmentCompletedHandler` / `CreateCoreWebView2ControllerCompletedHandler` (not the shorter names from older versions). The `create()` return value must be passed by reference (`&`) to satisfy the `Param` trait.
- **Windows-only** — requires WebView2 runtime (present on Windows 11 by default).
- Frontend assets live in `static/` (Vue 3 + Tailwind + FontAwesome), loaded as plain files.
