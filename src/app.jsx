const { useState, useEffect, useMemo, useRef } = React;

// ── Icons (SVG) ──
const Icons = {
  scan: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
    </svg>
  ),
  cog: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.7M8 12.8v1.7M14.5 8h-1.7M3.2 8H1.5M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2M12.6 12.6l-1.2-1.2M4.6 4.6L3.4 3.4" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.6 3.6l.85.85M11.55 11.55l.85.85M11.55 3.6l-.85.85M4.45 11.55l-.85.85" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 10.2A5.7 5.7 0 0 1 5.8 2.5a6.2 6.2 0 1 0 7.7 7.7z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4M12.5 2v2.5H10M3.5 14v-2.5H6" />
    </svg>
  ),
  auto: (
    <svg viewBox="0 0 16 16" width="14" height="14">
      <defs>
        <clipPath id="half-clip">
          <rect x="0" y="0" width="8" height="16" />
        </clipPath>
      </defs>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="8" r="5" clipPath="url(#half-clip)" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5 4l.5 8h5l.5-8" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <rect x="1" y="2" width="14" height="3" rx="0.5" />
      <rect x="1" y="6.5" width="14" height="3" rx="0.5" />
      <rect x="1" y="11" width="14" height="3" rx="0.5" />
    </svg>
  ),
};

// ── Tweaks Hook ──
function useTweaks(defaults) {
  const storageKey = "icon-manager.tweaks";
  const [values, setValues] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return { ...defaults, ...(saved ? JSON.parse(saved) : {}) };
  });

  const setTweak = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return [values, setTweak];
}

// ── Utility Functions ──
function shortPath(p) {
  if (!p) return "未设置目录";
  const home = String(p).match(/^\/home\/[^/]+/)?.[0] || String(p).match(/^\/Users\/[^/]+/)?.[0] || "";
  return home ? "~" + p.slice(home.length) : p;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Theme Toggle ──
const COLOR_MODE_CYCLE = { system: "dark", dark: "light", light: "system" };
const COLOR_MODE_META = {
  system: { icon: "auto", title: "跟随系统（点击切换暗色）" },
  dark: { icon: "moon", title: "暗色模式（点击切换亮色）" },
  light: { icon: "sun", title: "亮色模式（点击跟随系统）" },
};

// ── TopBar Component ──
function TopBar({ path, scanning, onScan, onSettings, onCycleColorMode, colorMode }) {
  const meta = COLOR_MODE_META[colorMode] || COLOR_MODE_META.system;
  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="logo">🎨</div>
        <div className="tb-title">
          <div className="tb-t1">Icon Manager</div>
          <div className="tb-t2">Tauri 项目图标管理</div>
        </div>
        <div className="tb-divider" />
        <button className="path-pick" onClick={onSettings}>
          {Icons.folder}
          <span className="path-txt">{shortPath(path)}</span>
        </button>
      </div>
      <div className="tb-right">
        <button className="ibtn" title={meta.title} onClick={onCycleColorMode}>
          {meta.icon === "sun" ? Icons.sun : meta.icon === "moon" ? Icons.moon : Icons.auto}
        </button>
        <button className="btn btn-ghost" onClick={onSettings}>
          {Icons.cog}
          <span>设置</span>
        </button>
        <button className="btn btn-primary" onClick={onScan} disabled={scanning}>
          {Icons.scan}
          <span>{scanning ? "扫描中" : "扫描项目"}</span>
        </button>
      </div>
    </header>
  );
}

