# Design Document: LLM-Optimized Documentation

## Overview

This design transforms goa.design documentation from a traditional multi-page Hugo/Docsy site into an LLM-optimized format. The transformation involves three main areas:

1. **Copy Page Feature**: A dropdown button on each page allowing users to copy content as Markdown or Plain Text for pasting into LLM contexts
2. **Content Consolidation**: Reorganizing fragmented sub-pages into longer, self-contained topic pages
3. **Typography & Visual Refresh**: Modernizing the visual design with improved typography and information density inspired by Claude's documentation

The implementation uses Hugo's existing infrastructure (shortcodes, partials, CSS overrides) without requiring custom build tooling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Hugo Build Process                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Content    │    │   Layouts    │    │   Assets     │       │
│  │  (Markdown)  │    │  (Partials)  │    │   (SCSS)     │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Consolidated Pages                       │       │
│  │  • Merged topic content                              │       │
│  │  • Auto-generated TOC                                │       │
│  │  • Token count metadata                              │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Copy Page Component                      │       │
│  │  • Dropdown UI (Markdown / Plain Text)               │       │
│  │  • Content extraction from DOM                       │       │
│  │  • Clipboard API integration                         │       │
│  │  • Visual feedback                                   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Copy Page Component

**Location**: `layouts/partials/copy-page.html` + `assets/js/copy-page.js`

**Responsibilities**:
- Render dropdown button with "Copy as Markdown" and "Copy as Plain Text" options
- Extract page content from the DOM (title, headings, prose, code blocks)
- Convert HTML to Markdown or Plain Text format
- Copy to clipboard using Clipboard API
- Display visual feedback (toast notification)

**Interface**:
```html
<!-- Partial inclusion in page template -->
{{ partial "copy-page.html" . }}
```

**JavaScript API**:
```javascript
// Copy page content in specified format
function copyPageContent(format: 'markdown' | 'plaintext'): Promise<void>

// Extract content from page DOM
function extractPageContent(): PageContent

// Convert to markdown format
function toMarkdown(content: PageContent): string

// Convert to plain text format  
function toPlainText(content: PageContent): string

// Show feedback toast
function showCopyFeedback(success: boolean): void
```

### 2. Content Structure (Consolidated Pages)

**Current Structure** (fragmented):
```
content/en/docs/
├── 4-concepts/
│   └── 1-design-language/
│       ├── _index.md
│       ├── 1-data-modeling.md
│       ├── 2-api.md
│       ├── 3-services-methods.md
│       └── ...
```

**New Structure** (consolidated, Claude-inspired):

The structure follows Claude's documentation pattern: clear top-level categories with focused, self-contained pages that can be consumed independently.

```
content/en/docs/
├── _index.md                   # Documentation home with section overview + token counts
│
├── 1-goa/                      # Goa Framework (API Design & Generation)
│   ├── _index.md               # Goa overview + quick links
│   ├── quickstart.md           # Installation + first service (combined)
│   ├── dsl-reference.md        # Complete DSL: types, services, HTTP, gRPC, security
│   ├── code-generation.md      # Generation process, output structure, customization
│   ├── http-guide.md           # HTTP transport: routing, content, CORS, WebSocket, SSE
│   ├── grpc-guide.md           # gRPC transport: design, streaming, protobuf
│   ├── error-handling.md       # Errors: defining, types, transport mapping, serialization
│   ├── interceptors.md         # Goa interceptors, HTTP middleware, gRPC interceptors
│   └── production.md           # Observability, security patterns, common patterns
│
├── 2-goa-ai/                   # Goa-AI Framework (Agentic Systems)
│   ├── _index.md               # Goa-AI overview + architecture diagram
│   ├── quickstart.md           # Installation + first agent (combined)
│   ├── dsl-reference.md        # Complete DSL: agents, toolsets, policies, MCP
│   ├── runtime.md              # Runtime architecture, plan/execute loop, engines
│   ├── toolsets.md             # Toolset types, execution models, transforms
│   ├── agent-composition.md    # Agent-as-tool, run trees, streaming topology
│   ├── mcp-integration.md      # MCP servers, transports, generated wrappers
│   ├── memory-sessions.md      # Transcripts, memory stores, sessions, runs
│   └── production.md           # Temporal setup, streaming UI, model integration
│
└── 3-community/                # Community & Contributing
    └── _index.md               # Contributing, support, resources (single page)
```

