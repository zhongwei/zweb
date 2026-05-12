use std::borrow::Cow;
use std::collections::BTreeMap;
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

enum Target {
    Url(String),
    Dir(PathBuf),
    Default,
}

fn parse_args() -> Target {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut i = 0;
    while i < args.len() {
        if args[i] == "-d" {
            if i + 1 < args.len() {
                return Target::Dir(PathBuf::from(&args[i + 1]));
            } else {
                eprintln!("error: -d requires a directory argument");
                std::process::exit(1);
            }
        }
        i += 1;
    }
    if let Some(arg) = args.iter().find(|a| !a.starts_with('-')) {
        let url = if arg.starts_with("http://") || arg.starts_with("https://") || arg.starts_with("file://") {
            arg.clone()
        } else {
            format!("https://{arg}")
        };
        return Target::Url(url);
    }
    Target::Default
}

fn resolve_dir_target(dir: &Path) -> String {
    let candidates = ["index.html", "index.htm"];
    let dir = dir.canonicalize().unwrap_or_else(|e| {
        eprintln!("error: cannot access directory '{}': {e}", dir.display());
        std::process::exit(1);
    });
    for name in &candidates {
        let file = dir.join(name);
        if file.exists() {
            let path_str = file.to_str().unwrap_or_else(|| {
                eprintln!("error: path contains invalid unicode");
                std::process::exit(1);
            });
            let path_str = path_str.trim_start_matches(r"\\?\");
            return format!("file:///{}", path_str.replace('\\', "/"));
        }
    }
    eprintln!("error: no index.html or index.htm found in '{}'", dir.display());
    std::process::exit(1);
}

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
    use windows::core::w;
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

fn likes_path() -> PathBuf {
    PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/g/likes.js"))
}

fn read_likes() -> Vec<Vec<u32>> {
    let path = likes_path();
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    let trimmed = content.trim();
    if !trimmed.starts_with("var likes = ") {
        return Vec::new();
    }
    let json_part = &trimmed["var likes = ".len()..];
    let json_part = json_part.trim_end_matches(';').trim();
    match serde_json::from_str::<Vec<Vec<u32>>>(json_part) {
        Ok(v) => v,
        Err(_) => Vec::new(),
    }
}

fn write_likes(data: &[Vec<u32>]) {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "[]".to_string());
    let content = format!("var likes = {json};\n");
    let path = likes_path();
    let _ = fs::write(&path, content);
}

fn toggle_like(dir: u32, img: u32) -> bool {
    let mut map: BTreeMap<u32, Vec<u32>> = BTreeMap::new();
    for entry in read_likes() {
        if entry.len() >= 2 {
            let d = entry[0];
            let imgs: Vec<u32> = entry[1..].to_vec();
            map.insert(d, imgs);
        }
    }
    let entry = map.entry(dir).or_default();
    let liked;
    if let Some(pos) = entry.iter().position(|&x| x == img) {
        entry.remove(pos);
        liked = false;
    } else {
        entry.push(img);
        entry.sort();
        liked = true;
    }
    if entry.is_empty() {
        map.remove(&dir);
    }
    let result: Vec<Vec<u32>> = map
        .into_iter()
        .filter(|(_, v)| !v.is_empty())
        .map(|(d, v)| {
            let mut row = vec![d];
            row.extend(v);
            row
        })
        .collect();
    write_likes(&result);
    liked
}

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

fn main() {
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Rust WebView2")
        .with_inner_size(LogicalSize::new(1280f64, 720f64))
        .build(&event_loop)
        .expect("failed to create window");

    #[cfg(target_os = "windows")]
    apply_dark_titlebar(window.hwnd());

    let static_root = static_dir().canonicalize().expect("static dir must exist");

    let _webview = WebViewBuilder::new()
        .with_custom_protocol("zweb".into(), move |_webview_id, request| {
            let path = request.uri().path();
            let file_path = static_root.join(path.trim_start_matches('/'));
            let resolved = match file_path.canonicalize() {
                Ok(p) => p,
                Err(_) => {
                    return Response::builder()
                        .status(404)
                        .body(format!("Not found: {path}").into_bytes())
                        .expect("building response")
                        .map(Cow::Owned);
                }
            };
            if !resolved.starts_with(&static_root) {
                return Response::builder()
                    .status(403)
                    .body("Forbidden".as_bytes().to_vec())
                    .expect("building response")
                    .map(Cow::Owned);
            }
            match fs::read(&resolved) {
                Ok(data) => Response::builder()
                    .header("Content-Type", mime_type(&resolved))
                    .body(data)
                    .expect("building response")
                    .map(Cow::Owned),
                Err(_) => Response::builder()
                    .status(404)
                    .body(format!("Not found: {path}").into_bytes())
                    .expect("building response")
                    .map(Cow::Owned),
            }
        })
        .with_url({
            let target = parse_args();
            match target {
                Target::Default => "https://www.rust-lang.org".to_string(),
                Target::Url(u) => u,
                Target::Dir(d) => resolve_dir_target(&d),
            }
        })
        .build(&window)
        .expect("failed to create webview");

    let _likes_server = {
        let server = tiny_http::Server::http("127.0.0.1:18832")
            .expect("failed to start likes API server on port 18832");
        std::thread::spawn(move || run_http_server(server))
    };

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