// ── ProjectCard Component ──
function ProjectCard({ project, loading, onReplaceIcon, onCargoClean, onBuild, onDebug }) {
  return (
    <div className={`project-card ${loading ? "loading" : ""}`}>
      <div className="card-header">
        <img src={project.icon} alt={escapeHtml(project.name)} className="project-icon" />
        <div className="project-info">
          <div className="project-name">
            {escapeHtml(project.name)}
            <span className="version-badge">{escapeHtml(project.version)}</span>
          </div>
          <div className="project-description" title={escapeHtml(project.description)}>
            {escapeHtml(project.description || "无描述")}
          </div>
          <div className="project-path" title={escapeHtml(project.path)}>
            {escapeHtml(shortPath(project.path))}
          </div>
        </div>
      </div>

      <div className="card-details">
        <div className="detail-row">
          <span className="detail-label">图标文件 ({project.iconFiles.length})</span>
        </div>
        <div className="icon-files-list">
          {project.iconFiles.map((f, i) => (
            <span key={i} className="icon-file-badge">
              {escapeHtml(f)}
            </span>
          ))}
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn-action"
          onClick={() => onReplaceIcon(project)}
          disabled={loading}
        >
          🎨 更换图标
        </button>
        <button
          className="btn-action"
          onClick={() => onCargoClean(project)}
          disabled={loading}
        >
          🧹 清理缓存
        </button>
        <button
          className="btn-action"
          onClick={() => onBuild(project)}
          disabled={loading}
        >
          📦 打包
        </button>
        <button
          className="btn-action"
          onClick={() => onDebug(project)}
          disabled={loading}
        >
          🐛 调试
        </button>
      </div>
    </div>
  );
}

