use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;
use base64::Engine as _;
use tokio::io::AsyncBufReadExt;
use tokio::process::Command as TokioCommand;
use std::process::Stdio;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TauriProject {
    pub name: String,
    pub path: String,
    pub icon_path: String,
    pub icon_data_url: String,
    pub description: String,
    pub version: String,
    pub icon_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IconOpResult {
    pub success: bool,
    pub output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub base_dir: String,
}

impl Default for Settings {
    fn default() -> Self {
        // Return empty string to prompt user to select directory
        Self {
            base_dir: String::new(),
        }
    }
}

fn settings_path() -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "无法获取配置目录".to_string())
        .map(|d| d.join("webcode-icon-manager").join("settings.json"))
}

#[tauri::command]
pub async fn icon_load_settings() -> Result<Settings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("读取配置失败: {}", e))?;
    serde_json::from_str(&raw).map_err(|e| format!("解析配置失败: {}", e))
}

#[tauri::command]
pub async fn icon_save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    tokio::fs::write(&path, json)
        .await
        .map_err(|e| format!("保存配置失败: {}", e))
}

fn icon_to_data_url(path: &Path) -> String {
    match fs::read(path) {
        Ok(bytes) => {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            format!("data:image/png;base64,{}", b64)
        }
        Err(_) => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".to_string(), // 1x1 transparent pixel
    }
}

fn get_icon_files(icons_dir: &Path) -> Vec<String> {
    if !icons_dir.exists() {
        return vec![];
    }
    fs::read_dir(icons_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
                .map(|e| e.file_name().to_string_lossy().to_string())
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub async fn icon_scan_projects(base_dir: String) -> Result<Vec<TauriProject>, String> {
    let base_path = Path::new(&base_dir);
    if !base_path.exists() {
        return Err(format!("目录不存在: {}", base_dir));
    }

    let mut projects = Vec::new();

    let entries = fs::read_dir(base_path)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取条目失败: {}", e))?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let tauri_conf = path.join("src-tauri/tauri.conf.json");
        let icons_dir = path.join("src-tauri/icons");
        let icon_path = icons_dir.join("icon.png");

        if !tauri_conf.exists() || !icon_path.exists() {
            continue;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let description = if let Ok(content) = fs::read_to_string(&tauri_conf) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                json["bundle"]["longDescription"]
                    .as_str()
                    .or_else(|| json["bundle"]["shortDescription"].as_str())
                    .unwrap_or("")
                    .to_string()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let version = if let Ok(content) = fs::read_to_string(&tauri_conf) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                json["version"].as_str().unwrap_or("0.0.0").to_string()
            } else {
                "0.0.0".to_string()
            }
        } else {
            "0.0.0".to_string()
        };

        let icon_data_url = icon_to_data_url(&icon_path);
        let icon_files = get_icon_files(&icons_dir);

        projects.push(TauriProject {
            name,
            path: path.to_string_lossy().to_string(),
            icon_path: icon_path.to_string_lossy().to_string(),
            icon_data_url,
            description,
            version,
            icon_files,
        });
    }

    projects.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(projects)
}

#[tauri::command]
pub async fn icon_replace_icon(project_path: String, icon_path: String) -> Result<IconOpResult, String> {
    let project_dir = Path::new(&project_path);
    let icon_file = Path::new(&icon_path);

    if !project_dir.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("项目目录不存在: {}", project_path),
        });
    }

    if !icon_file.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("图标文件不存在: {}", icon_path),
        });
    }

    let output = Command::new("npx")
        .args(["tauri", "icon", &icon_path])
        .current_dir(project_dir)
        .output()
        .map_err(|e| format!("执行命令失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let combined = if !stdout.is_empty() && !stderr.is_empty() {
        format!("{}\n{}", stdout, stderr)
    } else if !stdout.is_empty() {
        stdout
    } else if !stderr.is_empty() {
        stderr
    } else {
        "命令执行完成".to_string()
    };

    Ok(IconOpResult {
        success: output.status.success(),
        output: combined,
    })
}

#[tauri::command]
pub async fn icon_build_project(
    project_path: String,
    app_handle: tauri::AppHandle,
) -> Result<IconOpResult, String> {
    let project_dir = Path::new(&project_path);

    if !project_dir.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("项目目录不存在: {}", project_path),
        });
    }

    let build_cmd = resolve_build_command(project_dir);
    let mut child = TokioCommand::new("bash")
        .args(["-l", "-c", &build_cmd])
        .current_dir(project_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动构建失败: {}", e))?;

    let stdout = child.stdout.take().expect("no stdout");
    let stderr = child.stderr.take().expect("no stderr");
    let ah1 = app_handle.clone();
    let ah2 = app_handle.clone();

    let t1 = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            ah1.emit("build_output", line).ok();
        }
    });
    let t2 = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            ah2.emit("build_output", line).ok();
        }
    });

    let status = child.wait().await.map_err(|e| format!("等待构建失败: {}", e))?;
    let _ = tokio::join!(t1, t2);

    if !status.success() {
        return Ok(IconOpResult {
            success: false,
            output: "构建失败，请查看日志".to_string(),
        });
    }

    let product_name = read_product_name(project_dir).unwrap_or_default();
    let bundle_dir = project_dir.join("src-tauri/target/release/bundle");
    let reveal_path = find_bundle_artifact(&bundle_dir, &product_name);
    open_in_finder(&reveal_path);

    Ok(IconOpResult {
        success: true,
        output: format!("构建成功，产物位于: {}", reveal_path.display()),
    })
}

