use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;
use base64::Engine as _;

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
