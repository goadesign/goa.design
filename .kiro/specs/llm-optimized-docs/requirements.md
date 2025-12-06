# Requirements Document

## Introduction

This specification defines the transformation of goa.design documentation from a traditional multi-page Hugo site into an LLM-optimized format. The goal is to consolidate fragmented content into longer, self-contained documents that can be easily copied and pasted into LLM contexts (Claude, GPT, etc.) while maintaining the existing Hugo/Docsy site structure and navigation. The approach is inspired by Anthropic's documentation at platform.claude.com, which features consolidated pages with "Copy page" functionality.

## Glossary

- **LLM Context**: The text input provided to a Large Language Model for processing, typically with token limits (e.g., 100K-200K tokens)
- **Hugo**: The static site generator used by goa.design
- **Docsy**: The Hugo theme used by goa.design for documentation
- **Copy Page**: A UI feature that copies the entire page content (markdown or plain text) to clipboard for pasting into LLM contexts
- **Consolidated Page**: A single page that combines multiple related sub-pages into one cohesive document
- **Context Dump**: A self-contained document optimized for LLM consumption with all necessary context included

## Requirements

### Requirement 1

**User Story:** As a developer using an LLM assistant, I want to copy entire documentation sections in one action, so that I can provide comprehensive context to the LLM without manually combining multiple pages.

#### Acceptance Criteria

1. WHEN a user clicks the "Copy page" dropdown on any documentation page THEN the System SHALL display options to copy as Markdown or Plain Text
2. WHEN a user selects a copy format THEN the System SHALL copy the page content to the clipboard and provide visual feedback confirming the action
3. WHEN content is copied THEN the System SHALL include the page title, all headings, code blocks, and prose in a format suitable for LLM consumption
4. WHEN content is copied as Markdown THEN the System SHALL preserve code block language annotations and heading hierarchy
5. WHEN content is copied as Plain Text THEN the System SHALL convert markdown formatting to readable plain text while preserving code blocks

### Requirement 2

**User Story:** As a developer, I want documentation pages consolidated by topic rather than split across many small pages, so that I can get complete context on a subject without navigating multiple pages.

#### Acceptance Criteria

1. WHEN viewing the Goa documentation THEN the System SHALL present content organized into consolidated topic pages rather than fragmented sub-pages
2. WHEN a topic has related sub-topics THEN the System SHALL combine them into a single scrollable page with clear section headings
3. WHEN consolidating pages THEN the System SHALL maintain logical flow and add transitional context where sub-pages were previously separate
4. WHEN a consolidated page exceeds reasonable reading length THEN the System SHALL provide a table of contents for navigation within the page

### Requirement 3

**User Story:** As a developer, I want the documentation home page to clearly indicate that content is optimized for LLM consumption, so that I understand the intended use pattern.

#### Acceptance Criteria

1. WHEN a user visits the documentation section THEN the System SHALL display visual indicators that pages are LLM-optimized
2. WHEN displaying the documentation index THEN the System SHALL show estimated token counts or content size for each major section
3. WHEN a user hovers over or views a section link THEN the System SHALL indicate the scope of content included (e.g., "Complete DSL Reference" vs individual DSL functions)

### Requirement 4

**User Story:** As a developer, I want the sidebar navigation simplified to reflect the consolidated structure, so that I can quickly find the right context dump for my needs.

#### Acceptance Criteria

1. WHEN viewing the documentation sidebar THEN the System SHALL display a flattened navigation structure with fewer top-level items
2. WHEN a section contains consolidated content THEN the System SHALL show it as a single entry rather than an expandable tree
3. WHEN navigating between sections THEN the System SHALL maintain clear visual hierarchy distinguishing major topics from sub-sections

### Requirement 5

**User Story:** As a developer, I want consolidated pages to be self-contained with all necessary context, so that the LLM can understand the content without requiring additional pages.

#### Acceptance Criteria

1. WHEN a consolidated page references concepts from other sections THEN the System SHALL include brief inline explanations or context
2. WHEN code examples depend on prior setup THEN the System SHALL include the necessary context or imports within the same page
3. WHEN a page references external resources THEN the System SHALL clearly mark them as external and provide sufficient context for understanding without following the link

### Requirement 6

**User Story:** As a maintainer, I want the consolidation to work with the existing Hugo/Docsy infrastructure, so that I can maintain the site without learning new tooling.

#### Acceptance Criteria

1. WHEN building the site THEN the System SHALL use standard Hugo build processes without custom build steps
2. WHEN adding the copy functionality THEN the System SHALL implement it as a Hugo shortcode or partial that integrates with Docsy
3. WHEN consolidating content THEN the System SHALL reorganize markdown files within the existing content structure rather than requiring new tooling

### Requirement 7

**User Story:** As a developer, I want the copy functionality to handle code blocks intelligently, so that code examples are properly formatted when pasted into LLM contexts.

#### Acceptance Criteria

1. WHEN copying content with code blocks THEN the System SHALL preserve the language annotation (e.g., ```go)
2. WHEN copying content with multiple code blocks THEN the System SHALL maintain clear separation between blocks
3. WHEN copying content THEN the System SHALL strip Hugo shortcodes and render their content appropriately

### Requirement 8

**User Story:** As a developer reading documentation, I want improved typography with better visibility and information density, so that I can scan and read content more efficiently.

#### Acceptance Criteria

1. WHEN displaying documentation content THEN the System SHALL use a clean, modern sans-serif font optimized for screen reading
2. WHEN displaying headings THEN the System SHALL use clear visual hierarchy with appropriate weight and spacing distinctions
3. WHEN displaying prose content THEN the System SHALL use comfortable line height and optimal line length for readability
4. WHEN displaying code blocks THEN the System SHALL use a monospace font with syntax highlighting and sufficient contrast
5. WHEN displaying the page layout THEN the System SHALL maximize content density while maintaining visual breathing room

### Requirement 9

**User Story:** As a developer, I want the documentation to have a modern, minimal visual design similar to Claude's documentation, so that the interface feels professional and focused on content.

#### Acceptance Criteria

1. WHEN viewing the documentation THEN the System SHALL display a clean interface with reduced visual clutter compared to default Docsy
2. WHEN displaying navigation elements THEN the System SHALL use subtle styling that doesn't compete with content
3. WHEN displaying interactive elements THEN the System SHALL provide clear affordances without excessive decoration
4. WHEN viewing on different screen sizes THEN the System SHALL adapt layout to maintain readability and density appropriate to the viewport

