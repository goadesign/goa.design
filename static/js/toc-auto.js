/**
 * Auto-Generated Table of Contents for Long Pages
 * 
 * Generates a table of contents for documentation pages exceeding 2000 words.
 * Provides easy navigation within long consolidated pages.
 * 
 * Requirements: 2.4
 */

(function() {
  'use strict';

  // Word count threshold for TOC generation
  var WORD_COUNT_THRESHOLD = 2000;

  /**
   * Count words in text content
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  function countWords(text) {
    if (!text) return 0;
    var words = text.trim().split(/\s+/).filter(function(w) {
      return w.length > 0;
    });
    return words.length;
  }

  /**
   * Get word count from a DOM element
   * @param {Element} element - DOM element to count words in
   * @returns {number} Word count
   */
  function getElementWordCount(element) {
    if (!element) return 0;
    return countWords(element.textContent || '');
  }

  /**
   * Extract headings from content element
   * @param {Element} contentElement - Content container element
   * @returns {Array} Array of heading objects with level, text, and id
   */
  function extractHeadings(contentElement) {
    if (!contentElement) return [];
    
    var headings = [];
    var headingElements = contentElement.querySelectorAll('h2, h3, h4');
    
    headingElements.forEach(function(heading, index) {
      var level = parseInt(heading.tagName.charAt(1), 10);
      var text = heading.textContent.trim();
      
      // Ensure heading has an ID for linking
      var id = heading.id;
      if (!id) {
        id = 'toc-heading-' + index;
        heading.id = id;
      }
      
      headings.push({
        level: level,
        text: text,
        id: id,
      });
    });
    
    return headings;
  }

  /**
   * Generate TOC HTML from headings
   * @param {Array} headings - Array of heading objects
   * @returns {string} HTML string for TOC
   */
  function generateTocHtml(headings) {
    if (!headings || headings.length === 0) return '';
    
    var html = '<nav class="toc-auto" aria-label="Table of Contents">\n';
    html += '<div class="toc-auto-header">\n';
    html += '<i class="fas fa-list" aria-hidden="true"></i>\n';
    html += '<span>On this page</span>\n';
    html += '</div>\n';
    html += '<ul class="toc-auto-list">\n';
    
    headings.forEach(function(heading) {
      var indent = heading.level - 2; // h2 = 0, h3 = 1, h4 = 2
      var indentClass = indent > 0 ? ' toc-indent-' + indent : '';
      
      html += '<li class="toc-auto-item' + indentClass + '">';
      html += '<a href="#' + heading.id + '" class="toc-auto-link">';
      html += escapeHtml(heading.text);
      html += '</a>';
      html += '</li>\n';
    });
    
    html += '</ul>\n';
    html += '</nav>';
    
    return html;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if page needs TOC based on word count
   * @param {Element} contentElement - Content container element
   * @returns {boolean} True if TOC should be generated
   */
  function shouldGenerateToc(contentElement) {
    var wordCount = getElementWordCount(contentElement);
    return wordCount > WORD_COUNT_THRESHOLD;
  }

  /**
   * Insert TOC into the page
   * @param {Element} contentElement - Content container element
   * @param {string} tocHtml - TOC HTML to insert
   */
  function insertToc(contentElement, tocHtml) {
    if (!contentElement || !tocHtml) return;
    
    // Find the first h1 or the beginning of content
    var h1 = contentElement.querySelector('h1');
    var insertPoint = h1 ? h1.nextElementSibling : contentElement.firstChild;
    
    // Skip description/lead paragraph if present
    if (insertPoint && insertPoint.classList && insertPoint.classList.contains('lead')) {
      insertPoint = insertPoint.nextElementSibling;
    }
    
    // Create TOC element
    var tocContainer = document.createElement('div');
    tocContainer.className = 'toc-auto-container';
    tocContainer.innerHTML = tocHtml;
    
    // Insert before the insert point
    if (insertPoint) {
      contentElement.insertBefore(tocContainer, insertPoint);
    } else {
      contentElement.appendChild(tocContainer);
    }
  }

  /**
   * Initialize auto TOC for the page
   */
  function initAutoToc() {
    var contentElement = document.querySelector('.td-content');
    if (!contentElement) return;
    
    // Check if TOC should be generated
    if (!shouldGenerateToc(contentElement)) return;
    
    // Extract headings
    var headings = extractHeadings(contentElement);
    if (headings.length === 0) return;
    
    // Generate and insert TOC
    var tocHtml = generateTocHtml(headings);
    insertToc(contentElement, tocHtml);
    
    // Add scroll spy for active state
    initScrollSpy(headings);
  }

  /**
   * Initialize scroll spy to highlight current section
   * @param {Array} headings - Array of heading objects
   */
  function initScrollSpy(headings) {
    if (!headings || headings.length === 0) return;
    
    var tocLinks = document.querySelectorAll('.toc-auto-link');
    if (tocLinks.length === 0) return;
    
    function updateActiveLink() {
      var scrollPos = window.scrollY + 100; // Offset for header
      var activeId = null;
      
      // Find the current section
      for (var i = headings.length - 1; i >= 0; i--) {
        var heading = headings[i];
        var element = document.getElementById(heading.id);
        if (element && element.offsetTop <= scrollPos) {
          activeId = heading.id;
          break;
        }
      }
      
      // Update active class
      tocLinks.forEach(function(link) {
        var href = link.getAttribute('href');
        if (href === '#' + activeId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
    
    // Throttle scroll handler
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          updateActiveLink();
          ticking = false;
        });
        ticking = true;
      }
    });
    
    // Initial update
    updateActiveLink();
  }

  // Export for testing
  window.TocAuto = {
    countWords: countWords,
    getElementWordCount: getElementWordCount,
    extractHeadings: extractHeadings,
    generateTocHtml: generateTocHtml,
    shouldGenerateToc: shouldGenerateToc,
    WORD_COUNT_THRESHOLD: WORD_COUNT_THRESHOLD,
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoToc);
  } else {
    initAutoToc();
  }
})();
