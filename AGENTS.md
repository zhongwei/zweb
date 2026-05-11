# AGENTS.md

## Build

```
cargo build
```

Single binary, no workspace. The crate name is `zweb`.

## Key facts

- **Rust edition 2024** — `static mut` references are banned; use raw pointer access or a wrapper type.
- **wry 0.55 + tao 0.35** — cross-platform WebView and window management. On Windows, wry uses WebView2 internally.
- **windows crate 0.61** — kept only for dark title bar support (`DwmSetWindowAttribute` + registry). Version aligned with wry/tao internals.
- **Windows-only** — requires WebView2 runtime (present on Windows 11 by default). Architecture supports future Linux/macOS builds.
- Frontend assets live in `static/` (Vue 3 + Tailwind + FontAwesome), served via custom protocol `zweb://localhost/`. **Ignore the `static/` directory** — it is unrelated to current work and should not be modified.
