const { invoke } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog;

// ── State ──
let currentDir = '';
let projects = [];
let settings = null;

// ── Theme ──
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }
  updateThemeButton();
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('btn-theme');
  const theme = document.documentElement.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Log Panel ──
function log(message, type = 'info') {
  const panel = document.getElementById('log-output');
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${message}`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

function clearLog() {
  document.getElementById('log-output').innerHTML = '';
}

// ── Settings ──
async function loadSettings() {
  try {
    settings = await invoke('icon_load_settings');
    currentDir = settings.base_dir;
    updateCurrentDir();
  } catch (e) {
    log(`加载设置失败: ${e}`, 'error');
    settings = { base_dir: '' };
  }
}

async function saveSettings() {
  const input = document.getElementById('s-base-dir');
  const newDir = input.value.trim();
  if (!newDir) {
    log('请输入有效的目录路径', 'error');
    return;
  }
  try {
    await invoke('icon_save_settings', { settings: { base_dir: newDir } });
    settings.base_dir = newDir;
    currentDir = newDir;
    updateCurrentDir();
    closeModal('settings-modal');
    log('设置已保存', 'ok');
  } catch (e) {
    log(`保存设置失败: ${e}`, 'error');
  }
}

function updateCurrentDir() {
  const el = document.getElementById('current-dir');
  if (!currentDir) {
    el.textContent = '未设置';
    el.title = '请选择工作区目录';
  } else {
    el.textContent = currentDir.replace(/^.*[\/\\]/, '');
    el.title = currentDir;
  }
}

// ── Select Directory ──
async function selectDirectory() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择 webcode 工作区目录'
    });

    if (!selected) {
      return; // User cancelled
    }

    // Save the selected directory
    await invoke('icon_save_settings', { settings: { base_dir: selected } });
    settings.base_dir = selected;
    currentDir = selected;
    updateCurrentDir();
    log(`工作区目录已设置: ${selected}`, 'ok');
  } catch (e) {
    log(`选择目录失败: ${e}`, 'error');
  }
}

// ── Scan Projects ──
async function scanProjects() {
  if (!currentDir) {
    log('请先点击 📁 按钮选择工作区目录', 'error');
    return;
  }

  log('开始扫描 Tauri 项目...', 'info');
  const grid = document.getElementById('project-grid');
  const empty = document.getElementById('empty-state');

  try {
    projects = await invoke('icon_scan_projects', { baseDir: currentDir });
    log(`扫描完成，找到 ${projects.length} 个 Tauri 项目`, 'ok');
    renderProjects();
  } catch (e) {
    log(`扫描失败: ${e}`, 'error');
  }
}

function renderProjects() {
  const grid = document.getElementById('project-grid');
  const empty = document.getElementById('empty-state');

  if (projects.length === 0) {
    empty.style.display = 'block';
    empty.textContent = '未找到 Tauri 项目';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = projects.map(p => renderProjectCard(p)).join('');
}

function renderProjectCard(project) {
  const { name, icon_data_url, description, version, path, icon_files } = project;

  const iconFilesHtml = icon_files.map(f =>
    `<span class="icon-file-badge">${escapeHtml(f)}</span>`
  ).join('');

  const descAttr = description ? `title="${escapeHtml(description)}"` : '';
  const descText = description || '无描述';

  return `
    <div class="project-card" data-path="${escapeHtml(path)}">
      <div class="card-header">
        <img src="${icon_data_url}" alt="${escapeHtml(name)}" class="project-icon">
        <div class="project-info">
          <div class="project-name">
            ${escapeHtml(name)}
            <span class="version-badge">${escapeHtml(version)}</span>
          </div>
          <div class="project-description" ${descAttr}>${escapeHtml(descText)}</div>
          <div class="project-path" title="${escapeHtml(path)}">${escapeHtml(path)}</div>
        </div>
      </div>

      <div class="card-details">
        <div class="detail-row">
          <span class="detail-label">图标文件 (${icon_files.length})</span>
        </div>
        <div class="icon-files-list">
          ${iconFilesHtml}
        </div>
      </div>

      <div class="card-actions">
        <button class="btn-action" onclick="replaceIcon('${escapeHtml(path)}')">
          🎨 更换图标
        </button>
        <button class="btn-action" onclick="cargoClean('${escapeHtml(path)}')">
          🧹 清理缓存
        </button>
      </div>
    </div>
  `;
}

// ── Replace Icon ──
async function replaceIcon(projectPath) {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Images',
        extensions: ['png', 'svg', 'jpg', 'jpeg']
      }]
    });

    if (!selected) {
      log('未选择图标文件', 'info');
      return;
    }

    log(`正在替换图标: ${projectPath}`, 'info');
    const card = document.querySelector(`.project-card[data-path="${projectPath}"]`);
    if (card) card.classList.add('loading');

    const result = await invoke('icon_replace_icon', {
      projectPath,
      iconPath: selected
    });

    if (result.success) {
      log(`图标替换成功: ${projectPath}`, 'ok');
      log(result.output, 'info');
      // Refresh projects to show new icon
      await scanProjects();
    } else {
      log(`图标替换失败: ${result.output}`, 'error');
    }

    if (card) card.classList.remove('loading');
  } catch (e) {
    log(`替换图标出错: ${e}`, 'error');
    const card = document.querySelector(`.project-card[data-path="${projectPath}"]`);
    if (card) card.classList.remove('loading');
  }
}

// ── Cargo Clean ──
async function cargoClean(projectPath) {
  try {
    const projectName = projectPath.split(/[\/\\]/).pop();
    if (!confirm(`确定要清理 ${projectName} 的编译缓存吗？\n\n这将删除 target 目录，下次编译会重新生成。`)) {
      return;
    }

    log(`正在清理缓存: ${projectPath}`, 'info');
    const card = document.querySelector(`.project-card[data-path="${projectPath}"]`);
    if (card) card.classList.add('loading');

    const result = await invoke('icon_cargo_clean', { projectPath });

    if (result.success) {
      log(`缓存清理成功: ${projectPath}`, 'ok');
      log(result.output, 'info');
    } else {
      log(`缓存清理失败: ${result.output}`, 'error');
    }

    if (card) card.classList.remove('loading');
  } catch (e) {
    log(`清理缓存出错: ${e}`, 'error');
    const card = document.querySelector(`.project-card[data-path="${projectPath}"]`);
    if (card) card.classList.remove('loading');
  }
}

// ── Modals ──
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── Utility ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Event Listeners ──
async function initApp() {
  initTheme();

  // Toolbar
  document.getElementById('btn-scan').addEventListener('click', scanProjects);
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-change-dir').addEventListener('click', selectDirectory);
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('s-base-dir').value = settings?.base_dir || '';
    openModal('settings-modal');
  });

  // Settings modal
  document.getElementById('btn-settings-save').addEventListener('click', saveSettings);
  document.getElementById('btn-settings-cancel').addEventListener('click', () => closeModal('settings-modal'));
  document.querySelector('#settings-modal .modal-backdrop').addEventListener('click', () => closeModal('settings-modal'));

  // Log panel
  document.getElementById('btn-log-toggle').addEventListener('click', () => {
    document.getElementById('log-panel').classList.toggle('collapsed');
    document.getElementById('btn-log-toggle').textContent =
      document.getElementById('log-panel').classList.contains('collapsed') ? '展开' : '收起';
  });
  document.getElementById('btn-log-clear').addEventListener('click', clearLog);

  // Load settings on start
  await loadSettings();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Make functions available globally for onclick handlers
window.scanProjects = scanProjects;
window.replaceIcon = replaceIcon;
window.cargoClean = cargoClean;
window.selectDirectory = selectDirectory;
