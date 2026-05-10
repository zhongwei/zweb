use std::cell::UnsafeCell;

use windows::{
    core::*,
    Win32::{
        Foundation::*,
        Graphics::Dwm::*,
        System::{
            Com::*,
            LibraryLoader::*,
            Registry::*,
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

fn is_dark_mode() -> bool {
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

fn apply_theme(hwnd: HWND) {
    unsafe {
        let dark = is_dark_mode() as i32;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark as *const _ as *const _,
            std::mem::size_of::<i32>() as u32,
        );
    }
}

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

        apply_theme(hwnd);

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

                                        let mut rect = RECT::default();
                                        let _ = GetClientRect(hwnd, &mut rect);
                                        let _ = controller.SetBounds(rect);
                                        let _ = controller.SetIsVisible(true);

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
            WM_SETTINGCHANGE => {
                apply_theme(hwnd);
                DefWindowProcW(hwnd, msg, wparam, lparam)
            }

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
