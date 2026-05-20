# webcode-icon-manager

WebClaw Tauri 图标管理工具。扫描 Tauri 项目，一键替换图标，清理编译缓存。

## 功能

- 自动扫描目录下的所有 Tauri 项目
- 显示项目图标、版本、描述等信息
- 文件选择对话框一键替换图标（使用 `npx tauri icon`）
- 一键执行 `cargo clean` 清理编译缓存
- 跨平台支持（macOS、Linux、Windows）

## 开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```

## 系统要求

- Node.js 18+
- Rust（通过 rustup 安装）
- macOS: Xcode Command Line Tools
- Linux: libwebkit2gtk-4.1-dev, libgtk-3-dev
- Windows: Visual Studio C++ Build Tools

## 许可证

MIT
