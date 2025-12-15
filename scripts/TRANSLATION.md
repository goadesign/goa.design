# Translation Workflow for goa.design

This document describes how to translate goa.design documentation using DeepL.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your DeepL API key:
   ```
   DEEPL_API_KEY=your-api-key-here
   ```

Get a DeepL API key at: https://www.deepl.com/pro-api

## Quick Start

```bash
# Translate all English docs to all languages (IT, JA, FR)
./scripts/translate content/en/docs/

# Translate a single file to French only
./scripts/translate --lang FR content/en/docs/1-goa/quickstart.md

# Translate a directory to Japanese only
./scripts/translate --lang JA content/en/docs/1-goa/

# See what would be translated (dry run)
./scripts/translate --dry-run content/en/docs/
```

## How It Works

1. **Source files** live in `content/en/docs/`
2. **Translated files** are placed in `content/{lang}/docs/` with the same structure
3. A **cache file** (`.translation-cache.json`) tracks which files have been translated
4. Only **changed files** are re-translated (unless `--force` is used)

## Supported Languages

| Code | Language | Directory |
|------|----------|-----------|
| EN   | English  | content/en |
| IT   | Italian  | content/it |
| JA   | Japanese | content/ja |
| FR   | French   | content/fr |

## What Gets Translated

- **Translated**: Prose, headings, lists, front matter (title, description, linkTitle)
- **Preserved**: Code blocks, inline code, HTML tags, URLs, Hugo shortcodes

## Common Tasks

### After editing English docs

```bash
# Re-translate changed files
./scripts/translate content/en/docs/

# Force re-translate everything
./scripts/translate --force content/en/docs/
```

### Adding a new page

```bash
# Translate the new page to all languages
./scripts/translate content/en/docs/1-goa/new-page.md
```

### Translate only to one language

```bash
./scripts/translate --lang FR content/en/docs/
```

## DeepL API

Usage is displayed after each run. The free tier includes 500,000 chars/month.

You can also pass a different API key directly:
```bash
./scripts/translate --api-key "your-key-here" content/en/docs/
```

## Troubleshooting

### Virtual environment issues

The script creates a `.venv/` directory for its dependencies. If you have issues:

```bash
rm -rf .venv
./scripts/translate --help  # Will recreate venv
```

### Force re-translation

If a file is corrupted or you want to re-translate:

```bash
./scripts/translate --force content/en/docs/1-goa/quickstart.md
```

### Clear translation cache

To re-translate everything:

```bash
rm .translation-cache.json
./scripts/translate content/en/docs/
```

## Files

- `scripts/translate` - Main entry point (shell script)
- `scripts/translate.py` - Python translation logic
- `.translation-cache.json` - Tracks translated files (gitignored)
- `.venv/` - Python virtual environment (gitignored)
- `i18n/*.yaml` - UI string translations (manually maintained)

