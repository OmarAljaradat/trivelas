export function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const body = document.body;

  // Function to apply theme
  const applyTheme = (isDark) => {
    if (isDark) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    
    // Also apply/remove light-theme class on buy-coins pages to avoid style overrides conflicts
    if (body.classList.contains('buy-coins-body')) {
      if (isDark) {
        body.classList.remove('light-theme');
      } else {
        body.classList.add('light-theme');
      }
    }

    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
      }
    }
  };

  // Check saved preference
  const savedTheme = localStorage.getItem('trivela_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDarkDefault = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  applyTheme(isDarkDefault);

  if (toggleBtn) {
    // Remove previous listener to avoid double triggers
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
    
    newBtn.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      const isDarkNow = body.classList.contains('dark-mode');
      localStorage.setItem('trivela_theme', isDarkNow ? 'dark' : 'light');
      applyTheme(isDarkNow);
    });
  }
}

// Automatically init theme on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Dynamically inject the analytics tracker on all client pages importing theme
(function() {
  const script = document.createElement('script');
  script.src = '/src/core/analytics-client.js';
  script.async = true;
  document.head.appendChild(script);

  const mScript = document.createElement('script');
  mScript.src = '/src/core/marketing-client.js?v=4.0';
  mScript.async = true;
  document.head.appendChild(mScript);
})();
