/**
 * Property-Based Tests for External Link Marking
 * 
 * Uses fast-check to verify correctness properties across many random inputs.
 * Each test runs minimum 100 iterations as specified in the design document.
 * 
 * **Feature: llm-optimized-docs, Property 6: External link marking**
 * **Validates: Requirements 5.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// =============================================================================
// Test Setup - Load external-links.js in JSDOM environment
// =============================================================================

let ExternalLinks;
let dom;

beforeEach(async () => {
  // Create a fresh JSDOM instance for each test
  dom = new JSDOM('<!DOCTYPE html><html><body><div class="td-content"></div></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://goa.design/docs/test',
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  global.NodeFilter = dom.window.NodeFilter;
  global.navigator = dom.window.navigator;
  global.MutationObserver = dom.window.MutationObserver;
  
  // Load the external-links.js module
  const fs = await import('fs');
  const path = await import('path');
  const scriptPath = path.resolve('./static/js/external-links.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute the script in the JSDOM context
  const script = dom.window.document.createElement('script');
  script.textContent = scriptContent;
  dom.window.document.head.appendChild(script);
  
  ExternalLinks = dom.window.ExternalLinks;
});

// =============================================================================
// Generators for Property-Based Testing
// =============================================================================

/**
 * Generate a random external domain (not goa.design)
 */
const externalDomainArb = fc.constantFrom(
  'github.com',
  'google.com',
  'example.com',
  'stackoverflow.com',
  'npmjs.com',
  'golang.org',
  'pkg.go.dev',
  'docs.aws.amazon.com',
  'developer.mozilla.org',
  'medium.com',
  'dev.to',
  'twitter.com',
  'youtube.com',
  'reddit.com',
);

/**
 * Generate a random internal domain (goa.design variants)
 */
const internalDomainArb = fc.constantFrom(
  'goa.design',
  'www.goa.design',
  'localhost',
  '127.0.0.1',
);

/**
 * Generate a random URL path
 */
const urlPathArb = fc.array(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'), { minLength: 1, maxLength: 20 }),
  { minLength: 0, maxLength: 4 }
).map(parts => '/' + parts.join('/'));

/**
 * Generate a random external URL
 */
const externalUrlArb = fc.tuple(
  fc.constantFrom('https://', 'http://'),
  externalDomainArb,
  urlPathArb,
).map(([protocol, domain, path]) => protocol + domain + path);

/**
 * Generate a random internal URL (absolute with domain)
 */
const internalAbsoluteUrlArb = fc.tuple(
  fc.constantFrom('https://', 'http://'),
  internalDomainArb,
  urlPathArb,
).map(([protocol, domain, path]) => protocol + domain + path);

/**
 * Generate a random internal relative URL
 */
const internalRelativeUrlArb = urlPathArb;

/**
 * Generate anchor-only URLs
 */
const anchorUrlArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'),
  { minLength: 1, maxLength: 20 }
).map(s => '#' + s);

/**
 * Generate mailto URLs
 */
const mailtoUrlArb = fc.emailAddress().map(email => 'mailto:' + email);

/**
 * Generate link text
 */
const linkTextArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

// =============================================================================
// Property Tests
// =============================================================================

