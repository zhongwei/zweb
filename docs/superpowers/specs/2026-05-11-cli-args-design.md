# CLI Argument Handling Design

## Overview

Add command-line argument parsing to `zweb` to control the initial page loaded in the WebView window. Uses manual argument parsing (no external dependencies).

## Behavior

| Invocation | Result |
|---|---|
| `zweb` | Open `https://www.rust-lang.org` |
| `zweb -d <dir>` | Open `index.html` or `index.htm` from `<dir>` via `file://` protocol |
| `zweb <url>` | Open the URL (auto-prepend `https://` if no scheme present) |

## Parsing Rules

1. Iterate `std::env::args().skip(1)`
2. If `-d` is encountered, take the next argument as the directory path
3. Any other argument is treated as a URL
4. Priority: `-d` > URL > default (`https://www.rust-lang.org`)
5. `-d` and URL are mutually exclusive; `-d` takes precedence
6. URL arguments without a scheme (`http://`, `https://`, `file://`) are auto-prefixed with `https://`

## Implementation

### New enum in `main.rs`

```rust
enum Target {
    Url(String),
    Dir(PathBuf),
    Default,
}
```

### New function: `parse_args()`

- Returns `Target` based on CLI arguments
- For `Dir`: canonicalizes the path, then checks for `index.html` then `index.htm`; errors if neither found
- For `Url`: if the string does not start with `http://`, `https://`, or `file://`, prepend `https://`

### Changes to `main()`

- Call `parse_args()` to determine the target
- Set `with_url()` based on the target:
  - `Target::Default` → `https://www.rust-lang.org`
  - `Target::Url(u)` → `u`
  - `Target::Dir(d)` → `file:///` + canonicalized path to index file
- The existing `zweb://` custom protocol and `static/` directory serving remain unchanged
- Window title should reflect the opened target

## Scope

- Single-file change in `src/main.rs`
- No new dependencies
- No changes to the custom protocol handler or static file serving
