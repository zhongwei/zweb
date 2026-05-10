use std::cell::UnsafeCell;

use windows::{
    core::*,
    Win32::{
        Foundation::*,
        System::{
            Com::*,
            LibraryLoader::*,
        },
        UI::WindowsAndMessaging::*,
    },
};

use webview2_com::{
    Microsoft::Web::WebView2::Win32::*,
    CreateCoreWebView2EnvironmentCompletedHandler,
    CreateCoreWebView2ControllerCompletedHandler,
};

struct SyncCell<T>(UnsafeCell<T>);
unsafe impl<T> Sync for SyncCell<T> {}

static CONTROLLER: SyncCell<Option<ICoreWebView2Controller>> = SyncCell(UnsafeCell::new(None));

fn main() -> Result<()> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let hinstance = GetModuleHandleW(None)?;

        let class_name = w!("WebView2Window");

        let wc = WNDCLASSW {
            lpfnWndProc: Some(wndproc),
            hInstance: HINSTANCE(hinstance.0),
            lpszClassName: class_name,
            hCursor: LoadCursorW(None, IDC_ARROW)?,
            ..Default::default()
        };

        RegisterClassW(&wc);

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            class_name,
            w!("Rust WebView2"),
            WS_OVERLAPPEDWINDOW | WS_VISIBLE,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            1280,
            720,
            None,
            None,
            Some(HINSTANCE(hinstance.0)),
            None,
        )?;

        CreateCoreWebView2EnvironmentWithOptions(
            PCWSTR::null(),
            PCWSTR::null(),
            None,
            &CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(
                move |result, env| {
                    if result.is_ok() {
                        let env = env.unwrap();

                        env.CreateCoreWebView2Controller(
                            hwnd,
                            &CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
                                move |result, controller| {
                                    if result.is_ok() {
                                        let controller = controller.unwrap();

                                        let webview = controller.CoreWebView2()?;

                                        webview.Navigate(w!(
                                            "https://www.rust-lang.org"
                                        ))?;

                                        CONTROLLER.0.get().write(Some(controller));
                                    }

                                    Ok(())
                                },
                            )),
                        )?;
                    }

                    Ok(())
                },
            )),
        )?;

        let mut msg = MSG::default();

        while GetMessageW(&mut msg, None, 0, 0).into() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(())
}

extern "system" fn wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        match msg {
            WM_SIZE => {
                if let Some(controller) = &*CONTROLLER.0.get() {
                    let mut rect = RECT::default();

                    let _ = GetClientRect(hwnd, &mut rect);

                    let _ = controller.SetBounds(rect);
                }

                LRESULT(0)
            }

            WM_DESTROY => {
                PostQuitMessage(0);
                LRESULT(0)
            }

            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}