**Rationale for Goa-AI breakdown** (inspired by Claude's docs):

1. **quickstart.md** - Single entry point combining installation + first agent (like Claude's "Get started")
2. **dsl-reference.md** - Complete DSL reference in one file (like Claude's "API reference" - comprehensive, searchable)
3. **runtime.md** - Core runtime concepts: architecture, plan/execute loop, policies, engines
4. **toolsets.md** - Focused on tool execution: types, models, transforms, validation
5. **agent-composition.md** - Advanced pattern: agent-as-tool, run trees, streaming (like Claude's "Agent patterns")
6. **mcp-integration.md** - External tool integration via MCP (standalone topic)
7. **memory-sessions.md** - State management: transcripts, memory, sessions, runs
8. **production.md** - Deployment: Temporal, streaming UI, model providers (like Claude's "Production" section)

### 3. Token Count Display

**Location**: `layouts/partials/section-meta.html`

**Responsibilities**:
- Calculate approximate token count from page content
- Display token count badge on section index pages
- Show content scope indicator (e.g., "Complete DSL Reference")

**Token Estimation**:
```javascript
// Approximate tokens ≈ words × 1.3 (for English text with code)
function estimateTokens(content: string): number {
  const words = content.split(/\s+/).length
  return Math.ceil(words * 1.3)
}
```

### 4. Typography & Styling

**Location**: `assets/scss/_custom.scss`

**Key Style Changes**:
- Font: Inter or system sans-serif stack for body, JetBrains Mono for code
- Line height: 1.6 for prose, 1.4 for code
- Max content width: 48rem (768px) for optimal reading
- Heading scale: Clear hierarchy with weight and size distinctions
- Code blocks: Subtle background, clear syntax highlighting
- Navigation: Reduced visual weight, subtle hover states

### 5. Sidebar Navigation

**Location**: `layouts/partials/sidebar.html` (override Docsy default)

**Changes**:
- Flatten navigation to reflect consolidated structure
- Remove expandable trees for consolidated sections
- Add visual indicators for LLM-optimized pages
- Show token count badges inline

## Data Models

### PageContent
```typescript
interface PageContent {
  title: string
  description?: string
  sections: Section[]
  metadata: {
    tokenCount: number
    wordCount: number
    lastUpdated: string
  }
}

interface Section {
  level: number           // 1-6 for h1-h6
  title: string
  content: ContentBlock[]
}

interface ContentBlock {
  type: 'prose' | 'code' | 'list' | 'table' | 'alert'
  content: string
  language?: string       // For code blocks
}
```

### CopyFormat
```typescript
type CopyFormat = 'markdown' | 'plaintext'

interface CopyOptions {
  format: CopyFormat
  includeMetadata: boolean  // Include token count, last updated
  stripShortcodes: boolean  // Remove Hugo shortcode syntax
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Copy content completeness
*For any* documentation page with a title, headings, code blocks, and prose content, when the copy function is invoked, the output SHALL contain all of these elements.
**Validates: Requirements 1.3**

### Property 2: Markdown format preservation
*For any* content containing code blocks with language annotations and headings at various levels, when copied as Markdown, the output SHALL preserve all language annotations (e.g., ```go) and maintain the correct heading hierarchy (# for h1, ## for h2, etc.).
**Validates: Requirements 1.4**

### Property 3: Plain text conversion
*For any* markdown content, when copied as Plain Text, the output SHALL be readable text without markdown syntax (no #, *, ```) while preserving code block content with clear visual separation.
**Validates: Requirements 1.5**

### Property 4: TOC presence for long pages
*For any* consolidated page exceeding 2000 words, the rendered page SHALL include a table of contents with links to major sections.
**Validates: Requirements 2.4**

### Property 5: Token count display
*For any* section displayed in the documentation index, the section entry SHALL include an estimated token count or content size indicator.
**Validates: Requirements 3.2**

### Property 6: External link marking
*For any* link to an external resource (non-goa.design URL), the link SHALL be visually marked as external (icon or indicator) and open in a new tab.
**Validates: Requirements 5.3**

### Property 7: Code block separation
*For any* page content containing multiple code blocks, when copied, each code block SHALL be separated by at least one blank line from surrounding content.
**Validates: Requirements 7.2**

### Property 8: Shortcode stripping
*For any* content containing Hugo shortcodes (e.g., `{{< alert >}}`), when copied, the output SHALL contain the rendered content without raw shortcode syntax.
**Validates: Requirements 7.3**

## Error Handling

### Clipboard API Failures
- **Scenario**: Browser doesn't support Clipboard API or permission denied
- **Handling**: Fall back to `document.execCommand('copy')` with textarea element; show error toast if both fail

### Content Extraction Failures
- **Scenario**: DOM structure doesn't match expected selectors
- **Handling**: Log warning, copy visible text content as fallback

### Token Count Estimation
- **Scenario**: Content contains unusual formatting or non-text elements
- **Handling**: Use conservative estimate, display "~X tokens" to indicate approximation

## Testing Strategy

### Dual Testing Approach

This project uses both unit tests and property-based tests:
- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property-based tests**: Verify universal properties hold across all valid inputs

### Property-Based Testing Framework

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Each property test runs minimum 100 iterations.

**Test File Location**: `assets/js/copy-page.test.js`

### Property Tests

Each correctness property will be implemented as a property-based test:

1. **Copy content completeness**: Generate random page structures with varying combinations of titles, headings, code blocks, and prose. Verify all elements appear in output.

2. **Markdown format preservation**: Generate content with random code block languages and heading levels. Verify language annotations and heading markers are preserved.

3. **Plain text conversion**: Generate markdown content with various formatting. Verify output contains no markdown syntax while preserving code content.

4. **Code block separation**: Generate pages with 2-10 code blocks. Verify each block is separated by blank lines in output.

5. **Shortcode stripping**: Generate content with various shortcode patterns. Verify no `{{` or `}}` appear in output.

### Unit Tests

- Copy button renders correctly
- Dropdown shows correct options
- Clipboard API integration works
- Toast feedback appears and dismisses
- Token count calculation accuracy
- External link detection and marking

### Visual/Manual Testing

- Typography renders correctly across browsers
- Responsive layout works at various breakpoints
- Navigation reflects consolidated structure
- Copy functionality works in Safari, Chrome, Firefox

