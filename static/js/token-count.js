// =============================================================================
// Token Count - Utility for Estimating LLM Token Counts
// =============================================================================
// Provides token estimation for documentation content.
// Uses the approximation: tokens ≈ words × 1.3 (for English text with code)
//
// Requirements: 3.1, 3.2

(function() {
  'use strict';

  /**
   * Estimate token count from text content.
   * Uses the approximation: tokens ≈ words × 1.3
   * This accounts for English text mixed with code, which typically
   * tokenizes to slightly more tokens than words.
   * 
   * @param {string} content - Text content to estimate tokens for
   * @returns {number} Estimated token count
   */
  function estimateTokens(content) {
    if (!content || typeof content !== 'string') {
      return 0;
    }
    
    // Count words by splitting on whitespace
    const words = content.trim().split(/\s+/).filter(function(word) {
      return word.length > 0;
    });
    
    const wordCount = words.length;
    
    // Apply 1.3 multiplier and round up
    return Math.ceil(wordCount * 1.3);
  }

  /**
   * Format token count for display.
   * Adds appropriate suffix (K for thousands).
   * 
   * @param {number} tokens - Token count
   * @returns {string} Formatted token count string
   */
  function formatTokenCount(tokens) {
    if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'K';
    }
    return tokens.toString();
  }

  /**
   * Get token count from a DOM element's text content.
   * 
   * @param {Element} element - DOM element to extract text from
   * @returns {number} Estimated token count
   */
  function getElementTokenCount(element) {
    if (!element) {
      return 0;
    }
    return estimateTokens(element.textContent);
  }

  /**
   * Update all token count displays on the page.
   * Looks for elements with data-token-count attribute and updates their display.
   */
  function updateTokenDisplays() {
    var elements = document.querySelectorAll('[data-word-count]');
    elements.forEach(function(el) {
      var wordCount = parseInt(el.getAttribute('data-word-count'), 10);
      if (!isNaN(wordCount)) {
        var tokenCount = Math.ceil(wordCount * 1.3);
        el.setAttribute('data-token-count', tokenCount);
        
        var tokenValueEl = el.querySelector('.token-value');
        if (tokenValueEl) {
          tokenValueEl.textContent = formatTokenCount(tokenCount);
        }
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateTokenDisplays);
  } else {
    updateTokenDisplays();
  }

  // Expose functions globally
  window.TokenCount = {
    estimateTokens: estimateTokens,
    formatTokenCount: formatTokenCount,
    getElementTokenCount: getElementTokenCount,
    updateTokenDisplays: updateTokenDisplays
  };

})();
