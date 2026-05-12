# `svr` Subcommand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `svr` subcommand that starts only the HTTP API server without a GUI window.

**Architecture:** Extract the HTTP request-handling loop from `main()` into a shared `run_http_server()` function. In `svr` mode, call it directly on the main thread. In GUI mode, call it inside `thread::spawn` (as today).

**Tech Stack:** Rust, tiny_http, std::env::args (no new dependencies)

---

### Task 1: Extract `run_http_server()` function

**Files:**
- Modify: `src/main.rs:251-361`

- [ ] **Step 1: Add the `run_http_server` function**

Add this function after `toggle_like()` (after line 191, before `fn main()`):

```rust
fn run_http_server(server: tiny_http::Server) {
    for mut request in server.incoming_requests() {
        match (request.method(), request.url()) {
            (&tiny_http::Method::Post, "/api/like") => {
                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_err() {
                    let resp = tiny_http::Response::from_string("{}")
                        .with_status_code(400)
                        .with_header(tiny_http::Header {
                            field: "Content-Type".parse().unwrap(),
                            value: "application/json".parse().unwrap(),
                        });
                    let _ = request.respond(resp);
                    continue;
                }
                let parsed: std::collections::HashMap<String, u32> =
                    match serde_json::from_str(&body) {
                        Ok(p) => p,
                        Err(_) => {
                            let resp = tiny_http::Response::from_string("{}")
                                .with_status_code(400)
                                .with_header(tiny_http::Header {
                                    field: "Content-Type".parse().unwrap(),
                                    value: "application/json".parse().unwrap(),
                                });
                            let _ = request.respond(resp);
                            continue;
                        }
                    };
                let dir = match parsed.get("dir") {
                    Some(&d) => d,
                    None => {
                        let resp = tiny_http::Response::from_string("{}")
                            .with_status_code(400)
                            .with_header(tiny_http::Header {
                                field: "Content-Type".parse().unwrap(),
                                value: "application/json".parse().unwrap(),
                            });
                        let _ = request.respond(resp);
                        continue;
                    }
                };
                let img = match parsed.get("img") {
                    Some(&i) => i,
                    None => {
                        let resp = tiny_http::Response::from_string("{}")
                            .with_status_code(400)
                            .with_header(tiny_http::Header {
                                field: "Content-Type".parse().unwrap(),
                                value: "application/json".parse().unwrap(),
                            });
                        let _ = request.respond(resp);
                        continue;
                    }
                };
                let liked = toggle_like(dir, img);
                let resp_body = format!("{{\"liked\":{liked}}}");
                let resp = tiny_http::Response::from_string(resp_body)
                    .with_header(tiny_http::Header {
                        field: "Content-Type".parse().unwrap(),
                        value: "application/json".parse().unwrap(),
                    })
                    .with_header(tiny_http::Header {
                        field: "Access-Control-Allow-Origin".parse().unwrap(),
                        value: "*".parse().unwrap(),
                    });
                let _ = request.respond(resp);
            }
            (&tiny_http::Method::Get, "/api/likes") => {
                let data = read_likes();
                let resp_body =
                    serde_json::to_string(&data).unwrap_or_else(|_| "[]".to_string());
                let resp = tiny_http::Response::from_string(resp_body)
                    .with_header(tiny_http::Header {
                        field: "Content-Type".parse().unwrap(),
                        value: "application/json".parse().unwrap(),
                    })
                    .with_header(tiny_http::Header {
                        field: "Access-Control-Allow-Origin".parse().unwrap(),
                        value: "*".parse().unwrap(),
                    });
                let _ = request.respond(resp);
            }
            (&tiny_http::Method::Options, _) => {
                let resp = tiny_http::Response::from_string("")
                    .with_status_code(204)
                    .with_header(tiny_http::Header {
                        field: "Access-Control-Allow-Origin".parse().unwrap(),
                        value: "*".parse().unwrap(),
                    })
                    .with_header(tiny_http::Header {
                        field: "Access-Control-Allow-Methods".parse().unwrap(),
                        value: "GET, POST, OPTIONS".parse().unwrap(),
                    })
                    .with_header(tiny_http::Header {
                        field: "Access-Control-Allow-Headers".parse().unwrap(),
                        value: "Content-Type".parse().unwrap(),
                    });
                let _ = request.respond(resp);
            }
            _ => {
                let resp = tiny_http::Response::from_string("not found")
                    .with_status_code(404);
                let _ = request.respond(resp);
            }
        }
    }
}
```

- [ ] **Step 2: Replace inline server code in `main()` with `run_http_server` call**

Replace lines 251-361 (the `_likes_server` block) with:

```rust
    let _likes_server = {
        let server = tiny_http::Server::http("127.0.0.1:18832")
            .expect("failed to start likes API server on port 18832");
        std::thread::spawn(move || run_http_server(server))
    };
```

- [ ] **Step 3: Build to verify**

Run: `cargo build`
Expected: compiles successfully, no errors

- [ ] **Step 4: Commit**

```bash
git add src/main.rs
git commit -m "refactor: extract run_http_server from main"
```

---

### Task 2: Add `svr` subcommand branching

**Files:**
- Modify: `src/main.rs:193` (top of `main()`)

- [ ] **Step 1: Insert `svr` check at the top of `main()`**

Add this code as the first lines of `main()`, before the `EventLoop::new()` call:

```rust
    if std::env::args().nth(1).as_deref() == Some("svr") {
        let server = tiny_http::Server::http("127.0.0.1:18832")
            .expect("failed to start likes API server on port 18832");
        eprintln!("zweb svr: listening on 127.0.0.1:18832");
        run_http_server(server);
        return;
    }
```

- [ ] **Step 2: Build to verify**

Run: `cargo build`
Expected: compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src/main.rs
git commit -m "feat: add svr subcommand for headless HTTP server"
```
