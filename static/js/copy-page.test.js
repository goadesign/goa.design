/**
 * Property-Based Tests for Copy Page Functionality
 * 
 * Uses fast-check to verify correctness properties across many random inputs.
 * Each test runs minimum 100 iterations as specified in the design document.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// =============================================================================
// Test Setup - Load copy-page.js in JSDOM environment
// =============================================================================

let CopyPage;

beforeEach(async () => {
  // Create a fresh JSDOM instance for each test
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  global.NodeFilter = dom.window.NodeFilter;
  global.navigator = dom.window.navigator;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  
  // Load the copy-page.js module
  const fs = await import('fs');
  const path = await import('path');
  const scriptPath = path.resolve('./static/js/copy-page.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute the script in the JSDOM context
  const script = dom.window.document.createElement('script');
  script.textContent = scriptContent;
  dom.window.document.head.appendChild(script);
  
  CopyPage = dom.window.CopyPage;
});

// =============================================================================
// Generators for Property-Based Testing
// =============================================================================

/**
 * Generate a random heading level (1-6)
 */
const headingLevelArb = fc.integer({ min: 1, max: 6 });

/**
 * Generate a random non-empty string for content
 */
const contentTextArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

/**
 * Generate a random programming language identifier
 */
const languageArb = fc.constantFrom('go', 'javascript', 'python', 'typescript', 'rust', 'java', 'bash', 'yaml', 'json', '');

/**
 * Generate a random code block content (no triple backticks to avoid nesting issues)
 */
const codeContentArb = fc.string({ minLength: 1, maxLength: 500 })
  .filter(s => !s.includes('```') && s.trim().length > 0);

/**
 * Generate a ContentBlock for testing
 */
const contentBlockArb = fc.oneof(
  // Heading block
  fc.record({
    type: fc.constant('heading'),
    level: headingLevelArb,
    content: contentTextArb,
  }),
  // Code block
  fc.record({
    type: fc.constant('code'),
    content: codeContentArb,
    language: languageArb,
  }),
  // Prose block
  fc.record({
    type: fc.constant('prose'),
    content: contentTextArb,
  }),
  // List block
  fc.record({
    type: fc.constant('list'),
    content: fc.array(contentTextArb, { minLength: 1, maxLength: 5 })
      .map(items => items.map((item, i) => `- ${item}`).join('\n')),
  }),
  // Alert block
  fc.record({
    type: fc.constant('alert'),
    content: contentTextArb,
  })
);

/**
 * Generate a PageContent object for testing
 */
const pageContentArb = fc.record({
  title: contentTextArb,
  description: fc.option(contentTextArb, { nil: undefined }),
  blocks: fc.array(contentBlockArb, { minLength: 0, maxLength: 10 }),
});

/**
 * Generate PageContent with at least one code block
 */
const pageContentWithCodeArb = fc.record({
  title: contentTextArb,
  description: fc.option(contentTextArb, { nil: undefined }),
  blocks: fc.tuple(
    fc.array(contentBlockArb, { minLength: 0, maxLength: 3 }),
    fc.record({
      type: fc.constant('code'),
      content: codeContentArb,
      language: languageArb,
    }),
    fc.array(contentBlockArb, { minLength: 0, maxLength: 3 })
  ).map(([before, code, after]) => [...before, code, ...after]),
});

/**
 * Generate PageContent with multiple code blocks
 */
const pageContentWithMultipleCodeBlocksArb = fc.record({
  title: contentTextArb,
  description: fc.option(contentTextArb, { nil: undefined }),
  blocks: fc.array(
    fc.record({
      type: fc.constant('code'),
      content: codeContentArb,
      language: languageArb,
    }),
    { minLength: 2, maxLength: 5 }
  ),
});

// =============================================================================
// Property Tests
// =============================================================================

