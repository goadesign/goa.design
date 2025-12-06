/**
 * Property-Based Tests for Auto-Generated TOC Functionality
 * 
 * Uses fast-check to verify correctness properties across many random inputs.
 * Each test runs minimum 100 iterations as specified in the design document.
 * 
 * **Feature: llm-optimized-docs, Property 4: TOC presence for long pages**
 * **Validates: Requirements 2.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// =============================================================================
// Test Setup - Load toc-auto.js in JSDOM environment
// =============================================================================

let TocAuto;

beforeEach(async () => {
  // Create a fresh JSDOM instance for each test
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  
  // Load the toc-auto.js module
  const fs = await import('fs');
  const path = await import('path');
  const scriptPath = path.resolve('./static/js/toc-auto.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute the script in the JSDOM context
  const script = dom.window.document.createElement('script');
  script.textContent = scriptContent;
  dom.window.document.head.appendChild(script);
  
  TocAuto = dom.window.TocAuto;
});

// =============================================================================
// Generators for Property-Based Testing
// =============================================================================

/**
 * Generate a random word (non-empty string without spaces)
 */
const wordArb = fc.string({ minLength: 1, maxLength: 15 })
  .filter(s => s.trim().length > 0 && !s.includes(' ') && !s.includes('\n'));

/**
 * Generate text with a specific word count
 * @param {number} minWords - Minimum word count
 * @param {number} maxWords - Maximum word count
 */
const textWithWordCountArb = (minWords, maxWords) => 
  fc.array(wordArb, { minLength: minWords, maxLength: maxWords })
    .map(words => words.join(' '));

/**
 * Generate text exceeding the threshold (> 2000 words)
 */
const longTextArb = textWithWordCountArb(2001, 2500);

/**
 * Generate text below the threshold (<= 2000 words)
 */
const shortTextArb = textWithWordCountArb(100, 2000);

/**
 * Generate a random heading level (2-4, as h1 is typically the page title)
 */
const headingLevelArb = fc.integer({ min: 2, max: 4 });

/**
 * Generate a random heading text
 * Excludes HTML special characters since they get escaped in output
 * Excludes leading/trailing whitespace since it gets trimmed
 */
const headingTextArb = fc.string({ minLength: 1, maxLength: 50 })
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.includes('&') && !s.includes('<') && !s.includes('>') && !s.includes('"'));

/**
 * Generate a random heading object
 */
const headingArb = fc.record({
  level: headingLevelArb,
  text: headingTextArb,
  id: fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s)),
});

/**
 * Generate an array of headings
 */
const headingsArb = fc.array(headingArb, { minLength: 1, maxLength: 10 });

// =============================================================================
// Property Tests
// =============================================================================