describe('External Links Property Tests', () => {
  /**
   * **Feature: llm-optimized-docs, Property 6: External link marking**
   * 
   * *For any* link to an external resource (non-goa.design URL), the link SHALL be
   * visually marked as external (icon or indicator) and open in a new tab.
   * 
   * **Validates: Requirements 5.3**
   */
  describe('Property 6: External link marking', () => {
    it('correctly identifies external URLs', () => {
      fc.assert(
        fc.property(externalUrlArb, (url) => {
          expect(ExternalLinks.isExternalLink(url)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('correctly identifies internal absolute URLs', () => {
      fc.assert(
        fc.property(internalAbsoluteUrlArb, (url) => {
          expect(ExternalLinks.isExternalLink(url)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('correctly identifies internal relative URLs', () => {
      fc.assert(
        fc.property(internalRelativeUrlArb, (url) => {
          expect(ExternalLinks.isExternalLink(url)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('correctly identifies anchor-only URLs as internal', () => {
      fc.assert(
        fc.property(anchorUrlArb, (url) => {
          expect(ExternalLinks.isExternalLink(url)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('correctly identifies mailto URLs as internal', () => {
      fc.assert(
        fc.property(mailtoUrlArb, (url) => {
          expect(ExternalLinks.isExternalLink(url)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('external links are marked with external-link class', () => {
      fc.assert(
        fc.property(externalUrlArb, linkTextArb, (url, text) => {
          // Create a fresh content area
          const contentArea = dom.window.document.querySelector('.td-content');
          contentArea.innerHTML = '';
          
          // Create an anchor element
          const anchor = dom.window.document.createElement('a');
          anchor.href = url;
          anchor.textContent = text;
          contentArea.appendChild(anchor);
          
          // Process links
          ExternalLinks.processLinks();
          
          // Verify the anchor has the external-link class
          expect(anchor.classList.contains('external-link')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('external links have target="_blank" attribute', () => {
      fc.assert(
        fc.property(externalUrlArb, linkTextArb, (url, text) => {
          // Create a fresh content area
          const contentArea = dom.window.document.querySelector('.td-content');
          contentArea.innerHTML = '';
          
          // Create an anchor element
          const anchor = dom.window.document.createElement('a');
          anchor.href = url;
          anchor.textContent = text;
          contentArea.appendChild(anchor);
          
          // Process links
          ExternalLinks.processLinks();
          
          // Verify target="_blank"
          expect(anchor.getAttribute('target')).toBe('_blank');
        }),
        { numRuns: 100 }
      );
    });

    it('external links have rel="noopener" attribute', () => {
      fc.assert(
        fc.property(externalUrlArb, linkTextArb, (url, text) => {
          // Create a fresh content area
          const contentArea = dom.window.document.querySelector('.td-content');
          contentArea.innerHTML = '';
          
          // Create an anchor element
          const anchor = dom.window.document.createElement('a');
          anchor.href = url;
          anchor.textContent = text;
          contentArea.appendChild(anchor);
          
          // Process links
          ExternalLinks.processLinks();
          
          // Verify rel="noopener"
          expect(anchor.getAttribute('rel')).toBe('noopener');
        }),
        { numRuns: 100 }
      );
    });

    it('external links have external link icon', () => {
      fc.assert(
        fc.property(externalUrlArb, linkTextArb, (url, text) => {
          // Create a fresh content area
          const contentArea = dom.window.document.querySelector('.td-content');
          contentArea.innerHTML = '';
          
          // Create an anchor element
          const anchor = dom.window.document.createElement('a');
          anchor.href = url;
          anchor.textContent = text;
          contentArea.appendChild(anchor);
          
          // Process links
          ExternalLinks.processLinks();
          
          // Verify external link icon is present
          const icon = anchor.querySelector('.external-link-icon');
          expect(icon).not.toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('internal links are NOT marked as external', () => {
      fc.assert(
        fc.property(
          fc.oneof(internalAbsoluteUrlArb, internalRelativeUrlArb, anchorUrlArb),
          linkTextArb,
          (url, text) => {
            // Create a fresh content area
            const contentArea = dom.window.document.querySelector('.td-content');
            contentArea.innerHTML = '';
            
            // Create an anchor element
            const anchor = dom.window.document.createElement('a');
            anchor.href = url;
            anchor.textContent = text;
            contentArea.appendChild(anchor);
            
            // Process links
            ExternalLinks.processLinks();
            
            // Verify the anchor does NOT have the external-link class
            expect(anchor.classList.contains('external-link')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('internal links do NOT have target="_blank"', () => {
      fc.assert(
        fc.property(
          fc.oneof(internalAbsoluteUrlArb, internalRelativeUrlArb),
          linkTextArb,
          (url, text) => {
            // Create a fresh content area
            const contentArea = dom.window.document.querySelector('.td-content');
            contentArea.innerHTML = '';
            
            // Create an anchor element
            const anchor = dom.window.document.createElement('a');
            anchor.href = url;
            anchor.textContent = text;
            contentArea.appendChild(anchor);
            
            // Process links
            ExternalLinks.processLinks();
            
            // Verify target is NOT set to _blank
            expect(anchor.getAttribute('target')).not.toBe('_blank');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('already processed links are not processed again', () => {
      fc.assert(
        fc.property(externalUrlArb, linkTextArb, (url, text) => {
          // Create a fresh content area
          const contentArea = dom.window.document.querySelector('.td-content');
          contentArea.innerHTML = '';
          
          // Create an anchor element
          const anchor = dom.window.document.createElement('a');
          anchor.href = url;
          anchor.textContent = text;
          contentArea.appendChild(anchor);
          
          // Process links twice
          ExternalLinks.processLinks();
          ExternalLinks.processLinks();
          
          // Verify only one icon is added
          const icons = anchor.querySelectorAll('.external-link-icon');
          expect(icons.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });
});
