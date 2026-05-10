use std::borrow::Cow;
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
