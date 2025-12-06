// =============================================================================
// Copy Page - LLM-Optimized Content Extraction and Clipboard Functionality
// =============================================================================
// Extracts page content (title, headings, code blocks, prose) and copies to
// clipboard in Markdown or Plain Text format for pasting into LLM contexts.

(function() {
  'use strict';

  // =========================================================================
  // Data Types
  // =========================================================================

  /**
   * @typedef {Object} ContentBlock
   * @property {'prose'|'code'|'heading'|'list'|'table'|'alert'} type
   * @property {string} content
   * @property {string} [language] - For code blocks
   * @property {number} [level] - For headings (1-6)
   */

  /**
   * @typedef {Object} PageContent
   * @property {string} title
   * @property {string} [description]
   * @property {ContentBlock[]} blocks
   */

  // =========================================================================
  // Content Extraction
  // =========================================================================

  /**
   * Extract page content from the DOM.
   * @returns {PageContent}
   */
  function extractPageContent() {
    const content = {
      title: '',
      description: '',
      blocks: []
    };

    // Extract title from the page
    const titleEl = document.querySelector('h1') || 
                    document.querySelector('.td-content h1') ||
                    document.querySelector('article h1');
    if (titleEl) {
      content.title = titleEl.textContent.trim();
    }

    // Extract description from meta or first paragraph
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      content.description = metaDesc.getAttribute('content') || '';
    }

    // Find the main content area
    const mainContent = document.querySelector('.td-content') ||
                        document.querySelector('article') ||
                        document.querySelector('main');

    if (!mainContent) {
      return content;
    }

    // Process all child elements
    const walker = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          // Skip navigation, TOC, and other non-content elements
          if (node.closest('.td-toc') || 
              node.closest('.td-sidebar') ||
              node.closest('.copy-page-dropdown') ||
              node.closest('nav')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const processedNodes = new Set();
    let currentNode;

    while ((currentNode = walker.nextNode())) {
      // Skip if already processed as part of a parent
      if (processedNodes.has(currentNode)) {
        continue;
      }

      const block = extractBlock(currentNode, processedNodes);
      if (block) {
        content.blocks.push(block);
      }
    }

    return content;
  }

  /**
   * Extract a content block from a DOM element.
   * @param {Element} element
   * @param {Set} processedNodes
   * @returns {ContentBlock|null}
   */
  function extractBlock(element, processedNodes) {
    const tagName = element.tagName.toLowerCase();

    // Headings
    if (/^h[1-6]$/.test(tagName)) {
      processedNodes.add(element);
      return {
        type: 'heading',
        level: parseInt(tagName.charAt(1), 10),
        content: element.textContent.trim()
      };
    }

    // Code blocks (pre > code)
    if (tagName === 'pre') {
      processedNodes.add(element);
      const codeEl = element.querySelector('code');
      const code = codeEl || element;
      
      // Extract language from class (e.g., "language-go", "highlight-go")
      let language = '';
      const classes = (code.className || '').split(/\s+/);
      for (const cls of classes) {
        const match = cls.match(/^(?:language-|highlight-)(.+)$/);
        if (match) {
          language = match[1];
          break;
        }
      }
      
      // Also check data-lang attribute (used by some highlighters)
      if (!language && element.dataset.lang) {
        language = element.dataset.lang;
      }

      return {
        type: 'code',
        content: code.textContent,
        language: language
      };
    }

    // Lists
    if (tagName === 'ul' || tagName === 'ol') {
      processedNodes.add(element);
      // Mark all children as processed
      element.querySelectorAll('*').forEach(function(child) {
        processedNodes.add(child);
      });
      return {
        type: 'list',
        content: extractListContent(element, tagName === 'ol')
      };
    }

    // Tables
    if (tagName === 'table') {
      processedNodes.add(element);
      element.querySelectorAll('*').forEach(function(child) {
        processedNodes.add(child);
      });
      return {
        type: 'table',
        content: extractTableContent(element)
      };
    }

    // Alert/callout boxes (Hugo shortcodes rendered)
    if (element.classList.contains('alert') || 
        element.classList.contains('callout') ||
        element.classList.contains('admonition')) {
      processedNodes.add(element);
      element.querySelectorAll('*').forEach(function(child) {
        processedNodes.add(child);
      });
      return {
        type: 'alert',
        content: element.textContent.trim()
      };
    }

    // Paragraphs
    if (tagName === 'p') {
      processedNodes.add(element);
      const text = element.textContent.trim();
      if (text) {
        return {
          type: 'prose',
          content: text
        };
      }
    }

    // Blockquotes
    if (tagName === 'blockquote') {
      processedNodes.add(element);
      element.querySelectorAll('*').forEach(function(child) {
        processedNodes.add(child);
      });
      return {
        type: 'prose',
        content: '> ' + element.textContent.trim().replace(/\n/g, '\n> ')
      };
    }

    return null;
  }

  /**
   * Extract list content preserving structure.
   * @param {Element} listEl
   * @param {boolean} ordered
   * @param {number} [depth=0]
   * @returns {string}
   */
  function extractListContent(listEl, ordered, depth) {
    depth = depth || 0;
    const indent = '  '.repeat(depth);
    const lines = [];
    let index = 1;

    const items = listEl.children;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.tagName.toLowerCase() !== 'li') {
        continue;
      }

      const prefix = ordered ? (index + '. ') : '- ';
      
      // Get direct text content (not nested lists)
      let text = '';
      for (let j = 0; j < item.childNodes.length; j++) {
        const child = item.childNodes[j];
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = child.tagName.toLowerCase();
          if (childTag !== 'ul' && childTag !== 'ol') {
            text += child.textContent;
          }
        }
      }
      
      lines.push(indent + prefix + text.trim());
      index++;

      // Process nested lists
      const nestedList = item.querySelector(':scope > ul, :scope > ol');
      if (nestedList) {
        const nestedOrdered = nestedList.tagName.toLowerCase() === 'ol';
        lines.push(extractListContent(nestedList, nestedOrdered, depth + 1));
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract table content as markdown.
   * @param {Element} tableEl
   * @returns {string}
   */
  function extractTableContent(tableEl) {
    const rows = [];
    const headerRow = tableEl.querySelector('thead tr');
    const bodyRows = tableEl.querySelectorAll('tbody tr');

    if (headerRow) {
      const headers = [];
      headerRow.querySelectorAll('th, td').forEach(function(cell) {
        headers.push(cell.textContent.trim());
      });
      rows.push('| ' + headers.join(' | ') + ' |');
      rows.push('| ' + headers.map(function() { return '---'; }).join(' | ') + ' |');
    }

    bodyRows.forEach(function(row) {
      const cells = [];
      row.querySelectorAll('td, th').forEach(function(cell) {
        cells.push(cell.textContent.trim());
      });
      rows.push('| ' + cells.join(' | ') + ' |');
    });

    return rows.join('\n');
  }

  // =========================================================================
  // Format Conversion
  // =========================================================================

  /**
   * Convert page content to Markdown format.
   * @param {PageContent} content
   * @returns {string}
   */
  function toMarkdown(content) {
    const lines = [];

    // Title
    if (content.title) {
      lines.push('# ' + content.title);
      lines.push('');
    }

    // Description
    if (content.description) {
      lines.push(content.description);
      lines.push('');
    }

    // Content blocks
    for (let i = 0; i < content.blocks.length; i++) {
      const block = content.blocks[i];
      const prevBlock = i > 0 ? content.blocks[i - 1] : null;

      switch (block.type) {
        case 'heading':
          // Add blank line before heading if previous block wasn't empty
          if (prevBlock) {
            lines.push('');
          }
          lines.push('#'.repeat(block.level) + ' ' + block.content);
          lines.push('');
          break;

        case 'code':
          // Ensure blank line before code block
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push('```' + (block.language || ''));
          lines.push(block.content);
          lines.push('```');
          lines.push('');
          break;

        case 'list':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push(block.content);
          lines.push('');
          break;

        case 'table':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push(block.content);
          lines.push('');
          break;

        case 'alert':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push('> **Note:** ' + block.content);
          lines.push('');
          break;

        case 'prose':
        default:
          lines.push(block.content);
          lines.push('');
          break;
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Convert page content to Plain Text format.
   * @param {PageContent} content
   * @returns {string}
   */
  function toPlainText(content) {
    const lines = [];

    // Title
    if (content.title) {
      lines.push(content.title.toUpperCase());
      lines.push('='.repeat(content.title.length));
      lines.push('');
    }

    // Description
    if (content.description) {
      lines.push(content.description);
      lines.push('');
    }

    // Content blocks
    for (let i = 0; i < content.blocks.length; i++) {
      const block = content.blocks[i];
      const prevBlock = i > 0 ? content.blocks[i - 1] : null;

      switch (block.type) {
        case 'heading':
          if (prevBlock) {
            lines.push('');
          }
          lines.push(block.content);
          // Underline based on level
          const underline = block.level <= 2 ? '=' : '-';
          lines.push(underline.repeat(block.content.length));
          lines.push('');
          break;

        case 'code':
          // Ensure blank line before code block
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push('--- CODE ---');
          lines.push(block.content);
          lines.push('--- END CODE ---');
          lines.push('');
          break;

        case 'list':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          // Convert markdown list markers to plain text
          lines.push(block.content);
          lines.push('');
          break;

        case 'table':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          // Convert markdown table to plain text (remove pipes)
          const tableLines = block.content.split('\n');
          tableLines.forEach(function(line) {
            // Skip separator lines
            if (!/^\|[\s-|]+\|$/.test(line)) {
              lines.push(line.replace(/^\||\|$/g, '').replace(/\|/g, '  |  ').trim());
            }
          });
          lines.push('');
          break;

        case 'alert':
          if (prevBlock && prevBlock.type !== 'heading') {
            lines.push('');
          }
          lines.push('NOTE: ' + block.content);
          lines.push('');
          break;

        case 'prose':
        default:
          // Remove markdown-style blockquote markers for plain text
          lines.push(block.content.replace(/^>\s*/gm, ''));
          lines.push('');
          break;
      }
    }

    return lines.join('\n').trim();
  }

  // =========================================================================
  // Clipboard Operations
  // =========================================================================

  /**
   * Copy text to clipboard using modern API with fallback.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  function copyToClipboard(text) {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function() { return true; })
        .catch(function() {
          // Fall back to execCommand
          return execCommandCopy(text);
        });
    }

    // Fallback for older browsers
    return Promise.resolve(execCommandCopy(text));
  }

  /**
   * Fallback copy using execCommand.
   * @param {string} text
   * @returns {boolean}
   */
  function execCommandCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      console.error('execCommand copy failed:', e);
    }
    
    document.body.removeChild(textarea);
    return success;
  }

  // =========================================================================
  // Toast Notification
  // =========================================================================

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {boolean} success
   */
  function showToast(message, success) {
    // Remove any existing toast
    const existing = document.querySelector('.copy-page-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'copy-page-toast' + (success ? ' success' : ' error');
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(function() {
      toast.classList.add('visible');
    });

    // Auto-dismiss after 2 seconds
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2000);
  }

  // =========================================================================
  // Main Copy Functions
  // =========================================================================

  /**
   * Copy page content in the specified format.
   * @param {'markdown'|'plaintext'} format
   */
  function copyPageContent(format) {
    const content = extractPageContent();
    
    let text;
    if (format === 'markdown') {
      text = toMarkdown(content);
    } else {
      text = toPlainText(content);
    }

    copyToClipboard(text).then(function(success) {
      if (success) {
        const formatName = format === 'markdown' ? 'Markdown' : 'Plain Text';
        showToast('Copied as ' + formatName, true);
      } else {
        showToast('Failed to copy', false);
      }
    });
  }

  // =========================================================================
  // Exports for Testing and External Use
  // =========================================================================

  // Expose functions globally for the partial to use
  window.CopyPage = {
    extractPageContent: extractPageContent,
    toMarkdown: toMarkdown,
    toPlainText: toPlainText,
    copyToClipboard: copyToClipboard,
    showToast: showToast,
    copyPageContent: copyPageContent
  };

})();