// ── LogPanel Component ──
function LogPanel({ entries, open, setOpen, onClear }) {
  const last = entries[entries.length - 1] || { level: "info", t: "--:--:--", msg: "等待操作" };
  const [copyLabel, setCopyLabel] = useState("拷贝");

  const handleCopy = async (e) => {
    e.stopPropagation();
    const text = entries
      .slice()
      .reverse()
      .map((e) => `[${e.t}] ${e.msg}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("已复制!");
      setTimeout(() => setCopyLabel("拷贝"), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopyLabel("已复制!");
        setTimeout(() => setCopyLabel("拷贝"), 2000);
      } catch (err) {
        console.error("拷贝失败:", err);
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className={`log ${open ? "log-open" : ""}`}>
      <div className="log-hd" onClick={() => setOpen(!open)}>
        <span className="log-title">操作日志</span>
        <span className="log-count">{entries.length} 条</span>
        <div className="log-recent">
          {!open && (
            <span className={`log-last log-${last.level}`}>
              <span className="log-t">{last.t}</span>
              <span className="log-m">{last.msg}</span>
            </span>
          )}
        </div>
        {open && (
          <>
            <button
              className="log-toggle"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              清空
            </button>
            <button className="log-toggle" onClick={handleCopy}>
              {copyLabel}
            </button>
          </>
        )}
        <button className="log-toggle">{open ? "收起" : "展开"}</button>
      </div>
      {open && (
        <div className="log-body">
          {entries.slice().reverse().map((e, i) => (
            <div key={i} className={`log-row log-${e.level}`}>
              <span className="log-t">{e.t}</span>
              <span className="log-dot" />
              <span className="log-m">{e.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SettingsModal Component ──
function SettingsModal({ open, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [selecting, setSelecting] = useState(false);
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const handleSelectDirectory = async () => {
    setSelecting(true);
    try {
      const selected = await Bridge.selectDirectory();
      if (selected) {
        setDraft({ ...draft, base_dir: selected });
      }
    } catch (e) {
      console.error("选择目录失败:", e);
    } finally {
      setSelecting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>设置</h2>
        <div className="form-group">
          <label>工作区目录</label>
          <div className="input-with-button">
            <input
              type="text"
              value={draft?.base_dir || ""}
              onChange={(e) => setDraft({ ...draft, base_dir: e.target.value })}
              placeholder="/home/xxx/智能体/webcode"
            />
            <button
              className="btn btn-secondary"
              onClick={handleSelectDirectory}
              disabled={selecting}
            >
              {selecting ? "选择中..." : "选择目录"}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={() => onSave(draft)}>
            保存并重新扫描
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TweaksPanel Component ──
function TweaksPanel({ tweaks, setTweak }) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-hd" onClick={() => setTweak("showTweaks", !tweaks.showTweaks)}>
        <span>⚙ 外观设置</span>
        <button className="tweaks-toggle">{tweaks.showTweaks ? "收起" : "展开"}</button>
      </div>
      {tweaks.showTweaks && (
        <div className="tweaks-body">
          <div className="tweak-section">
            <label>密度</label>
            <div className="tweak-radio">
              {["compact", "regular", "comfy"].map((v) => (
                <button
                  key={v}
                  className={`tweak-opt ${tweaks.density === v ? "on" : ""}`}
                  onClick={() => setTweak("density", v)}
                >
                  {v === "compact" ? "紧凑" : v === "regular" ? "标准" : "宽松"}
                </button>
              ))}
            </div>
          </div>
          <div className="tweak-section">
            <label>视图</label>
            <div className="tweak-radio">
              <button
                className={`tweak-opt ${tweaks.view === "grid" ? "on" : ""}`}
                onClick={() => setTweak("view", "grid")}
              >
                {Icons.grid} 网格
              </button>
              <button
                className={`tweak-opt ${tweaks.view === "list" ? "on" : ""}`}
                onClick={() => setTweak("view", "list")}
              >
                {Icons.list} 列表
              </button>
            </div>
          </div>
          <div className="tweak-section">
            <label>主题色</label>
            <div className="tweak-colors">
              {["#D97757", "#3B82F6", "#10B981", "#7C3AED", "#0F172A"].map((c) => (
                <button
                  key={c}
                  className={`tweak-color ${tweaks.accent === c ? "on" : ""}`}
                  style={{ "--color": c }}
                  onClick={() => setTweak("accent", c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App Component ──
const TWEAK_DEFAULTS = {
  density: "regular",
  view: "grid",
  accent: "#D97757",
  colorMode: "system",
  showLog: true,
  showTweaks: false,
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({ base_dir: "" });
  const [scanning, setScanning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [loadingPaths, setLoadingPaths] = useState({});

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.colorMode === "dark") {
      root.dataset.theme = "dark";
      localStorage.setItem("icon-manager.theme", "dark");
    } else if (tweaks.colorMode === "light") {
      root.dataset.theme = "light";
      localStorage.setItem("icon-manager.theme", "light");
    } else {
      delete root.dataset.theme;
      localStorage.removeItem("icon-manager.theme");
    }
  }, [tweaks.colorMode]);

  // Apply accent color
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", tweaks.accent);
  }, [tweaks.accent]);

  // Push log entry
  const pushLog = React.useCallback((level, msg) => {
    const t = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogEntries((prev) => [...prev.slice(-199), { t, level, msg }]);
  }, []);

  // Load settings on mount
  useEffect(() => {
    Bridge.loadSettings()
      .then((s) => {
        setSettings(s);
        settingsRef.current = s;
        if (s.base_dir) {
          doScan(s);
        }
      })
      .catch((e) => pushLog("error", `加载设置失败: ${e}`));
  }, [pushLog]);

  // Scan projects
  const doScan = async (s = settingsRef.current) => {
    if (!s.base_dir) {
      pushLog("warn", "请先设置工作区目录");
      return;
    }

    setScanning(true);
    pushLog("info", `开始扫描 ${shortPath(s.base_dir)}`);
    try {
      const list = await Bridge.scanProjects(s.base_dir);
      setProjects(list);
      pushLog("ok", `扫描完成，找到 ${list.length} 个 Tauri 项目`);
    } catch (e) {
      pushLog("error", `扫描失败: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  // Replace icon
  const replaceIcon = async (project) => {
    try {
      const selected = await Bridge.openFile();
      if (!selected) {
        pushLog("info", "未选择图标文件");
        return;
      }

      setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
      pushLog("info", `[${project.name}] 正在替换图标...`);

      const result = await Bridge.replaceIcon(project.path, project.tauriDir, selected);
      if (result.success) {
        pushLog("ok", `[${project.name}] 图标替换成功`);
        await doScan(); // Refresh to show new icon
      } else {
        pushLog("error", `[${project.name}] 图标替换失败: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] 替换图标出错: ${e}`);
    } finally {
      setLoadingPaths((prev) => {
        const next = { ...prev };
        delete next[project.path];
        return next;
      });
    }
  };

  // Cargo clean
  const cargoClean = async (project) => {
    if (!confirm(`确定要清理 ${project.name} 的编译缓存吗？\n\n这将删除 target 目录。`)) {
      return;
    }

    setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
    pushLog("info", `[${project.name}] 正在清理缓存...`);

    try {
      const result = await Bridge.cargoClean(project.path, project.tauriDir);
      if (result.success) {
        pushLog("ok", `[${project.name}] 缓存清理成功`);
      } else {
        pushLog("error", `[${project.name}] 缓存清理失败: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] 清理缓存出错: ${e}`);
    } finally {
      setLoadingPaths((prev) => {
        const next = { ...prev };
        delete next[project.path];
        return next;
      });
    }
  };

  // Build project
  const buildProject = async (project) => {
    if (!confirm(`确定要构建 ${project.name} 吗？\n\n可能需要 5-15 分钟。`)) {
      return;
    }

    setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
    pushLog("info", `[${project.name}] 开始构建...`);

    const unlisten = Bridge.listenBuildOutput((msg) => pushLog("info", `[${project.name}] ${msg}`));

    try {
      const result = await Bridge.buildProject(project.path);
      if (result.success) {
        pushLog("ok", `[${project.name}] 构建完成`);
      } else {
        pushLog("error", `[${project.name}] 构建失败: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] 构建出错: ${e}`);
    } finally {
      unlisten();
      setLoadingPaths((prev) => {
        const next = { ...prev };
        delete next[project.path];
        return next;
      });
    }
  };

  // Debug project
  const debugProject = async (project) => {
    setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
    pushLog("info", `[${project.name}] 启动调试模式...`);

    const unlisten = Bridge.listenBuildOutput((msg) => pushLog("info", `[${project.name}] ${msg}`));

    try {
      const result = await Bridge.debugProject(project.path);
      if (result.success) {
        pushLog("ok", `[${project.name}] 调试模式已启动`);
      } else {
        pushLog("error", `[${project.name}] 启动调试失败: ${result.output}`);
        unlisten();
      }
    } catch (e) {
      pushLog("error", `[${project.name}] 启动调试出错: ${e}`);
      unlisten();
    } finally {
      setLoadingPaths((prev) => {
        const next = { ...prev };
        delete next[project.path];
        return next;
      });
    }
  };

  // Save settings
  const saveSettings = async (next) => {
    try {
      await Bridge.saveSettings(next);
      setSettings(next);
      settingsRef.current = next;
      setSettingsOpen(false);
      pushLog("ok", "设置已保存");
      await doScan(next);
    } catch (e) {
      pushLog("error", `保存设置失败: ${e}`);
    }
  };

  // Cycle color mode
  const cycleColorMode = () => {
    setTweak("colorMode", COLOR_MODE_CYCLE[tweaks.colorMode]);
  };

  return (
    <div className={`app density-${tweaks.density}`}>
      <TopBar
        path={settings.base_dir}
        scanning={scanning}
        onScan={() => doScan()}
        onSettings={() => setSettingsOpen(true)}
        onCycleColorMode={cycleColorMode}
        colorMode={tweaks.colorMode}
      />

      {tweaks.showTweaks && <TweaksPanel tweaks={tweaks} setTweak={setTweak} />}

      <main className="main">
        {projects.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">{Icons.scan}</div>
            <div className="empty-t">{scanning ? "正在扫描..." : "没有找到 Tauri 项目"}</div>
            <div className="empty-s">
              {settings.base_dir ? "检查工作区目录中是否包含 Tauri 项目" : "请先在设置中选择工作区目录"}
            </div>
          </div>
        ) : (
          <div className={`project-grid view-${tweaks.view}`}>
            {projects.map((p) => (
              <ProjectCard
                key={p.path}
                project={p}
                loading={!!loadingPaths[p.path]}
                onReplaceIcon={replaceIcon}
                onCargoClean={cargoClean}
                onBuild={buildProject}
                onDebug={debugProject}
              />
            ))}
          </div>
        )}
      </main>

      {tweaks.showLog && (
        <LogPanel
          entries={logEntries}
          open={logOpen}
          setOpen={setLogOpen}
          onClear={() => setLogEntries([])}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />
    </div>
  );
}

// ── Mount React App ──
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