#[tauri::command]
pub async fn icon_debug_project(project_path: String) -> Result<IconOpResult, String> {
    let project_dir = Path::new(&project_path);

    if !project_dir.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("项目目录不存在: {}", project_path),
        });
    }

    let dev_cmd = resolve_dev_command(project_dir);

    Command::new("bash")
        .args(["-l", "-c", &dev_cmd])
        .current_dir(project_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动调试失败: {}", e))?;

    Ok(IconOpResult {
        success: true,
        output: format!("已在后台启动调试模式（{}），首次 Rust 编译需约 1 分钟", dev_cmd),
    })
}

fn resolve_dev_command(project_dir: &Path) -> String {
    let pkg_path = project_dir.join("package.json");
    if let Ok(content) = fs::read_to_string(&pkg_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(scripts) = json["scripts"].as_object() {
                if scripts.contains_key("dev") {
                    return "npm run dev".to_string();
                }
                if scripts.contains_key("tauri:dev") {
                    return "npm run tauri:dev".to_string();
                }
            }
        }
    }
    "npx tauri dev".to_string()
}

fn resolve_build_command(project_dir: &Path) -> String {
    let pkg_path = project_dir.join("package.json");
    if let Ok(content) = fs::read_to_string(&pkg_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(scripts) = json["scripts"].as_object() {
                if scripts.contains_key("build") {
                    return "npm run build".to_string();
                }
                if scripts.contains_key("tauri:build") {
                    return "npm run tauri:build".to_string();
                }
            }
        }
    }
    "npx tauri build".to_string()
}

fn read_product_name(project_dir: &Path) -> Option<String> {
    let conf = fs::read_to_string(project_dir.join("src-tauri/tauri.conf.json")).ok()?;
    let json: serde_json::Value = serde_json::from_str(&conf).ok()?;
    json["productName"].as_str().map(|s| s.to_string())
}

fn find_bundle_artifact(bundle_dir: &Path, product_name: &str) -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if !product_name.is_empty() {
            let app = bundle_dir.join("macos").join(format!("{}.app", product_name));
            if app.exists() {
                return app;
            }
        }
        return bundle_dir.join("macos");
    }
    #[cfg(target_os = "linux")]
    {
        let dir = bundle_dir.join("appimage");
        if let Ok(entries) = fs::read_dir(&dir) {
            for e in entries.flatten() {
                if e.path().extension().map_or(false, |x| x == "AppImage") {
                    return e.path();
                }
            }
        }
        return dir;
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    bundle_dir.to_path_buf()
}

fn open_in_finder(path: &Path) {
    #[cfg(target_os = "macos")]
    {
        if path.is_dir() && path.extension().map_or(true, |e| e != "app") {
            Command::new("open").arg(path).spawn().ok();
        } else {
            Command::new("open").args(["-R", &path.to_string_lossy().to_string()]).spawn().ok();
        }
    }
    #[cfg(target_os = "linux")]
    {
        let target = if path.is_file() { path.parent().unwrap_or(path) } else { path };
        Command::new("xdg-open").arg(target).spawn().ok();
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    let _ = path;
}

#[tauri::command]
pub async fn icon_cargo_clean(project_path: String) -> Result<IconOpResult, String> {
    let project_dir = Path::new(&project_path);

    if !project_dir.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("项目目录不存在: {}", project_path),
        });
    }

    let tauri_dir = project_dir.join("src-tauri");
    if !tauri_dir.exists() {
        return Ok(IconOpResult {
            success: false,
            output: format!("src-tauri 目录不存在: {}", tauri_dir.display()),
        });
    }

    let output = Command::new("cargo")
        .arg("clean")
        .current_dir(&tauri_dir)
        .output()
        .map_err(|e| format!("执行命令失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let combined = if !stdout.is_empty() && !stderr.is_empty() {
        format!("{}\n{}", stdout, stderr)
    } else if !stdout.is_empty() {
        stdout
    } else if !stderr.is_empty() {
        stderr
    } else {
        "清理完成".to_string()
    };

    Ok(IconOpResult {
        success: output.status.success(),
        output: combined,
    })
}
