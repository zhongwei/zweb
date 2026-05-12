# `svr` Subcommand Design

## Goal

Add a `svr` subcommand to zweb that starts only the HTTP API server (port 18832) without creating any GUI window or WebView.

## Behavior

- `zweb svr` — starts the likes API server on 127.0.0.1:18832, blocks in the main thread. No window, no WebView, no `-d`/URL args.
- `zweb` (no subcommand) — current behavior unchanged (window + WebView + background HTTP server).

## Design

Extend the existing hand-rolled `std::env::args()` parsing at the top of `main()`:

1. Check `std::env::args().nth(1) == Some("svr")`
2. If yes: create the tiny_http server and run `incoming_requests()` loop directly on the main thread (no `thread::spawn`). This blocks naturally.
3. If no: proceed with the existing GUI flow unchanged.

## Changes to `main.rs`

- Insert a `svr` branch at the top of `main()`, before the EventLoop/Window/WebView creation.
- Extract the HTTP request-handling loop into a standalone function `run_http_server()` shared by both modes.
- In GUI mode, `run_http_server()` is called inside `thread::spawn` (as today).
- In `svr` mode, `run_http_server()` is called directly on the main thread.

## What does NOT change

- `parse_args()`, `Target` enum, URL/dir resolution — untouched (svr mode doesn't use them).
- All existing helper functions (likes_path, read_likes, write_likes, toggle_like, etc.).
- No new dependencies.
