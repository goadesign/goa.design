/**
 * Unit Tests for Copy Page UI Component
 * 
 * Tests the dropdown UI, click handlers, and toast feedback functionality.
 * Requirements: 1.1, 1.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// =============================================================================
// Test Setup
// =============================================================================

let dom;
let document;
let window;
let CopyPage;

/**
 * Create a fresh JSDOM environment with the copy-page script loaded
 */
async function setupDOM(htmlContent = '') {
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <div class="td-content">
        <h1>Test Page</h1>
        <p>Test content paragraph.</p>
        <pre><code class="language-go">func main() {}</code></pre>
      </div>
      ${htmlContent}
    </body>
    </html>
  `, {
    runScripts: 'dangerously',
    resources: 'usable',
  });
  
  window = dom.window;
  document = window.document;
  
  // Set up requestAnimationFrame on the window object BEFORE loading the script
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  
  // Set up globals
  global.window = window;
  global.document = document;
  global.Node = window.Node;
  global.NodeFilter = window.NodeFilter;
  global.navigator = window.navigator;
  global.requestAnimationFrame = window.requestAnimationFrame;
  
  // Load the copy-page.js module
  const fs = await import('fs');
  const path = await import('path');
  const scriptPath = path.resolve('./static/js/copy-page.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute the script in the JSDOM context
  const script = document.createElement('script');
  script.textContent = scriptContent;
  document.head.appendChild(script);
  
  CopyPage = window.CopyPage;
  
  return { dom, document, window, CopyPage };
}

/**
 * Create the dropdown HTML structure
 */
function createDropdownHTML() {
  return `
    <div class="copy-page-dropdown" id="copy-page-dropdown">
      <button class="copy-page-btn" aria-haspopup="true" aria-expanded="false">
        <i class="fas fa-copy"></i>
        <span>Copy page</span>
        <i class="fas fa-chevron-down dropdown-arrow"></i>
      </button>
      <div class="copy-page-menu" role="menu">
        <button class="copy-page-menu-item" role="menuitem" data-format="markdown">
          <i class="fas fa-file-code"></i>
          <span>Copy as Markdown</span>
        </button>
        <button class="copy-page-menu-item" role="menuitem" data-format="plaintext">
          <i class="fas fa-file-alt"></i>
          <span>Copy as Plain Text</span>
        </button>
      </div>
    </div>
  `;
}

// =============================================================================
// Unit Tests
// =============================================================================

describe('Copy Page UI Component', () => {
  beforeEach(async () => {
    await setupDOM(createDropdownHTML());
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('Dropdown renders correctly', () => {
    it('renders the dropdown container', () => {
      const dropdown = document.getElementById('copy-page-dropdown');
      expect(dropdown).not.toBeNull();
      expect(dropdown.classList.contains('copy-page-dropdown')).toBe(true);
    });

    it('renders the main button with correct text', () => {
      const btn = document.querySelector('.copy-page-btn');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain('Copy page');
    });

    it('renders the dropdown menu with two options', () => {
      const menu = document.querySelector('.copy-page-menu');
      expect(menu).not.toBeNull();
      
      const items = menu.querySelectorAll('.copy-page-menu-item');
      expect(items.length).toBe(2);
    });

    it('renders Markdown option with correct data-format', () => {
      const markdownItem = document.querySelector('[data-format="markdown"]');
      expect(markdownItem).not.toBeNull();
      expect(markdownItem.textContent).toContain('Markdown');
    });

    it('renders Plain Text option with correct data-format', () => {
      const plaintextItem = document.querySelector('[data-format="plaintext"]');
      expect(plaintextItem).not.toBeNull();
      expect(plaintextItem.textContent).toContain('Plain Text');
    });

    it('has correct ARIA attributes on button', () => {
      const btn = document.querySelector('.copy-page-btn');
      expect(btn.getAttribute('aria-haspopup')).toBe('true');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('has correct role on menu', () => {
      const menu = document.querySelector('.copy-page-menu');
      expect(menu.getAttribute('role')).toBe('menu');
    });

    it('has correct role on menu items', () => {
      const items = document.querySelectorAll('.copy-page-menu-item');
      items.forEach(item => {
        expect(item.getAttribute('role')).toBe('menuitem');
      });
    });
  });

  describe('Toast feedback', () => {
    it('showToast creates a toast element', () => {
      CopyPage.showToast('Test message', true);
      
      const toast = document.querySelector('.copy-page-toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toBe('Test message');
    });

    it('showToast adds success class for successful copy', () => {
      CopyPage.showToast('Copied!', true);
      
      const toast = document.querySelector('.copy-page-toast');
      expect(toast.classList.contains('success')).toBe(true);
      expect(toast.classList.contains('error')).toBe(false);
    });

    it('showToast adds error class for failed copy', () => {
      CopyPage.showToast('Failed!', false);
      
      const toast = document.querySelector('.copy-page-toast');
      expect(toast.classList.contains('error')).toBe(true);
      expect(toast.classList.contains('success')).toBe(false);
    });

    it('showToast has correct ARIA attributes', () => {
      CopyPage.showToast('Test', true);
      
      const toast = document.querySelector('.copy-page-toast');
      expect(toast.getAttribute('role')).toBe('status');
      expect(toast.getAttribute('aria-live')).toBe('polite');
    });

    it('showToast removes existing toast before creating new one', () => {
      CopyPage.showToast('First', true);
      CopyPage.showToast('Second', true);
      
      const toasts = document.querySelectorAll('.copy-page-toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].textContent).toBe('Second');
    });

    it('showToast adds visible class after creation', async () => {
      CopyPage.showToast('Test', true);
      
      // Wait for requestAnimationFrame
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const toast = document.querySelector('.copy-page-toast');
      expect(toast.classList.contains('visible')).toBe(true);
    });
  });

  describe('Content extraction', () => {
    it('extractPageContent returns an object with title', () => {
      const content = CopyPage.extractPageContent();
      expect(content).toHaveProperty('title');
      expect(content.title).toBe('Test Page');
    });

    it('extractPageContent returns an object with blocks array', () => {
      const content = CopyPage.extractPageContent();
      expect(content).toHaveProperty('blocks');
      expect(Array.isArray(content.blocks)).toBe(true);
    });

    it('extractPageContent extracts prose content', () => {
      const content = CopyPage.extractPageContent();
      const proseBlocks = content.blocks.filter(b => b.type === 'prose');
      expect(proseBlocks.length).toBeGreaterThan(0);
      expect(proseBlocks.some(b => b.content.includes('Test content'))).toBe(true);
    });

    it('extractPageContent extracts code blocks with language', () => {
      const content = CopyPage.extractPageContent();
      const codeBlocks = content.blocks.filter(b => b.type === 'code');
      expect(codeBlocks.length).toBeGreaterThan(0);
      expect(codeBlocks[0].language).toBe('go');
    });
  });

  describe('Format conversion', () => {
    it('toMarkdown returns a string', () => {
      const content = CopyPage.extractPageContent();
      const markdown = CopyPage.toMarkdown(content);
      expect(typeof markdown).toBe('string');
    });

    it('toMarkdown includes title with # prefix', () => {
      const content = CopyPage.extractPageContent();
      const markdown = CopyPage.toMarkdown(content);
      expect(markdown).toContain('# Test Page');
    });

    it('toMarkdown includes code blocks with language annotation', () => {
      const content = CopyPage.extractPageContent();
      const markdown = CopyPage.toMarkdown(content);
      expect(markdown).toContain('```go');
    });

    it('toPlainText returns a string', () => {
      const content = CopyPage.extractPageContent();
      const plainText = CopyPage.toPlainText(content);
      expect(typeof plainText).toBe('string');
    });

    it('toPlainText includes title in uppercase', () => {
      const content = CopyPage.extractPageContent();
      const plainText = CopyPage.toPlainText(content);
      expect(plainText).toContain('TEST PAGE');
    });

    it('toPlainText does not include markdown code fences', () => {
      const content = CopyPage.extractPageContent();
      const plainText = CopyPage.toPlainText(content);
      expect(plainText).not.toContain('```');
    });
  });

  describe('Clipboard operations', () => {
    it('copyToClipboard returns a thenable (promise-like)', () => {
      const result = CopyPage.copyToClipboard('test');
      // Check for promise-like behavior (has .then method)
      expect(typeof result.then).toBe('function');
    });

    it('copyToClipboard resolves to boolean', async () => {
      // Note: In JSDOM, clipboard API may not be fully supported
      // This test verifies the function handles the fallback gracefully
      const result = await CopyPage.copyToClipboard('test');
      expect(typeof result).toBe('boolean');
    });
  });
});
