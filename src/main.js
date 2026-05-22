// ── Theme Initialization (runs before React) ──
(function () {
  const saved = localStorage.getItem('icon-manager.theme');
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }

  // Apply system preference if no saved theme
  if (!saved) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  }
})();