describe('Copy Page Property Tests', () => {
  /**
   * **Feature: llm-optimized-docs, Property 1: Copy content completeness**
   * 
   * *For any* documentation page with a title, headings, code blocks, and prose content,
   * when the copy function is invoked, the output SHALL contain all of these elements.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 1: Copy content completeness', () => {
    it('toMarkdown output contains all content elements', () => {
      fc.assert(
        fc.property(pageContentArb, (content) => {
          const markdown = CopyPage.toMarkdown(content);
          
          // Title must be present (trimmed for comparison)
          if (content.title && content.title.trim()) {
            expect(markdown).toContain(content.title.trim());
          }
          
          // Description must be present if provided (trimmed for comparison)
          if (content.description && content.description.trim()) {
            expect(markdown).toContain(content.description.trim());
          }
          
          // All block content must be present (trimmed for comparison)
          // The implementation normalizes whitespace, so we check trimmed content
          for (const block of content.blocks) {
            const trimmedContent = block.content.trim();
            if (trimmedContent) {
              // For list blocks, check each list item individually
              if (block.type === 'list') {
                const items = trimmedContent.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
                for (const item of items) {
                  expect(markdown).toContain(item);
                }
              } else {
                expect(markdown).toContain(trimmedContent);
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('toPlainText output contains all content elements', () => {
      fc.assert(
        fc.property(pageContentArb, (content) => {
          const plainText = CopyPage.toPlainText(content);
          
          // Title must be present (uppercase in plain text, trimmed for comparison)
          if (content.title && content.title.trim()) {
            expect(plainText.toUpperCase()).toContain(content.title.trim().toUpperCase());
          }
          
          // Description must be present if provided (trimmed for comparison)
          if (content.description && content.description.trim()) {
            expect(plainText).toContain(content.description.trim());
          }
          
          // All block content must be present (trimmed for comparison)
          for (const block of content.blocks) {
            // For prose blocks, strip blockquote markers for comparison
            let expectedContent = block.type === 'prose' 
              ? block.content.replace(/^>\s*/gm, '')
              : block.content;
            expectedContent = expectedContent.trim();
            
            if (expectedContent) {
              // For list blocks, check each list item individually
              if (block.type === 'list') {
                const items = expectedContent.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
                for (const item of items) {
                  expect(plainText).toContain(item);
                }
              } else {
                expect(plainText).toContain(expectedContent);
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: llm-optimized-docs, Property 2: Markdown format preservation**
   * 
   * *For any* content containing code blocks with language annotations and headings
   * at various levels, when copied as Markdown, the output SHALL preserve all language
   * annotations (e.g., ```go) and maintain the correct heading hierarchy.
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 2: Markdown format preservation', () => {
    it('preserves code block language annotations', () => {
      fc.assert(
        fc.property(pageContentWithCodeArb, (content) => {
          const markdown = CopyPage.toMarkdown(content);
          
          for (const block of content.blocks) {
            if (block.type === 'code' && block.language) {
              // Language annotation must appear in the markdown
              expect(markdown).toContain('```' + block.language);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('maintains correct heading hierarchy with # markers', () => {
      fc.assert(
        fc.property(pageContentArb, (content) => {
          const markdown = CopyPage.toMarkdown(content);
          
          for (const block of content.blocks) {
            if (block.type === 'heading') {
              // Check that the heading marker with correct level is present
              const headingMarker = '#'.repeat(block.level) + ' ';
              // And that the content (trimmed) appears somewhere after a heading marker
              const trimmedContent = block.content.trim();
              if (trimmedContent) {
                // The markdown should contain the heading marker
                expect(markdown).toContain(headingMarker);
                // And the content should be present
                expect(markdown).toContain(trimmedContent);
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: llm-optimized-docs, Property 3: Plain text conversion**
   * 
   * *For any* markdown content, when copied as Plain Text, the output SHALL be
   * readable text without markdown syntax (no #, *, ```) while preserving code
   * block content with clear visual separation.
   * 
   * **Validates: Requirements 1.5**
   */
  describe('Property 3: Plain text conversion', () => {
    it('removes markdown heading markers', () => {
      // Use a generator that excludes content starting with markdown heading syntax
      // since the plain text conversion preserves user content as-is
      const safeContentTextArb = fc.string({ minLength: 1, maxLength: 200 })
        .filter(s => s.trim().length > 0 && !s.trim().match(/^#{1,6}\s/));
      
      const safePageContentArb = fc.record({
        title: safeContentTextArb,
        description: fc.option(safeContentTextArb, { nil: undefined }),
        blocks: fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('heading'),
              level: headingLevelArb,
              content: safeContentTextArb,
            }),
            fc.record({
              type: fc.constant('code'),
              content: codeContentArb,
              language: languageArb,
            }),
            fc.record({
              type: fc.constant('prose'),
              content: safeContentTextArb,
            })
          ),
          { minLength: 0, maxLength: 10 }
        ),
      });
      
      fc.assert(
        fc.property(safePageContentArb, (content) => {
          const plainText = CopyPage.toPlainText(content);
          
          // Should not contain markdown heading markers at line start
          // (except in user content which may legitimately contain # characters)
          const lines = plainText.split('\n');
          for (const line of lines) {
            // The toPlainText function should not ADD markdown heading markers
            // We check that headings are converted to underlined format, not # format
            // Skip lines that are underlines (=== or ---)
            if (line.match(/^[=-]+$/)) continue;
            // Skip lines that are code markers
            if (line.match(/^---\s*(CODE|END CODE)\s*---$/)) continue;
            // For actual content lines, verify no markdown heading syntax was added
            // Note: User content may contain # but toPlainText shouldn't add new ones
            expect(line).not.toMatch(/^#{1,6}\s/);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('removes markdown code fence markers', () => {
      fc.assert(
        fc.property(pageContentWithCodeArb, (content) => {
          const plainText = CopyPage.toPlainText(content);
          
          // Should not contain ``` markers
          expect(plainText).not.toContain('```');
        }),
        { numRuns: 100 }
      );
    });

    it('preserves code block content with visual separation', () => {
      fc.assert(
        fc.property(pageContentWithCodeArb, (content) => {
          const plainText = CopyPage.toPlainText(content);
          
          for (const block of content.blocks) {
            if (block.type === 'code') {
              // Code content must be present
              expect(plainText).toContain(block.content);
              // Should have visual markers for code
              expect(plainText).toContain('--- CODE ---');
              expect(plainText).toContain('--- END CODE ---');
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: llm-optimized-docs, Property 7: Code block separation**
   * 
   * *For any* page content containing multiple code blocks, when copied, each code
   * block SHALL be separated by at least one blank line from surrounding content.
   * 
   * **Validates: Requirements 7.2**
   */
  describe('Property 7: Code block separation', () => {
    it('markdown code blocks are separated by blank lines', () => {
      fc.assert(
        fc.property(pageContentWithMultipleCodeBlocksArb, (content) => {
          const markdown = CopyPage.toMarkdown(content);
          
          // Find all code block positions
          const codeBlockRegex = /```[\s\S]*?```/g;
          let match;
          const codeBlocks = [];
          
          while ((match = codeBlockRegex.exec(markdown)) !== null) {
            codeBlocks.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
            });
          }
          
          // Each code block should have blank line before (except at start)
          // and blank line after (except at end)
          for (let i = 0; i < codeBlocks.length; i++) {
            const block = codeBlocks[i];
            
            // Check for blank line before (if not at start)
            if (block.start > 0) {
              const before = markdown.substring(0, block.start);
              // Should end with at least one newline (blank line)
              expect(before).toMatch(/\n\s*$/);
            }
            
            // Check for blank line after (if not at end)
            if (block.end < markdown.length) {
              const after = markdown.substring(block.end);
              // Should start with newline
              expect(after).toMatch(/^\n/);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('plain text code blocks are separated by blank lines', () => {
      fc.assert(
        fc.property(pageContentWithMultipleCodeBlocksArb, (content) => {
          const plainText = CopyPage.toPlainText(content);
          
          // Find all code block markers
          const codeStartRegex = /--- CODE ---/g;
          let match;
          const codeStarts = [];
          
          while ((match = codeStartRegex.exec(plainText)) !== null) {
            codeStarts.push(match.index);
          }
          
          // Each code block marker should have blank line before (except at start)
          for (const startPos of codeStarts) {
            if (startPos > 0) {
              const before = plainText.substring(0, startPos);
              expect(before).toMatch(/\n\s*$/);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: llm-optimized-docs, Property 8: Shortcode stripping**
   * 
   * *For any* content containing Hugo shortcodes (e.g., `{{< alert >}}`), when copied,
   * the output SHALL contain the rendered content without raw shortcode syntax.
   * 
   * **Validates: Requirements 7.3**
   */
  describe('Property 8: Shortcode stripping', () => {
    it('output does not contain Hugo shortcode syntax', () => {
      // Generate content that might have shortcode-like patterns
      const contentWithPotentialShortcodes = fc.record({
        title: contentTextArb,
        description: fc.option(contentTextArb, { nil: undefined }),
        blocks: fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('prose'),
              content: contentTextArb,
            }),
            fc.record({
              type: fc.constant('alert'),
              content: contentTextArb,
            })
          ),
          { minLength: 1, maxLength: 5 }
        ),
      });

      fc.assert(
        fc.property(contentWithPotentialShortcodes, (content) => {
          const markdown = CopyPage.toMarkdown(content);
          const plainText = CopyPage.toPlainText(content);
          
          // Neither output should contain Hugo shortcode delimiters
          expect(markdown).not.toMatch(/\{\{[<%]/);
          expect(markdown).not.toMatch(/[%>]\}\}/);
          expect(plainText).not.toMatch(/\{\{[<%]/);
          expect(plainText).not.toMatch(/[%>]\}\}/);
        }),
        { numRuns: 100 }
      );
    });
  });
});
