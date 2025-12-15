// =============================================================================
// External Links - Detection and Marking for LLM-Optimized Documentation
// =============================================================================
// Detects external links (non-goa.design URLs) and marks them with:
// - External link icon
// - target="_blank" attribute
// - rel="noopener" for security
// Requirements: 5.3

(function() {
  'use strict';

  // =========================================================================
  // Configuration
  // =========================================================================

  /**
   * Domains considered internal (not marked as external)
   */
  var INTERNAL_DOMAINS = [
    'goa.design',
    'www.goa.design',
    'localhost',
    '127.0.0.1',
  ];

  /**
   * CSS class added to external links
   */
  var EXTERNAL_LINK_CLASS = 'external-link';

  /**
   * Selector for content area to process
   */
  var CONTENT_SELECTOR = '.td-content';

  // =========================================================================
  // Link Detection
  // =========================================================================

  /**
   * Check if a URL is external (not on goa.design or internal domains).
   * @param {string} href - The URL to check
   * @returns {boolean} - True if the link is external
   */
  function isExternalLink(href) {
    if (!href || typeof href !== 'string') {
      return false;
    }

    // Skip empty, anchor-only, or javascript links
    if (href === '' || href.startsWith('#') || href.startsWith('javascript:')) {
      return false;
    }

    // Skip mailto and tel links
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      return false;
    }

    // Relative URLs are internal
    if (href.startsWith('/') && !href.startsWith('//')) {
      return false;
    }

    // Try to parse as URL
    var url;
    try {
      // Handle protocol-relative URLs
      if (href.startsWith('//')) {
        url = new URL('https:' + href);
      } else if (href.match(/^https?:\/\//)) {
        url = new URL(href);
      } else {
        // Relative URL without leading slash - internal
        return false;
      }
    } catch (e) {
      // Invalid URL - treat as internal
      return false;
    }

    // Check if hostname matches any internal domain
    var hostname = url.hostname.toLowerCase();
    for (var i = 0; i < INTERNAL_DOMAINS.length; i++) {
      if (hostname === INTERNAL_DOMAINS[i] || hostname.endsWith('.' + INTERNAL_DOMAINS[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if an anchor element should be processed.
   * @param {HTMLAnchorElement} anchor - The anchor element
   * @returns {boolean} - True if the anchor should be processed
   */
  function shouldProcessAnchor(anchor) {
    // Skip if already processed
    if (anchor.classList.contains(EXTERNAL_LINK_CLASS)) {
      return false;
    }

    // Skip navigation links, buttons, etc.
    if (anchor.classList.contains('nav-link') ||
        anchor.classList.contains('btn') ||
        anchor.closest('nav') ||
        anchor.closest('.td-sidebar') ||
        anchor.closest('.td-sidebar-toc') ||
        anchor.closest('.copy-page-dropdown')) {
      return false;
    }

    return true;
  }

  // =========================================================================
  // Link Marking
  // =========================================================================

  /**
   * Mark an anchor element as external.
   * @param {HTMLAnchorElement} anchor - The anchor element to mark
   */
  function markAsExternal(anchor) {
    // Add external link class
    anchor.classList.add(EXTERNAL_LINK_CLASS);

    // Set target and rel attributes
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener');

    // Add external link icon if not already present
    if (!anchor.querySelector('.external-link-icon')) {
      var icon = document.createElement('span');
      icon.className = 'external-link-icon';
      icon.setAttribute('aria-hidden', 'true');
      // Using a simple arrow icon character
      icon.innerHTML = '&#8599;'; // ↗ North East Arrow
      anchor.appendChild(icon);
    }
  }

  /**
   * Process all links in the content area.
   */
  function processLinks() {
    var contentArea = document.querySelector(CONTENT_SELECTOR);
    if (!contentArea) {
      return;
    }

    var anchors = contentArea.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      if (shouldProcessAnchor(anchor) && isExternalLink(anchor.getAttribute('href'))) {
        markAsExternal(anchor);
      }
    }
  }

  // =========================================================================
  // Initialization
  // =========================================================================

  /**
   * Initialize external link marking.
   */
  function init() {
    processLinks();

    // Re-process on dynamic content changes (for SPAs or dynamic loading)
    if (typeof MutationObserver !== 'undefined') {
      var contentArea = document.querySelector(CONTENT_SELECTOR);
      if (contentArea) {
        var observer = new MutationObserver(function(mutations) {
          var shouldProcess = false;
          for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length > 0) {
              shouldProcess = true;
              break;
            }
          }
          if (shouldProcess) {
            processLinks();
          }
        });
        observer.observe(contentArea, { childList: true, subtree: true });
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // =========================================================================
  // Exports for Testing
  // =========================================================================

  window.ExternalLinks = {
    isExternalLink: isExternalLink,
    shouldProcessAnchor: shouldProcessAnchor,
    markAsExternal: markAsExternal,
    processLinks: processLinks,
    INTERNAL_DOMAINS: INTERNAL_DOMAINS,
    EXTERNAL_LINK_CLASS: EXTERNAL_LINK_CLASS,
  };

})();
