// =============================================================================
// Theme Toggle - Dark/Light Mode Switcher
// =============================================================================
// Handles theme persistence, system preference detection, and smooth transitions.

(function() {
  'use strict';

  const THEME_KEY = 'goa-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  // Get the system preference
  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK;
    }
    return LIGHT;
  }

  // Get the stored theme or fall back to system preference
  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  // Store the theme preference
  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // localStorage not available
    }
  }

  // Apply the theme to the document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also set on body for td-home class combination
    if (document.body) {
      document.body.setAttribute('data-theme', theme);
    }
    
    // Update Gurubase widget if present
    const guruWidget = document.getElementById('guru-widget-id');
    if (guruWidget) {
      guruWidget.setAttribute('data-light-mode', theme === LIGHT ? 'true' : 'false');
    }
  }

  // Get current theme
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || LIGHT;
  }

  // Toggle between themes
  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
    setStoredTheme(next);
  }

  // Initialize theme on page load
  function initTheme() {
    const stored = getStoredTheme();
    const theme = stored || getSystemPreference();
    applyTheme(theme);
  }

  // Create the theme toggle button
  function createToggleButton() {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle dark mode');
    button.setAttribute('title', 'Toggle dark mode');
    
    button.innerHTML = `
      <span class="theme-toggle-icon">
        <svg class="sun-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
        </svg>
        <svg class="moon-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
        </svg>
      </span>
    `;
    
    button.addEventListener('click', toggleTheme);
    
    return button;
  }

  // Insert the toggle button into the navbar
  function insertToggleButton() {
    // Check if already inserted
    if (document.querySelector('.theme-toggle')) {
      return;
    }
    
    // Find the search element - it should be in the navbar
    const search = document.querySelector('.td-navbar .td-search');
    
    if (!search) {
      // Retry after a short delay if search not found yet
      setTimeout(insertToggleButton, 100);
      return;
    }
    
    const toggle = createToggleButton();
    
    // Insert toggle right after the search element
    if (search.nextSibling) {
      search.parentNode.insertBefore(toggle, search.nextSibling);
    } else {
      search.parentNode.appendChild(toggle);
    }
  }

  // Listen for system preference changes
  function watchSystemPreference() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        // Only auto-switch if user hasn't set a preference
        if (!getStoredTheme()) {
          applyTheme(e.matches ? DARK : LIGHT);
        }
      });
    }
  }

  // Initialize immediately to prevent flash
  initTheme();

  // Set up the toggle button and system preference watcher when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      insertToggleButton();
      watchSystemPreference();
    });
  } else {
    insertToggleButton();
    watchSystemPreference();
  }
})();

