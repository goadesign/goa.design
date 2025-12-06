/**
 * Property-Based Tests for Token Count Functionality
 * 
 * Uses fast-check to verify correctness properties across many random inputs.
 * Each test runs minimum 100 iterations as specified in the design document.
 * 
 * **Feature: llm-optimized-docs, Property 5: Token count display**
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// =============================================================================
// Test Setup - Load token-count.js in JSDOM environment
// =============================================================================

let TokenCount;

beforeEach(async () => {
  // Create a fresh JSDOM instance for each test
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  
  // Load the token-count.js module
  const fs = await import('fs');
  const path = await import('path');
  const scriptPath = path.resolve('./static/js/token-count.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute the script in the JSDOM context
  const script = dom.window.document.createElement('script');
  script.textContent = scriptContent;
  dom.window.document.head.appendChild(script);
  
  TokenCount = dom.window.TokenCount;
});

// =============================================================================
// Generators for Property-Based Testing
// =============================================================================

/**
 * Generate random text content with varying word counts
 */
const textContentArb = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes(' ')),
  { minLength: 0, maxLength: 500 }
).map(words => words.join(' '));

/**
 * Generate random word count for testing
 */
const wordCountArb = fc.integer({ min: 0, max: 100000 });

/**
 * Generate random token count for formatting tests
 */
const tokenCountArb = fc.integer({ min: 0, max: 1000000 });

// =============================================================================
// Property Tests
// =============================================================================

describe('Token Count Property Tests', () => {
  /**
   * **Feature: llm-optimized-docs, Property 5: Token count display**
   * 
   * *For any* section displayed in the documentation index, the section entry
   * SHALL include an estimated token count or content size indicator.
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 5: Token count display', () => {
    it('token count is approximately words × 1.3 for any text content', () => {
      fc.assert(
        fc.property(textContentArb, (content) => {
          const tokenCount = TokenCount.estimateTokens(content);
          
          // Count words manually
          const words = content.trim().split(/\s+/).filter(w => w.length > 0);
          const wordCount = words.length;
          
          // Token count should be ceil(words × 1.3)
          const expectedTokens = Math.ceil(wordCount * 1.3);
          
          expect(tokenCount).toBe(expectedTokens);
        }),
        { numRuns: 100 }
      );
    });

    it('token count is always non-negative for any input', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const tokenCount = TokenCount.estimateTokens(content);
          expect(tokenCount).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('token count is zero for empty or whitespace-only content', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
          (whitespace) => {
            const tokenCount = TokenCount.estimateTokens(whitespace);
            expect(tokenCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('token count increases monotonically with word count', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 100 }),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 100 }),
          (words1, words2) => {
            const content1 = words1.join(' ');
            const content2 = words1.concat(words2).join(' ');
            
            const tokens1 = TokenCount.estimateTokens(content1);
            const tokens2 = TokenCount.estimateTokens(content2);
            
            // More words should mean more or equal tokens
            expect(tokens2).toBeGreaterThanOrEqual(tokens1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formatTokenCount produces valid string for any token count', () => {
      fc.assert(
        fc.property(tokenCountArb, (tokens) => {
          const formatted = TokenCount.formatTokenCount(tokens);
          
          // Should be a non-empty string
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
          
          // Should contain digits
          expect(formatted).toMatch(/\d/);
          
          // For large numbers, should use K suffix
          if (tokens >= 1000) {
            expect(formatted).toContain('K');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('formatTokenCount K suffix represents thousands correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 1000000 }),
          (tokens) => {
            const formatted = TokenCount.formatTokenCount(tokens);
            
            // Should end with K
            expect(formatted).toMatch(/K$/);
            
            // Parse the number part
            const numPart = parseFloat(formatted.replace('K', ''));
            
            // The formatted value should be tokens/1000 rounded to 1 decimal place
            // We verify by checking the formatted string matches what toFixed(1) produces
            const expected = (tokens / 1000).toFixed(1);
            expect(formatted).toBe(expected + 'K');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles null and undefined inputs gracefully', () => {
      expect(TokenCount.estimateTokens(null)).toBe(0);
      expect(TokenCount.estimateTokens(undefined)).toBe(0);
      expect(TokenCount.estimateTokens('')).toBe(0);
    });

    it('getElementTokenCount returns correct count for DOM elements', () => {
      fc.assert(
        fc.property(textContentArb, (content) => {
          // Create a DOM element with the content
          const div = document.createElement('div');
          div.textContent = content;
          document.body.appendChild(div);
          
          const elementTokens = TokenCount.getElementTokenCount(div);
          const directTokens = TokenCount.estimateTokens(content);
          
          // Should match direct estimation
          expect(elementTokens).toBe(directTokens);
          
          // Cleanup
          document.body.removeChild(div);
        }),
        { numRuns: 100 }
      );
    });

    it('getElementTokenCount returns 0 for null element', () => {
      expect(TokenCount.getElementTokenCount(null)).toBe(0);
    });
  });
});
