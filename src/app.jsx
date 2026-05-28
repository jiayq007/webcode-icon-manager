const { useState, useEffect, useMemo, useRef } = React;

// ── i18n Hook ──
function useI18n() {
  const [lang, setLang] = useState(() => window.i18n.getLang());

  useEffect(() => {
    const handler = (e) => setLang(e.detail);
    window.addEventListener('i18n-change', handler);
    return () => window.removeEventListener('i18n-change', handler);
  }, []);

  const t = React.useCallback((key, ...args) => {
    let text = window.i18n.t(key);
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, arg);
    });
    return text;
  }, []);

  const toggleLang = React.useCallback(() => {
    const newLang = lang === 'zh' ? 'en' : 'zh';
    window.i18n.setLang(newLang);
  }, [lang]);

  return { lang, t, toggleLang };
}

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
  if (!p) return window.i18n.t('dirNotSet');
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
const COLOR_MODE_META_KEYS = {
  system: { icon: "auto", titleKey: "themeSystemDesc" },
  dark: { icon: "moon", titleKey: "themeDarkDesc" },
  light: { icon: "sun", titleKey: "themeLightDesc" },
};

// ── TopBar Component ──
function TopBar({ path, scanning, onScan, onSettings, onCycleColorMode, colorMode, t, lang, onToggleLang }) {
  const meta = COLOR_MODE_META_KEYS[colorMode] || COLOR_MODE_META_KEYS.system;
  const langMeta = {
    zh: { label: "EN", title: t('langToggleToEn') },
    en: { label: "中", title: t('langToggleToZh') },
  };

  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="logo">🎨</div>
        <div className="tb-title">
          <div className="tb-t1">{t('appTitle')}</div>
          <div className="tb-t2">{t('appSubtitle')}</div>
        </div>
        <div className="tb-divider" />
        <button className="path-pick" onClick={onSettings}>
          {Icons.folder}
          <span className="path-txt">{shortPath(path)}</span>
        </button>
      </div>
      <div className="tb-right">
        <button className="ibtn lang-btn" title={langMeta[lang]?.title} onClick={onToggleLang}>
          {langMeta[lang]?.label || lang}
        </button>
        <button className="ibtn" title={t(meta.titleKey)} onClick={onCycleColorMode}>
          {meta.icon === "sun" ? Icons.sun : meta.icon === "moon" ? Icons.moon : Icons.auto}
        </button>
        <button className="btn btn-ghost" onClick={onSettings}>
          {Icons.cog}
          <span>{t('settings')}</span>
        </button>
        <button className="btn btn-primary" onClick={onScan} disabled={scanning}>
          {Icons.scan}
          <span>{scanning ? t('scanning') : t('scanProjects')}</span>
        </button>
      </div>
    </header>
  );
}

// ── ProjectCard Component ──
function ProjectCard({ project, loading, onReplaceIcon, onCargoClean, onBuild, onDebug, t }) {
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
            {escapeHtml(project.description || t('noDescription'))}
          </div>
          <div className="project-path" title={escapeHtml(project.path)}>
            {escapeHtml(shortPath(project.path))}
          </div>
        </div>
      </div>

      <div className="card-details">
        <div className="detail-row">
          <span className="detail-label">{t('iconFilesWithCount', project.iconFiles.length)}</span>
        </div>
        <div className="icon-files-list">
          {project.iconFiles.map((f, i) => (
            <span key={i} className="icon-file-badge">
              {escapeHtml(f)}
            </span>
          ))}
        </div>
        <div className="detail-row" style={{ marginTop: '6px' }}>
          <span
            className="target-status-badge"
            style={{ color: project.hasTarget ? 'var(--accent)' : 'var(--fg-muted, #888)' }}
          >
            {project.hasTarget ? '● ' : '○ '}
            {project.hasTarget ? t('targetExists') : t('targetNotExists')}
          </span>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn-action"
          onClick={() => onReplaceIcon(project)}
          disabled={loading}
        >
          🎨 {t('replaceIcon')}
        </button>
        <button
          className="btn-action"
          onClick={() => onCargoClean(project)}
          disabled={loading || !project.hasTarget}
        >
          🧹 {t('cleanCache')}
        </button>
        <button
          className="btn-action"
          onClick={() => onBuild(project)}
          disabled={loading}
        >
          📦 {t('build')}
        </button>
        <button
          className="btn-action"
          onClick={() => onDebug(project)}
          disabled={loading}
        >
          🐛 {t('debug')}
        </button>
      </div>
    </div>
  );
}