describe('Auto TOC Property Tests', () => {
  /**
   * **Feature: llm-optimized-docs, Property 4: TOC presence for long pages**
   * 
   * *For any* consolidated page exceeding 2000 words, the rendered page SHALL
   * include a table of contents with links to major sections.
   * 
   * **Validates: Requirements 2.4**
   */
  describe('Property 4: TOC presence for long pages', () => {
    it('shouldGenerateToc returns true for pages exceeding 2000 words', () => {
      fc.assert(
        fc.property(longTextArb, (text) => {
          // Create a DOM element with the long text
          const div = document.createElement('div');
          div.className = 'td-content';
          div.textContent = text;
          document.body.appendChild(div);
          
          const shouldGenerate = TocAuto.shouldGenerateToc(div);
          
          // Should return true for long pages
          expect(shouldGenerate).toBe(true);
          
          // Cleanup
          document.body.removeChild(div);
        }),
        { numRuns: 100 }
      );
    });

    it('shouldGenerateToc returns false for pages with 2000 words or fewer', () => {
      fc.assert(
        fc.property(shortTextArb, (text) => {
          // Create a DOM element with the short text
          const div = document.createElement('div');
          div.className = 'td-content';
          div.textContent = text;
          document.body.appendChild(div);
          
          const shouldGenerate = TocAuto.shouldGenerateToc(div);
          
          // Should return false for short pages
          expect(shouldGenerate).toBe(false);
          
          // Cleanup
          document.body.removeChild(div);
        }),
        { numRuns: 100 }
      );
    });

    it('generated TOC contains links to all headings', () => {
      fc.assert(
        fc.property(headingsArb, (headings) => {
          const tocHtml = TocAuto.generateTocHtml(headings);
          
          // TOC should contain a link for each heading
          for (const heading of headings) {
            // Should contain the heading text
            expect(tocHtml).toContain(heading.text);
            // Should contain a link to the heading ID
            expect(tocHtml).toContain('href="#' + heading.id + '"');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('generated TOC has correct structure with nav and list elements', () => {
      fc.assert(
        fc.property(headingsArb, (headings) => {
          const tocHtml = TocAuto.generateTocHtml(headings);
          
          // Should have nav element with aria-label
          expect(tocHtml).toContain('<nav class="toc-auto"');
          expect(tocHtml).toContain('aria-label="Table of Contents"');
          
          // Should have header
          expect(tocHtml).toContain('toc-auto-header');
          expect(tocHtml).toContain('On this page');
          
          // Should have list
          expect(tocHtml).toContain('<ul class="toc-auto-list">');
          
          // Should have list items
          expect(tocHtml).toContain('<li class="toc-auto-item');
        }),
        { numRuns: 100 }
      );
    });

    it('TOC indentation reflects heading hierarchy', () => {
      fc.assert(
        fc.property(headingsArb, (headings) => {
          const tocHtml = TocAuto.generateTocHtml(headings);
          
          for (const heading of headings) {
            const expectedIndent = heading.level - 2; // h2=0, h3=1, h4=2
            
            if (expectedIndent > 0) {
              // Should have indent class for h3 and h4
              expect(tocHtml).toContain('toc-indent-' + expectedIndent);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('extractHeadings extracts all h2, h3, h4 headings from DOM', () => {
      fc.assert(
        fc.property(headingsArb, (headings) => {
          // Create a DOM element with headings
          const div = document.createElement('div');
          div.className = 'td-content';
          
          for (const heading of headings) {
            const h = document.createElement('h' + heading.level);
            h.id = heading.id;
            h.textContent = heading.text;
            div.appendChild(h);
          }
          
          document.body.appendChild(div);
          
          const extracted = TocAuto.extractHeadings(div);
          
          // Should extract all headings
          expect(extracted.length).toBe(headings.length);
          
          // Each extracted heading should match input
          for (let i = 0; i < headings.length; i++) {
            expect(extracted[i].level).toBe(headings[i].level);
            expect(extracted[i].text).toBe(headings[i].text);
            expect(extracted[i].id).toBe(headings[i].id);
          }
          
          // Cleanup
          document.body.removeChild(div);
        }),
        { numRuns: 100 }
      );
    });

    it('extractHeadings assigns IDs to headings without IDs', () => {
      fc.assert(
        fc.property(
          fc.array(headingTextArb, { minLength: 1, maxLength: 5 }),
          (headingTexts) => {
            // Create a DOM element with headings without IDs
            const div = document.createElement('div');
            div.className = 'td-content';
            
            for (const text of headingTexts) {
              const h = document.createElement('h2');
              h.textContent = text;
              // No ID set
              div.appendChild(h);
            }
            
            document.body.appendChild(div);
            
            const extracted = TocAuto.extractHeadings(div);
            
            // All extracted headings should have IDs
            for (const heading of extracted) {
              expect(heading.id).toBeTruthy();
              expect(heading.id.length).toBeGreaterThan(0);
            }
            
            // The DOM elements should now have IDs
            const domHeadings = div.querySelectorAll('h2');
            domHeadings.forEach((h) => {
              expect(h.id).toBeTruthy();
            });
            
            // Cleanup
            document.body.removeChild(div);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('countWords correctly counts words in text', () => {
      fc.assert(
        fc.property(
          fc.array(wordArb, { minLength: 0, maxLength: 100 }),
          (words) => {
            const text = words.join(' ');
            const count = TocAuto.countWords(text);
            
            // Should match the number of words
            expect(count).toBe(words.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('countWords returns 0 for empty or whitespace-only text', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
          (whitespace) => {
            const count = TocAuto.countWords(whitespace);
            expect(count).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('generateTocHtml returns empty string for empty headings array', () => {
      const tocHtml = TocAuto.generateTocHtml([]);
      expect(tocHtml).toBe('');
    });

    it('generateTocHtml returns empty string for null/undefined', () => {
      expect(TocAuto.generateTocHtml(null)).toBe('');
      expect(TocAuto.generateTocHtml(undefined)).toBe('');
    });

    it('extractHeadings returns empty array for null element', () => {
      const headings = TocAuto.extractHeadings(null);
      expect(headings).toEqual([]);
    });

    it('shouldGenerateToc returns false for null element', () => {
      const shouldGenerate = TocAuto.shouldGenerateToc(null);
      expect(shouldGenerate).toBe(false);
    });
  });
});