// ── LogPanel Component ──
function LogPanel({ entries, open, setOpen, onClear, t }) {
  const last = entries[entries.length - 1] || { level: "info", t: "--:--:--", msg: t('waiting') };
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    const text = entries
      .slice()
      .reverse()
      .map((e) => `[${e.t}] ${e.msg}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error(t('copyFail'), err);
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className={`log ${open ? "log-open" : ""}`}>
      <div className="log-hd" onClick={() => setOpen(!open)}>
        <span className="log-title">{t('operationLog')}</span>
        <span className="log-count">{entries.length} {t('logCount')}</span>
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
              {t('clear')}
            </button>
            <button className="log-toggle" onClick={handleCopy}>
              {copied ? t('copied') : t('copy')}
            </button>
          </>
        )}
        <button className="log-toggle">{open ? t('collapse') : t('expand')}</button>
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
function SettingsModal({ open, settings, onClose, onSave, t }) {
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
      console.error(t('selectDirFailed'), e);
    } finally {
      setSelecting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{t('settingsTitle')}</h2>
        <div className="form-group">
          <label>{t('workspaceDir')}</label>
          <div className="input-with-button">
            <input
              type="text"
              value={draft?.base_dir || ""}
              onChange={(e) => setDraft({ ...draft, base_dir: e.target.value })}
              placeholder={t('selectDirPlaceholder')}
            />
            <button
              className="btn btn-secondary"
              onClick={handleSelectDirectory}
              disabled={selecting}
            >
              {selecting ? t('selecting') : t('selectDirBtn')}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={() => onSave(draft)}>
            {t('saveAndRescan')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TweaksPanel Component ──
function TweaksPanel({ tweaks, setTweak, t }) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-hd" onClick={() => setTweak("showTweaks", !tweaks.showTweaks)}>
        <span>⚙ {t('appearance')}</span>
        <button className="tweaks-toggle">{tweaks.showTweaks ? t('collapse') : t('expand')}</button>
      </div>
      {tweaks.showTweaks && (
        <div className="tweaks-body">
          <div className="tweak-section">
            <label>{t('density')}</label>
            <div className="tweak-radio">
              {["compact", "regular", "comfy"].map((v) => (
                <button
                  key={v}
                  className={`tweak-opt ${tweaks.density === v ? "on" : ""}`}
                  onClick={() => setTweak("density", v)}
                >
                  {v === "compact" ? t('densityCompact') : v === "regular" ? t('densityRegular') : t('densityComfy')}
                </button>
              ))}
            </div>
          </div>
          <div className="tweak-section">
            <label>{t('view')}</label>
            <div className="tweak-radio">
              <button
                className={`tweak-opt ${tweaks.view === "grid" ? "on" : ""}`}
                onClick={() => setTweak("view", "grid")}
              >
                {Icons.grid} {t('viewGrid')}
              </button>
              <button
                className={`tweak-opt ${tweaks.view === "list" ? "on" : ""}`}
                onClick={() => setTweak("view", "list")}
              >
                {Icons.list} {t('viewList')}
              </button>
            </div>
          </div>
          <div className="tweak-section">
            <label>{t('accentColor')}</label>
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
  const { lang, t, toggleLang } = useI18n();
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
    const timeStr = new Date().toLocaleTimeString("en-CA", { hour12: false });
    setLogEntries((prev) => [...prev.slice(-199), { t: timeStr, level, msg }]);
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
      .catch((e) => pushLog("error", `${t('logFailedToLoad')}: ${e}`));
  }, [pushLog, t]);

  // Scan projects
  const doScan = async (s = settingsRef.current) => {
    if (!s.base_dir) {
      pushLog("warn", t('pleaseSetWorkspaceDir'));
      return;
    }

    setScanning(true);
    pushLog("info", t('scanProjectsAt', shortPath(s.base_dir)));
    try {
      const list = await Bridge.scanProjects(s.base_dir);
      setProjects(list);
      pushLog("ok", t('scanCompleteFound', list.length));
    } catch (e) {
      pushLog("error", `${t('scanFailedMsg')}: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  // Replace icon
  const replaceIcon = async (project) => {
    try {
      const selected = await Bridge.openFile();
      if (!selected) {
        pushLog("info", t('noFileSelected'));
        return;
      }

      setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
      pushLog("info", `[${project.name}] ${t('replacingIconFor')}...`);

      const result = await Bridge.replaceIcon(project.path, project.tauriDir, selected);
      if (result.success) {
        pushLog("ok", `[${project.name}] ${t('iconReplaceOk')}`);
        await doScan(); // Refresh to show new icon
      } else {
        pushLog("error", `[${project.name}] ${t('iconReplaceFailedFor')}: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] ${t('iconReplaceFailedFor')}: ${e}`);
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
    if (!confirm(t('confirmCleanCache', project.name))) {
      return;
    }

    setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
    pushLog("info", `[${project.name}] ${t('cleaningCacheFor')}...`);

    try {
      const result = await Bridge.cargoClean(project.path, project.tauriDir);
      if (result.success) {
        pushLog("ok", `[${project.name}] ${t('cacheCleanOk')}`);
        setProjects((prev) =>
          prev.map((p) => p.path === project.path ? { ...p, hasTarget: false } : p)
        );
      } else {
        pushLog("error", `[${project.name}] ${t('cleanCacheFailedFor')}: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] ${t('cleanCacheFailedFor')}: ${e}`);
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
    if (!confirm(t('confirmBuild', project.name))) {
      return;
    }

    setLoadingPaths((prev) => ({ ...prev, [project.path]: true }));
    pushLog("info", `[${project.name}] ${t('buildInProgress')}...`);

    const unlisten = Bridge.listenBuildOutput((msg) => pushLog("info", `[${project.name}] ${msg}`));

    try {
      const result = await Bridge.buildProject(project.path);
      if (result.success) {
        pushLog("ok", `[${project.name}] ${t('buildOk')}`);
      } else {
        pushLog("error", `[${project.name}] ${t('buildFailedFor')}: ${result.output}`);
      }
    } catch (e) {
      pushLog("error", `[${project.name}] ${t('buildFailedFor')}: ${e}`);
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
    pushLog("info", `[${project.name}] ${t('debugModeStarted')}...`);

    const unlisten = Bridge.listenBuildOutput((msg) => pushLog("info", `[${project.name}] ${msg}`));

    try {
      const result = await Bridge.debugProject(project.path);
      if (result.success) {
        pushLog("ok", `[${project.name}] ${t('debugOk')}`);
      } else {
        pushLog("error", `[${project.name}] ${t('debugFailedFor')}: ${result.output}`);
        unlisten();
      }
    } catch (e) {
      pushLog("error", `[${project.name}] ${t('debugFailedFor')}: ${e}`);
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
      pushLog("ok", t('settingsSaved'));
      await doScan(next);
    } catch (e) {
      pushLog("error", `${t('saveSettingsFailed')}: ${e}`);
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
        t={t}
        lang={lang}
        onToggleLang={toggleLang}
      />

      <TweaksPanel tweaks={tweaks} setTweak={setTweak} t={t} />

      <main className="main">
        {projects.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">{Icons.scan}</div>
            <div className="empty-t">{scanning ? t('scanningDir') : t('noProjects')}</div>
            <div className="empty-s">
              {settings.base_dir ? t('noProjectsHint') : t('noProjectsHintNoDir')}
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
                t={t}
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
          t={t}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        t={t}
      />
    </div>
  );
}

// ── Mount React App ──
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
